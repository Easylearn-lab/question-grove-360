import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { msraCpsQuestions } from "../drizzle/schema";
import { desc, eq, and } from "drizzle-orm";

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
});
