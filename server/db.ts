import { eq, and, lte, gte, asc, desc, sql, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Profile queries
export async function getOrCreateProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { profiles } = await import("../drizzle/schema");
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  
  if (result.length > 0) {
    return result[0];
  }
  
  // Create a new profile if it doesn't exist
  await db.insert(profiles).values({ userId });
  const newResult = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return newResult.length > 0 ? newResult[0] : undefined;
}

export async function updateProfile(userId: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { profiles } = await import("../drizzle/schema");
  await db.update(profiles).set(data).where(eq(profiles.userId, userId));
  return getOrCreateProfile(userId);
}

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { profiles } = await import("../drizzle/schema");
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Question Bank queries
export async function getQuestionsByFilters(
  specialty?: string,
  limit: number = 500,
  offset: number = 0,
  userId?: number,
  topic?: string
) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { questions, userAttempts } = await import("../drizzle/schema");
    
    // Spaced repetition weighting:
    // - Questions answered incorrectly get weight 3x
    // - Questions never attempted get weight 2x
    // - Questions answered correctly get weight 1x
    // We use a LEFT JOIN to user_attempts and compute a weight, then ORDER BY weighted random
    if (userId) {
      let whereClause = specialty
        ? sql`q.specialty = ${specialty}`
        : sql`1=1`;
      if (topic) {
        whereClause = specialty
          ? sql`q.specialty = ${specialty} AND q.topic = ${topic}`
          : sql`q.topic = ${topic}`;
      }
      
      const result = await db.execute(sql`
        SELECT q.* FROM questions q
        LEFT JOIN (
          SELECT questionId,
            SUM(CASE WHEN isCorrect = 1 THEN 1 ELSE 0 END) as correct_count,
            SUM(CASE WHEN isCorrect = 0 THEN 1 ELSE 0 END) as incorrect_count,
            COUNT(*) as total_attempts
          FROM user_attempts
          WHERE userId = ${userId}
          GROUP BY questionId
        ) ua ON q.id = ua.questionId
        WHERE ${whereClause}
        ORDER BY -LOG(RAND()) / (
          CASE
            WHEN ua.total_attempts IS NULL THEN 2.0
            WHEN ua.incorrect_count > ua.correct_count THEN 3.0
            WHEN ua.incorrect_count = ua.correct_count THEN 2.0
            ELSE 1.0
          END
        )
        LIMIT ${limit} OFFSET ${offset}
      `);
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      return rows as any[];
    }
    
    // Fallback: pure random if no userId
    const conditions = [];
    if (specialty) conditions.push(eq(questions.specialty, specialty));
    if (topic) conditions.push(eq(questions.topic, topic));
    
    if (conditions.length > 0) {
      const result = await db.select().from(questions)
        .where(and(...conditions))
        .orderBy(sql`RAND()`)
        .limit(limit)
        .offset(offset);
      return result;
    } else {
      const result = await db.select().from(questions)
        .orderBy(sql`RAND()`)
        .limit(limit)
        .offset(offset);
      return result;
    }
  } catch (error) {
    console.error("[Database] Failed to get questions:", error);
    return [];
  }
}

export async function getTopicsBySpecialty(specialty: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(
      sql`SELECT topic, COUNT(*) as count FROM questions WHERE specialty = ${specialty} AND topic IS NOT NULL AND topic != '' GROUP BY topic ORDER BY count DESC`
    );
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return (rows as any[]).map((r: any) => ({
      topic: r.topic as string,
      count: Number(r.count),
    }));
  } catch (error) {
    console.error("[Database] Failed to get topics by specialty:", error);
    return [];
  }
}

export async function getQuestionById(questionId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const { questions } = await import("../drizzle/schema");
    const result = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get question:", error);
    return undefined;
  }
}

export async function bookmarkQuestion(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    const { bookmarks } = await import("../drizzle/schema");
    await db.insert(bookmarks).values({
      userId,
      itemId: questionId,
      itemType: "question",
      createdAt: new Date(),
    }).onDuplicateKeyUpdate({
      set: { createdAt: new Date() },
    });
    return true;
  } catch (error) {
    console.error("[Database] Failed to bookmark question:", error);
    return false;
  }
}

// Mock Exam queries
export async function createMockExam(userId: number, mockId: number, examId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const { mockResults } = await import("../drizzle/schema");
    const result = await db.insert(mockResults).values({
      userId,
      mockId,
      examId,
      score: 0,
      totalQuestions: 0,
      percentage: "0",
      timeTaken: 0,
      passed: false,
      completedAt: new Date(),
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to create mock exam:", error);
    return undefined;
  }
}

export async function recordUserAttempt(
  userId: number,
  questionId: number,
  examId: number,
  selectedAnswer: string,
  isCorrect: boolean,
  timeTaken: number,
  mode: string = "tutor"
) {
  const db = await getDb();
  if (!db) return false;

  try {
    const { userAttempts } = await import("../drizzle/schema");
    await db.insert(userAttempts).values({
      userId,
      questionId,
      examId,
      selectedAnswer,
      isCorrect,
      timeTaken,
      mode,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error("[Database] Failed to record user attempt:", error);
    return false;
  }
}

export async function completeMockResult(mockResultId: number, score: number, percentage: number, timeTaken: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    const { mockResults } = await import("../drizzle/schema");
    await db.update(mockResults).set({
      score,
      percentage: percentage.toString(),
      timeTaken,
      completedAt: new Date(),
    }).where(eq(mockResults.id, mockResultId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to complete mock result:", error);
    return false;
  }
}

// Pattern Recognition / SRS queries
export async function getOrCreateFlashcard(userId: number, flashcardId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const { userSrsProgress } = await import("../drizzle/schema");
    
    const existing = await db
      .select()
      .from(userSrsProgress)
      .where(and(eq(userSrsProgress.userId, userId), eq(userSrsProgress.flashcardId, flashcardId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new SRS progress entry
    await db.insert(userSrsProgress).values({
      userId,
      flashcardId,
      repetitions: 0,
      easeFactor: "2.5",
      interval: 1,
      dueDate: new Date(),
      lastReviewed: new Date(),
    });

    const result = await db
      .select()
      .from(userSrsProgress)
      .where(and(eq(userSrsProgress.userId, userId), eq(userSrsProgress.flashcardId, flashcardId)))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get or create flashcard:", error);
    return undefined;
  }
}

export async function updateSrsProgress(
  userId: number,
  flashcardId: number,
  quality: number
) {
  const db = await getDb();
  if (!db) return false;

  try {
    const { userSrsProgress } = await import("../drizzle/schema");
    
    const progress = await db
      .select()
      .from(userSrsProgress)
      .where(and(eq(userSrsProgress.userId, userId), eq(userSrsProgress.flashcardId, flashcardId)))
      .limit(1);

    if (progress.length === 0) return false;

    const current = progress[0];
    const currentEase = typeof current.easeFactor === 'string' ? parseFloat(current.easeFactor) : (current.easeFactor || 2.5);
    let newEaseFactor = currentEase + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    newEaseFactor = Math.max(1.3, newEaseFactor);

    let newInterval = 1;
    if (current.repetitions === 0) {
      newInterval = 1;
    } else if (current.repetitions === 1) {
      newInterval = 3;
    } else {
      newInterval = Math.round((current.interval || 1) * newEaseFactor);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + newInterval);

    await db.update(userSrsProgress).set({
      repetitions: (current.repetitions || 0) + 1,
      easeFactor: newEaseFactor.toString(),
      interval: newInterval,
      dueDate,
      lastReviewed: new Date(),
    }).where(and(eq(userSrsProgress.userId, userId), eq(userSrsProgress.flashcardId, flashcardId)));

    return true;
  } catch (error) {
    console.error("[Database] Failed to update SRS progress:", error);
    return false;
  }
}

export async function getDueFlashcards(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { userSrsProgress } = await import("../drizzle/schema");
    
    const now = new Date();
    const result = await db
      .select()
      .from(userSrsProgress)
      .where(and(
        eq(userSrsProgress.userId, userId),
        lte(userSrsProgress.dueDate, now)
      ))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get due flashcards:", error);
    return [];
  }
}

// Study session queries
export async function getUserStudyStats(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const { userAttempts, mockResults } = await import("../drizzle/schema");
    
    // Get total questions answered
    const attempts = await db
      .select()
      .from(userAttempts)
      .where(eq(userAttempts.userId, userId));

    const correctCount = attempts.filter(a => a.isCorrect).length;
    const accuracy = attempts.length > 0 ? (correctCount / attempts.length) * 100 : 0;

    // Get recent mock results
    const recentMocks = await db
      .select()
      .from(mockResults)
      .where(eq(mockResults.userId, userId))
      .limit(5);

    return {
      totalQuestionsAnswered: attempts.length,
      accuracy: Math.round(accuracy),
      recentMockScore: recentMocks.length > 0 ? (recentMocks[0].score || 0) : 0,
      totalMocksCompleted: recentMocks.length,
    };
  } catch (error) {
    console.error("[Database] Failed to get study stats:", error);
    return undefined;
  }
}

// Update profile by Stripe subscription ID (used by webhooks)
export async function updateProfileByStripeSubscriptionId(
  stripeSubscriptionId: string,
  data: Record<string, any>
) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const { profiles } = await import("../drizzle/schema");
    await db
      .update(profiles)
      .set(data)
      .where(eq(profiles.stripeSubscriptionId, stripeSubscriptionId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update profile by stripe subscription ID:", error);
    return false;
  }
}


// Progress Dashboard queries
export async function getMockExamScoreTrends(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { mockResults } = await import("../drizzle/schema");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await db
      .select()
      .from(mockResults)
      .where(and(
        eq(mockResults.userId, userId),
        gte(mockResults.completedAt, cutoffDate)
      ))
      .orderBy(asc(mockResults.completedAt));

    return results.map((r) => ({
      date: r.completedAt,
      score: r.score || 0,
      percentage: parseFloat(r.percentage || "0"),
      totalQuestions: r.totalQuestions || 0,
      timeTaken: r.timeTaken || 0,
      passed: r.passed || false,
    }));
  } catch (error) {
    console.error("[Database] Failed to get mock exam score trends:", error);
    return [];
  }
}

export async function getFlashcardMasteryStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, mastered: 0, reviewing: 0, learning: 0, masteryPercentage: 0 };

  try {
    const { userSrsProgress } = await import("../drizzle/schema");
    
    const allCards = await db
      .select()
      .from(userSrsProgress)
      .where(eq(userSrsProgress.userId, userId));

    const mastered = allCards.filter(c => (c.repetitions || 0) >= 20).length;
    const reviewing = allCards.filter(c => (c.repetitions || 0) >= 5 && (c.repetitions || 0) < 20).length;
    const learning = allCards.filter(c => (c.repetitions || 0) < 5).length;

    return {
      total: allCards.length,
      mastered,
      reviewing,
      learning,
      masteryPercentage: allCards.length > 0 ? Math.round((mastered / allCards.length) * 100) : 0,
    };
  } catch (error) {
    console.error("[Database] Failed to get flashcard mastery stats:", error);
    return { total: 0, mastered: 0, reviewing: 0, learning: 0, masteryPercentage: 0 };
  }
}

export async function getFlashcardProgressTrend(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { userSrsProgress } = await import("../drizzle/schema");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await db
      .select()
      .from(userSrsProgress)
      .where(and(
        eq(userSrsProgress.userId, userId),
        gte(userSrsProgress.lastReviewed, cutoffDate)
      ))
      .orderBy(asc(userSrsProgress.lastReviewed));

    // Group by date and calculate daily mastery
    const dailyStats: Record<string, { reviewed: number; mastered: number }> = {};
    
    results.forEach((r) => {
      const dateStr = r.lastReviewed?.toISOString().split('T')[0] || '';
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = { reviewed: 0, mastered: 0 };
      }
      dailyStats[dateStr].reviewed += 1;
      if ((r.repetitions || 0) >= 20) {
        dailyStats[dateStr].mastered += 1;
      }
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date: new Date(date),
      cardsReviewed: stats.reviewed,
      cardsMastered: stats.mastered,
      masteryPercentage: stats.reviewed > 0 ? Math.round((stats.mastered / stats.reviewed) * 100) : 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get flashcard progress trend:", error);
    return [];
  }
}

export async function getSpecialtyBreakdown(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { userAttempts, questions } = await import("../drizzle/schema");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const attempts = await db
      .select({
        specialty: questions.specialty,
        correct: userAttempts.isCorrect,
      })
      .from(userAttempts)
      .innerJoin(questions, eq(userAttempts.questionId, questions.id))
      .where(and(
        eq(userAttempts.userId, userId),
        gte(userAttempts.createdAt, cutoffDate)
      ));

    const specialtyStats: Record<string, { total: number; correct: number }> = {};
    
    attempts.forEach((a) => {
      const specialty = a.specialty || 'Unknown';
      if (!specialtyStats[specialty]) {
        specialtyStats[specialty] = { total: 0, correct: 0 };
      }
      specialtyStats[specialty].total += 1;
      if (a.correct) {
        specialtyStats[specialty].correct += 1;
      }
    });

    return Object.entries(specialtyStats).map(([specialty, stats]) => ({
      specialty,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get specialty breakdown:", error);
    return [];
  }
}


export async function getBookmarks(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { bookmarks, questions } = await import("../drizzle/schema");
    const result = await db
      .select({
        id: bookmarks.id,
        questionId: bookmarks.itemId,
        question: questions.question,
        domain: questions.domain,
        specialty: questions.specialty,
        difficulty: questions.difficulty,
        optionA: questions.optionA,
        optionB: questions.optionB,
        optionC: questions.optionC,
        optionD: questions.optionD,
        optionE: questions.optionE,
        correctAnswer: questions.correctAnswer,
        topic: questions.topic,
        bookmarkedAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .innerJoin(questions, eq(bookmarks.itemId, questions.id))
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt))
      .limit(limit)
      .offset(offset);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get bookmarks:", error);
    return [];
  }
}

export async function removeBookmark(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    const { bookmarks } = await import("../drizzle/schema");
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.itemId, questionId)));
    return true;
  } catch (error) {
    console.error("[Database] Failed to remove bookmark:", error);
    return false;
  }
}

export async function isQuestionBookmarked(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    const { bookmarks } = await import("../drizzle/schema");
    const result = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.itemId, questionId)))
      .limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[Database] Failed to check bookmark:", error);
    return false;
  }
}

/**
 * Get comprehensive dashboard stats for a user, optionally filtered by exam.
 * Returns study streak, accuracy, question count, accuracy trend, and specialty breakdown.
 */
export async function getDashboardStats(userId: number, examCode?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { userAttempts, questions, exams } = await import("../drizzle/schema");

    // Resolve examId if examCode provided
    let examId: number | undefined;
    if (examCode) {
      const examResult = await db
        .select({ id: exams.id })
        .from(exams)
        .where(eq(exams.code, examCode))
        .limit(1);
      if (examResult.length > 0) {
        examId = examResult[0].id;
      }
    }

    // Build base condition
    const conditions = [eq(userAttempts.userId, userId)];
    if (examId) {
      conditions.push(eq(userAttempts.examId, examId));
    }

    // Get all attempts for this user (optionally filtered by exam)
    const allAttempts = await db
      .select({
        id: userAttempts.id,
        isCorrect: userAttempts.isCorrect,
        createdAt: userAttempts.createdAt,
        questionId: userAttempts.questionId,
      })
      .from(userAttempts)
      .where(and(...conditions))
      .orderBy(userAttempts.createdAt);

    if (allAttempts.length === 0) {
      return {
        studyStreak: 0,
        accuracy: null,
        accuracyChange: null,
        totalQuestions: 0,
        questionsToday: 0,
        passProbability: null,
        accuracyTrend: [],
        specialtyBreakdown: [],
      };
    }

    // === STUDY STREAK ===
    // Count consecutive days with activity ending today or yesterday
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    
    // Get unique days with activity
    const activityDays = new Set<string>();
    allAttempts.forEach((a) => {
      if (a.createdAt) {
        activityDays.add(new Date(a.createdAt).toISOString().split("T")[0]);
      }
    });
    
    let streak = 0;
    let checkDate = new Date(now);
    // If no activity today, start checking from yesterday
    if (!activityDays.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (activityDays.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // === ACCURACY ===
    const correctCount = allAttempts.filter((a) => a.isCorrect).length;
    const accuracy = Math.round((correctCount / allAttempts.length) * 100);

    // Accuracy change this week vs last week
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeekAttempts = allAttempts.filter(
      (a) => a.createdAt && new Date(a.createdAt) >= oneWeekAgo
    );
    const lastWeekAttempts = allAttempts.filter(
      (a) => a.createdAt && new Date(a.createdAt) >= twoWeeksAgo && new Date(a.createdAt) < oneWeekAgo
    );
    
    let accuracyChange: number | null = null;
    if (thisWeekAttempts.length > 0 && lastWeekAttempts.length > 0) {
      const thisWeekAcc = Math.round(
        (thisWeekAttempts.filter((a) => a.isCorrect).length / thisWeekAttempts.length) * 100
      );
      const lastWeekAcc = Math.round(
        (lastWeekAttempts.filter((a) => a.isCorrect).length / lastWeekAttempts.length) * 100
      );
      accuracyChange = thisWeekAcc - lastWeekAcc;
    }

    // === QUESTIONS COUNT ===
    const totalQuestions = allAttempts.length;
    const todayStart = new Date(todayStr);
    const questionsToday = allAttempts.filter(
      (a) => a.createdAt && new Date(a.createdAt) >= todayStart
    ).length;

    // === PASS PROBABILITY ===
    // Based on accuracy + coverage. Minimum 20 questions to show.
    let passProbability: number | null = null;
    if (totalQuestions >= 20) {
      // Simple model: weighted average of accuracy (70%) and consistency bonus (30%)
      const recentAttempts = allAttempts.slice(-50); // last 50
      const recentAcc = recentAttempts.filter((a) => a.isCorrect).length / recentAttempts.length;
      const consistencyBonus = Math.min(totalQuestions / 200, 1) * 0.1; // up to 10% bonus for volume
      passProbability = Math.min(Math.round((recentAcc * 0.9 + consistencyBonus) * 100), 99);
    }

    // === ACCURACY TREND ===
    // Group attempts by date and calculate daily accuracy
    const dailyStats: Record<string, { correct: number; total: number }> = {};
    allAttempts.forEach((a) => {
      if (a.createdAt) {
        const dateStr = new Date(a.createdAt).toISOString().split("T")[0];
        if (!dailyStats[dateStr]) {
          dailyStats[dateStr] = { correct: 0, total: 0 };
        }
        dailyStats[dateStr].total++;
        if (a.isCorrect) {
          dailyStats[dateStr].correct++;
        }
      }
    });

    const accuracyTrend = Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        questions: stats.total,
      }));

    // === SPECIALTY BREAKDOWN ===
    // Join with questions to get specialty data
    const specialtyConditions = [eq(userAttempts.userId, userId)];
    if (examId) {
      specialtyConditions.push(eq(userAttempts.examId, examId));
    }

    const specialtyAttempts = await db
      .select({
        specialty: questions.specialty,
        isCorrect: userAttempts.isCorrect,
      })
      .from(userAttempts)
      .innerJoin(questions, eq(userAttempts.questionId, questions.id))
      .where(and(...specialtyConditions));

    const specialtyMap: Record<string, { correct: number; total: number }> = {};
    specialtyAttempts.forEach((a) => {
      const spec = a.specialty || "General";
      if (!specialtyMap[spec]) {
        specialtyMap[spec] = { correct: 0, total: 0 };
      }
      specialtyMap[spec].total++;
      if (a.isCorrect) {
        specialtyMap[spec].correct++;
      }
    });

    const specialtyBreakdown = Object.entries(specialtyMap)
      .filter(([, stats]) => stats.total > 0)
      .map(([name, stats]) => ({
        name,
        value: Math.round((stats.correct / stats.total) * 100),
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8); // Top 8 specialties

    return {
      studyStreak: streak,
      accuracy,
      accuracyChange,
      totalQuestions,
      questionsToday,
      passProbability,
      accuracyTrend,
      specialtyBreakdown,
    };
  } catch (error) {
    console.error("[Database] Failed to get dashboard stats:", error);
    return null;
  }
}

/**
 * Get list of available exams from the database.
 */
export async function getAvailableExams() {
  const db = await getDb();
  if (!db) return [];

  try {
    const { exams, questions } = await import("../drizzle/schema");
    
    // Get all active exams
    const allExams = await db
      .select({
        id: exams.id,
        code: exams.code,
        name: exams.name,
        category: exams.category,
      })
      .from(exams)
      .where(eq(exams.isActive, true));

    // Count questions per exam
    const questionCounts = await db
      .select({
        examId: questions.examId,
        count: sql<number>`COUNT(*)`,
      })
      .from(questions)
      .groupBy(questions.examId);

    const countMap = new Map(questionCounts.map((q) => [q.examId, q.count]));

    return allExams.map((exam) => ({
      ...exam,
      questionCount: countMap.get(exam.id) || 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get available exams:", error);
    return [];
  }
}


// All 17 MRCGP AKT specialties
const ALL_SPECIALTIES = [
  "Neurology", "Endocrinology", "Dermatology", "Renal & Urology",
  "Cardiovascular", "Respiratory", "Gastroenterology", "Musculoskeletal",
  "Obstetrics & Gynaecology", "Ethics & Organisational", "Paediatrics",
  "Haematology", "Pharmacology & Prescribing", "Statistics & EBM",
  "Ophthalmology", "ENT", "Infectious Disease",
];

/**
 * Get the user's exam readiness score based on question bank accuracy and mock exam scores.
 * Returns a percentage, label, colour, and top 2 weakest specialties.
 */
export async function getReadinessScore(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { userAttempts, questions, mockResults } = await import("../drizzle/schema");

    // Get question bank accuracy across all specialties (examId=1 for MRCGP AKT)
    const attempts = await db
      .select({
        isCorrect: userAttempts.isCorrect,
        specialty: questions.specialty,
      })
      .from(userAttempts)
      .innerJoin(questions, eq(userAttempts.questionId, questions.id))
      .where(and(eq(userAttempts.userId, userId), eq(userAttempts.examId, 1)));

    // Get mock exam scores
    const mocks = await db
      .select({
        percentage: mockResults.percentage,
        completedAt: mockResults.completedAt,
      })
      .from(mockResults)
      .where(and(eq(mockResults.userId, userId), eq(mockResults.examId, 1)))
      .orderBy(desc(mockResults.completedAt));

    if (attempts.length === 0 && mocks.length === 0) {
      return { score: null, label: "No Data", colour: "grey", weakestSpecialties: [] };
    }

    // Calculate question bank accuracy
    let qbAccuracy = 0;
    if (attempts.length > 0) {
      const correct = attempts.filter((a) => a.isCorrect).length;
      qbAccuracy = (correct / attempts.length) * 100;
    }

    // Calculate average mock score (use last 5 mocks max)
    let mockAvg = 0;
    let hasMocks = false;
    if (mocks.length > 0) {
      hasMocks = true;
      const recentMocks = mocks.slice(0, 5);
      mockAvg = recentMocks.reduce((sum, m) => sum + parseFloat(m.percentage || "0"), 0) / recentMocks.length;
    }

    // Calculate overall readiness: weighted average
    // If both available: 60% question bank + 40% mock scores
    // If only question bank: 100% question bank
    // If only mocks: 100% mock scores
    let readinessScore: number;
    if (attempts.length > 0 && hasMocks) {
      readinessScore = Math.round(qbAccuracy * 0.6 + mockAvg * 0.4);
    } else if (attempts.length > 0) {
      readinessScore = Math.round(qbAccuracy);
    } else {
      readinessScore = Math.round(mockAvg);
    }

    // Determine label and colour
    let label: string;
    let colour: string;
    if (readinessScore >= 80) {
      label = "Exam Ready";
      colour = "green";
    } else if (readinessScore >= 66) {
      label = "Borderline";
      colour = "amber";
    } else if (readinessScore >= 50) {
      label = "High Risk";
      colour = "orange";
    } else {
      label = "Not Ready";
      colour = "red";
    }

    // Find top 2 weakest specialties
    const specialtyMap: Record<string, { correct: number; total: number }> = {};
    attempts.forEach((a) => {
      const spec = a.specialty || "General";
      if (!specialtyMap[spec]) specialtyMap[spec] = { correct: 0, total: 0 };
      specialtyMap[spec].total++;
      if (a.isCorrect) specialtyMap[spec].correct++;
    });

    const weakestSpecialties = Object.entries(specialtyMap)
      .filter(([, s]) => s.total >= 3) // Minimum 3 attempts to be meaningful
      .map(([name, s]) => ({ name, accuracy: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 2);

    return { score: readinessScore, label, colour, weakestSpecialties };
  } catch (error) {
    console.error("[Database] Failed to get readiness score:", error);
    return null;
  }
}

/**
 * Get the user's weakness fingerprint — per-specialty accuracy with red/amber/green/grey indicators.
 */
export async function getWeaknessFingerprint(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { userAttempts, questions } = await import("../drizzle/schema");

    // Get all attempts for MRCGP AKT (examId=1) grouped by specialty
    const attempts = await db
      .select({
        specialty: questions.specialty,
        isCorrect: userAttempts.isCorrect,
      })
      .from(userAttempts)
      .innerJoin(questions, eq(userAttempts.questionId, questions.id))
      .where(and(eq(userAttempts.userId, userId), eq(userAttempts.examId, 1)));

    // Build specialty stats
    const specialtyMap: Record<string, { correct: number; total: number }> = {};
    attempts.forEach((a) => {
      const spec = a.specialty || "General";
      if (!specialtyMap[spec]) specialtyMap[spec] = { correct: 0, total: 0 };
      specialtyMap[spec].total++;
      if (a.isCorrect) specialtyMap[spec].correct++;
    });

    // Map all 17 specialties with their status
    const fingerprint = ALL_SPECIALTIES.map((name) => {
      const stats = specialtyMap[name];
      if (!stats || stats.total === 0) {
        return { name, accuracy: null, status: "grey" as const, label: "Not started", total: 0 };
      }
      const accuracy = Math.round((stats.correct / stats.total) * 100);
      let status: "red" | "amber" | "green";
      if (accuracy >= 70) {
        status = "green";
      } else if (accuracy >= 50) {
        status = "amber";
      } else {
        status = "red";
      }
      return { name, accuracy, status, label: `${accuracy}%`, total: stats.total };
    });

    return fingerprint;
  } catch (error) {
    console.error("[Database] Failed to get weakness fingerprint:", error);
    return null;
  }
}

/**
 * Reset all question attempts for a user (for the question reset feature).
 */
export async function resetUserQuestionAttempts(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { userAttempts } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    // Delete all attempts for this user
    await db.delete(userAttempts).where(eq(userAttempts.userId, userId));

    return { success: true, message: "All question attempts have been reset" };
  } catch (error) {
    console.error("[Database] Failed to reset user attempts:", error);
    throw error;
  }
}


/**
 * Reset question attempts for a specific specialty for a user.
 */
export async function resetUserQuestionAttemptsBySpecialty(userId: number, specialty: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const { userAttempts, questions } = await import("../drizzle/schema");
    const { eq, and, inArray } = await import("drizzle-orm");

    // Get all question IDs for this specialty
    const specialtyQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.specialty, specialty));

    const questionIds = specialtyQuestions.map((q) => q.id);

    if (questionIds.length === 0) {
      return { success: true, message: `No questions found for specialty: ${specialty}` };
    }

    // Delete attempts for these questions
    await db
      .delete(userAttempts)
      .where(
        and(
          eq(userAttempts.userId, userId),
          inArray(userAttempts.questionId, questionIds)
        )
      );

    return { success: true, message: `Progress reset for ${specialty}` };
  } catch (error) {
    console.error("[Database] Failed to reset user attempts by specialty:", error);
    throw error;
  }
}


// AI Explanation Bookmarking
export async function bookmarkExplanation(
  userId: number,
  content: string
): Promise<{ bookmarked: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const { bookmarks } = await import("../drizzle/schema");
    const crypto = await import("crypto");
    const hash = crypto.createHash("md5").update(content).digest("hex");
    const itemId = parseInt(hash.substring(0, 8), 16) % 2147483647;

    // Check if already bookmarked
    const existing = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.itemType, "ai_explanation"),
          eq(bookmarks.itemId, itemId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Remove bookmark
      await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            eq(bookmarks.itemType, "ai_explanation"),
            eq(bookmarks.itemId, itemId)
          )
        );
      return { bookmarked: false };
    } else {
      // Add bookmark
      await db.insert(bookmarks).values({
        userId,
        itemId,
        itemType: "ai_explanation",
      });
      return { bookmarked: true };
    }
  } catch (error) {
    console.error("[Database] Failed to bookmark explanation:", error);
    throw error;
  }
}

export async function getBookmarkedExplanations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { bookmarks } = await import("../drizzle/schema");
    return await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.itemType, "ai_explanation")
        )
      )
      .orderBy(desc(bookmarks.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get bookmarked explanations:", error);
    return [];
  }
}

export async function isBookmarkedExplanation(
  userId: number,
  content: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const { bookmarks } = await import("../drizzle/schema");
    const crypto = await import("crypto");
    const hash = crypto.createHash("md5").update(content).digest("hex");
    const itemId = parseInt(hash.substring(0, 8), 16) % 2147483647;

    const result = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.itemType, "ai_explanation"),
          eq(bookmarks.itemId, itemId)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("[Database] Failed to check bookmarked explanation:", error);
    return false;
  }
}


// MRCGP AKT - Get specialty breakdown with question counts
export async function getMrcgpAktSpecialties() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(
      sql`SELECT specialty, COUNT(*) AS count FROM questions WHERE examId = 1 GROUP BY specialty ORDER BY count DESC`
    );
    // mysql2 returns [rows, fields]
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return (rows as any[]).map((r: any) => ({
      specialty: r.specialty as string,
      count: Number(r.count),
    }));
  } catch (error) {
    console.error("[Database] Failed to get MRCGP AKT specialties:", error);
    return [];
  }
}

// MRCGP AKT - Get questions by specialty from database
export async function getMrcgpAktQuestionsBySpecialty(specialty?: string, limit: number = 500, userId?: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { questions, userAttempts } = await import("../drizzle/schema");

    // Spaced repetition weighting when userId is available
    if (userId) {
      const whereClause = specialty
        ? sql`q.examId = 1 AND q.specialty = ${specialty}`
        : sql`q.examId = 1`;
      
      const result = await db.execute(sql`
        SELECT q.* FROM questions q
        LEFT JOIN (
          SELECT questionId,
            SUM(CASE WHEN isCorrect = 1 THEN 1 ELSE 0 END) as correct_count,
            SUM(CASE WHEN isCorrect = 0 THEN 1 ELSE 0 END) as incorrect_count,
            COUNT(*) as total_attempts
          FROM user_attempts
          WHERE userId = ${userId}
          GROUP BY questionId
        ) ua ON q.id = ua.questionId
        WHERE ${whereClause}
        ORDER BY -LOG(RAND()) / (
          CASE
            WHEN ua.total_attempts IS NULL THEN 2.0
            WHEN ua.incorrect_count > ua.correct_count THEN 3.0
            WHEN ua.incorrect_count = ua.correct_count THEN 2.0
            ELSE 1.0
          END
        )
        LIMIT ${limit}
      `);
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      return rows as any[];
    }

    // Fallback: pure random if no userId
    if (specialty) {
      const result = await db.select().from(questions)
        .where(and(eq(questions.examId, 1), eq(questions.specialty, specialty)))
        .orderBy(sql`RAND()`)
        .limit(limit);
      return result;
    } else {
      const result = await db.select().from(questions)
        .where(eq(questions.examId, 1))
        .orderBy(sql`RAND()`)
        .limit(limit);
      return result;
    }
  } catch (error) {
    console.error("[Database] Failed to get MRCGP AKT questions:", error);
    return [];
  }
}


// Note360 - Get all notes for a specialty
export async function getNote360BySpecialty(specialty: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { notes } = await import("../drizzle/schema");
    const result = await db.select().from(notes)
      .where(and(eq(notes.examId, 1), eq(notes.specialty, specialty)))
      .orderBy(notes.title);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get Note360 by specialty:", error);
    return [];
  }
}

// Note360 - Get user progress for a note
export async function getUserNoteProgress(userId: number, noteId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { userNoteProgress } = await import("../drizzle/schema");
    const result = await db.select().from(userNoteProgress)
      .where(and(eq(userNoteProgress.userId, userId), eq(userNoteProgress.noteId, noteId)))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get user note progress:", error);
    return null;
  }
}

// Note360 - Get all user progress for a specialty
export async function getUserNoteProgressBySpecialty(userId: number, specialty: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { userNoteProgress, notes } = await import("../drizzle/schema");
    const result = await db.select({
      id: userNoteProgress.id,
      userId: userNoteProgress.userId,
      noteId: userNoteProgress.noteId,
      isRead: userNoteProgress.isRead,
      isBookmarked: userNoteProgress.isBookmarked,
      createdAt: userNoteProgress.createdAt,
      updatedAt: userNoteProgress.updatedAt,
    })
      .from(userNoteProgress)
      .innerJoin(notes, eq(userNoteProgress.noteId, notes.id))
      .where(and(eq(userNoteProgress.userId, userId), eq(notes.specialty, specialty)));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get user note progress by specialty:", error);
    return [];
  }
}

// Note360 - Update user note progress (mark as read or bookmark)
export async function updateUserNoteProgress(
  userId: number,
  noteId: number,
  isRead?: boolean,
  isBookmarked?: boolean
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { userNoteProgress } = await import("../drizzle/schema");
    
    // Check if record exists
    const existing = await getUserNoteProgress(userId, noteId);
    
    if (existing) {
      // Update existing record
      const updateData: any = {};
      if (isRead !== undefined) updateData.isRead = isRead;
      if (isBookmarked !== undefined) updateData.isBookmarked = isBookmarked;
      updateData.updatedAt = new Date();

      const result = await db.update(userNoteProgress)
        .set(updateData)
        .where(and(eq(userNoteProgress.userId, userId), eq(userNoteProgress.noteId, noteId)));
      return result;
    } else {
      // Create new record
      const result = await db.insert(userNoteProgress).values({
        userId,
        noteId,
        isRead: isRead ?? false,
        isBookmarked: isBookmarked ?? false,
      });
      return result;
    }
  } catch (error) {
    console.error("[Database] Failed to update user note progress:", error);
    return null;
  }
}

// Note360 - Get progress stats for a specialty
export async function getNote360ProgressStats(userId: number, specialty: string) {
  const db = await getDb();
  if (!db) return { total: 0, read: 0, bookmarked: 0 };

  try {
    const { userNoteProgress, notes } = await import("../drizzle/schema");
    
    // Get total notes in specialty
    const allNotes = await db.select().from(notes)
      .where(and(eq(notes.examId, 1), eq(notes.specialty, specialty)));
    
    // Get user progress
    const userProgress = await db.select().from(userNoteProgress)
      .innerJoin(notes, eq(userNoteProgress.noteId, notes.id))
      .where(and(eq(userNoteProgress.userId, userId), eq(notes.specialty, specialty)));

    const read = userProgress.filter((p) => p.user_note_progress.isRead).length;
    const bookmarked = userProgress.filter((p) => p.user_note_progress.isBookmarked).length;

    return {
      total: allNotes.length,
      read,
      bookmarked,
    };
  } catch (error) {
    console.error("[Database] Failed to get Note360 progress stats:", error);
    return { total: 0, read: 0, bookmarked: 0 };
  }
}

// Question Flags - persistent per-user flagged questions
export async function flagQuestion(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    const { questionFlags } = await import("../drizzle/schema");
    await db.insert(questionFlags).values({
      userId,
      questionId,
      createdAt: new Date(),
    }).onDuplicateKeyUpdate({ set: { createdAt: new Date() } });
    return true;
  } catch (error) {
    console.error("[DB] flagQuestion error:", error);
    return false;
  }
}

export async function unflagQuestion(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    const { questionFlags } = await import("../drizzle/schema");
    await db.delete(questionFlags).where(and(eq(questionFlags.userId, userId), eq(questionFlags.questionId, questionId)));
    return true;
  } catch (error) {
    console.error("[DB] unflagQuestion error:", error);
    return false;
  }
}

export async function isQuestionFlagged(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    const { questionFlags } = await import("../drizzle/schema");
    const result = await db
      .select()
      .from(questionFlags)
      .where(and(eq(questionFlags.userId, userId), eq(questionFlags.questionId, questionId)))
      .limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[DB] isQuestionFlagged error:", error);
    return false;
  }
}

export async function getUserFlaggedQuestionIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    const { questionFlags } = await import("../drizzle/schema");
    const results = await db
      .select({ questionId: questionFlags.questionId })
      .from(questionFlags)
      .where(eq(questionFlags.userId, userId));
    return results.map(r => r.questionId);
  } catch (error) {
    console.error("[DB] getUserFlaggedQuestionIds error:", error);
    return [];
  }
}


// ============================================================
// Multi-Subscription Helpers (subscriptions table)
// ============================================================

/**
 * Insert or update a subscription record in the subscriptions table.
 * Uses stripeSubscriptionId as the unique key for upsert.
 */
export async function upsertSubscription(data: {
  userId: number;
  planType: string;
  examId?: number | null;
  status: string;
  paymentProvider?: string;
  stripeSubscriptionId: string;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const { subscriptions } = await import("../drizzle/schema");

    // Check if subscription already exists
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, data.stripeSubscriptionId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(subscriptions)
        .set({
          status: data.status,
          planType: data.planType,
          currentPeriodStart: data.currentPeriodStart || undefined,
          currentPeriodEnd: data.currentPeriodEnd || undefined,
        })
        .where(eq(subscriptions.stripeSubscriptionId, data.stripeSubscriptionId));
      return existing[0];
    }

    // Insert new subscription
    await db.insert(subscriptions).values({
      userId: data.userId,
      planType: data.planType,
      examId: data.examId || null,
      status: data.status,
      paymentProvider: data.paymentProvider || "stripe",
      stripeSubscriptionId: data.stripeSubscriptionId,
      currentPeriodStart: data.currentPeriodStart || null,
      currentPeriodEnd: data.currentPeriodEnd || null,
    });

    const inserted = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, data.stripeSubscriptionId))
      .limit(1);
    return inserted.length > 0 ? inserted[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to upsert subscription:", error);
    return undefined;
  }
}

/**
 * Get all subscriptions for a user (active, trialing, past_due).
 */
export async function getSubscriptionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { subscriptions } = await import("../drizzle/schema");
    const results = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return results;
  } catch (error) {
    console.error("[Database] Failed to get subscriptions by userId:", error);
    return [];
  }
}

/**
 * Update a subscription by its Stripe subscription ID.
 */
export async function updateSubscriptionByStripeId(
  stripeSubscriptionId: string,
  data: Record<string, any>
) {
  const db = await getDb();
  if (!db) return false;

  try {
    const { subscriptions } = await import("../drizzle/schema");
    await db
      .update(subscriptions)
      .set(data)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update subscription by stripeId:", error);
    return false;
  }
}


/**
 * Get topic-level accuracy breakdown for a user, grouped by specialty.
 * Returns only topics the user has attempted at least one question in.
 * Sorted by accuracy ascending (weakest first) within each specialty.
 */
export async function getTopicBreakdown(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { userAttempts, questions } = await import("../drizzle/schema");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const attempts = await db
      .select({
        specialty: questions.specialty,
        topic: questions.topic,
        isCorrect: userAttempts.isCorrect,
      })
      .from(userAttempts)
      .innerJoin(questions, eq(userAttempts.questionId, questions.id))
      .where(and(
        eq(userAttempts.userId, userId),
        gte(userAttempts.createdAt, cutoffDate)
      ));

    // Group by specialty -> topic
    const specialtyTopicMap: Record<string, Record<string, { total: number; correct: number }>> = {};

    attempts.forEach((a) => {
      const specialty = a.specialty || "Unknown";
      const topic = a.topic || "Uncategorised";

      if (!specialtyTopicMap[specialty]) {
        specialtyTopicMap[specialty] = {};
      }
      if (!specialtyTopicMap[specialty][topic]) {
        specialtyTopicMap[specialty][topic] = { total: 0, correct: 0 };
      }
      specialtyTopicMap[specialty][topic].total += 1;
      if (a.isCorrect) {
        specialtyTopicMap[specialty][topic].correct += 1;
      }
    });

    // Convert to array format, sorted by accuracy ascending (weakest first) within each specialty
    return Object.entries(specialtyTopicMap).map(([specialty, topics]) => ({
      specialty,
      topics: Object.entries(topics)
        .filter(([, stats]) => stats.total > 0)
        .map(([topic, stats]) => ({
          topic,
          total: stats.total,
          correct: stats.correct,
          accuracy: Math.round((stats.correct / stats.total) * 100),
        }))
        .sort((a, b) => a.accuracy - b.accuracy), // weakest first
    }));
  } catch (error) {
    console.error("[Database] Failed to get topic breakdown:", error);
    return [];
  }
}


/**
 * Get users eligible for the weekly digest email.
 * Criteria:
 * - Has at least one active subscription (subscriptions.status = 'active')
 * - Has answered at least 1 question in the last 30 days
 * - Has not unsubscribed from digest (profiles.digestUnsubscribed != true)
 * - Has an email address
 */
export async function getWeeklyDigestUsers() {
  const db = await getDb();
  if (!db) return [];

  try {
    const { subscriptions, userAttempts, profiles } = await import("../drizzle/schema");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Get users with active subscriptions
    const activeSubUsers = await db
      .selectDistinct({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    if (activeSubUsers.length === 0) return [];

    const activeUserIds = activeSubUsers.map((u) => u.userId);

    // Get users who have answered at least 1 question in last 30 days
    const recentlyActiveUsers = await db
      .selectDistinct({ userId: userAttempts.userId })
      .from(userAttempts)
      .where(and(
        inArray(userAttempts.userId, activeUserIds),
        gte(userAttempts.createdAt, cutoffDate)
      ));

    if (recentlyActiveUsers.length === 0) return [];

    const recentUserIds = recentlyActiveUsers.map((u) => u.userId);

    // Get user details + check unsubscribe status
    const eligibleUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        digestUnsubscribed: profiles.digestUnsubscribed,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(inArray(users.id, recentUserIds));

    // Filter: has email, not unsubscribed
    return eligibleUsers.filter(
      (u) => u.email && !u.digestUnsubscribed
    );
  } catch (error) {
    console.error("[Database] Failed to get weekly digest users:", error);
    return [];
  }
}

/**
 * Set digestUnsubscribed = true for a user (opt out of weekly digest).
 */
export async function setDigestUnsubscribed(userId: number, unsubscribed: boolean = true) {
  const db = await getDb();
  if (!db) return false;

  try {
    const { profiles } = await import("../drizzle/schema");
    await db
      .update(profiles)
      .set({ digestUnsubscribed: unsubscribed })
      .where(eq(profiles.userId, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to set digest unsubscribed:", error);
    return false;
  }
}
