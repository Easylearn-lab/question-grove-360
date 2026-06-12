/**
 * Adaptive Learning Algorithm
 * 
 * Combines SM-2 spaced repetition with difficulty adjustment based on
 * user performance patterns. The algorithm:
 * 
 * 1. Tracks per-question performance (correct/incorrect, time taken)
 * 2. Uses SM-2 to schedule flashcard reviews
 * 3. Adjusts question difficulty selection based on user's weak areas
 * 4. Predicts pass probability based on historical performance
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, lte, sql, desc } from "drizzle-orm";

// SM-2 Algorithm Implementation
interface SM2Input {
  quality: number; // 0-5 rating (0=complete failure, 5=perfect)
  repetitions: number;
  interval: number; // days
  easeFactor: number;
}

interface SM2Output {
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: Date;
}

/**
 * SM-2 Spaced Repetition Algorithm
 * Based on: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */
export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, repetitions, interval, easeFactor } = input;

  let newRepetitions: number;
  let newInterval: number;
  let newEaseFactor: number;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response - reset
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Number(newEaseFactor.toFixed(2)),
    nextReviewDate,
  };
}

/**
 * Calculate difficulty adjustment based on user performance
 * Returns a recommended difficulty level for the next question
 */
export function calculateDifficultyAdjustment(
  recentPerformance: { correct: boolean; difficulty: string }[]
): "Easy" | "Medium" | "Hard" {
  if (recentPerformance.length < 3) return "Medium";

  const last10 = recentPerformance.slice(-10);
  const correctRate = last10.filter((p) => p.correct).length / last10.length;

  if (correctRate >= 0.8) return "Hard";
  if (correctRate >= 0.5) return "Medium";
  return "Easy";
}

/**
 * Calculate predicted pass probability based on performance model
 */
export function calculatePassProbability(
  specialtyScores: Record<string, number>,
  passMark: number = 70
): number {
  const scores = Object.values(specialtyScores);
  if (scores.length === 0) return 0;

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = Math.sqrt(
    scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length
  );

  // Use a simplified normal distribution approximation
  const zScore = (avgScore - passMark) / (stdDev || 1);
  // Sigmoid approximation of cumulative normal distribution
  const probability = 1 / (1 + Math.exp(-1.7 * zScore));

  return Math.round(probability * 100);
}

// Adaptive Learning Router
export const adaptiveRouter = router({
  /**
   * Get the next recommended question based on adaptive algorithm
   */
  getNextQuestion: protectedProcedure
    .input(
      z.object({
        examId: z.number().optional(),
        specialty: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { userAttempts, questions, userPerformanceModel } = await import("../drizzle/schema");

      // Get user's recent performance
      const recentAttempts = await db
        .select({
          correct: userAttempts.isCorrect,
          difficulty: questions.difficulty,
          specialty: questions.specialty,
          questionId: userAttempts.questionId,
        })
        .from(userAttempts)
        .innerJoin(questions, eq(userAttempts.questionId, questions.id))
        .where(eq(userAttempts.userId, ctx.user.id))
        .orderBy(desc(userAttempts.createdAt))
        .limit(20);

      // Calculate recommended difficulty
      const performance = recentAttempts.map((a) => ({
        correct: a.correct ?? false,
        difficulty: a.difficulty || "Medium",
      }));
      const recommendedDifficulty = calculateDifficultyAdjustment(performance);

      // Find weak specialties
      const specialtyPerformance: Record<string, { correct: number; total: number }> = {};
      recentAttempts.forEach((a) => {
        const spec = a.specialty || "General";
        if (!specialtyPerformance[spec]) {
          specialtyPerformance[spec] = { correct: 0, total: 0 };
        }
        specialtyPerformance[spec].total++;
        if (a.correct) specialtyPerformance[spec].correct++;
      });

      const weakSpecialties = Object.entries(specialtyPerformance)
        .filter(([, data]) => data.total >= 3 && data.correct / data.total < 0.5)
        .map(([spec]) => spec);

      // Get questions the user hasn't answered yet, prioritizing weak areas
      const answeredIds = recentAttempts.map((a) => a.questionId).filter(Boolean);

      return {
        recommendedDifficulty,
        weakSpecialties,
        answeredCount: recentAttempts.length,
        performance: specialtyPerformance,
      };
    }),

  /**
   * Update SRS progress after reviewing a flashcard
   */
  updateSrsProgress: protectedProcedure
    .input(
      z.object({
        flashcardId: z.number(),
        quality: z.number().min(0).max(5), // SM-2 quality rating
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { userSrsProgress } = await import("../drizzle/schema");

      // Get current progress
      const [current] = await db
        .select()
        .from(userSrsProgress)
        .where(
          and(
            eq(userSrsProgress.userId, ctx.user.id),
            eq(userSrsProgress.flashcardId, input.flashcardId)
          )
        )
        .limit(1);

      const sm2Result = calculateSM2({
        quality: input.quality,
        repetitions: current?.repetitions || 0,
        interval: current?.interval || 1,
        easeFactor: current?.easeFactor ? Number(current.easeFactor) : 2.5,
      });

      const dueDateStr = sm2Result.nextReviewDate.toISOString().split("T")[0];

      if (current) {
        await db
          .update(userSrsProgress)
          .set({
            interval: sm2Result.interval,
            easeFactor: String(sm2Result.easeFactor),
            repetitions: sm2Result.repetitions,
            dueDate: dueDateStr,
            lastReviewed: new Date(),
          } as any)
          .where(eq(userSrsProgress.id, current.id));
      } else {
        await db.insert(userSrsProgress).values({
          userId: ctx.user.id,
          flashcardId: input.flashcardId,
          interval: sm2Result.interval,
          easeFactor: String(sm2Result.easeFactor),
          repetitions: sm2Result.repetitions,
          dueDate: dueDateStr,
          lastReviewed: new Date(),
        } as any);
      }

      return {
        nextReviewDate: sm2Result.nextReviewDate,
        interval: sm2Result.interval,
        easeFactor: sm2Result.easeFactor,
      };
    }),

  /**
   * Get due flashcards for review (SRS scheduling)
   */
  getDueCards: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { userSrsProgress, flashcards } = await import("../drizzle/schema");

      const today = new Date().toISOString().split("T")[0];

      const dueCards = await db
        .select({
          progressId: userSrsProgress.id,
          flashcardId: flashcards.id,
          front: flashcards.front,
          back: flashcards.back,
          category: flashcards.category,
          interval: userSrsProgress.interval,
          easeFactor: userSrsProgress.easeFactor,
          repetitions: userSrsProgress.repetitions,
          dueDate: userSrsProgress.dueDate,
        })
        .from(userSrsProgress)
        .innerJoin(flashcards, eq(userSrsProgress.flashcardId, flashcards.id))
        .where(
          and(
            eq(userSrsProgress.userId, ctx.user.id),
            sql`${userSrsProgress.dueDate} <= ${today}`
          )
        )
        .limit(input.limit);

      return dueCards;
    }),

  /**
   * Get user's performance model and pass prediction
   */
  getPerformanceModel: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const { userPerformanceModel } = await import("../drizzle/schema");

    const [model] = await db
      .select()
      .from(userPerformanceModel)
      .where(eq(userPerformanceModel.userId, ctx.user.id))
      .limit(1);

    if (!model) {
      return {
        specialtyScores: {},
        weakAreas: [],
        strongAreas: [],
        predictedPassProbability: 0,
      };
    }

    const specialtyScores = (model.specialtyScores as Record<string, number>) || {};
    const passProbability = calculatePassProbability(specialtyScores);

    return {
      specialtyScores,
      weakAreas: (model.weakAreas as string[]) || [],
      strongAreas: (model.strongAreas as string[]) || [],
      predictedPassProbability: passProbability,
    };
  }),

  /**
   * Recalculate user's performance model based on all attempts
   */
  recalculateModel: protectedProcedure.mutation(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const { userAttempts, questions, userPerformanceModel } = await import("../drizzle/schema");

    // Get all user attempts with question data
    const attempts = await db
      .select({
        correct: userAttempts.isCorrect,
        specialty: questions.specialty,
      })
      .from(userAttempts)
      .innerJoin(questions, eq(userAttempts.questionId, questions.id))
      .where(eq(userAttempts.userId, ctx.user.id));

    // Calculate specialty scores
    const specialtyData: Record<string, { correct: number; total: number }> = {};
    attempts.forEach((a) => {
      const spec = a.specialty || "General";
      if (!specialtyData[spec]) specialtyData[spec] = { correct: 0, total: 0 };
      specialtyData[spec].total++;
      if (a.correct) specialtyData[spec].correct++;
    });

    const specialtyScores: Record<string, number> = {};
    Object.entries(specialtyData).forEach(([spec, data]) => {
      specialtyScores[spec] = Math.round((data.correct / data.total) * 100);
    });

    // Determine weak and strong areas
    const weakAreas = Object.entries(specialtyScores)
      .filter(([, score]) => score < 50)
      .map(([spec]) => spec);
    const strongAreas = Object.entries(specialtyScores)
      .filter(([, score]) => score >= 75)
      .map(([spec]) => spec);

    const passProbability = calculatePassProbability(specialtyScores);

    // Upsert performance model
    const [existing] = await db
      .select()
      .from(userPerformanceModel)
      .where(eq(userPerformanceModel.userId, ctx.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(userPerformanceModel)
        .set({
          specialtyScores: specialtyScores as any,
          weakAreas: weakAreas as any,
          strongAreas: strongAreas as any,
          predictedPassProbability: String(passProbability),
          lastCalculated: new Date(),
        } as any)
        .where(eq(userPerformanceModel.id, existing.id));
    } else {
      await db.insert(userPerformanceModel).values({
        userId: ctx.user.id,
        specialtyScores: specialtyScores as any,
        weakAreas: weakAreas as any,
        strongAreas: strongAreas as any,
        predictedPassProbability: String(passProbability),
        lastCalculated: new Date(),
      } as any);
    }

    return {
      specialtyScores,
      weakAreas,
      strongAreas,
      predictedPassProbability: passProbability,
    };
  }),
});
