import { router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql, count } from "drizzle-orm";

export const adminRouter = router({
  // Coupon Management
  getCoupons: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { coupons } = await import("../drizzle/schema");
    const result = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return result.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue ? parseFloat(c.discountValue) : 0,
      maxUsageCount: c.maxUsageCount,
      usageCount: c.usageCount,
      expiryDate: c.expiryDate,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }),

  createCoupon: adminProcedure
    .input(
      z.object({
        code: z.string().min(3).max(50),
        discountType: z.enum(["percentage", "fixed"]),
        discountValue: z.number().min(1),
        maxUsageCount: z.number().min(1).nullable(),
        expiryDate: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { coupons } = await import("../drizzle/schema");
      await db.insert(coupons).values({
        code: input.code.toUpperCase(),
        discountType: input.discountType,
        discountValue: input.discountValue.toString(),
        maxUsageCount: input.maxUsageCount,
        expiryDate: input.expiryDate ? input.expiryDate : undefined,
        isActive: true,
      } as any);
      return { success: true };
    }),

  deleteCoupon: adminProcedure
    .input(z.number())
    .mutation(async ({ input: couponId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { coupons } = await import("../drizzle/schema");
      await db.update(coupons).set({ isActive: false }).where(eq(coupons.id, couponId));
      return { success: true };
    }),

  // User Management
  getUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { users, profiles } = await import("../drizzle/schema");

      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          subscriptionStatus: profiles.subscriptionStatus,
          subscriptionPlan: profiles.subscriptionPlan,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const totalResult = await db.select({ total: count() }).from(users);
      const total = totalResult[0]?.total || 0;

      return { users: userList, total };
    }),

  promoteToAdmin: adminProcedure
    .input(z.number())
    .mutation(async ({ input: userId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { users } = await import("../drizzle/schema");
      await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
      return { success: true };
    }),

  demoteFromAdmin: adminProcedure
    .input(z.number())
    .mutation(async ({ input: userId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { users } = await import("../drizzle/schema");
      await db.update(users).set({ role: "user" }).where(eq(users.id, userId));
      return { success: true };
    }),

  assignFreeTrial: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        days: z.number().default(7),
        examId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { freeTrials, profiles } = await import("../drizzle/schema");
      const now = new Date();
      const trialEnd = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);

      await db.insert(freeTrials).values({
        userId: input.userId,
        examId: input.examId || 1,
        assignedBy: ctx.user.id,
        trialStart: now,
        trialEnd: trialEnd,
        used: false,
      });

      // Also update profile subscription status
      await db.update(profiles).set({
        subscriptionStatus: "trialing",
        trialEndsAt: trialEnd,
      }).where(eq(profiles.userId, input.userId));

      return { success: true, trialEnd };
    }),

  // Question Management
  getQuestions: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        examId: z.number().optional(),
        specialty: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { questions } = await import("../drizzle/schema");

      let query = db.select().from(questions).orderBy(desc(questions.createdAt)).limit(input.limit).offset(input.offset);

      const result = await query;
      const totalResult = await db.select({ total: count() }).from(questions);
      const total = totalResult[0]?.total || 0;

      return { questions: result, total };
    }),

  createQuestion: adminProcedure
    .input(
      z.object({
        examId: z.number(),
        domain: z.string().optional(),
        specialty: z.string(),
        subSpecialty: z.string().optional(),
        difficulty: z.enum(["Easy", "Medium", "Hard"]),
        question: z.string().min(10),
        optionA: z.string(),
        optionB: z.string(),
        optionC: z.string(),
        optionD: z.string(),
        optionE: z.string().optional(),
        correctAnswer: z.string(),
        explanationCorrect: z.string().optional(),
        explanationA: z.string().optional(),
        explanationB: z.string().optional(),
        explanationC: z.string().optional(),
        explanationD: z.string().optional(),
        explanationE: z.string().optional(),
        reference: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { questions } = await import("../drizzle/schema");
      await db.insert(questions).values({
        ...input,
        tags: input.tags || [],
        status: "active",
      });
      return { success: true };
    }),

  updateQuestion: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          question: z.string().optional(),
          optionA: z.string().optional(),
          optionB: z.string().optional(),
          optionC: z.string().optional(),
          optionD: z.string().optional(),
          optionE: z.string().optional(),
          correctAnswer: z.string().optional(),
          explanationCorrect: z.string().optional(),
          difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
          specialty: z.string().optional(),
          status: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { questions } = await import("../drizzle/schema");
      await db.update(questions).set(input.data).where(eq(questions.id, input.id));
      return { success: true };
    }),

  deleteQuestion: adminProcedure
    .input(z.number())
    .mutation(async ({ input: questionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { questions } = await import("../drizzle/schema");
      await db.update(questions).set({ status: "archived" }).where(eq(questions.id, questionId));
      return { success: true };
    }),

  // Analytics
  getAnalytics: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const { users, profiles, questions, userAttempts, mockResults } = await import("../drizzle/schema");

    const [totalUsers] = await db.select({ total: count() }).from(users);
    const [totalQuestions] = await db.select({ total: count() }).from(questions);
    const [totalAttempts] = await db.select({ total: count() }).from(userAttempts);
    const [totalMocks] = await db.select({ total: count() }).from(mockResults);

    // Active subscribers
    const [activeSubscribers] = await db
      .select({ total: count() })
      .from(profiles)
      .where(eq(profiles.subscriptionStatus, "active"));

    return {
      totalUsers: totalUsers?.total || 0,
      totalQuestions: totalQuestions?.total || 0,
      totalAttempts: totalAttempts?.total || 0,
      totalMocksCompleted: totalMocks?.total || 0,
      activeSubscribers: activeSubscribers?.total || 0,
    };
  }),
});
