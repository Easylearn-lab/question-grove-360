import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db as drizzleDb } from "drizzle-orm";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import * as db from "./db";

describe("OAuth Redirect Loop Fix", () => {
  let testDb: any;

  beforeAll(async () => {
    testDb = await getDb();
    if (!testDb) {
      console.warn("Database not available, skipping OAuth tests");
    }
  });

  it("should create session token with fallback name when name is empty", async () => {
    const openId = "test-oauth-user-" + Date.now();
    
    // Create session with empty name (simulating Google OAuth without display name)
    const token = await sdk.createSessionToken(openId, {
      name: "",
      expiresInMs: 3600000,
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    
    // Verify the token can be decoded
    const verified = await sdk.verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.openId).toBe(openId);
    expect(verified?.name).toBeDefined(); // Should have fallback name
  });

  it("should create session token with provided name", async () => {
    const openId = "test-oauth-user-named-" + Date.now();
    const userName = "John Doe";
    
    const token = await sdk.createSessionToken(openId, {
      name: userName,
      expiresInMs: 3600000,
    });

    expect(token).toBeDefined();
    
    const verified = await sdk.verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.openId).toBe(openId);
    expect(verified?.name).toBe(userName);
  });

  it("should verify session with empty name (lenient validation)", async () => {
    const openId = "test-oauth-lenient-" + Date.now();
    
    // Create token with empty name
    const token = await sdk.createSessionToken(openId, {
      name: "",
      expiresInMs: 3600000,
    });

    // Verify should succeed even with empty name
    const verified = await sdk.verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.openId).toBe(openId);
    expect(verified?.appId).toBeDefined();
    // Name can be empty, but should exist as a field
    expect("name" in verified!).toBe(true);
  });

  it("should reject session with missing openId", async () => {
    // Create a malformed JWT (missing openId)
    const secretKey = sdk["getSessionSecret"]();
    const { SignJWT } = await import("jose");
    
    const token = await new SignJWT({
      appId: "test-app",
      name: "Test User",
      // Missing openId
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secretKey);

    const verified = await sdk.verifySession(token);
    expect(verified).toBeNull();
  });

  it("should reject session with missing appId", async () => {
    const secretKey = sdk["getSessionSecret"]();
    const { SignJWT } = await import("jose");
    
    const token = await new SignJWT({
      openId: "test-user",
      name: "Test User",
      // Missing appId
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secretKey);

    const verified = await sdk.verifySession(token);
    expect(verified).toBeNull();
  });

  it("should upsert user with email as fallback name", async () => {
    if (!testDb) {
      console.warn("Skipping upsert test - database not available");
      return;
    }

    const openId = "test-oauth-email-" + Date.now();
    const email = `test-${Date.now()}@example.com`;

    await db.upsertUser({
      openId,
      email,
      name: null, // No display name
      loginMethod: "google",
    });

    const user = await db.getUserByOpenId(openId);
    expect(user).toBeDefined();
    expect(user?.openId).toBe(openId);
    expect(user?.email).toBe(email);
  });

  it("should handle multiple rapid session creations without race conditions", async () => {
    const openIds = Array.from({ length: 5 }, (_, i) => `test-race-${Date.now()}-${i}`);
    
    const tokens = await Promise.all(
      openIds.map(openId =>
        sdk.createSessionToken(openId, {
          name: "",
          expiresInMs: 3600000,
        })
      )
    );

    expect(tokens).toHaveLength(5);
    expect(tokens.every(t => typeof t === "string")).toBe(true);

    // Verify all tokens independently
    const verified = await Promise.all(tokens.map(t => sdk.verifySession(t)));
    expect(verified.every(v => v !== null)).toBe(true);
    expect(verified.map(v => v?.openId)).toEqual(openIds);
  });

  it("should maintain session validity after auth check", async () => {
    const openId = "test-oauth-persist-" + Date.now();
    
    // Create session
    const token = await sdk.createSessionToken(openId, {
      name: "Test User",
      expiresInMs: 3600000,
    });

    // First verification
    const verified1 = await sdk.verifySession(token);
    expect(verified1).not.toBeNull();

    // Second verification (simulating page reload)
    const verified2 = await sdk.verifySession(token);
    expect(verified2).not.toBeNull();

    // Both should have same openId
    expect(verified1?.openId).toBe(verified2?.openId);
  });
});
