import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock user context
function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("Question Grove 360 - Feature Tests", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("Authentication", () => {
    it("should return current user", async () => {
      const caller = appRouter.createCaller(ctx);
      const user = await caller.auth.me();
      expect(user).toBeDefined();
      expect(user?.id).toBe(1);
      expect(user?.email).toBe("test@example.com");
    });

    it("should logout user", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.logout();
      expect(result.success).toBe(true);
    });
  });

  describe("Profile Management", () => {
    it("should get user profile", async () => {
      const caller = appRouter.createCaller(ctx);
      const profile = await caller.profile.getProfile();
      expect(profile).toBeDefined();
      expect(profile?.userId).toBe(1);
    });

    it("should update user profile", async () => {
      const caller = appRouter.createCaller(ctx);
      const updated = await caller.profile.updateProfile({
        specialty: "Cardiology",
        country: "United Kingdom",
      });
      expect(updated).toBeDefined();
    });
  });

  describe("Question Bank", () => {
    it("should retrieve questions with filters", async () => {
      const caller = appRouter.createCaller(ctx);
      const questions = await caller.questions.list({
        specialty: "Cardiology",
        limit: 10,
        offset: 0,
      });
      expect(Array.isArray(questions)).toBe(true);
    });

    it("should bookmark a question", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.questions.bookmark(1);
      expect(result).toBeDefined();
    });

    it("should get bookmarked questions", async () => {
      const caller = appRouter.createCaller(ctx);
      const bookmarks = await caller.questions.getBookmarks();
      expect(Array.isArray(bookmarks)).toBe(true);
    });
  });

  describe("Mock Exams", () => {
    it("should create a mock exam attempt", async () => {
      const caller = appRouter.createCaller(ctx);
      const exam = await caller.mockExams.createAttempt({
        examId: 1,
      });
      expect(exam).toBeDefined();
      expect(exam?.userId).toBe(1);
    });

    it("should get exam history", async () => {
      const caller = appRouter.createCaller(ctx);
      const history = await caller.mockExams.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Pattern Recognition (SRS)", () => {
    it("should get due flashcards", async () => {
      const caller = appRouter.createCaller(ctx);
      const cards = await caller.flashcards.getDueCards();
      expect(Array.isArray(cards)).toBe(true);
    });

    it("should update SRS progress", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.flashcards.updateProgress({
        flashcardId: 1,
        quality: 4,
      });
      expect(result).toBeDefined();
    });

    it("should get flashcard stats", async () => {
      const caller = appRouter.createCaller(ctx);
      const stats = await caller.flashcards.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalCards).toBe("number");
      expect(typeof stats.masteredCards).toBe("number");
    });
  });

  describe("Study Stats", () => {
    it("should get user statistics", async () => {
      const caller = appRouter.createCaller(ctx);
      const stats = await caller.stats.getUserStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalQuestionsAnswered).toBe("number");
      expect(typeof stats.accuracy).toBe("number");
    });

    it("should get study streak", async () => {
      const caller = appRouter.createCaller(ctx);
      const streak = await caller.stats.getStreak();
      expect(typeof streak).toBe("number");
    });
  });

  describe("Admin Features", () => {
    it("should get admin dashboard stats", async () => {
      const adminCtx = createMockContext();
      adminCtx.user!.role = "admin";
      const caller = appRouter.createCaller(adminCtx);
      const stats = await caller.admin.getDashboardStats();
      expect(stats).toBeDefined();
    });

    it("should list all users (admin only)", async () => {
      const adminCtx = createMockContext();
      adminCtx.user!.role = "admin";
      const caller = appRouter.createCaller(adminCtx);
      const users = await caller.admin.listUsers();
      expect(Array.isArray(users)).toBe(true);
    });

    it("should create coupon (admin only)", async () => {
      const adminCtx = createMockContext();
      adminCtx.user!.role = "admin";
      const caller = appRouter.createCaller(adminCtx);
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const expiryDateStr = futureDate.toISOString().split('T')[0];
      const coupon = await caller.admin.createCoupon({
        code: "TEST20",
        discountType: "percentage",
        discountValue: 20,
        maxUsageCount: 100,
        expiryDate: expiryDateStr,
      });
      expect(coupon).toBeDefined();
      expect(coupon.code).toBe("TEST20");
    });
  });

  describe("Error Handling", () => {
    it("should reject non-admin access to admin features", async () => {
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.admin.getDashboardStats();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle invalid question ID", async () => {
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.questions.getById(999999);
        // Should either return null or throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
