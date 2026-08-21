import { router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql, count, like, or } from "drizzle-orm";

export const adminRouter = router({
  // ─── ANALYTICS ──────────────────────────────────────────────────────────────
  getAnalytics: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const { users, questions, userAttempts, mockResults, subscriptions, plab1Questions, flashcards, scaCases } = await import("../drizzle/schema");

    const [totalUsers] = await db.select({ total: count() }).from(users);
    const [totalQuestions] = await db.select({ total: count() }).from(questions);
    const [totalPlab1] = await db.select({ total: count() }).from(plab1Questions);
    const [totalFlashcards] = await db.select({ total: count() }).from(flashcards);
    const [totalScaCases] = await db.select({ total: count() }).from(scaCases);
    const [totalAttempts] = await db.select({ total: count() }).from(userAttempts);
    const [totalMocks] = await db.select({ total: count() }).from(mockResults);
    const [activeSubscribers] = await db
      .select({ total: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    return {
      totalUsers: totalUsers?.total || 0,
      totalQuestions: totalQuestions?.total || 0,
      totalPlab1Questions: totalPlab1?.total || 0,
      totalFlashcards: totalFlashcards?.total || 0,
      totalScaCases: totalScaCases?.total || 0,
      totalAttempts: totalAttempts?.total || 0,
      totalMocksCompleted: totalMocks?.total || 0,
      activeSubscribers: activeSubscribers?.total || 0,
    };
  }),

  // ─── USER MANAGEMENT ────────────────────────────────────────────────────────
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

      let baseQuery = db
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

      const userList = await baseQuery;
      const totalResult = await db.select({ total: count() }).from(users);
      const total = totalResult[0]?.total || 0;

      return { users: userList, total };
    }),

  updateUser: adminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        role: z.enum(["user", "admin"]).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users } = await import("../drizzle/schema");
      await db.update(users).set(input.data).where(eq(users.id, input.id));
      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(z.number())
    .mutation(async ({ input: userId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users } = await import("../drizzle/schema");
      // Soft delete by setting role to a disabled state - or just delete
      await db.delete(users).where(eq(users.id, userId));
      return { success: true };
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
    .input(z.object({ userId: z.number(), days: z.number().max(3).default(3), examId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { freeTrials, profiles } = await import("../drizzle/schema");
      const now = new Date();
      const trialEnd = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);
      await db.insert(freeTrials).values({ userId: input.userId, examId: input.examId || 1, assignedBy: ctx.user.id, trialStart: now, trialEnd, used: false });
      await db.update(profiles).set({ subscriptionStatus: "trialing", trialEndsAt: trialEnd }).where(eq(profiles.userId, input.userId));
      return { success: true, trialEnd };
    }),

  // ─── AKT QUESTION MANAGEMENT ────────────────────────────────────────────────
  getQuestions: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), specialty: z.string().optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { questions } = await import("../drizzle/schema");
      let query = db.select().from(questions).orderBy(desc(questions.createdAt)).limit(input.limit).offset(input.offset);
      const result = await query;
      const totalResult = await db.select({ total: count() }).from(questions);
      return { questions: result, total: totalResult[0]?.total || 0 };
    }),

  createQuestion: adminProcedure
    .input(z.object({
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
      topic: z.string().optional(),
      imageUrl: z.string().optional(),
      imageCaption: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { questions } = await import("../drizzle/schema");
      await db.insert(questions).values({ ...input, tags: input.tags || [], status: "active" });
      return { success: true };
    }),

  updateQuestion: adminProcedure
    .input(z.object({
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
        topic: z.string().optional(),
        imageUrl: z.string().optional(),
        imageCaption: z.string().optional(),
        status: z.string().optional(),
      }),
    }))
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

  // ─── PLAB1 QUESTION MANAGEMENT ──────────────────────────────────────────────
  getPlab1Questions: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), specialty: z.string().optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { plab1Questions } = await import("../drizzle/schema");
      const result = await db.select().from(plab1Questions).orderBy(desc(plab1Questions.createdAt)).limit(input.limit).offset(input.offset);
      const totalResult = await db.select({ total: count() }).from(plab1Questions);
      return { questions: result, total: totalResult[0]?.total || 0 };
    }),

  createPlab1Question: adminProcedure
    .input(z.object({
      specialty: z.string(),
      topic: z.string(),
      subTopic: z.string().optional(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
      questionType: z.enum(["SBA", "EMQ"]).default("SBA"),
      ukmlaCategoryId: z.string().optional(),
      question: z.string().min(10),
      optionA: z.string(),
      optionB: z.string(),
      optionC: z.string(),
      optionD: z.string(),
      optionE: z.string(),
      correctAnswer: z.string(),
      explanationCorrect: z.string().optional(),
      explanationA: z.string().optional(),
      explanationB: z.string().optional(),
      explanationC: z.string().optional(),
      explanationD: z.string().optional(),
      explanationE: z.string().optional(),
      reference: z.string().optional(),
      imageUrl: z.string().optional(),
      imageCaption: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { plab1Questions } = await import("../drizzle/schema");
      await db.insert(plab1Questions).values({ ...input, examId: 60001, status: "active" });
      return { success: true };
    }),

  updatePlab1Question: adminProcedure
    .input(z.object({
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
        topic: z.string().optional(),
        imageUrl: z.string().optional(),
        imageCaption: z.string().optional(),
        status: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { plab1Questions } = await import("../drizzle/schema");
      await db.update(plab1Questions).set(input.data).where(eq(plab1Questions.id, input.id));
      return { success: true };
    }),

  deletePlab1Question: adminProcedure
    .input(z.number())
    .mutation(async ({ input: questionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { plab1Questions } = await import("../drizzle/schema");
      await db.update(plab1Questions).set({ status: "archived" }).where(eq(plab1Questions.id, questionId));
      return { success: true };
    }),

  // ─── MSRA CPS QUESTION MANAGEMENT ──────────────────────────────────────────
  getMsraQuestions: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), specialty: z.string().optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { msraCpsQuestions } = await import("../drizzle/schema");
      const result = await db.select().from(msraCpsQuestions).orderBy(desc(msraCpsQuestions.createdAt)).limit(input.limit).offset(input.offset);
      const totalResult = await db.select({ total: count() }).from(msraCpsQuestions);
      return { questions: result, total: totalResult[0]?.total || 0 };
    }),

  createMsraQuestion: adminProcedure
    .input(z.object({
      questionType: z.enum(["SBA", "EMQ"]).default("SBA"),
      specialty: z.string(),
      topic: z.string().optional(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
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
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { msraCpsQuestions } = await import("../drizzle/schema");
      await db.insert(msraCpsQuestions).values({ ...input, status: "active" });
      return { success: true };
    }),

  updateMsraQuestion: adminProcedure
    .input(z.object({
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
        topic: z.string().optional(),
        imageUrl: z.string().optional(),
        status: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { msraCpsQuestions } = await import("../drizzle/schema");
      await db.update(msraCpsQuestions).set(input.data).where(eq(msraCpsQuestions.id, input.id));
      return { success: true };
    }),

  deleteMsraQuestion: adminProcedure
    .input(z.number())
    .mutation(async ({ input: questionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { msraCpsQuestions } = await import("../drizzle/schema");
      await db.update(msraCpsQuestions).set({ status: "archived" }).where(eq(msraCpsQuestions.id, questionId));
      return { success: true };
    }),

  // ─── MSRA PD QUESTION MANAGEMENT ──────────────────────────────────────────
  getMsraPdQuestions: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), domain: z.string().optional(), questionType: z.enum(["RANKING", "PICK3"]).optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { msraPdQuestions } = await import("../drizzle/schema");
      const conditions: any[] = [];
      if (input.domain) conditions.push(eq(msraPdQuestions.domain, input.domain));
      if (input.questionType) conditions.push(eq(msraPdQuestions.questionType, input.questionType));
      const { and: andOp } = await import("drizzle-orm");
      const whereClause = conditions.length > 0 ? andOp(...conditions) : undefined;
      const result = await db.select().from(msraPdQuestions).where(whereClause).orderBy(desc(msraPdQuestions.createdAt)).limit(input.limit).offset(input.offset);
      const totalResult = await db.select({ total: count() }).from(msraPdQuestions).where(whereClause);
      return { questions: result, total: totalResult[0]?.total || 0 };
    }),

  createMsraPdQuestion: adminProcedure
    .input(z.object({
      questionType: z.enum(["RANKING", "PICK3"]),
      domain: z.string().min(1),
      scenario: z.string().min(10),
      actionA: z.string().nullable().optional(),
      actionB: z.string().nullable().optional(),
      actionC: z.string().nullable().optional(),
      actionD: z.string().nullable().optional(),
      actionE: z.string().nullable().optional(),
      correctRanking: z.array(z.string()).nullable().optional(),
      explanationRanking: z.string().nullable().optional(),
      optionA: z.string().nullable().optional(),
      optionB: z.string().nullable().optional(),
      optionC: z.string().nullable().optional(),
      optionD: z.string().nullable().optional(),
      optionE: z.string().nullable().optional(),
      correctOptions: z.array(z.string()).nullable().optional(),
      explanationOptions: z.string().nullable().optional(),
      reference: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { msraPdQuestions } = await import("../drizzle/schema");
      await db.insert(msraPdQuestions).values({ ...input, status: "active" });
      return { success: true };
    }),

  updateMsraPdQuestion: adminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        questionType: z.enum(["RANKING", "PICK3"]).optional(),
        domain: z.string().optional(),
        scenario: z.string().optional(),
        actionA: z.string().nullable().optional(),
        actionB: z.string().nullable().optional(),
        actionC: z.string().nullable().optional(),
        actionD: z.string().nullable().optional(),
        actionE: z.string().nullable().optional(),
        correctRanking: z.array(z.string()).nullable().optional(),
        explanationRanking: z.string().nullable().optional(),
        optionA: z.string().nullable().optional(),
        optionB: z.string().nullable().optional(),
        optionC: z.string().nullable().optional(),
        optionD: z.string().nullable().optional(),
        optionE: z.string().nullable().optional(),
        correctOptions: z.array(z.string()).nullable().optional(),
        explanationOptions: z.string().nullable().optional(),
        reference: z.string().nullable().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { msraPdQuestions } = await import("../drizzle/schema");
      await db.update(msraPdQuestions).set(input.data).where(eq(msraPdQuestions.id, input.id));
      return { success: true };
    }),

  deleteMsraPdQuestion: adminProcedure
    .input(z.number())
    .mutation(async ({ input: questionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { msraPdQuestions } = await import("../drizzle/schema");
      await db.update(msraPdQuestions).set({ status: "archived" }).where(eq(msraPdQuestions.id, questionId));
      return { success: true };
    }),

  // ─── JAMB QUESTION MANAGEMENT ──────────────────────────────────────────────
  getJambQuestions: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), subject: z.string().optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { jambQuestions } = await import("../drizzle/schema");
      const result = await db.select().from(jambQuestions).orderBy(desc(jambQuestions.createdAt)).limit(input.limit).offset(input.offset);
      const totalResult = await db.select({ total: count() }).from(jambQuestions);
      return { questions: result, total: totalResult[0]?.total || 0 };
    }),

  createJambQuestion: adminProcedure
    .input(z.object({
      questionText: z.string().min(10),
      optionA: z.string(),
      optionB: z.string(),
      optionC: z.string(),
      optionD: z.string(),
      correctAnswer: z.string(),
      explanation: z.string().optional(),
      subject: z.string(),
      topic: z.string().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { jambQuestions } = await import("../drizzle/schema");
      await db.insert(jambQuestions).values({ ...input, country: "Nigeria", region: "West Africa" });
      return { success: true };
    }),

  updateJambQuestion: adminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        questionText: z.string().optional(),
        optionA: z.string().optional(),
        optionB: z.string().optional(),
        optionC: z.string().optional(),
        optionD: z.string().optional(),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
        subject: z.string().optional(),
        topic: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { jambQuestions } = await import("../drizzle/schema");
      await db.update(jambQuestions).set(input.data).where(eq(jambQuestions.id, input.id));
      return { success: true };
    }),

  deleteJambQuestion: adminProcedure
    .input(z.number())
    .mutation(async ({ input: questionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { jambQuestions } = await import("../drizzle/schema");
      await db.delete(jambQuestions).where(eq(jambQuestions.id, questionId));
      return { success: true };
    }),

  // ─── FLASHCARD MANAGEMENT ──────────────────────────────────────────────────
  getFlashcardsAdmin: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), specialty: z.string().optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { flashcards } = await import("../drizzle/schema");
      const result = await db.select().from(flashcards).orderBy(desc(flashcards.createdAt)).limit(input.limit).offset(input.offset);
      const totalResult = await db.select({ total: count() }).from(flashcards);
      return { flashcards: result, total: totalResult[0]?.total || 0 };
    }),

  createFlashcard: adminProcedure
    .input(z.object({
      examId: z.number().default(30001),
      category: z.string().optional(),
      front: z.string().min(3),
      back: z.string().min(3),
      specialty: z.string().optional(),
      explanation: z.string().optional(),
      difficulty: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { flashcards } = await import("../drizzle/schema");
      await db.insert(flashcards).values({ ...input, status: "active" });
      return { success: true };
    }),

  updateFlashcard: adminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        front: z.string().optional(),
        back: z.string().optional(),
        category: z.string().optional(),
        specialty: z.string().optional(),
        explanation: z.string().optional(),
        difficulty: z.string().optional(),
        status: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { flashcards } = await import("../drizzle/schema");
      await db.update(flashcards).set(input.data).where(eq(flashcards.id, input.id));
      return { success: true };
    }),

  deleteFlashcard: adminProcedure
    .input(z.number())
    .mutation(async ({ input: flashcardId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { flashcards } = await import("../drizzle/schema");
      await db.update(flashcards).set({ status: "archived" }).where(eq(flashcards.id, flashcardId));
      return { success: true };
    }),

  // ─── SCA CASE MANAGEMENT ──────────────────────────────────────────────────
  getScaCases: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { scaCases } = await import("../drizzle/schema");
      const result = await db.select().from(scaCases).orderBy(desc(scaCases.createdAt)).limit(input.limit).offset(input.offset);
      const totalResult = await db.select({ total: count() }).from(scaCases);
      return { cases: result, total: totalResult[0]?.total || 0 };
    }),

  createScaCase: adminProcedure
    .input(z.object({
      title: z.string().min(3),
      category: z.string().optional(),
      difficulty: z.string().optional(),
      patientName: z.string().optional(),
      patientAge: z.number().optional(),
      patientGender: z.string().optional(),
      presentingComplaint: z.string().optional(),
      backgroundContext: z.string().optional(),
      aiPatientPersona: z.string().optional(),
      examinationFindings: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { scaCases } = await import("../drizzle/schema");
      await db.insert(scaCases).values({ ...input, isActive: true });
      return { success: true };
    }),

  updateScaCase: adminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        title: z.string().optional(),
        category: z.string().optional(),
        difficulty: z.string().optional(),
        patientName: z.string().optional(),
        patientAge: z.number().optional(),
        patientGender: z.string().optional(),
        presentingComplaint: z.string().optional(),
        backgroundContext: z.string().optional(),
        aiPatientPersona: z.string().optional(),
        examinationFindings: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { scaCases } = await import("../drizzle/schema");
      await db.update(scaCases).set(input.data).where(eq(scaCases.id, input.id));
      return { success: true };
    }),

  deleteScaCase: adminProcedure
    .input(z.number())
    .mutation(async ({ input: caseId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { scaCases } = await import("../drizzle/schema");
      await db.update(scaCases).set({ isActive: false }).where(eq(scaCases.id, caseId));
      return { success: true };
    }),

  // ─── BULK UPLOAD ──────────────────────────────────────────────────────────
  bulkUpload: adminProcedure
    .input(z.object({
      contentType: z.enum(["akt", "plab1", "msra", "msra_pd", "jamb", "flashcards", "sca"]),
      rows: z.array(z.record(z.string(), z.any())),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let inserted = 0;
      let errors: { row: number; error: string }[] = [];

      if (input.contentType === "akt") {
        const { questions } = await import("../drizzle/schema");
        const insertedIds: number[] = [];
        for (let i = 0; i < input.rows.length; i++) {
          try {
            const r = input.rows[i];
            const result = await db.insert(questions).values({
              examId: 30001,
              specialty: r.specialty || "",
              question: r.question || r.stem || "",
              optionA: r.optionA || r.option_a || "",
              optionB: r.optionB || r.option_b || "",
              optionC: r.optionC || r.option_c || "",
              optionD: r.optionD || r.option_d || "",
              optionE: r.optionE || r.option_e || "",
              correctAnswer: r.correctAnswer || r.correct_answer || "",
              explanationCorrect: r.explanationCorrect || r.explanation || null,
              difficulty: r.difficulty || "Medium",
              topic: r.topic || null,
              imageUrl: r.imageUrl || null,
              status: "active",
            });
            if ((result as any)[0]?.insertId) insertedIds.push((result as any)[0].insertId);
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message?.slice(0, 100) || "Unknown error" });
          }
        }

        // ─── POST-IMPORT VALIDATION: flag answer-explanation mismatches ───
        if (insertedIds.length > 0) {
          try {
            const flagged = await db.execute(sql`
              UPDATE questions SET reviewFlag = 'answer_mismatch'
              WHERE id IN (${sql.raw(insertedIds.join(","))})
              AND reviewFlag IS NULL
              AND (CASE
                WHEN explanationCorrect LIKE '%Option A%' OR explanationCorrect LIKE '% A)%' OR explanationCorrect LIKE '% A.%' OR explanationCorrect LIKE '%answer is A%' THEN 'A'
                WHEN explanationCorrect LIKE '%Option B%' OR explanationCorrect LIKE '% B)%' OR explanationCorrect LIKE '% B.%' OR explanationCorrect LIKE '%answer is B%' THEN 'B'
                WHEN explanationCorrect LIKE '%Option C%' OR explanationCorrect LIKE '% C)%' OR explanationCorrect LIKE '% C.%' OR explanationCorrect LIKE '%answer is C%' THEN 'C'
                WHEN explanationCorrect LIKE '%Option D%' OR explanationCorrect LIKE '% D)%' OR explanationCorrect LIKE '% D.%' OR explanationCorrect LIKE '%answer is D%' THEN 'D'
                WHEN explanationCorrect LIKE '%Option E%' OR explanationCorrect LIKE '% E)%' OR explanationCorrect LIKE '% E.%' OR explanationCorrect LIKE '%answer is E%' THEN 'E'
                ELSE NULL END) IS NOT NULL
              AND (CASE
                WHEN explanationCorrect LIKE '%Option A%' OR explanationCorrect LIKE '% A)%' OR explanationCorrect LIKE '% A.%' OR explanationCorrect LIKE '%answer is A%' THEN 'A'
                WHEN explanationCorrect LIKE '%Option B%' OR explanationCorrect LIKE '% B)%' OR explanationCorrect LIKE '% B.%' OR explanationCorrect LIKE '%answer is B%' THEN 'B'
                WHEN explanationCorrect LIKE '%Option C%' OR explanationCorrect LIKE '% C)%' OR explanationCorrect LIKE '% C.%' OR explanationCorrect LIKE '%answer is C%' THEN 'C'
                WHEN explanationCorrect LIKE '%Option D%' OR explanationCorrect LIKE '% D)%' OR explanationCorrect LIKE '% D.%' OR explanationCorrect LIKE '%answer is D%' THEN 'D'
                WHEN explanationCorrect LIKE '%Option E%' OR explanationCorrect LIKE '% E)%' OR explanationCorrect LIKE '% E.%' OR explanationCorrect LIKE '%answer is E%' THEN 'E'
                ELSE NULL END) != correctAnswer
            `);
            const flaggedCount = (flagged as any)[0]?.affectedRows || 0;
            if (flaggedCount > 0) {
              errors.push({ row: 0, error: `⚠️ Post-import validation: ${flaggedCount} question(s) auto-flagged for answer-explanation mismatch. Check the "Needs Review" filter.` });
            }
          } catch (validationErr) {
            console.warn("[BulkUpload] Post-import validation error:", validationErr);
          }
        }
      } else if (input.contentType === "plab1") {
        const { plab1Questions } = await import("../drizzle/schema");
        for (let i = 0; i < input.rows.length; i++) {
          try {
            const r = input.rows[i];
            await db.insert(plab1Questions).values({
              examId: 60001,
              specialty: r.specialty || "",
              topic: r.topic || "",
              subTopic: r.subTopic || null,
              difficulty: r.difficulty || "Medium",
              questionType: r.questionType || "SBA",
              question: r.question || r.stem || "",
              optionA: r.optionA || r.option_a || "",
              optionB: r.optionB || r.option_b || "",
              optionC: r.optionC || r.option_c || "",
              optionD: r.optionD || r.option_d || "",
              optionE: r.optionE || r.option_e || "",
              correctAnswer: r.correctAnswer || r.correct_answer || "",
              explanationCorrect: r.explanationCorrect || r.explanation || null,
              reference: r.reference || null,
              imageUrl: r.imageUrl || null,
              status: "active",
            });
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message?.slice(0, 100) || "Unknown error" });
          }
        }
      } else if (input.contentType === "msra") {
        const { msraCpsQuestions } = await import("../drizzle/schema");
        for (let i = 0; i < input.rows.length; i++) {
          try {
            const r = input.rows[i];
            await db.insert(msraCpsQuestions).values({
              questionType: r.questionType || "SBA",
              specialty: r.specialty || "",
              topic: r.topic || null,
              difficulty: r.difficulty || "Medium",
              question: r.question || r.stem || "",
              optionA: r.optionA || r.option_a || "",
              optionB: r.optionB || r.option_b || "",
              optionC: r.optionC || r.option_c || "",
              optionD: r.optionD || r.option_d || "",
              optionE: r.optionE || r.option_e || "",
              correctAnswer: r.correctAnswer || r.correct_answer || "",
              explanationCorrect: r.explanationCorrect || r.explanation || null,
              reference: r.reference || null,
              imageUrl: r.imageUrl || null,
              status: "active",
            });
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message?.slice(0, 100) || "Unknown error" });
        }
      }
    } else if (input.contentType === "msra_pd") {
        const { msraPdQuestions } = await import("../drizzle/schema");
        for (let i = 0; i < input.rows.length; i++) {
          try {
            const r = input.rows[i];
            const qType = (r.questionType || r.question_type || "RANKING").toUpperCase();
            await db.insert(msraPdQuestions).values({
              questionType: qType === "PICK3" ? "PICK3" : "RANKING",
              domain: r.domain || r.topic || "",
              scenario: r.scenario || "",
              actionA: qType === "RANKING" ? (r.actionA || r.action_a || null) : null,
              actionB: qType === "RANKING" ? (r.actionB || r.action_b || null) : null,
              actionC: qType === "RANKING" ? (r.actionC || r.action_c || null) : null,
              actionD: qType === "RANKING" ? (r.actionD || r.action_d || null) : null,
              actionE: qType === "RANKING" ? (r.actionE || r.action_e || null) : null,
              correctRanking: qType === "RANKING" ? (r.correctRanking || r.correct_ranking || null) : null,
              explanationRanking: qType === "RANKING" ? (r.explanationRanking || r.explanation_ranking || r.explanation || null) : null,
              optionA: qType === "PICK3" ? (r.optionA || r.option_a || null) : null,
              optionB: qType === "PICK3" ? (r.optionB || r.option_b || null) : null,
              optionC: qType === "PICK3" ? (r.optionC || r.option_c || null) : null,
              optionD: qType === "PICK3" ? (r.optionD || r.option_d || null) : null,
              optionE: qType === "PICK3" ? (r.optionE || r.option_e || null) : null,
              correctOptions: qType === "PICK3" ? (r.correctOptions || r.correct_options || null) : null,
              explanationOptions: qType === "PICK3" ? (r.explanationOptions || r.explanation_options || r.explanation || null) : null,
              reference: r.reference || null,
              status: "active",
            });
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message?.slice(0, 100) || "Unknown error" });
          }
        }
      } else if (input.contentType === "jamb") {
        const { jambQuestions } = await import("../drizzle/schema");
        for (let i = 0; i < input.rows.length; i++) {
          try {
            const r = input.rows[i];
            await db.insert(jambQuestions).values({
              questionText: r.questionText || r.question_text || r.question || "",
              optionA: r.optionA || r.option_a || "",
              optionB: r.optionB || r.option_b || "",
              optionC: r.optionC || r.option_c || "",
              optionD: r.optionD || r.option_d || "",
              correctAnswer: r.correctAnswer || r.correct_answer || "",
              explanation: r.explanation || null,
              subject: r.subject || "",
              topic: r.topic || null,
              imageUrl: r.imageUrl || null,
              country: "Nigeria",
              region: "West Africa",
            });
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message?.slice(0, 100) || "Unknown error" });
          }
        }
      } else if (input.contentType === "flashcards") {
        const { flashcards } = await import("../drizzle/schema");
        for (let i = 0; i < input.rows.length; i++) {
          try {
            const r = input.rows[i];
            await db.insert(flashcards).values({
              examId: parseInt(r.examId) || 30001,
              front: r.front || "",
              back: r.back || "",
              category: r.category || null,
              specialty: r.specialty || null,
              explanation: r.explanation || null,
              difficulty: r.difficulty || "Medium",
              status: "active",
            });
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message?.slice(0, 100) || "Unknown error" });
          }
        }
      } else if (input.contentType === "sca") {
        const { scaCases } = await import("../drizzle/schema");
        for (let i = 0; i < input.rows.length; i++) {
          try {
            const r = input.rows[i];
            await db.insert(scaCases).values({
              title: r.title || "",
              category: r.category || null,
              difficulty: r.difficulty || null,
              patientName: r.patientName || null,
              patientAge: r.patientAge ? parseInt(r.patientAge) : null,
              patientGender: r.patientGender || null,
              presentingComplaint: r.presentingComplaint || null,
              backgroundContext: r.backgroundContext || null,
              aiPatientPersona: r.aiPatientPersona || null,
              examinationFindings: r.examinationFindings || null,
              isActive: true,
            });
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message?.slice(0, 100) || "Unknown error" });
          }
        }
      }

      return { inserted, errors, total: input.rows.length };
    }),

  // ─── IMAGE UPLOAD ──────────────────────────────────────────────────────────
  uploadQuestionImage: adminProcedure
    .input(z.object({
      imageData: z.string(), // base64
      imageMimeType: z.string().default("image/jpeg"),
      filename: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.imageData, "base64");
      const ext = input.imageMimeType.split("/")[1] || "jpg";
      const name = input.filename || `question-img-${Date.now()}`;
      const fileKey = `question-images/${name}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.imageMimeType);
      return { success: true, imageUrl: url };
    }),

  // ─── COUPON MANAGEMENT ──────────────────────────────────────────────────────
  getCoupons: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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
    .input(z.object({
      code: z.string().min(3).max(50),
      discountType: z.enum(["percentage", "fixed"]),
      discountValue: z.number().min(1),
      maxUsageCount: z.number().min(1).nullable(),
      expiryDate: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();
      const maxExpiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      let expiryDate = input.expiryDate;
      if (expiryDate) {
        const requested = new Date(expiryDate);
        if (requested > maxExpiry) expiryDate = maxExpiry.toISOString().split("T")[0];
      } else {
        expiryDate = maxExpiry.toISOString().split("T")[0];
      }
      const { coupons } = await import("../drizzle/schema");
      await db.insert(coupons).values({ code: input.code.toUpperCase(), discountType: input.discountType, discountValue: input.discountValue.toString(), maxUsageCount: input.maxUsageCount, expiryDate, isActive: true } as any);
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

  // ─── PICTURE360 IMAGE MANAGEMENT ──────────────────────────────────────────
  getPicture360Images: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0), specialty: z.string().optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sql: sqlFn } = await import("drizzle-orm");
      let query = `SELECT * FROM picture360_images ORDER BY createdAt DESC LIMIT ${input.limit} OFFSET ${input.offset}`;
      if (input.specialty) {
        query = `SELECT * FROM picture360_images WHERE specialty = '${input.specialty}' ORDER BY createdAt DESC LIMIT ${input.limit} OFFSET ${input.offset}`;
      }
      const result = await db.execute(sqlFn.raw(query));
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      const countQuery = input.specialty
        ? `SELECT COUNT(*) as total FROM picture360_images WHERE specialty = '${input.specialty}'`
        : `SELECT COUNT(*) as total FROM picture360_images`;
      const countResult = await db.execute(sqlFn.raw(countQuery));
      const countRows = Array.isArray(countResult) && Array.isArray(countResult[0]) ? countResult[0] : countResult;
      const total = (countRows as any[])[0]?.total || 0;
      return { images: rows, total };
    }),

  uploadPicture360Image: adminProcedure
    .input(z.object({
      specialty: z.string(),
      title: z.string().min(3),
      description: z.string().optional(),
      diagnosis: z.string().min(3),
      explanation: z.string().optional(),
      imageData: z.string(),
      imageMimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { storagePut } = await import("./storage");
      const { sql: sqlFn } = await import("drizzle-orm");
      const buffer = Buffer.from(input.imageData, "base64");
      const ext = input.imageMimeType.split("/")[1] || "jpg";
      const fileKey = `picture360/${input.specialty.toLowerCase().replace(/\s+/g, "-")}/${input.title.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.imageMimeType);
      await db.execute(sqlFn`INSERT INTO picture360_images (specialty, title, description, imageUrl, diagnosis, explanation, status) VALUES (${input.specialty}, ${input.title}, ${input.description || ""}, ${url}, ${input.diagnosis}, ${input.explanation || ""}, 'active')`);
      return { success: true, imageUrl: url };
    }),

  deletePicture360Image: adminProcedure
    .input(z.number())
    .mutation(async ({ input: imageId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sql: sqlFn } = await import("drizzle-orm");
      await db.execute(sqlFn`UPDATE picture360_images SET status = 'archived' WHERE id = ${imageId}`);
      return { success: true };
    }),

  // Legacy import procedure (kept for backward compatibility)
  importMRCGPAKTQuestions: adminProcedure.mutation(async () => {
    return { success: false, message: "Legacy import disabled. Use bulk upload instead." };
  }),
});
