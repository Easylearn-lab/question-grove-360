import { describe, it, expect } from "vitest";

/**
 * CrossSellGate Logic Tests
 * 
 * Tests the decision logic of the CrossSellGate component:
 * 1. If user has access → show children (pass-through)
 * 2. If user has the OTHER subscription but NOT the required one → show cross-sell
 * 3. If user has no subscription → show generic gate with "View Plans & Subscribe"
 * 
 * MULTI-SUBSCRIPTION FIX (July 2026):
 * Added tests for dual-subscriber scenario where user has BOTH AKT and SCA.
 * In that case, hasAccess=true for both tracks, so CrossSellGate always shows children.
 */

type ExamTrack = "AKT" | "SCA" | "MSRA";

interface SubscriptionEntry {
  plan: string;
  status: string;
}

// Simulate the getTrackFromPlan logic used in CrossSellGate
function getTrackFromPlan(plan: string | null): ExamTrack | null {
  if (!plan) return null;
  const upper = plan.toUpperCase();
  if (upper.startsWith("AKT")) return "AKT";
  if (upper.startsWith("SCA")) return "SCA";
  if (upper.startsWith("MSRA")) return "MSRA";
  return null;
}

// NEW multi-subscription decision logic (matches the actual CrossSellGate component)
type GateDecision = "show_children" | "cross_sell" | "generic_gate";

function getCrossSellDecisionMulti(
  hasAccess: boolean,
  subscriptions: SubscriptionEntry[],
  requiredTrack: ExamTrack
): GateDecision {
  if (hasAccess) return "show_children";

  // Check if user has ANY other active subscription
  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "active" || sub.status === "trialing"
  );
  const userTracks = activeSubscriptions
    .map((sub) => getTrackFromPlan(sub.plan))
    .filter((track): track is ExamTrack => track !== null);

  const isPremium = userTracks.length > 0;
  const hasOtherSubscription = isPremium && !userTracks.includes(requiredTrack);

  if (hasOtherSubscription) return "cross_sell";
  return "generic_gate";
}

// Legacy helper for backward-compat tests
function getCrossSellDecision(
  hasAccess: boolean,
  isPremium: boolean,
  plan: string | null,
  requiredTrack: ExamTrack
): GateDecision {
  const subscriptions: SubscriptionEntry[] = plan && isPremium
    ? [{ plan, status: "active" }]
    : [];
  return getCrossSellDecisionMulti(hasAccess, subscriptions, requiredTrack);
}

// Simulate the plan keys that would be shown in cross-sell
function getCrossSellPlanKeys(requiredTrack: ExamTrack): { plan3mo: string; plan6mo: string } {
  if (requiredTrack === "MSRA") return { plan3mo: "MSRA_3MONTH", plan6mo: "MSRA_6MONTH" };
  return {
    plan3mo: requiredTrack === "SCA" ? "SCA_3MONTH" : "AKT_3MONTH",
    plan6mo: requiredTrack === "SCA" ? "SCA_6MONTH" : "AKT_6MONTH",
  };
}

describe("CrossSellGate Logic", () => {
  describe("Decision: show children (user has access)", () => {
    it("shows children when hasAccess is true (AKT subscriber on AKT page)", () => {
      expect(getCrossSellDecision(true, true, "AKT_3MONTH", "AKT")).toBe("show_children");
    });

    it("shows children when hasAccess is true (SCA subscriber on SCA page)", () => {
      expect(getCrossSellDecision(true, true, "SCA_6MONTH", "SCA")).toBe("show_children");
    });
  });

  describe("Decision: cross-sell (user has OTHER subscription)", () => {
    it("shows cross-sell when AKT subscriber visits SCA page", () => {
      expect(getCrossSellDecision(false, true, "AKT_3MONTH", "SCA")).toBe("cross_sell");
    });

    it("shows cross-sell when AKT_6MONTH subscriber visits SCA page", () => {
      expect(getCrossSellDecision(false, true, "AKT_6MONTH", "SCA")).toBe("cross_sell");
    });

    it("shows cross-sell when SCA subscriber visits AKT page", () => {
      expect(getCrossSellDecision(false, true, "SCA_3MONTH", "AKT")).toBe("cross_sell");
    });

    it("shows cross-sell when SCA_6MONTH subscriber visits AKT page", () => {
      expect(getCrossSellDecision(false, true, "SCA_6MONTH", "AKT")).toBe("cross_sell");
    });
  });

  describe("Decision: generic gate (no subscription)", () => {
    it("shows generic gate when user has no subscription (null plan)", () => {
      expect(getCrossSellDecision(false, false, null, "AKT")).toBe("generic_gate");
    });

    it("shows generic gate when user has no subscription visiting SCA", () => {
      expect(getCrossSellDecision(false, false, null, "SCA")).toBe("generic_gate");
    });

    it("shows generic gate when user has expired subscription", () => {
      expect(getCrossSellDecision(false, false, "AKT_3MONTH", "AKT")).toBe("generic_gate");
    });

    it("shows generic gate when plan is unknown", () => {
      expect(getCrossSellDecision(false, false, "UNKNOWN", "AKT")).toBe("generic_gate");
    });
  });

  describe("MULTI-SUBSCRIPTION: Dual subscriber (AKT + SCA)", () => {
    const dualSubscriptions: SubscriptionEntry[] = [
      { plan: "AKT_3MONTH", status: "active" },
      { plan: "SCA_3MONTH", status: "active" },
    ];

    it("shows children on AKT page (has AKT access)", () => {
      // hasAccess=true because useExamAccess("AKT") checks all subscriptions
      expect(getCrossSellDecisionMulti(true, dualSubscriptions, "AKT")).toBe("show_children");
    });

    it("shows children on SCA page (has SCA access)", () => {
      expect(getCrossSellDecisionMulti(true, dualSubscriptions, "SCA")).toBe("show_children");
    });

    it("shows cross-sell on MSRA page (does not have MSRA)", () => {
      // hasAccess=false for MSRA, but user has other active subscriptions
      expect(getCrossSellDecisionMulti(false, dualSubscriptions, "MSRA")).toBe("cross_sell");
    });
  });

  describe("MULTI-SUBSCRIPTION: One active, one cancelled", () => {
    const mixedSubscriptions: SubscriptionEntry[] = [
      { plan: "AKT_3MONTH", status: "active" },
      { plan: "SCA_3MONTH", status: "cancelled" },
    ];

    it("shows children on AKT page (AKT still active)", () => {
      expect(getCrossSellDecisionMulti(true, mixedSubscriptions, "AKT")).toBe("show_children");
    });

    it("shows cross-sell on SCA page (SCA cancelled, but user has active AKT)", () => {
      // hasAccess=false for SCA (cancelled), but user has active AKT → cross-sell
      expect(getCrossSellDecisionMulti(false, mixedSubscriptions, "SCA")).toBe("cross_sell");
    });
  });

  describe("MULTI-SUBSCRIPTION: All cancelled", () => {
    const allCancelled: SubscriptionEntry[] = [
      { plan: "AKT_3MONTH", status: "cancelled" },
      { plan: "SCA_3MONTH", status: "cancelled" },
    ];

    it("shows generic gate on AKT page (all cancelled)", () => {
      expect(getCrossSellDecisionMulti(false, allCancelled, "AKT")).toBe("generic_gate");
    });

    it("shows generic gate on SCA page (all cancelled)", () => {
      expect(getCrossSellDecisionMulti(false, allCancelled, "SCA")).toBe("generic_gate");
    });
  });

  describe("Cross-sell plan keys", () => {
    it("returns SCA plan keys when requiredTrack is SCA", () => {
      const keys = getCrossSellPlanKeys("SCA");
      expect(keys.plan3mo).toBe("SCA_3MONTH");
      expect(keys.plan6mo).toBe("SCA_6MONTH");
    });

    it("returns AKT plan keys when requiredTrack is AKT", () => {
      const keys = getCrossSellPlanKeys("AKT");
      expect(keys.plan3mo).toBe("AKT_3MONTH");
      expect(keys.plan6mo).toBe("AKT_6MONTH");
    });

    it("returns MSRA plan keys when requiredTrack is MSRA", () => {
      const keys = getCrossSellPlanKeys("MSRA");
      expect(keys.plan3mo).toBe("MSRA_3MONTH");
      expect(keys.plan6mo).toBe("MSRA_6MONTH");
    });
  });

  describe("getTrackFromPlan utility", () => {
    it("maps AKT_3MONTH to AKT", () => {
      expect(getTrackFromPlan("AKT_3MONTH")).toBe("AKT");
    });

    it("maps AKT_6MONTH to AKT", () => {
      expect(getTrackFromPlan("AKT_6MONTH")).toBe("AKT");
    });

    it("maps SCA_3MONTH to SCA", () => {
      expect(getTrackFromPlan("SCA_3MONTH")).toBe("SCA");
    });

    it("maps SCA_6MONTH to SCA", () => {
      expect(getTrackFromPlan("SCA_6MONTH")).toBe("SCA");
    });

    it("maps MSRA_3MONTH to MSRA", () => {
      expect(getTrackFromPlan("MSRA_3MONTH")).toBe("MSRA");
    });

    it("returns null for null plan", () => {
      expect(getTrackFromPlan(null)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(getTrackFromPlan("")).toBeNull();
    });

    it("returns null for unknown plan", () => {
      expect(getTrackFromPlan("PICTURE360")).toBeNull();
    });

    it("is case-insensitive", () => {
      expect(getTrackFromPlan("akt_3month")).toBe("AKT");
      expect(getTrackFromPlan("sca_6month")).toBe("SCA");
    });
  });

  describe("Edge cases", () => {
    it("does not show cross-sell for same track (AKT on AKT) when not premium", () => {
      expect(getCrossSellDecision(false, false, "AKT_3MONTH", "AKT")).toBe("generic_gate");
    });

    it("does not show cross-sell when isPremium is true but plan is null", () => {
      expect(getCrossSellDecision(false, true, null, "AKT")).toBe("generic_gate");
    });

    it("does not show cross-sell when isPremium is true but plan is unknown", () => {
      expect(getCrossSellDecision(false, true, "PICTURE360", "AKT")).toBe("generic_gate");
    });
  });
});
