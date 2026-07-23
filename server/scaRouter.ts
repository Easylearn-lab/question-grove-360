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
      sql`SELECT id, title, category, difficulty, patientName, patientAge, patientGender, presentingComplaint, isFreeTrialCase FROM sca_cases WHERE isActive = 1 ORDER BY id`
    );
    return (result as any)[0] as any[];
  }),

  /**
   * Get full case details (protected - requires subscription)
   */
  getCaseById: protectedProcedure
    .input(z.object({ caseId: z.number(), isFreeTrial: z.boolean().optional().default(false) }))
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
      // If requesting as free trial, verify the case is actually a free trial case
      if (input.isFreeTrial && !cases[0].isFreeTrialCase) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This case is not available for free trial" });
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
      empathyScore: z.number().optional(),
      isFreeTrial: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Free trial consultations are not saved to history
      if (input.isFreeTrial) {
        return { success: true, id: 0, freeTrial: true };
      }

      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.execute(
        sql`INSERT INTO sca_consultations (userId, caseId, caseTitle, mode, transcript, duration, domain1Score, domain2Score, domain3Score, totalScore, passed, empathyScore, aiFeedback)
            VALUES (${ctx.user.id}, ${input.caseId}, ${input.caseTitle}, ${input.mode}, ${JSON.stringify(input.transcript)}, ${input.duration}, ${input.domain1Score}, ${input.domain2Score}, ${input.domain3Score}, ${input.totalScore}, ${input.passed}, ${input.empathyScore ?? null}, ${JSON.stringify(input.competencyScores || {})})`
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
        sql`SELECT id, caseId, caseTitle, mode, duration, domain1Score, domain2Score, domain3Score, totalScore, passed, empathyScore, completedAt FROM sca_consultations WHERE userId = ${ctx.user.id} ORDER BY completedAt DESC LIMIT 50`
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

  /**
   * Export SCA Progress Report as PDF
   * Includes: domain averages (radar summary), score trend, consultation table, weakest domain analysis
   */
  exportProgressPDF: protectedProcedure.mutation(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const result = await db.execute(
      sql`SELECT id, caseId, caseTitle, mode, duration, domain1Score, domain2Score, domain3Score, totalScore, passed, completedAt FROM sca_consultations WHERE userId = ${ctx.user.id} ORDER BY completedAt DESC LIMIT 50`
    );
    const consultations = (result as any)[0] as any[];

    if (consultations.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No consultations found" });
    }

    // Compute averages
    const total = consultations.length;
    const avgD1 = consultations.reduce((sum: number, c: any) => sum + (c.domain1Score || 0), 0) / total;
    const avgD2 = consultations.reduce((sum: number, c: any) => sum + (c.domain2Score || 0), 0) / total;
    const avgD3 = consultations.reduce((sum: number, c: any) => sum + (c.domain3Score || 0), 0) / total;
    const passRate = (consultations.filter((c: any) => c.passed).length / total) * 100;
    const avgTotal = (avgD1 + avgD2 + avgD3);

    // Weakest domain
    const minScore = Math.min(avgD1, avgD2, avgD3);
    let weakestDomain = "Data Gathering";
    if (minScore === avgD2) weakestDomain = "Clinical Management";
    else if (minScore === avgD3) weakestDomain = "Interpersonal Skills";

    // Generate PDF
    const { PDFDocument, rgb } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const boldFont = await pdfDoc.embedFont("Helvetica-Bold");
    const regularFont = await pdfDoc.embedFont("Helvetica");

    // Page 1: Summary
    const page1 = pdfDoc.addPage([612, 792]);
    const { width } = page1.getSize();
    let y = 750;
    const margin = 45;
    const teal = rgb(0.09, 0.55, 0.55);
    const dark = rgb(0.1, 0.1, 0.1);
    const green = rgb(0.09, 0.64, 0.26);
    const red = rgb(0.8, 0.15, 0.15);
    const grey = rgb(0.5, 0.5, 0.5);

    // Header
    page1.drawText("Question Grove 360", { x: margin, y, size: 22, color: teal, font: boldFont });
    y -= 28;
    page1.drawText("SCA Progress Report", { x: margin, y, size: 14, color: dark, font: regularFont });
    y -= 20;
    page1.drawText(`Candidate: ${ctx.user.name || ctx.user.email || "Unknown"}`, { x: margin, y, size: 10, color: grey, font: regularFont });
    y -= 16;
    page1.drawText(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { x: margin, y, size: 10, color: grey, font: regularFont });
    y -= 35;

    // Domain Performance Summary Box
    page1.drawRectangle({ x: margin, y: y - 100, width: width - margin * 2, height: 100, borderColor: teal, borderWidth: 1.5, color: rgb(0.96, 0.99, 0.99) });
    page1.drawText("Domain Performance (Average Scores)", { x: margin + 15, y: y - 20, size: 12, color: teal, font: boldFont });
    page1.drawText(`Data Gathering: ${avgD1.toFixed(2)} / 3`, { x: margin + 15, y: y - 42, size: 11, color: dark, font: regularFont });
    page1.drawText(`Clinical Management: ${avgD2.toFixed(2)} / 3`, { x: margin + 15, y: y - 58, size: 11, color: dark, font: regularFont });
    page1.drawText(`Interpersonal Skills: ${avgD3.toFixed(2)} / 3`, { x: margin + 15, y: y - 74, size: 11, color: dark, font: regularFont });
    page1.drawText(`Average Total: ${avgTotal.toFixed(1)} / 9`, { x: width - 200, y: y - 42, size: 12, color: teal, font: boldFont });
    page1.drawText(`Pass Rate: ${passRate.toFixed(0)}%`, { x: width - 200, y: y - 60, size: 11, color: passRate >= 50 ? green : red, font: boldFont });
    y -= 125;

    // Score Trend Section
    page1.drawText("Score Trend (Chronological)", { x: margin, y, size: 12, color: teal, font: boldFont });
    y -= 20;

    // Draw a simple text-based trend showing scores over time
    const chronological = [...consultations].reverse();
    const trendEntries = chronological.slice(0, 20); // Show last 20
    trendEntries.forEach((c: any, idx: number) => {
      if (y < 120) return; // Don't overflow page
      const dateStr = c.completedAt ? new Date(c.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
      const scoreBar = "\u2588".repeat(c.totalScore || 0) + "\u2591".repeat(9 - (c.totalScore || 0));
      const passText = c.passed ? "Pass" : "Fail";
      page1.drawText(`${dateStr}  ${scoreBar}  ${c.totalScore}/9 (${passText})`, { x: margin + 10, y, size: 9, color: c.passed ? green : red, font: regularFont });
      y -= 15;
    });
    y -= 20;

    // Weakest Domain Analysis
    if (y > 100) {
      page1.drawText("Weakness Analysis", { x: margin, y, size: 12, color: teal, font: boldFont });
      y -= 20;
      page1.drawText(
        `Your weakest domain is ${weakestDomain} (avg ${minScore.toFixed(2)}/3). Focus your revision on improving `,
        { x: margin, y, size: 10, color: dark, font: regularFont }
      );
      y -= 14;
      page1.drawText(
        `this area to raise your overall SCA performance. ${total} consultation(s) completed to date.`,
        { x: margin, y, size: 10, color: dark, font: regularFont }
      );
    }

    // Empathy Score Section
    if (y > 80) {
      y -= 15;
      const purple = rgb(0.45, 0.15, 0.7);
      page1.drawText("Empathy Score", { x: margin, y, size: 12, color: purple, font: boldFont });
      y -= 20;
      // Calculate aggregate empathy metrics from consultations
      const totalConsultations = consultations.length;
      const passedCount = consultations.filter((c: any) => c.passed).length;
      // Estimate empathy from pass rate and domain 3 (Interpersonal Skills)
      const avgInterpersonal = avgD3;
      const interpersonalPct = Math.round((avgInterpersonal / 3) * 100);
      const empathyEstimate = Math.min(100, Math.round((interpersonalPct * 0.6) + (passRate * 0.4)));
      page1.drawText(`Overall Empathy Estimate: ${empathyEstimate}%`, { x: margin + 10, y, size: 11, color: dark, font: boldFont });
      y -= 16;
      page1.drawText(`Based on: Interpersonal Skills avg ${avgD3.toFixed(2)}/3 (${interpersonalPct}%) and overall pass rate ${passRate.toFixed(0)}%`, { x: margin + 10, y, size: 9, color: grey, font: regularFont });
      y -= 16;
      let empathyExplanation = "";
      if (empathyEstimate >= 80) {
        empathyExplanation = "Excellent empathetic communication demonstrated across consultations.";
      } else if (empathyEstimate >= 60) {
        empathyExplanation = "Good empathetic approach. Continue developing active listening and reassurance techniques.";
      } else if (empathyEstimate >= 40) {
        empathyExplanation = "Moderate empathy. Focus on acknowledging emotions earlier and providing clearer reassurance.";
      } else {
        empathyExplanation = "Empathy needs development. Prioritise active listening and emotional validation in consultations.";
      }
      page1.drawText(empathyExplanation, { x: margin + 10, y, size: 9, color: dark, font: regularFont });
    }

    // Footer
    page1.drawText("Generated by Question Grove 360 — MRCGP SCA Training Platform", { x: margin, y: 25, size: 8, color: grey, font: regularFont });

    // Page 2: Consultation Table
    const page2 = pdfDoc.addPage([612, 792]);
    let y2 = 750;
    page2.drawText("Consultation History", { x: margin, y: y2, size: 14, color: teal, font: boldFont });
    y2 -= 30;

    // Table header
    page2.drawText("Case", { x: margin, y: y2, size: 9, color: grey, font: boldFont });
    page2.drawText("Date", { x: 230, y: y2, size: 9, color: grey, font: boldFont });
    page2.drawText("D1", { x: 320, y: y2, size: 9, color: grey, font: boldFont });
    page2.drawText("D2", { x: 360, y: y2, size: 9, color: grey, font: boldFont });
    page2.drawText("D3", { x: 400, y: y2, size: 9, color: grey, font: boldFont });
    page2.drawText("Total", { x: 440, y: y2, size: 9, color: grey, font: boldFont });
    page2.drawText("Result", { x: 500, y: y2, size: 9, color: grey, font: boldFont });
    y2 -= 5;
    page2.drawLine({ start: { x: margin, y: y2 }, end: { x: width - margin, y: y2 }, thickness: 0.5, color: grey });
    y2 -= 15;

    // Table rows
    consultations.forEach((c: any) => {
      if (y2 < 50) {
        // Would need new page for very long lists
        return;
      }
      const title = (c.caseTitle || `Case #${c.caseId}`).substring(0, 28);
      const dateStr = c.completedAt ? new Date(c.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
      const rowColor = c.passed ? green : red;
      page2.drawText(title, { x: margin, y: y2, size: 9, color: dark, font: regularFont });
      page2.drawText(dateStr, { x: 230, y: y2, size: 9, color: dark, font: regularFont });
      page2.drawText(String(c.domain1Score || 0), { x: 325, y: y2, size: 9, color: dark, font: regularFont });
      page2.drawText(String(c.domain2Score || 0), { x: 365, y: y2, size: 9, color: dark, font: regularFont });
      page2.drawText(String(c.domain3Score || 0), { x: 405, y: y2, size: 9, color: dark, font: regularFont });
      page2.drawText(`${c.totalScore || 0}/9`, { x: 440, y: y2, size: 9, color: dark, font: regularFont });
      page2.drawText(c.passed ? "Pass" : "Fail", { x: 500, y: y2, size: 9, color: rowColor, font: boldFont });
      y2 -= 16;
    });

    // Footer page 2
    page2.drawText("Generated by Question Grove 360 — MRCGP SCA Training Platform", { x: margin, y: 25, size: 8, color: grey, font: regularFont });

    const pdfBytes = await pdfDoc.save();
    return {
      pdfBase64: Buffer.from(pdfBytes).toString("base64"),
      filename: `sca-progress-report-${new Date().toISOString().slice(0, 10)}.pdf`,
    };
  }),
});
