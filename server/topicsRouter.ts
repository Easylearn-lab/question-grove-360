import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { topicSubjects, topics, topicContent, spellingWords, jambQuestions } from "../drizzle/schema";
import { eq, asc, sql, and } from "drizzle-orm";

async function db() {
  const { getDb } = await import("./db");
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export const topicsRouter = router({
  getSubjects: publicProcedure.query(async () => {
    const d = await db();
    return d.select().from(topicSubjects).orderBy(asc(topicSubjects.displayOrder));
  }),

  getSubjectBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const d = await db();
      const [subject] = await d.select().from(topicSubjects).where(eq(topicSubjects.slug, input.slug));
      return subject || null;
    }),

  getTopicsBySubjectSlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const d = await db();
      const [subject] = await d.select().from(topicSubjects).where(eq(topicSubjects.slug, input.slug));
      if (!subject) return [];
      return d.select().from(topics).where(eq(topics.subjectId, subject.id)).orderBy(asc(topics.displayOrder));
    }),

  getTopicBySlug: publicProcedure
    .input(z.object({ subjectSlug: z.string(), topicSlug: z.string() }))
    .query(async ({ input }) => {
      const d = await db();
      const [subject] = await d.select().from(topicSubjects).where(eq(topicSubjects.slug, input.subjectSlug));
      if (!subject) return null;
      const [topic] = await d.select().from(topics).where(and(eq(topics.subjectId, subject.id), eq(topics.slug, input.topicSlug)));
      if (!topic) return null;
      const [content] = await d.select().from(topicContent).where(eq(topicContent.topicId, topic.id));
      return { ...topic, subject, content: content || null };
    }),

  getLinkedQuestions: publicProcedure
    .input(z.object({ topicTag: z.string(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const d = await db();
      return d.select().from(jambQuestions).where(eq(jambQuestions.topic, input.topicTag)).limit(input.limit);
    }),

  getSpellingWords: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      difficulty: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const d = await db();
      const conditions: any[] = [];
      if (input.category) conditions.push(eq(spellingWords.category, input.category));
      if (input.difficulty) conditions.push(eq(spellingWords.difficultyLevel, input.difficulty));
      const baseQuery = conditions.length > 0
        ? d.select().from(spellingWords).where(and(...conditions))
        : d.select().from(spellingWords);
      return (baseQuery as any).orderBy(sql`RAND()`).limit(input.limit);
    }),

  getSpellingCategories: publicProcedure.query(async () => {
    const d = await db();
    const result = await d.select({ category: spellingWords.category }).from(spellingWords).groupBy(spellingWords.category);
    return result.map((r: any) => r.category);
  }),
});
