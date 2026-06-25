import { eq, and, lte, gte, asc, desc, sql } from "drizzle-orm";
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
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { questions } = await import("../drizzle/schema");
    
    if (specialty) {
      const result = await db.select().from(questions)
        .where(eq(questions.specialty, specialty))
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
export async function getMrcgpAktQuestionsBySpecialty(specialty?: string, limit: number = 500) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { questions } = await import("../drizzle/schema");

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
