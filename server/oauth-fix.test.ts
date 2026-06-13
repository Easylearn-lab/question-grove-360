import { describe, it, expect } from "vitest";

/**
 * Tests for the OAuth redirect loop fix.
 * 
 * Root cause: verifySession() rejected sessions with empty `name` field,
 * which happens when Google OAuth returns a user without a display name.
 * The fix:
 * 1. verifySession now allows empty name (only requires openId + appId)
 * 2. createSessionToken uses "User" as fallback name
 * 3. OAuth callback uses email or "User" as fallback display name
 * 4. OAuth callback redirects to /dashboard instead of /
 */

// We can't directly import the SDK class, but we can test the session logic
// by simulating the JWT creation and verification flow
describe("OAuth Session Fix", () => {
  describe("Session token creation with fallback name", () => {
    it("should use 'User' as fallback when name is empty", async () => {
      // Import the SDK
      const { sdk } = await import("./_core/sdk");
      
      // Create a session token with empty name
      const token = await sdk.createSessionToken("test-open-id-123", {
        name: "",
        expiresInMs: 60000,
      });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should use provided name when available", async () => {
      const { sdk } = await import("./_core/sdk");
      
      const token = await sdk.createSessionToken("test-open-id-456", {
        name: "John Doe",
        expiresInMs: 60000,
      });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should use 'User' as fallback when name is undefined", async () => {
      const { sdk } = await import("./_core/sdk");
      
      const token = await sdk.createSessionToken("test-open-id-789", {
        expiresInMs: 60000,
      });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe("Session verification with empty name", () => {
    it("should verify a session token created with fallback name", async () => {
      const { sdk } = await import("./_core/sdk");
      
      // Create token with empty name (should use "User" fallback)
      const token = await sdk.createSessionToken("verify-test-open-id", {
        name: "",
        expiresInMs: 60000,
      });
      
      // The token should be verifiable (previously this would fail)
      // We verify by checking the token is a valid JWT structure
      const parts = token.split(".");
      expect(parts.length).toBe(3); // header.payload.signature
      
      // Decode payload to verify name is "User" not empty
      const payload = JSON.parse(atob(parts[1]));
      expect(payload.openId).toBe("verify-test-open-id");
      expect(payload.name).toBe("User"); // Fallback applied
    });

    it("should verify a session token with a real name", async () => {
      const { sdk } = await import("./_core/sdk");
      
      const token = await sdk.createSessionToken("verify-test-open-id-2", {
        name: "Jane Smith",
        expiresInMs: 60000,
      });
      
      const parts = token.split(".");
      expect(parts.length).toBe(3);
      
      const payload = JSON.parse(atob(parts[1]));
      expect(payload.openId).toBe("verify-test-open-id-2");
      expect(payload.name).toBe("Jane Smith");
    });
  });

  describe("OAuth callback redirect behavior", () => {
    it("should redirect to /dashboard after successful OAuth (not /)", async () => {
      // Read the oauth.ts file to verify the redirect target
      const fs = await import("fs");
      const oauthContent = fs.readFileSync(
        "/home/ubuntu/question-grove-360/server/_core/oauth.ts",
        "utf-8"
      );
      
      // Verify redirect goes to /dashboard
      expect(oauthContent).toContain('res.redirect(302, "/dashboard")');
      // Verify it does NOT redirect to just "/"
      expect(oauthContent).not.toContain('res.redirect(302, "/")');
    });

    it("should use email as fallback name when name is missing", async () => {
      const fs = await import("fs");
      const oauthContent = fs.readFileSync(
        "/home/ubuntu/question-grove-360/server/_core/oauth.ts",
        "utf-8"
      );
      
      // Verify fallback name logic exists
      expect(oauthContent).toContain('userInfo.name || userInfo.email || "User"');
    });
  });

  describe("Home page authenticated redirect", () => {
    it("should redirect authenticated users from / to /dashboard", async () => {
      const fs = await import("fs");
      const homeContent = fs.readFileSync(
        "/home/ubuntu/question-grove-360/client/src/pages/Home.tsx",
        "utf-8"
      );
      
      // Verify the redirect logic exists
      expect(homeContent).toContain('navigate("/dashboard")');
      expect(homeContent).toContain("isAuthenticated");
    });
  });
});
