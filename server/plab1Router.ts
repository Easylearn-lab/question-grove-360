import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";

export const plab1Router = router({
  // Get all specialties with question counts
  getSpecialties: protectedProcedure.query(async () => {
    const { getPlab1Specialties } = await import("./db");
    return await getPlab1Specialties();
  }),

  // Get topics for a specialty
  getTopicsBySpecialty: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const { getPlab1TopicsBySpecialty } = await import("./db");
      return await getPlab1TopicsBySpecialty(input);
    }),

  // Get questions with spaced repetition weighting
  getQuestions: protectedProcedure
    .input(
      z.object({
        specialty: z.string().optional(),
        topic: z.string().optional(),
        limit: z.number().default(500),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getPlab1Questions } = await import("./db");
      return await getPlab1Questions(input.specialty, input.topic, input.limit, ctx.user.id);
    }),

  // Get a single question by ID
  getQuestionById: protectedProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const { getPlab1QuestionById } = await import("./db");
      return await getPlab1QuestionById(input);
    }),

  // Record an attempt
  recordAttempt: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        selectedAnswer: z.string(),
        isCorrect: z.boolean(),
        timeTaken: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { recordPlab1Attempt } = await import("./db");
      return await recordPlab1Attempt(
        ctx.user.id,
        input.questionId,
        input.selectedAnswer,
        input.isCorrect,
        input.timeTaken
      );
    }),

  // Get user's attempts for specific questions (for resume/review)
  getUserAttempts: protectedProcedure
    .input(z.object({ questionIds: z.array(z.number()) }))
    .query(async ({ ctx, input }) => {
      if (input.questionIds.length === 0) return [];
      const { getDb } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      const result = await db.execute(
        sql.raw(
          `SELECT questionId, selectedAnswer, isCorrect FROM user_attempts WHERE userId = ${ctx.user.id} AND examId = 60001 AND questionId IN (${input.questionIds.join(",")}) ORDER BY createdAt DESC`
        )
      );
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      const seen = new Set<number>();
      const unique: Array<{ questionId: number; selectedAnswer: string; isCorrect: boolean }> = [];
      for (const row of rows as any[]) {
        if (!seen.has(row.questionId)) {
          seen.add(row.questionId);
          unique.push({ questionId: row.questionId, selectedAnswer: row.selectedAnswer, isCorrect: !!row.isCorrect });
        }
      }
      return unique;
    }),

  // Generate a mock exam (180 questions, specialty-weighted)
  generateMockExam: protectedProcedure.mutation(async () => {
    const { generatePlab1MockExam } = await import("./db");
    const questions = await generatePlab1MockExam();
    return {
      questions: questions.map((q: any) => ({
        id: q.id,
        stem: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        optionE: q.optionE,
        specialty: q.specialty,
        topic: q.topic,
        difficulty: q.difficulty,
        imageUrl: q.imageUrl,
        imageCaption: q.imageCaption,
        imageType: q.imageType,
      })),
      timerMinutes: 180,
      totalQuestions: 180,
      passMarkPercentage: 63,
    };
  }),

  // Submit mock exam results
  submitMockExam: protectedProcedure
    .input(
      z.object({
        answers: z.record(z.string(), z.string()),
        timeTaken: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const questionIds = Object.keys(input.answers).map(Number);
      if (questionIds.length === 0) throw new Error("No answers provided");

      // Get correct answers
      const questionsResult = await db.execute(
        sql.raw(`SELECT id, correctAnswer, specialty, topic FROM plab1_questions WHERE id IN (${questionIds.join(",")})`)
      );
      const questions = Array.isArray(questionsResult) && Array.isArray(questionsResult[0]) ? questionsResult[0] : questionsResult;

      let score = 0;
      const specialtyScores: Record<string, { correct: number; total: number; percentage: number }> = {};
      const topicScores: Record<string, { correct: number; total: number; percentage: number }> = {};

      (questions as any[]).forEach((q: any) => {
        const userAnswer = input.answers[q.id.toString()];
        const isCorrect = userAnswer === q.correctAnswer;
        if (isCorrect) score++;

        // Specialty breakdown
        if (!specialtyScores[q.specialty]) specialtyScores[q.specialty] = { correct: 0, total: 0, percentage: 0 };
        specialtyScores[q.specialty].total++;
        if (isCorrect) specialtyScores[q.specialty].correct++;

        // Topic breakdown
        const topicKey = `${q.specialty}|${q.topic}`;
        if (!topicScores[topicKey]) topicScores[topicKey] = { correct: 0, total: 0, percentage: 0 };
        topicScores[topicKey].total++;
        if (isCorrect) topicScores[topicKey].correct++;
      });

      Object.keys(specialtyScores).forEach((k) => {
        specialtyScores[k].percentage = Math.round((specialtyScores[k].correct / specialtyScores[k].total) * 100);
      });
      Object.keys(topicScores).forEach((k) => {
        topicScores[k].percentage = Math.round((topicScores[k].correct / topicScores[k].total) * 100);
      });

      const totalQuestions = questionIds.length;
      const percentage = (score / totalQuestions) * 100;
      const passed = percentage >= 63;

      // Store result
      await db.execute(
        sql`INSERT INTO mock_results (userId, mockId, examId, score, totalQuestions, percentage, passed, timeTaken, answers, specialtyBreakdown, completedAt) VALUES (${ctx.user.id}, 0, 60001, ${score}, ${totalQuestions}, ${percentage.toFixed(2)}, ${passed ? 1 : 0}, ${input.timeTaken}, ${JSON.stringify(input.answers)}, ${JSON.stringify(specialtyScores)}, NOW())`
      );

      // Also record individual attempts
      for (const q of questions as any[]) {
        const userAnswer = input.answers[q.id.toString()];
        const isCorrect = userAnswer === q.correctAnswer;
        await db.execute(
          sql`INSERT INTO user_attempts (userId, questionId, examId, selectedAnswer, isCorrect, createdAt) VALUES (${ctx.user.id}, ${q.id}, 60001, ${userAnswer}, ${isCorrect ? 1 : 0}, NOW())`
        );
      }

      return {
        score,
        totalQuestions,
        percentage: Math.round(percentage * 100) / 100,
        passed,
        passMark: 63,
        specialtyBreakdown: specialtyScores,
        topicBreakdown: topicScores,
      };
    }),

  // Reset attempts for PLAB1
  resetAttempts: protectedProcedure.mutation(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.execute(sql`DELETE FROM user_attempts WHERE userId = ${ctx.user.id} AND examId = 60001`);
    return { success: true };
  }),

  // Reset attempts by specialty
  resetAttemptsBySpecialty: protectedProcedure
    .input(z.object({ specialty: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Get question IDs for this specialty
      const qResult = await db.execute(
        sql`SELECT id FROM plab1_questions WHERE specialty = ${input.specialty} AND examId = 60001`
      );
      const qRows = Array.isArray(qResult) && Array.isArray(qResult[0]) ? qResult[0] : qResult;
      const ids = (qRows as any[]).map((r: any) => r.id);
      if (ids.length > 0) {
        await db.execute(
          sql.raw(`DELETE FROM user_attempts WHERE userId = ${ctx.user.id} AND examId = 60001 AND questionId IN (${ids.join(",")})`)
        );
      }
      return { success: true };
    }),
});
