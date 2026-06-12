import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import * as OTPAuth from "otpauth";
import * as QRCode from "qrcode";

export const twoFactorRouter = router({
  // Get 2FA status for current user
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const { twoFactorAuth } = await import("../drizzle/schema");
    const [record] = await db
      .select()
      .from(twoFactorAuth)
      .where(eq(twoFactorAuth.userId, ctx.user.id))
      .limit(1);

    return {
      isEnabled: record?.isEnabled ?? false,
      hasSetup: !!record,
    };
  }),

  // Generate a new TOTP secret and QR code for setup
  setup: protectedProcedure.mutation(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const { twoFactorAuth } = await import("../drizzle/schema");

    // Check if already enabled
    const [existing] = await db
      .select()
      .from(twoFactorAuth)
      .where(eq(twoFactorAuth.userId, ctx.user.id))
      .limit(1);

    if (existing?.isEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "2FA is already enabled. Disable it first to reconfigure.",
      });
    }

    // Generate a new TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: "Question Grove 360",
      label: ctx.user.email || ctx.user.name || "User",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });

    const secret = totp.secret.base32;
    const otpauthUrl = totp.toString();

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    // Save or update the record (not yet enabled)
    if (existing) {
      await db
        .update(twoFactorAuth)
        .set({ secret, backupCodes: backupCodes as any })
        .where(eq(twoFactorAuth.userId, ctx.user.id));
    } else {
      await db.insert(twoFactorAuth).values({
        userId: ctx.user.id,
        secret,
        isEnabled: false,
        backupCodes: JSON.stringify(backupCodes),
      } as any);
    }

    return {
      secret,
      qrCodeDataUrl,
      otpauthUrl,
      backupCodes,
    };
  }),

  // Verify a TOTP code and enable 2FA
  verify: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { twoFactorAuth } = await import("../drizzle/schema");
      const [record] = await db
        .select()
        .from(twoFactorAuth)
        .where(eq(twoFactorAuth.userId, ctx.user.id))
        .limit(1);

      if (!record) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA has not been set up. Please run setup first.",
        });
      }

      // Verify the code
      const totp = new OTPAuth.TOTP({
        issuer: "Question Grove 360",
        label: ctx.user.email || ctx.user.name || "User",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(record.secret),
      });

      const delta = totp.validate({ token: input.code, window: 1 });

      if (delta === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code. Please try again.",
        });
      }

      // Enable 2FA
      await db
        .update(twoFactorAuth)
        .set({ isEnabled: true })
        .where(eq(twoFactorAuth.userId, ctx.user.id));

      return { success: true, message: "Two-factor authentication enabled successfully." };
    }),

  // Disable 2FA
  disable: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { twoFactorAuth } = await import("../drizzle/schema");
      const [record] = await db
        .select()
        .from(twoFactorAuth)
        .where(eq(twoFactorAuth.userId, ctx.user.id))
        .limit(1);

      if (!record || !record.isEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA is not currently enabled.",
        });
      }

      // Verify the code before disabling
      const totp = new OTPAuth.TOTP({
        issuer: "Question Grove 360",
        label: ctx.user.email || ctx.user.name || "User",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(record.secret),
      });

      const delta = totp.validate({ token: input.code, window: 1 });

      // Also check backup codes
      let backupCodes: string[] = [];
      try {
        backupCodes = record.backupCodes
          ? (typeof record.backupCodes === "string"
              ? JSON.parse(record.backupCodes)
              : record.backupCodes)
          : [];
      } catch {
        backupCodes = [];
      }

      const isBackupCode = backupCodes.includes(input.code.toUpperCase());

      if (delta === null && !isBackupCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid code. Please enter a valid TOTP code or backup code.",
        });
      }

      // If backup code was used, remove it from the list
      if (isBackupCode) {
        const updatedCodes = backupCodes.filter(
          (c) => c !== input.code.toUpperCase()
        );
        await db
          .update(twoFactorAuth)
          .set({ isEnabled: false, backupCodes: updatedCodes as any })
          .where(eq(twoFactorAuth.userId, ctx.user.id));
      } else {
        await db
          .update(twoFactorAuth)
          .set({ isEnabled: false })
          .where(eq(twoFactorAuth.userId, ctx.user.id));
      }

      return { success: true, message: "Two-factor authentication disabled." };
    }),
});
