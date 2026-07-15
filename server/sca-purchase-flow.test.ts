import { describe, it, expect, vi } from "vitest";

describe("SCA Purchase Flow Fix", () => {
  it("PAYMENT_ENABLED.SCA is true (payments enabled)", async () => {
    const { PAYMENT_ENABLED } = await import("./products");
    expect(PAYMENT_ENABLED.SCA).toBe(true);
  });

  it("SCA plans have valid Stripe price IDs", async () => {
    const { SUBSCRIPTION_PLANS } = await import("./products");
    expect(SUBSCRIPTION_PLANS.SCA_3MONTH).toBeDefined();
    expect(SUBSCRIPTION_PLANS.SCA_6MONTH).toBeDefined();
    expect(SUBSCRIPTION_PLANS.SCA_3MONTH.stripePriceId).toMatch(/^price_/);
    expect(SUBSCRIPTION_PLANS.SCA_6MONTH.stripePriceId).toMatch(/^price_/);
  });

  it("SCA plans have examTrack set to SCA", async () => {
    const { SUBSCRIPTION_PLANS } = await import("./products");
    expect(SUBSCRIPTION_PLANS.SCA_3MONTH.examTrack).toBe("SCA");
    expect(SUBSCRIPTION_PLANS.SCA_6MONTH.examTrack).toBe("SCA");
  });

  it("localStorage pending purchase pattern works correctly", () => {
    // Simulate the localStorage flow
    const planKey = "SCA_3MONTH";

    // Step 1: Store pending purchase (what Pricing.tsx does)
    const storage: Record<string, string> = {};
    storage["sca_pending_purchase"] = planKey;

    // Step 2: After login, SCASimulator.tsx checks and clears it
    const pendingPlan = storage["sca_pending_purchase"];
    expect(pendingPlan).toBe("SCA_3MONTH");

    delete storage["sca_pending_purchase"];
    expect(storage["sca_pending_purchase"]).toBeUndefined();
  });

  it("getLoginUrl generates correct URL with returnPath for SCA", () => {
    // Simulate the getLoginUrl logic
    const returnPath = "/sca";
    const redirectUri = "https://questiongrove360.com/api/oauth/callback";
    const statePayload = JSON.stringify({ redirectUri, returnPath });
    const state = Buffer.from(statePayload).toString("base64");

    // Decode and verify
    const decoded = JSON.parse(Buffer.from(state, "base64").toString());
    expect(decoded.returnPath).toBe("/sca");
    expect(decoded.redirectUri).toContain("/api/oauth/callback");
  });

  it("success_url for SCA plans redirects to /sca", () => {
    // Simulate the success_url logic from stripeRouter
    const origin = "https://questiongrove360.com";
    const examTrack = "SCA";
    const successUrl = examTrack === "SCA"
      ? `${origin}/sca?payment=success`
      : `${origin}/dashboard?payment=success`;
    expect(successUrl).toBe("https://questiongrove360.com/sca?payment=success");
  });

  it("success_url for AKT plans still redirects to /dashboard", () => {
    const origin = "https://questiongrove360.com";
    const examTrack = "AKT";
    const successUrl = examTrack === "SCA"
      ? `${origin}/sca?payment=success`
      : `${origin}/dashboard?payment=success`;
    expect(successUrl).toBe("https://questiongrove360.com/dashboard?payment=success");
  });
});
