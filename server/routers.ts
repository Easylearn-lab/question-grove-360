import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getOrCreateProfile, updateProfile, getProfileByUserId } from "./db";
import { stripeRouter } from "./stripeRouter";
import { adminRouter } from "./adminRouter";
import { aiCoachRouter } from "./aiCoachRouter";
import { twoFactorRouter } from "./twoFactorRouter";
import { voiceRouter } from "./voiceRouter";
import { adaptiveRouter } from "./adaptiveAlgorithm";

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

  // Profile Router
  profile: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await getProfileByUserId(ctx.user.id);
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          specialty: z.string().optional(),
          trainingYear: z.number().optional(),
          targetExam: z.string().optional(),
          country: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await updateProfile(ctx.user.id, input);
      }),
  }),

  // Questions Router
  questions: router({
    getQuestions: protectedProcedure
      .input(
        z.object({
          specialty: z.string().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getQuestionsByFilters } = await import("./db");
        return await getQuestionsByFilters(input.specialty, input.limit, input.offset);
      }),
    getQuestionById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const { getQuestionById } = await import("./db");
        return await getQuestionById(input);
      }),
    bookmarkQuestion: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const { bookmarkQuestion } = await import("./db");
        return await bookmarkQuestion(ctx.user.id, input);
      }),
    getBookmarks: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getBookmarks } = await import("./db");
        return await getBookmarks(ctx.user.id, input.limit, input.offset);
      }),
    removeBookmark: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const { removeBookmark } = await import("./db");
        return await removeBookmark(ctx.user.id, input);
      }),
    isBookmarked: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const { isQuestionBookmarked } = await import("./db");
        return await isQuestionBookmarked(ctx.user.id, input);
      }),

  }),

  // Mock Exams Router
  mockExams: router({
    create: protectedProcedure
      .input(
        z.object({
          mockId: z.number(),
          examId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createMockExam } = await import("./db");
        return await createMockExam(ctx.user.id, input.mockId, input.examId);
      }),
    recordAttempt: protectedProcedure
      .input(
        z.object({
          questionId: z.number(),
          examId: z.number(),
          selectedAnswer: z.string(),
          isCorrect: z.boolean(),
          timeTaken: z.number(),
          mode: z.string().default("tutor"),
        })
      )
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
  }),

  // Flashcards Router
  flashcards: router({
    getFlashcard: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const { getOrCreateFlashcard } = await import("./db");
        return await getOrCreateFlashcard(ctx.user.id, input);
      }),
    updateProgress: protectedProcedure
      .input(
        z.object({
          flashcardId: z.number(),
          quality: z.number().min(0).max(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { updateSrsProgress } = await import("./db");
        return await updateSrsProgress(ctx.user.id, input.flashcardId, input.quality);
      }),
  }),

  // Study Stats Router
  stats: router({
    getUserStats: protectedProcedure.query(async ({ ctx }) => {
      const { getUserStudyStats } = await import("./db");
      return await getUserStudyStats(ctx.user.id);
    }),
  }),

  // Dashboard Stats Router (real per-user data)
  dashboard: router({
    getStats: protectedProcedure
      .input(
        z.object({
          examCode: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getDashboardStats } = await import("./db");
        return await getDashboardStats(ctx.user.id, input.examCode);
      }),
    getExams: protectedProcedure.query(async () => {
      const { getAvailableExams } = await import("./db");
      return await getAvailableExams();
    }),
  }),

  // Progress Dashboard Router
  progress: router({
    getMockExamTrends: protectedProcedure
      .input(
        z.object({
          days: z.number().default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getMockExamScoreTrends } = await import("./db");
        return await getMockExamScoreTrends(ctx.user.id, input.days);
      }),
    getFlashcardStats: protectedProcedure.query(async ({ ctx }) => {
      const { getFlashcardMasteryStats } = await import("./db");
      return await getFlashcardMasteryStats(ctx.user.id);
    }),
    getFlashcardTrend: protectedProcedure
      .input(
        z.object({
          days: z.number().default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getFlashcardProgressTrend } = await import("./db");
        return await getFlashcardProgressTrend(ctx.user.id, input.days);
      }),
    getSpecialtyBreakdown: protectedProcedure
      .input(
        z.object({
          days: z.number().default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getSpecialtyBreakdown } = await import("./db");
        return await getSpecialtyBreakdown(ctx.user.id, input.days);
      }),
  }),

  // Stripe Router
  stripe: stripeRouter,

  // Admin Router
  admin: adminRouter,

  // AI Coach Router
  aiCoach: aiCoachRouter,

  // Two-Factor Authentication Router
  twoFactor: twoFactorRouter,

  // Voice Router (SCA voice integration)
  voice: voiceRouter,

  // Adaptive Learning Router
  adaptive: adaptiveRouter,
});

export type AppRouter = typeof appRouter;
