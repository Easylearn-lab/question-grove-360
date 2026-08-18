import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql, count, and, asc } from "drizzle-orm";
import QRCode from "qrcode";

// ─── SSE EVENT STORE (in-memory for real-time broadcasting) ─────────────────
type SSEClient = { id: string; res: any; sessionCode: string };
const sseClients: SSEClient[] = [];

export function addSSEClient(client: SSEClient) {
  sseClients.push(client);
}

export function removeSSEClient(clientId: string) {
  const idx = sseClients.findIndex((c) => c.id === clientId);
  if (idx !== -1) sseClients.splice(idx, 1);
}

export function broadcastToSession(sessionCode: string, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients
    .filter((c) => c.sessionCode === sessionCode)
    .forEach((c) => {
      try { c.res.write(payload); } catch {}
    });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function calculatePoints(isCorrect: boolean, responseTimeMs: number, timeLimitMs: number): number {
  if (!isCorrect) return 0;
  // Kahoot-style: base 1000 points, minus time penalty (faster = more points)
  const timeRatio = Math.min(responseTimeMs / timeLimitMs, 1);
  const points = Math.round(1000 * (1 - timeRatio * 0.5));
  return Math.max(points, 500); // minimum 500 for correct answer
}

async function fetchQuestionFromSource(db: any, questionId: number, sourceTable: string) {
  const { sql: sqlFn } = await import("drizzle-orm");
  let query = "";
  if (sourceTable === "questions") {
    query = `SELECT id, question as stem, optionA, optionB, optionC, optionD, optionE, correctAnswer, explanationCorrect as explanation, specialty, topic FROM questions WHERE id = ${questionId}`;
  } else if (sourceTable === "plab1_questions") {
    query = `SELECT id, question as stem, optionA, optionB, optionC, optionD, optionE, correctAnswer, explanationCorrect as explanation, specialty, topic FROM plab1_questions WHERE id = ${questionId}`;
  } else if (sourceTable === "msra_cps_questions") {
    query = `SELECT id, question as stem, optionA, optionB, optionC, optionD, optionE, correctAnswer, explanationCorrect as explanation, specialty, topic FROM msra_cps_questions WHERE id = ${questionId}`;
  } else if (sourceTable === "jamb_questions") {
    query = `SELECT id, question_text as stem, option_a as optionA, option_b as optionB, option_c as optionC, option_d as optionD, NULL as optionE, correct_answer as correctAnswer, explanation, subject as specialty, topic FROM jamb_questions WHERE id = ${questionId}`;
  } else {
    return null;
  }
  const result = await db.execute(sqlFn.raw(query));
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  return (rows as any[])[0] || null;
}

async function fetchRandomQuestions(db: any, sourceTable: string, count: number, specialty?: string, topic?: string) {
  const { sql: sqlFn } = await import("drizzle-orm");
  let where = "WHERE 1=1";
  if (sourceTable === "questions") {
    where += " AND status = 'active'";
    if (specialty) where += ` AND specialty = '${specialty.replace(/'/g, "''")}'`;
    if (topic) where += ` AND topic = '${topic.replace(/'/g, "''")}'`;
  } else if (sourceTable === "plab1_questions") {
    where += " AND status = 'active'";
    if (specialty) where += ` AND specialty = '${specialty.replace(/'/g, "''")}'`;
    if (topic) where += ` AND topic = '${topic.replace(/'/g, "''")}'`;
  } else if (sourceTable === "msra_cps_questions") {
    where += " AND status = 'active'";
    if (specialty) where += ` AND specialty = '${specialty.replace(/'/g, "''")}'`;
  } else if (sourceTable === "jamb_questions") {
    if (specialty) where += ` AND subject = '${specialty.replace(/'/g, "''")}'`;
    if (topic) where += ` AND topic = '${topic.replace(/'/g, "''")}'`;
  }
  const query = `SELECT id FROM ${sourceTable} ${where} ORDER BY RAND() LIMIT ${count}`;
  const result = await db.execute(sqlFn.raw(query));
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  return (rows as any[]).map((r: any) => r.id);
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────
export const liveQuizRouter = router({
  // ─── SESSION MANAGEMENT ──────────────────────────────────────────────────
  createSession: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(255),
      examSource: z.enum(["questions", "plab1_questions", "msra_cps_questions", "jamb_questions"]),
      specialtyFilter: z.string().optional(),
      topicFilter: z.string().optional(),
      questionCount: z.number().min(5).max(50).default(10),
      timeLimitSeconds: z.number().min(10).max(120).default(30),
      isPublic: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions, liveSessionQuestions } = await import("../drizzle/schema");

      const sessionCode = generateSessionCode();

      // Fetch random questions from the source table
      const questionIds = await fetchRandomQuestions(
        db, input.examSource, input.questionCount, input.specialtyFilter, input.topicFilter
      );

      if (questionIds.length < 5) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough questions available for the selected filters. Need at least 5." });
      }

      // Create session
      const [result] = await db.insert(liveSessions).values({
        hostUserId: ctx.user.id,
        sessionCode,
        title: input.title,
        examSource: input.examSource,
        topicFilter: input.topicFilter || null,
        specialtyFilter: input.specialtyFilter || null,
        questionCount: questionIds.length,
        timeLimitSeconds: input.timeLimitSeconds,
        isPublic: input.isPublic,
        status: "waiting",
        currentQuestionIndex: -1,
      });

      const sessionId = (result as any).insertId;

      // Insert session questions
      for (let i = 0; i < questionIds.length; i++) {
        await db.insert(liveSessionQuestions).values({
          sessionId,
          questionId: questionIds[i],
          questionSourceTable: input.examSource,
          orderIndex: i,
          timeLimitSeconds: input.timeLimitSeconds,
        });
      }

      return { sessionId, sessionCode, questionCount: questionIds.length };
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionCode: z.string().optional(), sessionId: z.number().optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions, liveParticipants, users } = await import("../drizzle/schema");

      let session;
      if (input.sessionCode) {
        [session] = await db.select().from(liveSessions).where(eq(liveSessions.sessionCode, input.sessionCode));
      } else if (input.sessionId) {
        [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, input.sessionId));
      }
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });

      const participants = await db.select().from(liveParticipants).where(eq(liveParticipants.sessionId, session.id)).orderBy(desc(liveParticipants.totalScore));

      // Get host name
      const [host] = await db.select({ name: users.name }).from(users).where(eq(users.id, session.hostUserId));

      return { ...session, participants, hostName: host?.name || "Host" };
    }),

  getMyHostedSessions: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { liveSessions } = await import("../drizzle/schema");
    return db.select().from(liveSessions).where(eq(liveSessions.hostUserId, ctx.user.id)).orderBy(desc(liveSessions.createdAt));
  }),

  // ─── PARTICIPANT MANAGEMENT ──────────────────────────────────────────────
  joinSession: protectedProcedure
    .input(z.object({
      sessionCode: z.string().length(6),
      displayName: z.string().min(1).max(50),
      teamName: z.string().max(50).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions, liveParticipants } = await import("../drizzle/schema");

      const [session] = await db.select().from(liveSessions).where(eq(liveSessions.sessionCode, input.sessionCode.toUpperCase()));
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found. Check the code and try again." });
      if (session.status === "ended") throw new TRPCError({ code: "BAD_REQUEST", message: "This session has already ended." });

      // Check if already joined
      const existing = await db.select().from(liveParticipants).where(
        and(eq(liveParticipants.sessionId, session.id), eq(liveParticipants.userId, ctx.user.id))
      );
      if (existing.length > 0) return { participantId: existing[0].id, sessionId: session.id, alreadyJoined: true };

      const [result] = await db.insert(liveParticipants).values({
        sessionId: session.id,
        userId: ctx.user.id,
        displayName: input.displayName,
        teamName: input.teamName || null,
        totalScore: 0,
      });

      const participantId = (result as any).insertId;

      // Broadcast to host that someone joined
      broadcastToSession(session.sessionCode, "participant_joined", { participantId, displayName: input.displayName, teamName: input.teamName });

      return { participantId, sessionId: session.id, alreadyJoined: false };
    }),

  // ─── HOST CONTROLS ───────────────────────────────────────────────────────
  startSession: protectedProcedure
    .input(z.number()) // sessionId
    .mutation(async ({ ctx, input: sessionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions } = await import("../drizzle/schema");

      const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId));
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.hostUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await db.update(liveSessions).set({ status: "active", currentQuestionIndex: 0 }).where(eq(liveSessions.id, sessionId));

      broadcastToSession(session.sessionCode, "session_started", { currentQuestionIndex: 0 });
      return { success: true };
    }),

  nextQuestion: protectedProcedure
    .input(z.number()) // sessionId
    .mutation(async ({ ctx, input: sessionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions } = await import("../drizzle/schema");

      const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId));
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.hostUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const nextIndex = (session.currentQuestionIndex || 0) + 1;
      if (nextIndex >= (session.questionCount || 10)) {
        // End session
        await db.update(liveSessions).set({ status: "ended", endedAt: new Date(), currentQuestionIndex: nextIndex }).where(eq(liveSessions.id, sessionId));
        broadcastToSession(session.sessionCode, "session_ended", {});
        return { ended: true, currentQuestionIndex: nextIndex };
      }

      await db.update(liveSessions).set({ currentQuestionIndex: nextIndex }).where(eq(liveSessions.id, sessionId));
      broadcastToSession(session.sessionCode, "next_question", { currentQuestionIndex: nextIndex });
      return { ended: false, currentQuestionIndex: nextIndex };
    }),

  revealAnswer: protectedProcedure
    .input(z.number()) // sessionId
    .mutation(async ({ ctx, input: sessionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions, liveSessionQuestions, liveResponses } = await import("../drizzle/schema");

      const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId));
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.hostUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Get current question
      const [currentQ] = await db.select().from(liveSessionQuestions).where(
        and(eq(liveSessionQuestions.sessionId, sessionId), eq(liveSessionQuestions.orderIndex, session.currentQuestionIndex || 0))
      );
      if (!currentQ) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

      // Fetch the actual question to get correct answer
      const questionData = await fetchQuestionFromSource(db, currentQ.questionId, currentQ.questionSourceTable);

      // Get response distribution
      const { sql: sqlFn } = await import("drizzle-orm");
      const distResult = await db.execute(sqlFn.raw(
        `SELECT selectedAnswer, COUNT(*) as cnt, SUM(isCorrect) as correct_count FROM live_responses WHERE sessionId = ${sessionId} AND questionId = ${currentQ.questionId} GROUP BY selectedAnswer`
      ));
      const distRows = Array.isArray(distResult) && Array.isArray(distResult[0]) ? distResult[0] : distResult;

      broadcastToSession(session.sessionCode, "answer_revealed", {
        correctAnswer: questionData?.correctAnswer,
        explanation: questionData?.explanation,
        distribution: distRows,
      });

      return { correctAnswer: questionData?.correctAnswer, explanation: questionData?.explanation, distribution: distRows };
    }),

  // ─── GET CURRENT QUESTION (for participants and host) ────────────────────
  getCurrentQuestion: protectedProcedure
    .input(z.object({ sessionId: z.number(), includeAnswer: z.boolean().default(false) }))
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions, liveSessionQuestions } = await import("../drizzle/schema");

      const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, input.sessionId));
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const qIdx = session.currentQuestionIndex;
      if (qIdx === undefined || qIdx === null || qIdx < 0) return null;

      const [currentQ] = await db.select().from(liveSessionQuestions).where(
        and(eq(liveSessionQuestions.sessionId, input.sessionId), eq(liveSessionQuestions.orderIndex, qIdx))
      );
      if (!currentQ) return null;

      const questionData = await fetchQuestionFromSource(db, currentQ.questionId, currentQ.questionSourceTable);
      if (!questionData) return null;

      return {
        questionIndex: session.currentQuestionIndex,
        totalQuestions: session.questionCount,
        timeLimitSeconds: currentQ.timeLimitSeconds || session.timeLimitSeconds || 30,
        stem: questionData.stem,
        optionA: questionData.optionA,
        optionB: questionData.optionB,
        optionC: questionData.optionC,
        optionD: questionData.optionD,
        optionE: questionData.optionE,
        ...(input.includeAnswer ? { correctAnswer: questionData.correctAnswer, explanation: questionData.explanation } : {}),
      };
    }),

  // ─── SUBMIT ANSWER ───────────────────────────────────────────────────────
  submitAnswer: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      participantId: z.number(),
      selectedAnswer: z.string(),
      responseTimeMs: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions, liveSessionQuestions, liveResponses, liveParticipants } = await import("../drizzle/schema");

      const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, input.sessionId));
      if (!session || session.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Session is not active" });

      const [currentQ] = await db.select().from(liveSessionQuestions).where(
        and(eq(liveSessionQuestions.sessionId, input.sessionId), eq(liveSessionQuestions.orderIndex, session.currentQuestionIndex || 0))
      );
      if (!currentQ) throw new TRPCError({ code: "NOT_FOUND" });

      // Check if already answered this question
      const existing = await db.select().from(liveResponses).where(
        and(eq(liveResponses.sessionId, input.sessionId), eq(liveResponses.participantId, input.participantId), eq(liveResponses.questionId, currentQ.questionId))
      );
      if (existing.length > 0) return { alreadyAnswered: true, points: existing[0].pointsAwarded };

      // Check correctness
      const questionData = await fetchQuestionFromSource(db, currentQ.questionId, currentQ.questionSourceTable);
      const isCorrect = questionData?.correctAnswer?.toUpperCase() === input.selectedAnswer.toUpperCase();
      const timeLimitMs = (currentQ.timeLimitSeconds || 30) * 1000;
      const points = calculatePoints(isCorrect, input.responseTimeMs, timeLimitMs);

      // Save response
      await db.insert(liveResponses).values({
        sessionId: input.sessionId,
        participantId: input.participantId,
        questionId: currentQ.questionId,
        selectedAnswer: input.selectedAnswer,
        isCorrect,
        responseTimeMs: input.responseTimeMs,
        pointsAwarded: points,
      });

      // Update participant total score
      await db.execute(sql`UPDATE live_participants SET totalScore = totalScore + ${points} WHERE id = ${input.participantId}`);

      // Broadcast response count update
      const [responseCount] = await db.select({ total: count() }).from(liveResponses).where(
        and(eq(liveResponses.sessionId, input.sessionId), eq(liveResponses.questionId, currentQ.questionId))
      );
      broadcastToSession(session.sessionCode, "response_count", { count: responseCount?.total || 0, questionId: currentQ.questionId });

      return { alreadyAnswered: false, points, isCorrect };
    }),

  // ─── LEADERBOARD ─────────────────────────────────────────────────────────
  getLeaderboard: protectedProcedure
    .input(z.number()) // sessionId
    .query(async ({ input: sessionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveParticipants } = await import("../drizzle/schema");

      const participants = await db.select().from(liveParticipants).where(eq(liveParticipants.sessionId, sessionId)).orderBy(desc(liveParticipants.totalScore));

      // Team scores
      const teams: Record<string, { teamName: string; totalScore: number; members: number }> = {};
      for (const p of participants) {
        if (p.teamName) {
          if (!teams[p.teamName]) teams[p.teamName] = { teamName: p.teamName, totalScore: 0, members: 0 };
          teams[p.teamName].totalScore += p.totalScore || 0;
          teams[p.teamName].members++;
        }
      }
      const teamLeaderboard = Object.values(teams).sort((a, b) => b.totalScore - a.totalScore);

      return { individuals: participants, teams: teamLeaderboard };
    }),

  // ─── HOST ANALYTICS ──────────────────────────────────────────────────────
  getSessionAnalytics: protectedProcedure
    .input(z.number()) // sessionId
    .query(async ({ ctx, input: sessionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { liveSessions, liveSessionQuestions, liveResponses, liveParticipants } = await import("../drizzle/schema");
      const { sql: sqlFn } = await import("drizzle-orm");

      const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId));
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      // Per-question stats
      const questions = await db.select().from(liveSessionQuestions).where(eq(liveSessionQuestions.sessionId, sessionId)).orderBy(asc(liveSessionQuestions.orderIndex));

      const questionStats = [];
      for (const q of questions) {
        const questionData = await fetchQuestionFromSource(db, q.questionId, q.questionSourceTable);
        const statsResult = await db.execute(sqlFn.raw(
          `SELECT COUNT(*) as total, SUM(isCorrect) as correct, AVG(responseTimeMs) as avgTime FROM live_responses WHERE sessionId = ${sessionId} AND questionId = ${q.questionId}`
        ));
        const statsRows = Array.isArray(statsResult) && Array.isArray(statsResult[0]) ? statsResult[0] : statsResult;
        const stats = (statsRows as any[])[0] || {};

        questionStats.push({
          orderIndex: q.orderIndex,
          stem: questionData?.stem?.slice(0, 100) || "Question",
          correctAnswer: questionData?.correctAnswer,
          totalResponses: parseInt(stats.total) || 0,
          correctResponses: parseInt(stats.correct) || 0,
          accuracyPercent: stats.total > 0 ? Math.round((parseInt(stats.correct) / parseInt(stats.total)) * 100) : 0,
          avgResponseTimeMs: Math.round(parseFloat(stats.avgTime) || 0),
        });
      }

      const [participantCount] = await db.select({ total: count() }).from(liveParticipants).where(eq(liveParticipants.sessionId, sessionId));

      return {
        session,
        participantCount: participantCount?.total || 0,
        questionStats,
        hardestQuestion: questionStats.sort((a, b) => a.accuracyPercent - b.accuracyPercent)[0],
        easiestQuestion: questionStats.sort((a, b) => b.accuracyPercent - a.accuracyPercent)[0],
      };
    }),

  // ─── PUBLIC DIRECTORY ────────────────────────────────────────────────────
  getPublicSessions: publicProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { liveSessions, users } = await import("../drizzle/schema");

    const sessions = await db
      .select({
        id: liveSessions.id,
        sessionCode: liveSessions.sessionCode,
        title: liveSessions.title,
        examSource: liveSessions.examSource,
        status: liveSessions.status,
        questionCount: liveSessions.questionCount,
        hostName: users.name,
        createdAt: liveSessions.createdAt,
      })
      .from(liveSessions)
      .leftJoin(users, eq(liveSessions.hostUserId, users.id))
      .where(and(eq(liveSessions.isPublic, true), eq(liveSessions.status, "waiting")))
      .orderBy(desc(liveSessions.createdAt))
      .limit(20);

    return sessions;
  }),

  // ─── GLOBAL LEADERBOARD ──────────────────────────────────────────────────
  getGlobalLeaderboard: publicProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { sql: sqlFn } = await import("drizzle-orm");

    // Top individuals across all public sessions
    const indResult = await db.execute(sqlFn.raw(
      `SELECT lp.displayName, SUM(lp.totalScore) as totalScore, COUNT(DISTINCT lp.sessionId) as sessionsPlayed
       FROM live_participants lp
       JOIN live_sessions ls ON lp.sessionId = ls.id
       WHERE ls.isPublic = 1 AND ls.status = 'ended'
       GROUP BY lp.userId, lp.displayName
       ORDER BY totalScore DESC
       LIMIT 20`
    ));
    const individuals = Array.isArray(indResult) && Array.isArray(indResult[0]) ? indResult[0] : indResult;

    // Top teams
    const teamResult = await db.execute(sqlFn.raw(
      `SELECT lp.teamName, SUM(lp.totalScore) as totalScore, COUNT(DISTINCT lp.id) as members
       FROM live_participants lp
       JOIN live_sessions ls ON lp.sessionId = ls.id
       WHERE ls.isPublic = 1 AND ls.status = 'ended' AND lp.teamName IS NOT NULL AND lp.teamName != ''
       GROUP BY lp.teamName
       ORDER BY totalScore DESC
       LIMIT 20`
    ));
    const teams = Array.isArray(teamResult) && Array.isArray(teamResult[0]) ? teamResult[0] : teamResult;

    return { individuals, teams };
  }),

  // ─── QR CODE ─────────────────────────────────────────────────────────────
  getQRCode: protectedProcedure
    .input(z.object({ sessionCode: z.string(), baseUrl: z.string() }))
    .query(async ({ input }) => {
      const joinUrl = `${input.baseUrl}/live/join?code=${input.sessionCode}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 300, margin: 2 });
      return { qrDataUrl, joinUrl };
    }),
});
