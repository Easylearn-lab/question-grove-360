import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getOrCreateProfile, updateProfile, getProfileByUserId } from "./db";
import { stripeRouter } from "./stripeRouter";
import { adminRouter } from "./adminRouter";
import { aiCoachRouter } from "./aiCoachRouter";
import { twoFactorRouter } from "./twoFactorRouter";
import { voiceRouter } from "./voiceRouter";
import { adaptiveRouter } from "./adaptiveAlgorithm";
import { passwordRouter } from "./passwordRouter";
import { scaRouter } from "./scaRouter";

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

  // Profile Router
  profile: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await getProfileByUserId(ctx.user.id);
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          specialty: z.string().optional(),
          trainingYear: z.number().optional(),
          targetExam: z.string().optional(),
          country: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await updateProfile(ctx.user.id, input);
      }),
  }),

  // Questions Router
  questions: router({
    getQuestions: protectedProcedure
      .input(
        z.object({
          specialty: z.string().optional(),
          limit: z.number().default(500),
          offset: z.number().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getQuestionsByFilters } = await import("./db");
        return await getQuestionsByFilters(input.specialty, input.limit, input.offset, ctx.user.id);
      }),
    getQuestionById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const { getQuestionById } = await import("./db");
        return await getQuestionById(input);
      }),
    bookmarkQuestion: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const { bookmarkQuestion } = await import("./db");
        return await bookmarkQuestion(ctx.user.id, input);
      }),
    getBookmarks: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getBookmarks } = await import("./db");
        return await getBookmarks(ctx.user.id, input.limit, input.offset);
      }),
    removeBookmark: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        const { removeBookmark } = await import("./db");
        return await removeBookmark(ctx.user.id, input);
      }),
    bookmarkExplanation: protectedProcedure
      .input(z.object({
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { bookmarkExplanation } = await import("./db");
        return await bookmarkExplanation(ctx.user.id, input.content);
      }),
    getBookmarkedExplanations: protectedProcedure
      .query(async ({ ctx }) => {
        const { getBookmarkedExplanations } = await import("./db");
        return await getBookmarkedExplanations(ctx.user.id);
      }),
    isBookmarkedExplanation: protectedProcedure
      .input(z.string())
      .query(async ({ ctx, input }) => {
        const { isBookmarkedExplanation } = await import("./db");
        return await isBookmarkedExplanation(ctx.user.id, input);
      }),
    isBookmarked: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const { isQuestionBookmarked } = await import("./db");
        return await isQuestionBookmarked(ctx.user.id, input);
      }),
    resetAttempts: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { resetUserQuestionAttempts } = await import("./db");
        return await resetUserQuestionAttempts(ctx.user.id);
      }),
    resetAttemptsBySpecialty: protectedProcedure
      .input(z.object({
        specialty: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { resetUserQuestionAttemptsBySpecialty } = await import("./db");
        return await resetUserQuestionAttemptsBySpecialty(ctx.user.id, input.specialty);
      }),

  }),

  // Mock Exams Router
  mockExams: router({
    // Get list of all 5 mocks with user attempt history
    getMocks: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { sql } = await import("drizzle-orm");
      const mocksResult = await db.execute(sql`SELECT id, name, questionCount, timeLimit, passMark FROM mocks WHERE examId = 1 AND isActive = 1`);
      const mocksRows = Array.isArray(mocksResult) && Array.isArray(mocksResult[0]) ? mocksResult[0] : mocksResult;
      const resultsData = await db.execute(sql`SELECT mockId, COUNT(*) as attempts, MAX(score) as bestScore, MAX(percentage) as bestPercentage, MAX(completedAt) as lastAttempt FROM mock_results WHERE userId = ${ctx.user.id} AND examId = 1 GROUP BY mockId`);
      const resultsRows = Array.isArray(resultsData) && Array.isArray(resultsData[0]) ? resultsData[0] : resultsData;
      return (mocksRows as any[]).map((m: any) => {
        const userResult = (resultsRows as any[]).find((r: any) => r.mockId === m.id);
        return {
          id: m.id,
          name: m.name,
          questionsCount: m.questionCount || 160,
          timerMinutes: m.timeLimit || 155,
          passMark: Number(m.passMark) || 70,
          bestScore: userResult ? Number(userResult.bestScore) : null,
          bestPercentage: userResult ? Number(userResult.bestPercentage) : null,
          attempts: userResult ? Number(userResult.attempts) : 0,
          lastAttempt: userResult?.lastAttempt || null,
        };
      });
    }),

    // Start a mock exam - fetch 160 random questions
    startMock: protectedProcedure
      .input(z.object({ mockId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sql } = await import("drizzle-orm");
        const questionsResult = await db.execute(sql`SELECT id, question, optionA, optionB, optionC, optionD, optionE, specialty, tags FROM questions WHERE examId = 1 AND status = 'active' ORDER BY RAND() LIMIT 160`);
        const questions = Array.isArray(questionsResult) && Array.isArray(questionsResult[0]) ? questionsResult[0] : questionsResult;
        if ((questions as any[]).length < 160) throw new Error("Not enough questions available");
        return {
          mockId: input.mockId,
          questions: (questions as any[]).map((q: any) => ({
            id: q.id,
            stem: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            optionE: q.optionE,
            specialty: q.specialty,
            tags: q.tags,
          })),
          timerMinutes: 155,
          totalQuestions: 160,
          passMarkPercentage: 70,
        };
      }),

    // Submit mock exam results
    submitMock: protectedProcedure
      .input(z.object({
        mockId: z.number(),
        mockName: z.string(),
        answers: z.record(z.string(), z.string()),
        flaggedQuestions: z.array(z.number()).optional(),
        timeTaken: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sql } = await import("drizzle-orm");
        const questionIds = Object.keys(input.answers).map(Number);
        if (questionIds.length === 0) throw new Error("No answers provided");
        const questionsResult = await db.execute(sql`SELECT id, correctAnswer, specialty FROM questions WHERE id IN (${sql.raw(questionIds.join(","))})`);
        const questions = Array.isArray(questionsResult) && Array.isArray(questionsResult[0]) ? questionsResult[0] : questionsResult;
        let score = 0;
        const specialtyScores: Record<string, { correct: number; total: number; percentage: number }> = {};
        (questions as any[]).forEach((q: any) => {
          const userAnswer = input.answers[q.id.toString()];
          const isCorrect = userAnswer === q.correctAnswer;
          if (isCorrect) score++;
          if (!specialtyScores[q.specialty]) specialtyScores[q.specialty] = { correct: 0, total: 0, percentage: 0 };
          specialtyScores[q.specialty].total++;
          if (isCorrect) specialtyScores[q.specialty].correct++;
        });
        Object.keys(specialtyScores).forEach(k => {
          specialtyScores[k].percentage = Math.round((specialtyScores[k].correct / specialtyScores[k].total) * 100);
        });
        const percentage = (score / 160) * 100;
        const passed = percentage >= 70;
        await db.execute(sql`INSERT INTO mock_results (userId, mockId, mockName, examId, score, totalQuestions, percentage, passed, timeTaken, answers, flaggedQuestions, specialtyBreakdown, completedAt) VALUES (${ctx.user.id}, ${input.mockId}, ${input.mockName}, 1, ${score}, 160, ${percentage.toFixed(2)}, ${passed ? 1 : 0}, ${input.timeTaken}, ${JSON.stringify(input.answers)}, ${JSON.stringify(input.flaggedQuestions || [])}, ${JSON.stringify(specialtyScores)}, NOW())`);
        const insertResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
        const insertRows = Array.isArray(insertResult) && Array.isArray(insertResult[0]) ? insertResult[0] : insertResult;
        const resultId = (insertRows as any[])[0]?.id || 0;
        
        // Send PDF report email asynchronously
        try {
          const { sendExamReportEmail } = await import("./emailService");
          const specialtyBreakdown: Record<string, number> = {};
          Object.entries(specialtyScores).forEach(([specialty, data]) => {
            specialtyBreakdown[specialty] = (data as any).percentage;
          });
          
          sendExamReportEmail({
            userId: ctx.user.id,
            userEmail: ctx.user.email || '',
            userName: ctx.user.name || 'User',
            examName: input.mockName,
            score,
            totalQuestions: 160,
            accuracy: Math.round(percentage),
            specialtyBreakdown,
            completedAt: new Date(),
          }).catch(err => console.error('Failed to send exam report email:', err));
        } catch (err) {
          console.error('Error triggering email report:', err);
        }
        
        return { resultId: Number(resultId), score, percentage: percentage.toFixed(2), passed, specialtyScores, timeTaken: input.timeTaken };
      }),

    // Download PDF score report
    downloadPDF: protectedProcedure
      .input(z.object({ resultId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sql } = await import("drizzle-orm");
        const result = await db.execute(sql`SELECT * FROM mock_results WHERE id = ${input.resultId} AND userId = ${ctx.user.id}`);
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        if ((rows as any[]).length === 0) throw new Error("Result not found");
        const r = (rows as any[])[0];
        
        // Generate PDF
        const { PDFDocument, rgb } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]);
        const { height } = page.getSize();
        
        let yPosition = height - 50;
        const margin = 50;
        const lineHeight = 20;
        
        // Title
        page.drawText('EXAM SCORE REPORT', {
          x: margin,
          y: yPosition,
          size: 24,
          color: rgb(0.1, 0.3, 0.8),
        });
        yPosition -= lineHeight * 2;
        
        // Header
        page.drawText(`Exam: ${r.mockName}`, { x: margin, y: yPosition, size: 11, color: rgb(0, 0, 0) });
        yPosition -= lineHeight;
        page.drawText(`Date: ${new Date(r.completedAt).toLocaleDateString()}`, { x: margin, y: yPosition, size: 11, color: rgb(0, 0, 0) });
        yPosition -= lineHeight * 2;
        
        // Results
        page.drawText('RESULTS', { x: margin, y: yPosition, size: 14, color: rgb(0.1, 0.3, 0.8) });
        yPosition -= lineHeight * 1.5;
        
        const scoreColor = r.percentage >= 70 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0);
        page.drawText(`Score: ${r.score}/${r.totalQuestions}`, { x: margin, y: yPosition, size: 12, color: rgb(0, 0, 0) });
        yPosition -= lineHeight;
        page.drawText(`Accuracy: ${r.percentage}%`, { x: margin, y: yPosition, size: 12, color: scoreColor });
        yPosition -= lineHeight;
        page.drawText(`Status: ${r.passed ? 'PASSED' : 'FAILED'}`, { x: margin, y: yPosition, size: 12, color: scoreColor });
        yPosition -= lineHeight * 2;
        
        // Specialty breakdown
        page.drawText('SPECIALTY BREAKDOWN', { x: margin, y: yPosition, size: 14, color: rgb(0.1, 0.3, 0.8) });
        yPosition -= lineHeight * 1.5;
        
        const specialtyBreakdown = typeof r.specialtyBreakdown === 'string' ? JSON.parse(r.specialtyBreakdown) : r.specialtyBreakdown;
        Object.entries(specialtyBreakdown).forEach(([specialty, data]: [string, any]) => {
          page.drawText(`${specialty}: ${data.percentage}%`, { x: margin + 20, y: yPosition, size: 11, color: rgb(0, 0, 0) });
          yPosition -= lineHeight;
        });
        
        // Footer
        page.drawText('Generated by Question Grove 360', { x: margin, y: 30, size: 9, color: rgb(0.5, 0.5, 0.5) });
        
        const pdfBytes = await pdfDoc.save();
        return {
          pdfBase64: Buffer.from(pdfBytes).toString('base64'),
          filename: `exam-score-${r.mockName.replace(/\s+/g, '-')}.pdf`,
        };
      }),

    // Get results for a specific attempt
    getResult: protectedProcedure
      .input(z.object({ resultId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sql } = await import("drizzle-orm");
        const result = await db.execute(sql`SELECT * FROM mock_results WHERE id = ${input.resultId} AND userId = ${ctx.user.id}`);
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        if ((rows as any[]).length === 0) throw new Error("Result not found");
        const r = (rows as any[])[0];
        return {
          id: r.id,
          mockId: r.mockId,
          mockName: r.mockName,
          score: r.score,
          totalQuestions: r.totalQuestions,
          percentage: Number(r.percentage),
          passed: Boolean(r.passed),
          timeTaken: r.timeTaken,
          specialtyBreakdown: typeof r.specialtyBreakdown === 'string' ? JSON.parse(r.specialtyBreakdown) : r.specialtyBreakdown,
          answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers,
          flaggedQuestions: typeof r.flaggedQuestions === 'string' ? JSON.parse(r.flaggedQuestions) : (r.flaggedQuestions || []),
          completedAt: r.completedAt,
        };
      }),

    // Get attempt history for a specific mock
    getHistory: protectedProcedure
      .input(z.object({ mockId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return [];
        const { sql } = await import("drizzle-orm");
        const result = await db.execute(sql`SELECT id, score, percentage, passed, timeTaken, completedAt FROM mock_results WHERE userId = ${ctx.user.id} AND mockId = ${input.mockId} ORDER BY completedAt DESC LIMIT 10`);
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        return (rows as any[]).map((r: any) => ({
          id: r.id,
          score: r.score,
          percentage: Number(r.percentage),
          passed: Boolean(r.passed),
          timeTaken: r.timeTaken,
          completedAt: r.completedAt,
        }));
      }),

    // Get question review for a specific attempt
    getReview: protectedProcedure
      .input(z.object({ resultId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sql } = await import("drizzle-orm");
        const resultData = await db.execute(sql`SELECT answers, flaggedQuestions FROM mock_results WHERE id = ${input.resultId} AND userId = ${ctx.user.id}`);
        const resultRows = Array.isArray(resultData) && Array.isArray(resultData[0]) ? resultData[0] : resultData;
        if ((resultRows as any[]).length === 0) throw new Error("Result not found");
        const r = (resultRows as any[])[0];
        const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
        const flagged = typeof r.flaggedQuestions === 'string' ? JSON.parse(r.flaggedQuestions) : (r.flaggedQuestions || []);
        const questionIds = Object.keys(answers).map(Number);
        if (questionIds.length === 0) return [];
        const questionsData = await db.execute(sql`SELECT id, question, optionA, optionB, optionC, optionD, optionE, correctAnswer, explanationCorrect, explanationA, explanationB, explanationC, explanationD, explanationE, niceReference, tags, specialty FROM questions WHERE id IN (${sql.raw(questionIds.join(","))})`);
        const questions = Array.isArray(questionsData) && Array.isArray(questionsData[0]) ? questionsData[0] : questionsData;
        return (questions as any[]).map((q: any) => ({
          id: q.id,
          stem: q.question,
          userAnswer: answers[q.id.toString()],
          correctAnswer: q.correctAnswer,
          isCorrect: answers[q.id.toString()] === q.correctAnswer,
          isFlagged: flagged.includes(q.id),
          options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD, E: q.optionE },
          explanations: { A: q.explanationA || '', B: q.explanationB || '', C: q.explanationC || '', D: q.explanationD || '', E: q.explanationE || '' },
          correctExplanation: q.explanationCorrect || '',
          niceReference: q.niceReference || '',
          tags: q.tags || '',
          specialty: q.specialty,
        }));
      }),

    // Send email report
    sendEmailReport: protectedProcedure
      .input(z.object({ resultId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sql } = await import("drizzle-orm");
        const resultData = await db.execute(sql`SELECT * FROM mock_results WHERE id = ${input.resultId} AND userId = ${ctx.user.id}`);
        const resultRows = Array.isArray(resultData) && Array.isArray(resultData[0]) ? resultData[0] : resultData;
        if ((resultRows as any[]).length === 0) throw new Error("Result not found");
        const r = (resultRows as any[])[0];
        const specialtyBreakdown = typeof r.specialtyBreakdown === 'string' ? JSON.parse(r.specialtyBreakdown) : r.specialtyBreakdown;
        const { sendMockExamEmail } = await import("./mockEmail");
        await sendMockExamEmail({
          userEmail: ctx.user.email || '',
          userName: ctx.user.name || 'Student',
          mockName: r.mockName || 'Mock Exam',
          score: r.score,
          totalQuestions: r.totalQuestions,
          percentage: Number(r.percentage),
          passed: Boolean(r.passed),
          timeTaken: r.timeTaken,
          specialtyBreakdown,
          resultId: r.id,
        });
        await db.execute(sql`UPDATE mock_results SET emailSent = 1 WHERE id = ${input.resultId}`);
        return { success: true };
      }),
    // Record individual question attempt
    recordAttempt: protectedProcedure
      .input(z.object({
        questionId: z.number(),
        examId: z.number(),
        selectedAnswer: z.string(),
        isCorrect: z.boolean(),
        timeTaken: z.number().optional(),
        mode: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`INSERT INTO user_attempts (userId, questionId, examId, selectedAnswer, isCorrect, timeTaken, mode) VALUES (${ctx.user.id}, ${input.questionId}, ${input.examId}, ${input.selectedAnswer}, ${input.isCorrect}, ${input.timeTaken || 0}, ${input.mode || 'practice'})`);
        return { success: true };
      }),
  }),

  // Flashcards Router
  flashcards: router({
    getFlashcardCounts: publicProcedure.query(async () => {
      try {
        const mysql = await import("mysql2/promise");
        const url = new URL(process.env.DATABASE_URL || "");
        const connection = await mysql.createConnection({
          host: url.hostname,
          port: url.port ? parseInt(url.port) : 3306,
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          ssl: {},
        } as any);
        
        const [countRows] = await connection.execute("SELECT COUNT(*) as total FROM flashcards WHERE examId = 1");
        const [specialtyRows] = await connection.execute("SELECT COUNT(DISTINCT specialty) as count FROM flashcards WHERE examId = 1");
        
        await connection.end();
        
        const totalCards = (countRows as any)[0]?.total || 0;
        const distinctSpecialties = (specialtyRows as any)[0]?.count || 0;
        
        return { totalCards, distinctSpecialties };
      } catch (error) {
        console.error("Error fetching flashcard counts:", error);
        return { totalCards: 0, distinctSpecialties: 0 };
      }
    }),
    getFlashcard: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        const { getOrCreateFlashcard } = await import("./db");
        return await getOrCreateFlashcard(ctx.user.id, input);
      }),
    getBySpecialty: protectedProcedure
      .input(z.object({ specialty: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await import("./db");
        const { flashcards } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const dbInstance = await db.getDb();
        if (input.specialty) {
          if (!dbInstance) throw new Error("Database connection failed");
        return await dbInstance.select().from(flashcards).where(and(eq(flashcards.specialty, input.specialty), eq(flashcards.examId, 1)));
        }
        return await dbInstance!.select().from(flashcards).where(eq(flashcards.examId, 1));
      }),
    updateProgress: protectedProcedure
      .input(
        z.object({
          flashcardId: z.number(),
          quality: z.number().min(0).max(5),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { updateSrsProgress } = await import("./db");
        return await updateSrsProgress(ctx.user.id, input.flashcardId, input.quality);
      }),
  }),

  // Study Stats Router
  stats: router({
    getUserStats: protectedProcedure.query(async ({ ctx }) => {
      const { getUserStudyStats } = await import("./db");
      return await getUserStudyStats(ctx.user.id);
    }),
  }),

  // Dashboard Stats Router (real per-user data)
  dashboard: router({
    getStats: protectedProcedure
      .input(
        z.object({
          examCode: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getDashboardStats } = await import("./db");
        return await getDashboardStats(ctx.user.id, input.examCode);
      }),
    getExams: protectedProcedure.query(async () => {
      const { getAvailableExams } = await import("./db");
      return await getAvailableExams();
    }),
    getReadinessScore: protectedProcedure.query(async ({ ctx }) => {
      const { getReadinessScore } = await import("./db");
      return await getReadinessScore(ctx.user.id);
    }),
    getWeaknessFingerprint: protectedProcedure.query(async ({ ctx }) => {
      const { getWeaknessFingerprint } = await import("./db");
      return await getWeaknessFingerprint(ctx.user.id);
    }),
  }),

  // Progress Dashboard Router
  progress: router({
    getMockExamTrends: protectedProcedure
      .input(
        z.object({
          days: z.number().default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getMockExamScoreTrends } = await import("./db");
        return await getMockExamScoreTrends(ctx.user.id, input.days);
      }),
    getFlashcardStats: protectedProcedure.query(async ({ ctx }) => {
      const { getFlashcardMasteryStats } = await import("./db");
      return await getFlashcardMasteryStats(ctx.user.id);
    }),
    getFlashcardTrend: protectedProcedure
      .input(
        z.object({
          days: z.number().default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getFlashcardProgressTrend } = await import("./db");
        return await getFlashcardProgressTrend(ctx.user.id, input.days);
      }),
    getSpecialtyBreakdown: protectedProcedure
      .input(
        z.object({
          days: z.number().default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getSpecialtyBreakdown } = await import("./db");
        return await getSpecialtyBreakdown(ctx.user.id, input.days);
      }),
  }),

  // Stripe Router
  stripe: stripeRouter,

  // Admin Router
  admin: adminRouter,

  // AI Coach Router
  aiCoach: aiCoachRouter,

  // Two-Factor Authentication Router
  twoFactor: twoFactorRouter,

  // SCA Simulator Router
  sca: scaRouter,

  // Voice Router (SCA voice integration)
  voice: voiceRouter,

  // Adaptive Learning Router
  adaptive: adaptiveRouter,

  // Password Management Router
  password: passwordRouter,

  // MRCGP AKT Router
  mrcgpAkt: router({
    getSpecialties: publicProcedure.query(async () => {
      const { getMrcgpAktSpecialties } = await import("./db");
      return await getMrcgpAktSpecialties();
    }),
    getQuestions: protectedProcedure
      .input(
        z.object({
          specialty: z.string().optional(),
          limit: z.number().default(500),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getMrcgpAktQuestionsBySpecialty } = await import("./db");
        return await getMrcgpAktQuestionsBySpecialty(input.specialty, input.limit, ctx.user.id);
      }),
  }),

  // Note360 Router
  note360: router({
    getBySpecialty: protectedProcedure
      .input(z.string())
      .query(async ({ input }) => {
        const { getNote360BySpecialty } = await import("./db");
        return await getNote360BySpecialty(input);
      }),
    getUserProgress: protectedProcedure
      .input(z.object({
        specialty: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserNoteProgressBySpecialty, getNote360ProgressStats } = await import("./db");
        const progress = await getUserNoteProgressBySpecialty(ctx.user.id, input.specialty);
        const stats = await getNote360ProgressStats(ctx.user.id, input.specialty);
        return { progress, stats };
      }),
    updateProgress: protectedProcedure
      .input(z.object({
        noteId: z.number(),
        isRead: z.boolean().optional(),
        isBookmarked: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateUserNoteProgress } = await import("./db");
        return await updateUserNoteProgress(
          ctx.user.id,
          input.noteId,
          input.isRead,
          input.isBookmarked
        );
            }),
  }),
  // Picture360 Router — auth flow fix applied July 15 2026
  picture360: router({
    getSpecialtyCounts: publicProcedure.query(async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`SELECT specialty, COUNT(*) as count FROM picture360_images WHERE status = 'active' GROUP BY specialty`);
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      return (rows as any[]).map((r: any) => ({ specialty: r.specialty, count: r.count }));
    }),
    getImagesBySpecialty: protectedProcedure
      .input(z.string())
      .query(async ({ input: specialty }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { sql } = await import("drizzle-orm");
        const result = await db.execute(sql`SELECT id, specialty, conditionName, imageUrl, keyFeatures, examPearl, optionA, optionB, optionC, optionD, correctAnswer, explanation FROM picture360_images WHERE specialty = ${specialty} AND status = 'active' ORDER BY id`);
        const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
        return (rows as any[]).map((r: any) => ({
          id: r.id,
          specialty: r.specialty,
          conditionName: r.conditionName,
          imageUrl: r.imageUrl,
          keyFeatures: r.keyFeatures,
          examPearl: r.examPearl,
          optionA: r.optionA,
          optionB: r.optionB,
          optionC: r.optionC,
          optionD: r.optionD,
          correctAnswer: r.correctAnswer,
          explanation: r.explanation,
        }));
      }),
  }),
});
export type AppRouter = typeof appRouter;
