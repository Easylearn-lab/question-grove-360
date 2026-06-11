import { eq, and, lte, gte, asc, desc } from "drizzle-orm";
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
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { questions } = await import("../drizzle/schema");
    
    if (specialty) {
      const result = await db.select().from(questions)
        .where(eq(questions.specialty, specialty))
        .limit(limit)
        .offset(offset);
      return result;
    } else {
      const result = await db.select().from(questions)
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
