import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { exams, jambQuestions } from "../drizzle/schema";
import {
  JAMB_ATTEMPT_EXAM_ID,
  JAMB_EXAM_CODE,
  JAMB_PAYMENT_PLANS,
  JAMB_SUBJECT_ORDER,
  JAMB_SUBJECTS,
} from "../shared/jamb";
import { getDb } from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const jambSubjectInput = z.string().refine(
  (subject) => JAMB_SUBJECT_ORDER.includes(subject as (typeof JAMB_SUBJECT_ORDER)[number]),
  "Unsupported JAMB subject"
);

async function getJambPaymentContext() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const [exam] = await db
    .select({ code: exams.code, currency: exams.currency, paymentProvider: exams.paymentProvider })
    .from(exams)
    .where(eq(exams.code, JAMB_EXAM_CODE))
    .limit(1);

  if (!exam || exam.currency !== "NGN" || exam.paymentProvider !== "paystack") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "JAMB payment configuration is incomplete",
    });
  }

  return exam;
}

export const jambRouter = router({
  getSubjects: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const counts = await db
      .select({ subject: jambQuestions.subject, count: sql<number>`COUNT(*)` })
      .from(jambQuestions)
      .groupBy(jambQuestions.subject);
    const countBySubject = new Map(counts.map((entry) => [entry.subject, Number(entry.count)]));

    return JAMB_SUBJECTS.map((subject) => ({
      ...subject,
      questionCount: countBySubject.get(subject.name) ?? 0,
      active: (countBySubject.get(subject.name) ?? 0) > 0,
    }));
  }),

  getPaymentContext: publicProcedure.query(async () => {
    const context = await getJambPaymentContext();
    return {
      examCode: context.code,
      currency: context.currency,
      paymentProvider: context.paymentProvider,
      plans: JAMB_PAYMENT_PLANS,
    };
  }),

  checkSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const result = await db.execute(
      sql`SELECT id FROM subscriptions
          WHERE userId = ${ctx.user.id}
            AND planType = 'jamb'
            AND status = 'active'
            AND currentPeriodEnd > NOW()
          LIMIT 1`
    );
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return { hasAccess: (rows as unknown[]).length > 0 };
  }),

  getQuestions: publicProcedure
    .input(z.object({ subject: jambSubjectInput }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db.select().from(jambQuestions).where(eq(jambQuestions.subject, input.subject)).orderBy(jambQuestions.id);
    }),

  getTopics: publicProcedure
    .input(z.object({ subject: jambSubjectInput }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const result = await db
        .select({ topic: jambQuestions.topic })
        .from(jambQuestions)
        .where(eq(jambQuestions.subject, input.subject))
        .groupBy(jambQuestions.topic)
        .orderBy(jambQuestions.topic);
      return result.map((row) => row.topic).filter((topic): topic is string => Boolean(topic));
    }),

  recordAttempt: protectedProcedure
    .input(z.object({ questionId: z.number(), selectedAnswer: z.enum(["A", "B", "C", "D"]), isCorrect: z.boolean(), subject: jambSubjectInput }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.execute(
        sql`INSERT INTO user_attempts (userId, questionId, examId, specialty, selectedAnswer, isCorrect, createdAt)
            VALUES (${ctx.user.id}, ${input.questionId}, ${JAMB_ATTEMPT_EXAM_ID}, ${`JAMB-${input.subject}`}, ${input.selectedAnswer}, ${input.isCorrect}, NOW())`
      );
      return { success: true };
    }),

  initializeCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(["monthly", "quarterly"]) }))
    .mutation(async ({ ctx, input }) => {
      const paymentContext = await getJambPaymentContext();
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecretKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Paystack is not configured" });
      }

      const plan = JAMB_PAYMENT_PLANS[input.plan];
      const reference = `jamb_${ctx.user.id}_${Date.now()}`;
      const origin = ctx.req.headers.origin || "https://questiongrove360.com";
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.user.email,
          amount: plan.amountMinor,
          currency: paymentContext.currency,
          reference,
          callback_url: `${origin}/international/nigeria/jamb?payment=success`,
          metadata: {
            user_id: ctx.user.id,
            plan: input.plan,
            product: "jamb",
            exam_code: JAMB_EXAM_CODE,
            custom_fields: [{ display_name: "Plan", variable_name: "plan", value: `JAMB All Subjects — ${plan.label}` }],
          },
        }),
      });

      const data = await response.json();
      if (!data.status) {
        throw new TRPCError({ code: "BAD_REQUEST", message: data.message || "Failed to initialise payment" });
      }

      return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
    }),
});
