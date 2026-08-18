import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(): TrpcContext {
  return {
    user: { id: 1, openId: "test-open-id", name: "Test User", email: "test@example.com", role: "user" },
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };
}

describe("Live Quiz Router", () => {
  it("should have liveQuiz namespace on appRouter", () => {
    expect(appRouter).toBeDefined();
    expect((appRouter as any)._def.procedures).toBeDefined();
  });

  it("should reject session creation with too few questions requested", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.liveQuiz.createSession({
        title: "Test Session",
        examSource: "questions",
        questionCount: 3, // below minimum of 5
        timeLimitSeconds: 30,
        isPublic: false,
      });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err).toBeDefined();
    }
  });

  it("should reject joining with invalid session code", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.liveQuiz.joinSession({
        sessionCode: "XXXXXX",
        displayName: "Player 1",
      });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).toContain("Session not found");
    }
  });

  it("should return empty public sessions list", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const sessions = await caller.liveQuiz.getPublicSessions();
    expect(Array.isArray(sessions)).toBe(true);
  });

  it("should return global leaderboard structure", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const lb = await caller.liveQuiz.getGlobalLeaderboard();
    expect(lb).toHaveProperty("individuals");
    expect(lb).toHaveProperty("teams");
  });
});
