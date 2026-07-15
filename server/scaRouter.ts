import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";

/**
 * SCA Simulator Router
 * Handles case retrieval, AI patient responses, consultation scoring, and history
 */
export const scaRouter = router({
  /**
   * Get all active SCA cases (public - for browsing)
   * Returns minimal info for the case grid
   */
  getCases: publicProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const result = await db.execute(
      sql`SELECT id, title, category, difficulty, patientName, patientAge, patientGender, presentingComplaint FROM sca_cases WHERE isActive = 1 ORDER BY id`
    );
    return (result as any)[0] as any[];
  }),

  /**
   * Get full case details (protected - requires subscription)
   */
  getCaseById: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.execute(
        sql`SELECT * FROM sca_cases WHERE id = ${input.caseId} AND isActive = 1`
      );
      const cases = (result as any)[0] as any[];
      if (cases.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }

      const c = cases[0];
      // Parse JSON fields that are stored as TEXT
      let aiPatientPersona = null;
      let markSheet = null;
      let examinationFindings = null;
      let investigationResults = null;

      try {
        aiPatientPersona = typeof c.aiPatientPersona === "string" ? JSON.parse(c.aiPatientPersona) : c.aiPatientPersona;
      } catch { aiPatientPersona = null; }
      try {
        markSheet = typeof c.markSheet === "string" ? JSON.parse(c.markSheet) : c.markSheet;
      } catch { markSheet = null; }
      try {
        examinationFindings = typeof c.examinationFindings === "string" ? JSON.parse(c.examinationFindings) : c.examinationFindings;
      } catch { examinationFindings = null; }
      try {
        investigationResults = typeof c.investigationResults === "string" ? JSON.parse(c.investigationResults) : c.investigationResults;
      } catch { investigationResults = null; }

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        patientName: c.patientName,
        patientAge: c.patientAge,
        patientGender: c.patientGender,
        presentingComplaint: c.presentingComplaint,
        backgroundContext: c.backgroundContext,
        aiPatientPersona,
        markSheet,
        examinationFindings,
        investigationResults,
      };
    }),

  /**
   * Generate AI patient response using the full persona
   */
  generatePatientResponse: protectedProcedure
    .input(z.object({
      caseId: z.number(),
      userMessage: z.string(),
      conversationHistory: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).optional().default([]),
      isFirstMessage: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result3 = await db.execute(
        sql`SELECT aiPatientPersona, presentingComplaint, patientName, patientAge, patientGender FROM sca_cases WHERE id = ${input.caseId}`
      );
      const cases = (result3 as any)[0] as any[];
      if (cases.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }

      const c = cases[0];
      let persona: any = null;
      try {
        persona = typeof c.aiPatientPersona === "string" ? JSON.parse(c.aiPatientPersona) : c.aiPatientPersona;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid patient persona data" });
      }

      // Extract opening sentence from character field
      const characterText = persona?.character || "";
      const openingSentenceMatch = characterText.match(/Opening sentence:\s*(.+?)(?:\.|"|\}|$)/i);
      const openingSentence = openingSentenceMatch ? openingSentenceMatch[1].trim() : "";

      // If first message, return the opening sentence
      if (input.isFirstMessage) {
        return {
          response: openingSentence || `Hello doctor, ${c.presentingComplaint?.toLowerCase() || "I've not been feeling well"}.`,
        };
      }

      const { invokeLLM } = await import("./_core/llm");

      const systemPrompt = `You are ${c.patientName}, a ${c.patientAge}-year-old ${c.patientGender?.toLowerCase()} patient in a GP consultation.

CHARACTER AND BEHAVIOUR:
${persona.character || ""}

WHAT YOU WILL SHARE OPENLY (without being asked):
${persona.openHistory || ""}

INFORMATION YOU WILL ONLY REVEAL IF DIRECTLY ASKED:
${JSON.stringify(persona.historyIfAsked || {}, null, 2)}

SOCIAL HISTORY:
${persona.socialHistory || ""}

HOW TO REACT TO THE DOCTOR:
${persona.howToReact || ""}

CRITICAL RULES:
1. Stay completely in character at all times. You are the patient, not an AI.
2. Do NOT volunteer information from "historyIfAsked" unless the doctor asks directly and sensitively about that specific topic.
3. Apply the "howToReact" rules strictly — if the doctor is rushed or clinical, become guarded. If they are warm and empathetic, open up gradually.
4. Keep responses natural and conversational — 1-3 sentences typically. Patients don't give medical lectures.
5. Show emotion where appropriate (pause, become tearful, get defensive) based on the character description.
6. If asked about something not covered in your history, respond realistically as this character would.
7. Never break character or acknowledge you are an AI.
8. Use natural speech patterns — hesitations, incomplete sentences, emotional responses.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.conversationHistory || []).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: input.userMessage },
      ];

      const response = await invokeLLM({ messages: messages as any });
      const patientResponse = response.choices[0]?.message?.content || "I'm sorry, could you say that again?";

      return { response: patientResponse };
    }),

  /**
   * Save consultation results
   */
  saveConsultation: protectedProcedure
    .input(z.object({
      caseId: z.number(),
      caseTitle: z.string(),
      mode: z.string().optional().default("practice"),
      transcript: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.number().optional(),
      })),
      duration: z.number(), // seconds
      domain1Score: z.number(),
      domain2Score: z.number(),
      domain3Score: z.number(),
      totalScore: z.number(),
      passed: z.boolean(),
      competencyScores: z.record(z.string(), z.enum(["well", "partial", "poor"])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.execute(
        sql`INSERT INTO sca_consultations (userId, caseId, caseTitle, mode, transcript, duration, domain1Score, domain2Score, domain3Score, totalScore, passed, aiFeedback)
            VALUES (${ctx.user.id}, ${input.caseId}, ${input.caseTitle}, ${input.mode}, ${JSON.stringify(input.transcript)}, ${input.duration}, ${input.domain1Score}, ${input.domain2Score}, ${input.domain3Score}, ${input.totalScore}, ${input.passed}, ${JSON.stringify(input.competencyScores || {})})`
      );

      return { success: true, id: (result as any)[0]?.insertId || 0 };
    }),

  /**
   * Get consultation history for current user
   */
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.execute(
        sql`SELECT id, caseId, caseTitle, mode, duration, domain1Score, domain2Score, domain3Score, totalScore, passed, completedAt FROM sca_consultations WHERE userId = ${ctx.user.id} ORDER BY completedAt DESC LIMIT 50`
      );
      return (result as any)[0] as any[];
  }),

  /**
   * Get a specific consultation result
   */
  getConsultation: protectedProcedure
    .input(z.object({ consultationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result2 = await db.execute(
        sql`SELECT * FROM sca_consultations WHERE id = ${input.consultationId} AND userId = ${ctx.user.id}`
      );
      const consultations = (result2 as any)[0] as any[];
      if (consultations.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Consultation not found" });
      }

      const c = consultations[0];
      return {
        ...c,
        transcript: typeof c.transcript === "string" ? JSON.parse(c.transcript) : c.transcript,
        aiFeedback: typeof c.aiFeedback === "string" ? JSON.parse(c.aiFeedback) : c.aiFeedback,
      };
    }),
});
