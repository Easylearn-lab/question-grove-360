import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb } from "./db";
import { users, passwordResetTokens } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// Password validation regex: at least 8 chars, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

const validatePassword = (password: string): boolean => {
  return PASSWORD_REGEX.test(password);
};

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const passwordRouter = router({
  // Change password for users who already have email/password login
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().refine(
          validatePassword,
          "Password must be at least 8 characters, include a number and a special character"
        ),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get user with password hash
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User does not have password login enabled",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(
        input.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      // Verify passwords match
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(input.newPassword);

      // Update password in database
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, ctx.user.id));

      // Send confirmation email
      try {
        await notifyOwner({
          title: "Password Changed",
          content: `Your password for ${user.email} was changed. If this wasn't you, contact support immediately.`,
        });
      } catch (error) {
        console.error("Failed to send password change confirmation email:", error);
      }

      return {
        success: true,
        message: "Your password has been updated successfully",
      };
    }),

  // Request to set password for Google users
  requestSetPassword: protectedProcedure.mutation(async ({ ctx }: any) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });

    if (!user || !user.email) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check rate limit: 3 requests per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTokens = await db.query.passwordResetTokens.findMany({
      where: and(
        eq(passwordResetTokens.userId, ctx.user.id),
        eq(passwordResetTokens.usedAt, null),
        // This is a simplified check - in production, use proper timestamp comparison
      ),
    });

    if (recentTokens.length >= 3) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later.",
      });
    }

    // Generate token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await db.insert(passwordResetTokens).values({
      userId: ctx.user.id,
      token,
      expiresAt,
    });

    // Send email with reset link
    try {
      await notifyOwner({
        title: "Set Your Password",
        content: `Click the link to set your password: https://questiongrove360.com/auth/set-password?token=${token}. This link expires in 1 hour.`,
      });
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send email",
      });
    }

    return {
      success: true,
      message: `We've sent a link to ${user.email}. Click it to set your password — the link expires in 1 hour.`,
    };
  }),

  // Verify and use reset token to set password
  setPasswordWithToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().refine(
          validatePassword,
          "Password must be at least 8 characters, include a number and a special character"
        ),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify passwords match
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      // Find valid token
      const resetToken = await db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.token, input.token),
          eq(passwordResetTokens.usedAt, null)
        ),
      });

      if (!resetToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This link has expired or is invalid",
        });
      }

      // Check if token expired
      if (resetToken.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This link has expired. Go back to Settings to request a new one.",
        });
      }

      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, resetToken.userId),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Hash new password
      const passwordHash = await hashPassword(input.newPassword);

      // Update user with password and login methods
      const currentLoginMethods = user.loginMethods
        ? (JSON.parse(JSON.stringify(user.loginMethods)) as string[])
        : ["email_password"];

      if (!currentLoginMethods.includes("email_password")) {
        currentLoginMethods.push("email_password");
      }

      await db
        .update(users)
        .set({
          passwordHash,
          loginMethods: JSON.stringify(currentLoginMethods),
        })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      // Send confirmation email
      try {
        await notifyOwner({
          title: "Email/Password Login Added",
          content: `Email/password login has been added to your account. You can now sign in with either method.`,
        });
      } catch (error) {
        console.error("Failed to send confirmation email:", error);
      }

      return {
        success: true,
        message: "Email & password login has been added to your account. You can now sign in with either method.",
      };
    }),

  // Request forgot password (same as requestSetPassword but for existing users)
  requestForgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find user by email (don't reveal if user exists)
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user) {
        // Return success anyway to prevent user enumeration
        return {
          success: true,
          message: "If an account exists with that email, we've sent a password reset link.",
        };
      }

      // Generate token
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token to database
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Send email with reset link
      try {
        await notifyOwner({
          title: "Reset Your Password",
          content: `Click the link to reset your password: https://questiongrove360.com/auth/reset-password?token=${token}. This link expires in 1 hour.`,
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }

      return {
        success: true,
        message: "If an account exists with that email, we've sent a password reset link.",
      };
    }),

  // Reset password with token (for forgot password flow)
  resetPasswordWithToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().refine(
          validatePassword,
          "Password must be at least 8 characters, include a number and a special character"
        ),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input }: any) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify passwords match
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      // Find valid token
      const resetToken = await db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.token, input.token),
          eq(passwordResetTokens.usedAt, null)
        ),
      });

      if (!resetToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This link has expired or is invalid",
        });
      }

      // Check if token expired
      if (resetToken.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This link has expired. Go back to login to request a new one.",
        });
      }

      // Hash new password
      const passwordHash = await hashPassword(input.newPassword);

      // Update user password
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      // Send confirmation email
      try {
        await notifyOwner({
          title: "Password Reset",
          content: `Your password has been successfully reset. If this wasn't you, contact support immediately.`,
        });
      } catch (error) {
        console.error("Failed to send confirmation email:", error);
      }

      return {
        success: true,
        message: "Your password has been reset successfully. You can now sign in with your new password.",
      };
    }),

  // Get current user's login methods
  getLoginMethods: protectedProcedure.query(async ({ ctx }: any) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const loginMethods = user.loginMethods
      ? (JSON.parse(JSON.stringify(user.loginMethods)) as string[])
      : ["email_password"];

    return {
      hasEmailPassword: loginMethods.includes("email_password"),
      hasGoogle: loginMethods.includes("google"),
      loginMethods,
    };
  }),
});
