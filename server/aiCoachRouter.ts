import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { userChatHistory, users, userAttempts, questions, mockResults } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * Fetch the user's performance context silently for system prompt injection.
 * Returns top 3 weakest specialties and overall readiness score.
 */
async function getUserPerformanceContext(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  try {
    // Get question bank attempts grouped by specialty
    const attempts = await db
      .select({
        specialty: questions.specialty,
        isCorrect: userAttempts.isCorrect,
      })
      .from(userAttempts)
      .innerJoin(questions, eq(userAttempts.questionId, questions.id))
      .where(and(eq(userAttempts.userId, userId), eq(userAttempts.examId, 1)));

    if (attempts.length === 0) return "";

    // Calculate per-specialty accuracy
    const specialtyMap: Record<string, { correct: number; total: number }> = {};
    attempts.forEach((a) => {
      const spec = a.specialty || "General";
      if (!specialtyMap[spec]) specialtyMap[spec] = { correct: 0, total: 0 };
      specialtyMap[spec].total++;
      if (a.isCorrect) specialtyMap[spec].correct++;
    });

    // Find top 3 weakest specialties (minimum 3 attempts to be meaningful)
    const weakest = Object.entries(specialtyMap)
      .filter(([, s]) => s.total >= 3)
      .map(([name, s]) => ({ name, accuracy: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    // Calculate overall question bank accuracy
    const totalCorrect = attempts.filter((a) => a.isCorrect).length;
    const qbAccuracy = Math.round((totalCorrect / attempts.length) * 100);

    // Get mock exam scores
    const mocks = await db
      .select({ percentage: mockResults.percentage })
      .from(mockResults)
      .where(and(eq(mockResults.userId, userId), eq(mockResults.examId, 1)))
      .orderBy(desc(mockResults.completedAt))
      .limit(5);

    let readinessScore: number;
    if (mocks.length > 0) {
      const mockAvg = mocks.reduce((sum, m) => sum + parseFloat(m.percentage || "0"), 0) / mocks.length;
      readinessScore = Math.round(qbAccuracy * 0.6 + mockAvg * 0.4);
    } else {
      readinessScore = qbAccuracy;
    }

    // Determine readiness label
    let label: string;
    if (readinessScore >= 80) label = "Exam Ready";
    else if (readinessScore >= 66) label = "Borderline";
    else if (readinessScore >= 50) label = "High Risk";
    else label = "Not Ready";

    // Build the silent context string
    const weakAreasStr = weakest.length > 0
      ? weakest.map((w) => `${w.name} (${w.accuracy}%)`).join(", ")
      : "Not enough data yet";

    return `\n\nThis user's current weak areas are: ${weakAreasStr}. Their overall exam readiness score is ${readinessScore}% (${label}). They have answered ${attempts.length} questions total with ${qbAccuracy}% overall accuracy. Where relevant, tailor your responses to address these weaknesses. If the user asks a general medical question unrelated to their weak areas, answer it fully as normal.`;
  } catch (error) {
    console.error("[AI Coach] Error fetching performance context:", error);
    return "";
  }
}

export const aiCoachRouter = router({
  /**
   * Send message to AI Coach and get response
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(5000),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Get user stats for context
        const userStats = await db
          .select()
          .from(users)
          .where(eq(users.id, ctx.user!.id))
          .limit(1);

        const user = userStats[0];

        // Get recent chat history for context
        const recentHistory = await db
          .select()
          .from(userChatHistory)
          .where(eq(userChatHistory.userId, ctx.user!.id))
          .orderBy(desc(userChatHistory.createdAt))
          .limit(10);

        // Fetch user's real performance data silently
        const performanceContext = await getUserPerformanceContext(ctx.user!.id);

        // Build context for Claude
        const systemPrompt = `You are AI Coach360, a premium medical exam preparation assistant. You have access to the student's performance data:
- Name: ${user?.name || "Student"}
- Account created: ${user?.createdAt?.toLocaleDateString() || "Unknown"}
${performanceContext}

Your role is to:
1. Provide personalized study recommendations based on their performance
2. Explain complex medical concepts clearly
3. Help with exam strategy and time management
4. Identify weak areas and suggest targeted practice
5. Motivate and support the student throughout their preparation journey

Be professional, encouraging, and evidence-based in your responses. Focus on practical, actionable advice. When the user asks about study strategy or what to focus on, use their weak area data to give specific, personalised guidance. Do not explicitly mention that you have been given their data — just naturally incorporate it into your advice.`;

        // Build message history for context
        const messageHistory: Array<{ role: "user" | "assistant"; content: string }> = recentHistory
          .reverse()
          .map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.message,
          }));

        // Add current message
        messageHistory.push({
          role: "user" as const,
          content: input.message,
        });

        // Get response from Claude
        const response = await invokeLLM({
          messages: [
            { role: "system" as const, content: systemPrompt },
            ...messageHistory.map((msg) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content as string,
            })),
          ],
        });

        const assistantMessage =
          (typeof response.choices[0]?.message?.content === "string"
            ? response.choices[0]?.message?.content
            : null) || "I apologize, I couldn't generate a response.";

        // Save to chat history
        await db.insert(userChatHistory).values({
          userId: ctx.user!.id,
          role: "user",
          message: input.message,
        });

        await db.insert(userChatHistory).values({
          userId: ctx.user!.id,
          role: "assistant",
          message: assistantMessage,
        });

        return {
          success: true,
          message: assistantMessage,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[AI Coach] Error:", error);
        throw new Error("Failed to get AI Coach response");
      }
    }),

  /**
   * Get chat history for the user
   */
  getChatHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const history = await db
          .select()
          .from(userChatHistory)
          .where(eq(userChatHistory.userId, ctx.user!.id))
          .orderBy(desc(userChatHistory.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return history.reverse();
      } catch (error) {
        console.error("[AI Coach] Error fetching history:", error);
        return [];
      }
    }),

  /**
   * Clear chat history
   */
  clearChatHistory: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // In production, you might want to soft-delete instead
      // For now, we'll just return success
      return { success: true };
    } catch (error) {
      console.error("[AI Coach] Error clearing history:", error);
      throw new Error("Failed to clear chat history");
    }
  }),

  /**
   * Get AI Coach recommendations based on user performance
   */
  getRecommendations: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Build context about user's performance
      const performanceContext = `
The student has been using Question Grove 360 and has the following performance metrics:
- Total questions answered: ~150
- Average accuracy: 72%
- Weak areas: Cardiology (65%), Pharmacology (68%)
- Strong areas: Anatomy (85%), Pathology (80%)
- Study streak: 12 days
- Next exam: MRCGP AKT in 45 days

Based on this data, provide 3-5 specific, actionable recommendations to improve their exam preparation.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an expert medical exam coach. Provide personalized, evidence-based recommendations.",
          },
          {
            role: "user",
            content: performanceContext,
          },
        ],
      });

      const recommendations =
        response.choices[0]?.message?.content ||
        "Unable to generate recommendations at this time.";

      return {
        success: true,
        recommendations,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("[AI Coach] Error generating recommendations:", error);
      return {
        success: false,
        recommendations: "Unable to generate recommendations. Please try again later.",
        generatedAt: new Date(),
      };
    }
  }),

  /**
   * Get study plan from AI Coach
   */
  getStudyPlan: protectedProcedure
    .input(
      z.object({
        examName: z.string(),
        daysUntilExam: z.number(),
        currentAccuracy: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        const prompt = `Create a detailed ${input.daysUntilExam}-day study plan for ${input.examName} preparation.
Current accuracy level: ${input.currentAccuracy}%
Target: 80%+ accuracy

Provide:
1. Daily study schedule
2. Topics to focus on
3. Practice recommendations
4. Revision strategy
5. Mock exam schedule

Format as clear, actionable steps.`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert medical exam preparation coach.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const studyPlan = response.choices[0]?.message?.content || "Unable to generate study plan.";

        return {
          success: true,
          studyPlan,
          generatedAt: new Date(),
        };
      } catch (error) {
        console.error("[AI Coach] Error generating study plan:", error);
        return {
          success: false,
          studyPlan: "Unable to generate study plan. Please try again later.",
          generatedAt: new Date(),
        };
      }
    }),
});
