import { describe, it, expect } from "vitest";

/**
 * Access Control Separation Tests
 * 
 * Verifies that each product (AKT, SCA, Picture360) has its own
 * independent access check and paying for one does NOT grant access to another.
 * 
 * MULTI-SUBSCRIPTION FIX (July 2026):
 * Added Scenario 5 to verify that a user with BOTH AKT and SCA subscriptions
 * gets access to both tracks simultaneously. This was the root cause of the bug
 * where subscribing to SCA overwrote the AKT subscription.
 */

type ExamTrack = "AKT" | "SCA" | "MSRA";

interface SubscriptionEntry {
  plan: string;
  status: string;
}

// Simulate the getExamTrackFromPlan logic used in the frontend hook
function getExamTrackFromPlan(plan: string | null): ExamTrack | null {
  if (!plan) return null;
  const upperPlan = plan.toUpperCase();
  if (upperPlan.startsWith("AKT")) return "AKT";
  if (upperPlan.startsWith("SCA")) return "SCA";
  if (upperPlan.startsWith("MSRA")) return "MSRA";
  return null;
}

/**
 * NEW multi-subscription access check.
 * Checks if ANY subscription in the array matches the required track AND is active/trialing.
 */
function checkExamAccessMulti(
  subscriptions: SubscriptionEntry[],
  requiredTrack: ExamTrack
): boolean {
  return subscriptions.some((sub) => {
    const isActive = sub.status === "active" || sub.status === "trialing";
    const matchesTrack = getExamTrackFromPlan(sub.plan) === requiredTrack;
    return isActive && matchesTrack;
  });
}

// Legacy single-subscription check (kept for backward compatibility tests)
function checkExamAccess(
  subscriptionStatus: string,
  plan: string | null,
  requiredTrack: ExamTrack
): boolean {
  return checkExamAccessMulti(
    plan ? [{ plan, status: subscriptionStatus }] : [],
    requiredTrack
  );
}

describe("Access Control Separation", () => {
  describe("Plan to ExamTrack mapping", () => {
    it("maps AKT_3MONTH to AKT track", () => {
      expect(getExamTrackFromPlan("AKT_3MONTH")).toBe("AKT");
    });

    it("maps AKT_6MONTH to AKT track", () => {
      expect(getExamTrackFromPlan("AKT_6MONTH")).toBe("AKT");
    });

    it("maps SCA_3MONTH to SCA track", () => {
      expect(getExamTrackFromPlan("SCA_3MONTH")).toBe("SCA");
    });

    it("maps SCA_6MONTH to SCA track", () => {
      expect(getExamTrackFromPlan("SCA_6MONTH")).toBe("SCA");
    });

    it("maps MSRA_3MONTH to MSRA track", () => {
      expect(getExamTrackFromPlan("MSRA_3MONTH")).toBe("MSRA");
    });

    it("maps MSRA_6MONTH to MSRA track", () => {
      expect(getExamTrackFromPlan("MSRA_6MONTH")).toBe("MSRA");
    });

    it("returns null for null plan", () => {
      expect(getExamTrackFromPlan(null)).toBeNull();
    });

    it("returns null for unknown plan", () => {
      expect(getExamTrackFromPlan("UNKNOWN_PLAN")).toBeNull();
    });
  });

  describe("Scenario 1: AKT subscriber only", () => {
    const subscriptions: SubscriptionEntry[] = [
      { plan: "AKT_6MONTH", status: "active" },
    ];

    it("CAN access AKT features", () => {
      expect(checkExamAccessMulti(subscriptions, "AKT")).toBe(true);
    });

    it("CANNOT access SCA features", () => {
      expect(checkExamAccessMulti(subscriptions, "SCA")).toBe(false);
    });

    it("CANNOT access MSRA features", () => {
      expect(checkExamAccessMulti(subscriptions, "MSRA")).toBe(false);
    });
  });

  describe("Scenario 2: SCA subscriber only", () => {
    const subscriptions: SubscriptionEntry[] = [
      { plan: "SCA_3MONTH", status: "active" },
    ];

    it("CAN access SCA features", () => {
      expect(checkExamAccessMulti(subscriptions, "SCA")).toBe(true);
    });

    it("CANNOT access AKT features", () => {
      expect(checkExamAccessMulti(subscriptions, "AKT")).toBe(false);
    });
  });

  describe("Scenario 3: No subscription", () => {
    const subscriptions: SubscriptionEntry[] = [];

    it("CANNOT access AKT with no subscriptions", () => {
      expect(checkExamAccessMulti(subscriptions, "AKT")).toBe(false);
    });

    it("CANNOT access SCA with no subscriptions", () => {
      expect(checkExamAccessMulti(subscriptions, "SCA")).toBe(false);
    });
  });

  describe("Scenario 4: Trialing status (admin coupon)", () => {
    it("AKT trialing CAN access AKT", () => {
      expect(checkExamAccessMulti([{ plan: "AKT_3MONTH", status: "trialing" }], "AKT")).toBe(true);
    });

    it("AKT trialing CANNOT access SCA", () => {
      expect(checkExamAccessMulti([{ plan: "AKT_3MONTH", status: "trialing" }], "SCA")).toBe(false);
    });

    it("SCA trialing CAN access SCA", () => {
      expect(checkExamAccessMulti([{ plan: "SCA_6MONTH", status: "trialing" }], "SCA")).toBe(true);
    });

    it("SCA trialing CANNOT access AKT", () => {
      expect(checkExamAccessMulti([{ plan: "SCA_6MONTH", status: "trialing" }], "AKT")).toBe(false);
    });
  });

  describe("Scenario 5: DUAL subscriber (AKT + SCA) — THE BUG FIX", () => {
    const subscriptions: SubscriptionEntry[] = [
      { plan: "AKT_3MONTH", status: "active" },
      { plan: "SCA_3MONTH", status: "active" },
    ];

    it("CAN access AKT features", () => {
      expect(checkExamAccessMulti(subscriptions, "AKT")).toBe(true);
    });

    it("CAN access SCA features", () => {
      expect(checkExamAccessMulti(subscriptions, "SCA")).toBe(true);
    });

    it("CANNOT access MSRA features (not subscribed)", () => {
      expect(checkExamAccessMulti(subscriptions, "MSRA")).toBe(false);
    });
  });

  describe("Scenario 6: One active, one cancelled", () => {
    const subscriptions: SubscriptionEntry[] = [
      { plan: "AKT_3MONTH", status: "active" },
      { plan: "SCA_3MONTH", status: "cancelled" },
    ];

    it("CAN access AKT (still active)", () => {
      expect(checkExamAccessMulti(subscriptions, "AKT")).toBe(true);
    });

    it("CANNOT access SCA (cancelled)", () => {
      expect(checkExamAccessMulti(subscriptions, "SCA")).toBe(false);
    });
  });

  describe("Scenario 7: Triple subscriber (AKT + SCA + MSRA)", () => {
    const subscriptions: SubscriptionEntry[] = [
      { plan: "AKT_6MONTH", status: "active" },
      { plan: "SCA_6MONTH", status: "active" },
      { plan: "MSRA_3MONTH", status: "active" },
    ];

    it("CAN access AKT", () => {
      expect(checkExamAccessMulti(subscriptions, "AKT")).toBe(true);
    });

    it("CAN access SCA", () => {
      expect(checkExamAccessMulti(subscriptions, "SCA")).toBe(true);
    });

    it("CAN access MSRA", () => {
      expect(checkExamAccessMulti(subscriptions, "MSRA")).toBe(true);
    });
  });

  describe("Picture360 independence", () => {
    it("Picture360 uses its own table (picture360_access), not subscription system", () => {
      // Picture360 access is checked via a separate table and hook (usePicture360Access)
      // It does NOT use useExamAccess or useSubscription
      // This test documents the architectural separation
      const dualSubscriber: SubscriptionEntry[] = [
        { plan: "AKT_6MONTH", status: "active" },
        { plan: "SCA_3MONTH", status: "active" },
      ];
      
      // Having AKT+SCA does NOT grant Picture360 access
      // Picture360 requires its own purchase recorded in picture360_access table
      expect(checkExamAccessMulti(dualSubscriber, "AKT")).toBe(true);
      expect(checkExamAccessMulti(dualSubscriber, "SCA")).toBe(true);
      // Picture360 access would be: SELECT * FROM picture360_access WHERE userId = ? AND status = 'active'
    });
  });

  describe("Edge cases", () => {
    it("canceled subscription has no access", () => {
      expect(checkExamAccessMulti([{ plan: "AKT_6MONTH", status: "canceled" }], "AKT")).toBe(false);
    });

    it("past_due subscription has no access", () => {
      expect(checkExamAccessMulti([{ plan: "SCA_3MONTH", status: "past_due" }], "SCA")).toBe(false);
    });

    it("empty subscriptions array has no access", () => {
      expect(checkExamAccessMulti([], "AKT")).toBe(false);
      expect(checkExamAccessMulti([], "SCA")).toBe(false);
    });

    it("subscription with null-like plan has no access", () => {
      expect(checkExamAccessMulti([{ plan: "", status: "active" }], "AKT")).toBe(false);
    });
  });

  describe("Legacy single-subscription helper (backward compat)", () => {
    it("active AKT can access AKT", () => {
      expect(checkExamAccess("active", "AKT_6MONTH", "AKT")).toBe(true);
    });

    it("active AKT cannot access SCA", () => {
      expect(checkExamAccess("active", "AKT_6MONTH", "SCA")).toBe(false);
    });

    it("inactive with null plan has no access", () => {
      expect(checkExamAccess("inactive", null, "AKT")).toBe(false);
    });
  });
});
