import { describe, it, expect } from "vitest";

/**
 * CrossSellGate Logic Tests
 * 
 * Tests the decision logic of the CrossSellGate component:
 * 1. If user has access → show children (pass-through)
 * 2. If user has the OTHER subscription → show cross-sell with direct checkout buttons
 * 3. If user has no subscription → show generic gate with "View Plans & Subscribe"
 */

type ExamTrack = "AKT" | "SCA";

// Simulate the getTrackFromPlan logic used in CrossSellGate
function getTrackFromPlan(plan: string | null): ExamTrack | null {
  if (!plan) return null;
  const upper = plan.toUpperCase();
  if (upper.startsWith("AKT")) return "AKT";
  if (upper.startsWith("SCA")) return "SCA";
  return null;
}

// Simulate the CrossSellGate decision logic
type GateDecision = "show_children" | "cross_sell" | "generic_gate";

function getCrossSellDecision(
  hasAccess: boolean,
  isPremium: boolean,
  plan: string | null,
  requiredTrack: ExamTrack
): GateDecision {
  if (hasAccess) return "show_children";

  const userTrack = getTrackFromPlan(plan);
  const hasOtherSubscription = isPremium && userTrack !== null && userTrack !== requiredTrack;

  if (hasOtherSubscription) return "cross_sell";
  return "generic_gate";
}

// Simulate the plan keys that would be shown in cross-sell
function getCrossSellPlanKeys(requiredTrack: ExamTrack): { plan3mo: string; plan6mo: string } {
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
      // User has AKT_3MONTH, visiting SCA page (hasAccess=false because useExamAccess('SCA') returns false)
      expect(getCrossSellDecision(false, true, "AKT_3MONTH", "SCA")).toBe("cross_sell");
    });

    it("shows cross-sell when AKT_6MONTH subscriber visits SCA page", () => {
      expect(getCrossSellDecision(false, true, "AKT_6MONTH", "SCA")).toBe("cross_sell");
    });

    it("shows cross-sell when SCA subscriber visits AKT page", () => {
      // User has SCA_3MONTH, visiting AKT page
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
      // isPremium is false even though plan might still be set
      expect(getCrossSellDecision(false, false, "AKT_3MONTH", "AKT")).toBe("generic_gate");
    });

    it("shows generic gate when plan is unknown", () => {
      expect(getCrossSellDecision(false, false, "UNKNOWN", "AKT")).toBe("generic_gate");
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
      // hasAccess=false, isPremium=false, plan=AKT → generic gate (not cross-sell)
      expect(getCrossSellDecision(false, false, "AKT_3MONTH", "AKT")).toBe("generic_gate");
    });

    it("does not show cross-sell when isPremium is true but plan is null", () => {
      // Edge case: isPremium=true but plan is null (shouldn't happen in practice)
      expect(getCrossSellDecision(false, true, null, "AKT")).toBe("generic_gate");
    });

    it("does not show cross-sell when isPremium is true but plan is unknown", () => {
      // Edge case: isPremium=true but plan doesn't map to a track
      expect(getCrossSellDecision(false, true, "PICTURE360", "AKT")).toBe("generic_gate");
    });
  });
});
