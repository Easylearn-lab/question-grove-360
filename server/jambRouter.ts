import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { jambQuestions } from "../drizzle/schema";
import { eq, sql, and } from "drizzle-orm";

export const jambRouter = router({
  checkSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const result = await db.execute(
      sql`SELECT id FROM subscriptions WHERE userId = ${ctx.user.id} AND planType = 'jamb' AND status = 'active' AND currentPeriodEnd > NOW() LIMIT 1`
    );
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return { hasAccess: (rows as any[]).length > 0 };
  }),

  getQuestions: publicProcedure
    .input(z.object({ subject: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const questions = await db
        .select()
        .from(jambQuestions)
        .where(eq(jambQuestions.subject, input.subject))
        .orderBy(jambQuestions.id);
      return questions;
    }),

  getTopics: publicProcedure
    .input(z.object({ subject: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const result = await db
        .select({ topic: jambQuestions.topic })
        .from(jambQuestions)
        .where(eq(jambQuestions.subject, input.subject))
        .groupBy(jambQuestions.topic)
        .orderBy(jambQuestions.topic);
      return result.map((r) => r.topic);
    }),

  recordAttempt: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        selectedAnswer: z.string(),
        isCorrect: z.boolean(),
        subject: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Use raw SQL to avoid FK constraint issues (JAMB questions are in a separate table)
      await db.execute(
        sql`INSERT INTO user_attempts (userId, questionId, examId, specialty, selectedAnswer, isCorrect, createdAt)
            VALUES (${ctx.user.id}, ${input.questionId}, 70001, ${`JAMB-${input.subject}`}, ${input.selectedAnswer}, ${input.isCorrect}, NOW())`
      );
      return { success: true };
    }),

  initializeCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(["monthly", "quarterly"]) }))
    .mutation(async ({ ctx, input }) => {
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecretKey) {
        throw new Error("Paystack not configured");
      }

      const plans: Record<string, { amount: number; name: string }> = {
        monthly: { amount: 150000, name: "JAMB All Subjects — Monthly (₦1,500)" },
        quarterly: { amount: 400000, name: "JAMB All Subjects — Quarterly (₦4,000)" },
      };

      const plan = plans[input.plan];
      const reference = `jamb_${ctx.user.id}_${Date.now()}`;

      const response = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: ctx.user.email,
            amount: plan.amount,
            reference,
            callback_url: `${ctx.req.headers.origin || "https://questiongrove360.com"}/international/nigeria/jamb?payment=success`,
            metadata: {
              user_id: ctx.user.id,
              plan: input.plan,
              product: "jamb",
              custom_fields: [
                { display_name: "Plan", variable_name: "plan", value: plan.name },
              ],
            },
          }),
        }
      );

      const data = await response.json();
      if (!data.status) {
        throw new Error(data.message || "Failed to initialize payment");
      }

      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
      };
    }),
});
