import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getOrCreateProfile, updateProfile, getProfileByUserId } from "./db";

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
});

export type AppRouter = typeof appRouter;
