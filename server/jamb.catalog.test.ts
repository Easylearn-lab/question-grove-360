import { describe, expect, it } from "vitest";
import {
  JAMB_ATTEMPT_EXAM_ID,
  JAMB_EXAM_CODE,
  JAMB_PAYMENT_PLANS,
  JAMB_SUBJECT_ORDER,
  JAMB_SUBJECTS,
  getJambSubjectBySlug,
} from "../shared/jamb";

describe("JAMB catalogue", () => {
  it("keeps the requested twelve-subject order and excludes removed subjects", () => {
    expect(JAMB_SUBJECT_ORDER).toEqual([
      "English Language",
      "Mathematics",
      "Biology",
      "Chemistry",
      "Physics",
      "Economics",
      "Government",
      "Geography",
      "Literature in English",
      "Commerce",
      "Principles of Accounts",
      "History",
    ]);
    expect(JAMB_SUBJECT_ORDER).not.toContain("Civic Education");
    expect(JAMB_SUBJECT_ORDER).not.toContain("Christian Religious Studies");
    expect(JAMB_SUBJECT_ORDER).not.toContain("Islamic Religious Studies");
  });

  it("maps URLs to catalogue entries and retains a dedicated JAMB attempt identifier", () => {
    expect(getJambSubjectBySlug("mathematics")?.name).toBe("Mathematics");
    expect(getJambSubjectBySlug("unknown-subject")).toBeUndefined();
    expect(JAMB_ATTEMPT_EXAM_ID).toBe(70003);
    expect(JAMB_EXAM_CODE).toBe("JAMB-UTME");
    expect(JAMB_SUBJECTS).toHaveLength(12);
  });

  it("uses the approved Naira payment amounts in minor units", () => {
    expect(JAMB_PAYMENT_PLANS.monthly.amountMinor).toBe(150000);
    expect(JAMB_PAYMENT_PLANS.monthly.displayAmount).toBe(1500);
    expect(JAMB_PAYMENT_PLANS.quarterly.amountMinor).toBe(400000);
    expect(JAMB_PAYMENT_PLANS.quarterly.displayAmount).toBe(4000);
  });
});
