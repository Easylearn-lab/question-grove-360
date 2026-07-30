import { router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql, count } from "drizzle-orm";

export const adminRouter = router({
  // Coupon Management
  getCoupons: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { coupons } = await import("../drizzle/schema");
    const result = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return result.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue ? parseFloat(c.discountValue) : 0,
      maxUsageCount: c.maxUsageCount,
      usageCount: c.usageCount,
      expiryDate: c.expiryDate,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }),

  createCoupon: adminProcedure
    .input(
      z.object({
        code: z.string().min(3).max(50),
        discountType: z.enum(["percentage", "fixed"]),
        discountValue: z.number().min(1),
        maxUsageCount: z.number().min(1).nullable(),
        expiryDate: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Enforce 3-day max coupon validity
      const now = new Date();
      const maxExpiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      let expiryDate = input.expiryDate;
      if (expiryDate) {
        const requested = new Date(expiryDate);
        if (requested > maxExpiry) {
          // Cap at 3 days from now
          expiryDate = maxExpiry.toISOString().split("T")[0];
        }
      } else {
        // Default to 3 days if no expiry specified
        expiryDate = maxExpiry.toISOString().split("T")[0];
      }

      const { coupons } = await import("../drizzle/schema");
      await db.insert(coupons).values({
        code: input.code.toUpperCase(),
        discountType: input.discountType,
        discountValue: input.discountValue.toString(),
        maxUsageCount: input.maxUsageCount,
        expiryDate: expiryDate,
        isActive: true,
      } as any);
      return { success: true };
    }),

  deleteCoupon: adminProcedure
    .input(z.number())
    .mutation(async ({ input: couponId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { coupons } = await import("../drizzle/schema");
      await db.update(coupons).set({ isActive: false }).where(eq(coupons.id, couponId));
      return { success: true };
    }),

  // User Management
  getUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { users, profiles } = await import("../drizzle/schema");

      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
          subscriptionStatus: profiles.subscriptionStatus,
          subscriptionPlan: profiles.subscriptionPlan,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const totalResult = await db.select({ total: count() }).from(users);
      const total = totalResult[0]?.total || 0;

      return { users: userList, total };
    }),

  promoteToAdmin: adminProcedure
    .input(z.number())
    .mutation(async ({ input: userId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { users } = await import("../drizzle/schema");
      await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
      return { success: true };
    }),

  demoteFromAdmin: adminProcedure
    .input(z.number())
    .mutation(async ({ input: userId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { users } = await import("../drizzle/schema");
      await db.update(users).set({ role: "user" }).where(eq(users.id, userId));
      return { success: true };
    }),

  assignFreeTrial: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        days: z.number().max(3).default(3),
        examId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { freeTrials, profiles } = await import("../drizzle/schema");
      const now = new Date();
      const trialEnd = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);

      await db.insert(freeTrials).values({
        userId: input.userId,
        examId: input.examId || 1,
        assignedBy: ctx.user.id,
        trialStart: now,
        trialEnd: trialEnd,
        used: false,
      });

      // Also update profile subscription status
      await db.update(profiles).set({
        subscriptionStatus: "trialing",
        trialEndsAt: trialEnd,
      }).where(eq(profiles.userId, input.userId));

      return { success: true, trialEnd };
    }),

  // Question Management
  getQuestions: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        examId: z.number().optional(),
        specialty: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { questions } = await import("../drizzle/schema");

      let query = db.select().from(questions).orderBy(desc(questions.createdAt)).limit(input.limit).offset(input.offset);

      const result = await query;
      const totalResult = await db.select({ total: count() }).from(questions);
      const total = totalResult[0]?.total || 0;

      return { questions: result, total };
    }),

  createQuestion: adminProcedure
    .input(
      z.object({
        examId: z.number(),
        domain: z.string().optional(),
        specialty: z.string(),
        subSpecialty: z.string().optional(),
        difficulty: z.enum(["Easy", "Medium", "Hard"]),
        question: z.string().min(10),
        optionA: z.string(),
        optionB: z.string(),
        optionC: z.string(),
        optionD: z.string(),
        optionE: z.string().optional(),
        correctAnswer: z.string(),
        explanationCorrect: z.string().optional(),
        explanationA: z.string().optional(),
        explanationB: z.string().optional(),
        explanationC: z.string().optional(),
        explanationD: z.string().optional(),
        explanationE: z.string().optional(),
        reference: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { questions } = await import("../drizzle/schema");
      await db.insert(questions).values({
        ...input,
        tags: input.tags || [],
        status: "active",
      });
      return { success: true };
    }),

  updateQuestion: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          question: z.string().optional(),
          optionA: z.string().optional(),
          optionB: z.string().optional(),
          optionC: z.string().optional(),
          optionD: z.string().optional(),
          optionE: z.string().optional(),
          correctAnswer: z.string().optional(),
          explanationCorrect: z.string().optional(),
          difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
          specialty: z.string().optional(),
          topic: z.string().optional(),
          status: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { questions } = await import("../drizzle/schema");
      await db.update(questions).set(input.data).where(eq(questions.id, input.id));
      return { success: true };
    }),

  deleteQuestion: adminProcedure
    .input(z.number())
    .mutation(async ({ input: questionId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { questions } = await import("../drizzle/schema");
      await db.update(questions).set({ status: "archived" }).where(eq(questions.id, questionId));
      return { success: true };
    }),

  // Analytics
  getAnalytics: adminProcedure.query(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const { users, profiles, questions, userAttempts, mockResults } = await import("../drizzle/schema");

    const [totalUsers] = await db.select({ total: count() }).from(users);
    const [totalQuestions] = await db.select({ total: count() }).from(questions);
    const [totalAttempts] = await db.select({ total: count() }).from(userAttempts);
    const [totalMocks] = await db.select({ total: count() }).from(mockResults);

    // Active subscribers (count from subscriptions table for accuracy)
    const { subscriptions } = await import("../drizzle/schema");
    const [activeSubscribers] = await db
      .select({ total: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    return {
      totalUsers: totalUsers?.total || 0,
      totalQuestions: totalQuestions?.total || 0,
      totalAttempts: totalAttempts?.total || 0,
      totalMocksCompleted: totalMocks?.total || 0,
      activeSubscribers: activeSubscribers?.total || 0,
    };
  }),

  // Import 430 MRCGP AKT Questions
  importMRCGPAKTQuestions: adminProcedure.mutation(async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const { questions: questionsTable, exams } = await import("../drizzle/schema");
    const { sql: sqlFn } = await import("drizzle-orm");

    // Get MRCGP AKT exam ID
    const examResult = await db.select().from(exams).where(eq(exams.code, "MRCGP_AKT")).limit(1);
    if (examResult.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "MRCGP AKT exam not found" });
    }
    const examId = examResult[0].id;

    // Load questions from JSON
    const questionsData = await fetch("/manus-storage/completion_batch_c_f78133c3.json").then(r => r.json());
    
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const q of questionsData) {
      try {
        // Map JSON to database schema
        const questionData = {
          examId,
          domain: q.domain || null,
          specialty: q.specialty || null,
          subSpecialty: q.specialty || null,
          difficulty: q.difficulty || "Medium",
          question: q.question,
          optionA: q.options?.A || "",
          optionB: q.options?.B || "",
          optionC: q.options?.C || "",
          optionD: q.options?.D || "",
          optionE: q.options?.E || null,
          correctAnswer: q.correct_answer,
          explanationCorrect: q.explanation?.correct || q.explanation?.[q.correct_answer] || null,
          explanationA: q.explanation?.A || null,
          explanationB: q.explanation?.B || null,
          explanationC: q.explanation?.C || null,
          explanationD: q.explanation?.D || null,
          explanationE: q.explanation?.E || null,
          reference: q.reference || null,
          tags: JSON.stringify(q.tags || []),
          status: "active",
        };

        // Upsert using raw SQL
        await db.execute(sqlFn`
          INSERT INTO questions (examId, domain, specialty, subSpecialty, difficulty, question, optionA, optionB, optionC, optionD, optionE, correctAnswer, explanationCorrect, explanationA, explanationB, explanationC, explanationD, explanationE, reference, tags, status)
          VALUES (${questionData.examId}, ${questionData.domain}, ${questionData.specialty}, ${questionData.subSpecialty}, ${questionData.difficulty}, ${questionData.question}, ${questionData.optionA}, ${questionData.optionB}, ${questionData.optionC}, ${questionData.optionD}, ${questionData.optionE}, ${questionData.correctAnswer}, ${questionData.explanationCorrect}, ${questionData.explanationA}, ${questionData.explanationB}, ${questionData.explanationC}, ${questionData.explanationD}, ${questionData.explanationE}, ${questionData.reference}, ${questionData.tags}, ${questionData.status})
          ON DUPLICATE KEY UPDATE
            domain = VALUES(domain),
            specialty = VALUES(specialty),
            difficulty = VALUES(difficulty),
            question = VALUES(question),
            optionA = VALUES(optionA),
            optionB = VALUES(optionB),
            optionC = VALUES(optionC),
            optionD = VALUES(optionD),
            optionE = VALUES(optionE),
            correctAnswer = VALUES(correctAnswer),
            explanationCorrect = VALUES(explanationCorrect),
            explanationA = VALUES(explanationA),
            explanationB = VALUES(explanationB),
            explanationC = VALUES(explanationC),
            explanationD = VALUES(explanationD),
            explanationE = VALUES(explanationE),
            reference = VALUES(reference),
            tags = VALUES(tags),
            updatedAt = NOW()
        `);
        imported++;
      } catch (err) {
        console.error(`Error importing question ${q.id}:`, err);
        errors++;
      }
    }

    return {
      success: true,
      imported,
      updated,
      errors,
      total: questionsData.length,
    };
  }),

  // Picture360 Image Management
  getPicture360Images: adminProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        specialty: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { sql: sqlFn } = await import("drizzle-orm");
      let query = `SELECT * FROM picture360_images ORDER BY createdAt DESC LIMIT ${input.limit} OFFSET ${input.offset}`;
      if (input.specialty) {
        query = `SELECT * FROM picture360_images WHERE specialty = '${input.specialty}' ORDER BY createdAt DESC LIMIT ${input.limit} OFFSET ${input.offset}`;
      }
      const result = await db.execute(sqlFn.raw(query));
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      
      const countQuery = input.specialty 
        ? `SELECT COUNT(*) as total FROM picture360_images WHERE specialty = '${input.specialty}'`
        : `SELECT COUNT(*) as total FROM picture360_images`;
      const countResult = await db.execute(sqlFn.raw(countQuery));
      const countRows = Array.isArray(countResult) && Array.isArray(countResult[0]) ? countResult[0] : countResult;
      const total = (countRows as any[])[0]?.total || 0;

      return { images: rows, total };
    }),

  uploadPicture360Image: adminProcedure
    .input(
      z.object({
        specialty: z.string(),
        title: z.string().min(3),
        description: z.string().optional(),
        diagnosis: z.string().min(3),
        explanation: z.string().optional(),
        imageData: z.string(), // base64 encoded image
        imageMimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { storagePut } = await import("./storage");
      const { sql: sqlFn } = await import("drizzle-orm");

      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.imageData, "base64");
      const ext = input.imageMimeType.split("/")[1] || "jpg";
      const fileKey = `picture360/${input.specialty.toLowerCase().replace(/\s+/g, "-")}/${input.title.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
      
      const { url } = await storagePut(fileKey, buffer, input.imageMimeType);

      // Insert into database
      await db.execute(sqlFn`INSERT INTO picture360_images (specialty, title, description, imageUrl, diagnosis, explanation, status) VALUES (${input.specialty}, ${input.title}, ${input.description || ""}, ${url}, ${input.diagnosis}, ${input.explanation || ""}, 'active')`);

      return { success: true, imageUrl: url };
    }),

  deletePicture360Image: adminProcedure
    .input(z.number())
    .mutation(async ({ input: imageId }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { sql: sqlFn } = await import("drizzle-orm");
      await db.execute(sqlFn`UPDATE picture360_images SET status = 'archived' WHERE id = ${imageId}`);
      return { success: true };
    }),

});
