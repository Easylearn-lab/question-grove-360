import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { msraCpsQuestions, msraPdQuestions, userAttempts } from "../drizzle/schema";
import { desc, eq, and, sql } from "drizzle-orm";

export const msraRouter = router({
  /**
   * Join the MSRA waitlist — stores email for launch notification.
   */
  joinWaitlist: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { sql } = await import("drizzle-orm");

      // Check if email already on waitlist
      const existing = await db.execute(
        sql`SELECT id FROM msra_waitlist WHERE email = ${input.email} LIMIT 1`
      );
      const rows = Array.isArray(existing) && Array.isArray(existing[0]) ? existing[0] : existing;
      if ((rows as any[]).length > 0) {
        return { success: true, message: "You're already on the waitlist!" };
      }

      // Insert new email
      await db.execute(
        sql`INSERT INTO msra_waitlist (email) VALUES (${input.email})`
      );
      return { success: true, message: "You've been added to the MSRA waitlist!" };
    }),

  /**
   * Get MSRA specialties from CPS questions
   */
  getSpecialties: publicProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const specialties = await db
      .selectDistinct({ specialty: msraCpsQuestions.specialty })
      .from(msraCpsQuestions)
      .where(eq(msraCpsQuestions.status, "active"))
      .orderBy(msraCpsQuestions.specialty);

    return specialties.filter((s) => s.specialty).map((s) => s.specialty!);
  }),

  /**
   * Get MSRA questions by specialty with optional topic filter
   */
  getQuestions: publicProcedure
    .input(
      z.object({
        specialty: z.string().optional(),
        topic: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(msraCpsQuestions.status, "active")];
      if (input.specialty) {
        conditions.push(eq(msraCpsQuestions.specialty, input.specialty));
      }
      if (input.topic) {
        conditions.push(eq(msraCpsQuestions.topic, input.topic));
      }

      const questions = await db
        .select()
        .from(msraCpsQuestions)
        .where(and(...conditions))
        .orderBy(desc(msraCpsQuestions.id))
        .limit(input.limit)
        .offset(input.offset);

      return questions.map((q) => ({
        id: q.id,
        specialty: q.specialty,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        optionE: q.optionE,
        correctAnswer: q.correctAnswer,
        explanationCorrect: q.explanationCorrect,
        explanationA: q.explanationA,
        explanationB: q.explanationB,
        explanationC: q.explanationC,
        explanationD: q.explanationD,
        explanationE: q.explanationE,
        reference: q.reference,
      }));
    }),

  /**
   * Get topics for a specialty
   */
  getTopicsBySpecialty: publicProcedure
    .input(z.object({ specialty: z.string() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const topics = await db
        .selectDistinct({ topic: msraCpsQuestions.topic })
        .from(msraCpsQuestions)
        .where(eq(msraCpsQuestions.specialty, input.specialty))
        .orderBy(msraCpsQuestions.topic);

      return topics.filter((t) => t.topic).map((t) => t.topic!);
    }),

  // ─── MSRA PD PROCEDURES ─────────────────────────────────────────────────

  /**
   * Get PD topics (domains)
   */
  getPdTopics: publicProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const topics = await db
      .selectDistinct({ domain: msraPdQuestions.domain })
      .from(msraPdQuestions)
      .where(eq(msraPdQuestions.status, "active"))
      .orderBy(msraPdQuestions.domain);
    return topics.filter((t) => t.domain).map((t) => t.domain!);
  }),

  /**
   * Get PD questions with optional topic/type filter
   */
  getPdQuestions: publicProcedure
    .input(z.object({
      domain: z.string().optional(),
      questionType: z.enum(["RANKING", "PICK3"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conditions: any[] = [eq(msraPdQuestions.status, "active")];
      if (input.domain) conditions.push(eq(msraPdQuestions.domain, input.domain));
      if (input.questionType) conditions.push(eq(msraPdQuestions.questionType, input.questionType));
      const questions = await db.select().from(msraPdQuestions).where(and(...conditions)).limit(input.limit).offset(input.offset);
      return questions;
    }),

  /**
   * Get PD question count
   */
  getPdCount: publicProcedure
    .input(z.object({ domain: z.string().optional(), questionType: z.enum(["RANKING", "PICK3"]).optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conditions: any[] = [eq(msraPdQuestions.status, "active")];
      if (input.domain) conditions.push(eq(msraPdQuestions.domain, input.domain));
      if (input.questionType) conditions.push(eq(msraPdQuestions.questionType, input.questionType));
      const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(msraPdQuestions).where(and(...conditions));
      return result.count;
    }),

  /**
   * Generate MSRA mock exam: 97 CPS + 75 PD = 172 questions
   */
  generateMockExam: protectedProcedure.mutation(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get 97 random CPS questions
    const cpsQuestions = await db
      .select({ id: msraCpsQuestions.id, question: msraCpsQuestions.question, optionA: msraCpsQuestions.optionA, optionB: msraCpsQuestions.optionB, optionC: msraCpsQuestions.optionC, optionD: msraCpsQuestions.optionD, optionE: msraCpsQuestions.optionE, correctAnswer: msraCpsQuestions.correctAnswer, explanationCorrect: msraCpsQuestions.explanationCorrect, explanationA: msraCpsQuestions.explanationA, explanationB: msraCpsQuestions.explanationB, explanationC: msraCpsQuestions.explanationC, explanationD: msraCpsQuestions.explanationD, explanationE: msraCpsQuestions.explanationE, specialty: msraCpsQuestions.specialty, topic: msraCpsQuestions.topic })
      .from(msraCpsQuestions)
      .where(eq(msraCpsQuestions.status, "active"))
      .orderBy(sql`RAND()`)
      .limit(97);

    // Get 75 random PD questions (mix of RANKING and PICK3)
    const pdQuestions = await db
      .select()
      .from(msraPdQuestions)
      .where(eq(msraPdQuestions.status, "active"))
      .orderBy(sql`RAND()`)
      .limit(75);

    return {
      cpsQuestions: cpsQuestions.map((q) => ({ ...q, section: "CPS" as const })),
      pdQuestions: pdQuestions.map((q) => ({ ...q, section: "PD" as const })),
      totalQuestions: cpsQuestions.length + pdQuestions.length,
      timeLimitMinutes: 195, // 3 hours 15 minutes
    };
  }),

  /**
   * Record a PD question attempt
   */
  recordPdAttempt: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      domain: z.string(),
      questionType: z.enum(["RANKING", "PICK3"]),
      isCorrect: z.boolean(),
      timeTaken: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(userAttempts).values({
        userId: ctx.user.id,
        questionId: input.questionId,
        examId: 70001, // MSRA PD examId
        selectedAnswer: input.questionType,
        isCorrect: input.isCorrect,
        timeTaken: input.timeTaken || 0,
        mode: "practice",
        sessionId: null,
        specialty: input.domain,
      });

      return { success: true };
    }),

  /**
   * Record a CPS question attempt
   */
  recordCpsAttempt: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      specialty: z.string(),
      selectedAnswer: z.string(),
      isCorrect: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(userAttempts).values({
        userId: ctx.user.id,
        questionId: input.questionId,
        examId: 70002, // MSRA CPS examId
        selectedAnswer: input.selectedAnswer,
        isCorrect: input.isCorrect,
        timeTaken: 0,
        mode: "practice",
        sessionId: null,
        specialty: input.specialty,
      });

      return { success: true };
    }),

  /**
   * Get CPS performance breakdown by specialty
   */
  getCpsPerformance: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const attempts = await db
      .select({
        specialty: userAttempts.specialty,
        isCorrect: userAttempts.isCorrect,
      })
      .from(userAttempts)
      .where(and(
        eq(userAttempts.userId, ctx.user.id),
        eq(userAttempts.examId, 70002)
      ));

    if (attempts.length === 0) return [];

    const specStats: Record<string, { correct: number; total: number }> = {};
    for (const a of attempts) {
      const spec = a.specialty || "Unknown";
      if (!specStats[spec]) specStats[spec] = { correct: 0, total: 0 };
      specStats[spec].total++;
      if (a.isCorrect) specStats[spec].correct++;
    }

    return Object.entries(specStats)
      .map(([specialty, stats]) => ({
        specialty,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        total: stats.total,
        correct: stats.correct,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }),

  /**
   * Get PD questions for spaced repetition — prioritizes recently failed questions
   */
  getPdSpacedRepetition: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all PD attempts for this user, ordered by most recent
      const attempts = await db
        .select({
          questionId: userAttempts.questionId,
          isCorrect: userAttempts.isCorrect,
          createdAt: userAttempts.createdAt,
        })
        .from(userAttempts)
        .where(and(
          eq(userAttempts.userId, ctx.user.id),
          eq(userAttempts.examId, 70001)
        ))
        .orderBy(desc(userAttempts.createdAt));

      if (attempts.length === 0) {
        // No attempts yet — return random questions
        const questions = await db.select().from(msraPdQuestions)
          .where(eq(msraPdQuestions.status, "active"))
          .orderBy(sql`RAND()`)
          .limit(input.limit);
        return questions;
      }

      // Build a map of questionId -> { lastWrong: Date | null, wrongCount: number, rightCount: number }
      const questionStats: Map<number, { lastWrong: Date | null; wrongCount: number; rightCount: number }> = new Map();
      for (const a of attempts) {
        const existing = questionStats.get(a.questionId);
        if (!existing) {
          questionStats.set(a.questionId, {
            lastWrong: !a.isCorrect ? a.createdAt : null,
            wrongCount: a.isCorrect ? 0 : 1,
            rightCount: a.isCorrect ? 1 : 0,
          });
        } else {
          if (!a.isCorrect) {
            existing.wrongCount++;
            if (!existing.lastWrong) existing.lastWrong = a.createdAt;
          } else {
            existing.rightCount++;
          }
        }
      }

      // Get question IDs that were answered wrong, sorted by recency and frequency
      const wrongQuestionIds = Array.from(questionStats.entries())
        .filter(([_, stats]) => stats.wrongCount > 0)
        .sort((a, b) => {
          // More recent failures first
          const aTime = a[1].lastWrong?.getTime() || 0;
          const bTime = b[1].lastWrong?.getTime() || 0;
          if (bTime !== aTime) return bTime - aTime;
          // More failures = higher priority
          return b[1].wrongCount - a[1].wrongCount;
        })
        .map(([id]) => id)
        .slice(0, input.limit);

      if (wrongQuestionIds.length === 0) {
        // All correct — return unanswered questions
        const answeredIds = Array.from(questionStats.keys());
        const questions = await db.select().from(msraPdQuestions)
          .where(and(
            eq(msraPdQuestions.status, "active"),
            sql`${msraPdQuestions.id} NOT IN (${sql.join(answeredIds.map(id => sql`${id}`), sql`, `)})`
          ))
          .orderBy(sql`RAND()`)
          .limit(input.limit);
        return questions;
      }

      // Fetch the wrong questions
      const questions = await db.select().from(msraPdQuestions)
        .where(sql`${msraPdQuestions.id} IN (${sql.join(wrongQuestionIds.map(id => sql`${id}`), sql`, `)})`);

      // Sort them in the same priority order
      const orderMap = new Map(wrongQuestionIds.map((id, idx) => [id, idx]));
      questions.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));

      return questions;
    }),

  /**
   * Get PD performance breakdown by domain (topic)
   */
  getPdPerformance: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all PD attempts for this user
    const attempts = await db
      .select({
        questionId: userAttempts.questionId,
        isCorrect: userAttempts.isCorrect,
      })
      .from(userAttempts)
      .where(and(
        eq(userAttempts.userId, ctx.user.id),
        eq(userAttempts.examId, 70001)
      ));

    if (attempts.length === 0) return [];

    // Get the domain for each question
    const questionIds = Array.from(new Set(attempts.map(a => a.questionId)));
    const questions = await db
      .select({ id: msraPdQuestions.id, domain: msraPdQuestions.domain })
      .from(msraPdQuestions)
      .where(sql`${msraPdQuestions.id} IN (${sql.join(questionIds.map(id => sql`${id}`), sql`, `)})`);

    const domainMap = new Map(questions.map(q => [q.id, q.domain]));

    // Aggregate by domain
    const domainStats: Record<string, { correct: number; total: number }> = {};
    for (const attempt of attempts) {
      const domain = domainMap.get(attempt.questionId) || "Unknown";
      if (!domainStats[domain]) domainStats[domain] = { correct: 0, total: 0 };
      domainStats[domain].total++;
      if (attempt.isCorrect) domainStats[domain].correct++;
    }

    return Object.entries(domainStats)
      .map(([domain, stats]) => ({
        domain,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        total: stats.total,
        correct: stats.correct,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // weakest first
  }),
});
