import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getOrCreateProfile, updateProfile, getProfileByUserId } from "./db";
import { stripeRouter } from "./stripeRouter";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getProfileByUserId(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({
        fullName: z.string().optional(),
        specialty: z.string().optional(),
        trainingYear: z.string().optional(),
        targetExam: z.string().optional(),
        targetExamDate: z.string().optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
        dailyQuestionGoal: z.number().optional(),
        weeklyHourGoal: z.number().optional(),
        leaderboardOptIn: z.boolean().optional(),
        avatarUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData: Record<string, any> = {};
        Object.entries(input).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[key] = value;
          }
        });
        return await updateProfile(ctx.user.id, updateData);
      }),
  }),

  // Questions Router
  questions: router({
    list: publicProcedure
      .input(z.object({
        specialty: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const { getQuestionsByFilters } = await import("./db");
        return await getQuestionsByFilters(input.specialty, input.limit, input.offset);
      }),
    
    get: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getQuestionById } = await import("./db");
        return await getQuestionById(input);
      }),
    
    bookmark: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const { bookmarkQuestion } = await import("./db");
        return await bookmarkQuestion(ctx.user.id, input);
      }),
  }),

  // Mock Exams Router
  mockExams: router({
    create: protectedProcedure
      .input(z.object({
        mockId: z.number(),
        examId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createMockExam } = await import("./db");
        return await createMockExam(ctx.user.id, input.mockId, input.examId);
      }),
    
    recordAttempt: protectedProcedure
      .input(z.object({
        questionId: z.number(),
        examId: z.number(),
        selectedAnswer: z.string(),
        isCorrect: z.boolean(),
        timeTaken: z.number(),
        mode: z.string().default("exam"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { recordUserAttempt } = await import("./db");
        return await recordUserAttempt(
          ctx.user.id,
          input.questionId,
          input.examId,
          input.selectedAnswer,
          input.isCorrect,
          input.timeTaken,
          input.mode
        );
      }),
    
    complete: protectedProcedure
      .input(z.object({
        mockResultId: z.number(),
        score: z.number(),
        percentage: z.number(),
        timeTaken: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { completeMockResult } = await import("./db");
        return await completeMockResult(input.mockResultId, input.score, input.percentage, input.timeTaken);
      }),
  }),

  // Pattern Recognition / Flashcards Router
  flashcards: router({
    getOrCreate: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const { getOrCreateFlashcard } = await import("./db");
        return await getOrCreateFlashcard(ctx.user.id, input);
      }),
    
    updateProgress: protectedProcedure
      .input(z.object({
        flashcardId: z.number(),
        quality: z.number().min(0).max(5),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateSrsProgress } = await import("./db");
        return await updateSrsProgress(ctx.user.id, input.flashcardId, input.quality);
      }),
    
    getDue: protectedProcedure
      .input(z.object({
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const { getDueFlashcards } = await import("./db");
        return await getDueFlashcards(ctx.user.id, input.limit);
      }),
  }),

  // Study Stats Router
  stats: router({
    getUserStats: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserStudyStats } = await import("./db");
        return await getUserStudyStats(ctx.user.id);
      }),
  }),

  // Stripe Router
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
