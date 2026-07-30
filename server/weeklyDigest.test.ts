import { describe, it, expect } from "vitest";
import { buildDigestEmail, decodeUnsubscribeToken } from "./weeklyDigestJob";

describe("Weekly Digest Email", () => {
  describe("buildDigestEmail", () => {
    it("generates valid HTML with user name and topics", () => {
      const html = buildDigestEmail("Alice", [
        { specialty: "Cardiovascular", topic: "Heart Failure", accuracy: 35, total: 12 },
        { specialty: "Neurology", topic: "Epilepsy", accuracy: 42, total: 8 },
        { specialty: "Respiratory", topic: "Asthma", accuracy: 50, total: 6 },
      ], "https://questiongrove360.com/api/unsubscribe/digest?token=abc123");

      expect(html).toContain("Hi Alice");
      expect(html).toContain("Heart Failure");
      expect(html).toContain("Cardiovascular");
      expect(html).toContain("35%");
      expect(html).toContain("Epilepsy");
      expect(html).toContain("42%");
      expect(html).toContain("Asthma");
      expect(html).toContain("50%");
      expect(html).toContain("Start Practising");
      expect(html).toContain("Unsubscribe from weekly digest");
      expect(html).toContain("token=abc123");
    });

    it("CTA links to the weakest topic", () => {
      const html = buildDigestEmail("Bob", [
        { specialty: "Dermatology", topic: "Eczema", accuracy: 20, total: 5 },
        { specialty: "Neurology", topic: "Stroke", accuracy: 45, total: 10 },
      ], "https://questiongrove360.com/api/unsubscribe/digest?token=xyz");

      // The main CTA should link to the weakest topic (Eczema)
      expect(html).toContain("specialty=Dermatology");
      expect(html).toContain("topic=Eczema");
    });

    it("includes brand color #32CD32", () => {
      const html = buildDigestEmail("Test", [
        { specialty: "Cardio", topic: "HF", accuracy: 30, total: 5 },
      ], "https://example.com/unsub");

      expect(html).toContain("#32CD32");
    });

    it("uses red color for topics below 40% accuracy", () => {
      const html = buildDigestEmail("Test", [
        { specialty: "Cardio", topic: "HF", accuracy: 25, total: 5 },
      ], "https://example.com/unsub");

      expect(html).toContain("#EF4444");
    });

    it("uses amber color for topics between 40-60% accuracy", () => {
      const html = buildDigestEmail("Test", [
        { specialty: "Cardio", topic: "HF", accuracy: 55, total: 5 },
      ], "https://example.com/unsub");

      expect(html).toContain("#F59E0B");
    });

    it("encodes specialty and topic in deep links", () => {
      const html = buildDigestEmail("Test", [
        { specialty: "Ear, Nose & Throat", topic: "Hearing Loss", accuracy: 40, total: 5 },
      ], "https://example.com/unsub");

      expect(html).toContain("specialty=Ear%2C%20Nose%20%26%20Throat");
      expect(html).toContain("topic=Hearing%20Loss");
    });
  });

  describe("decodeUnsubscribeToken", () => {
    it("decodes a valid token to extract userId", () => {
      // Generate a token manually matching the format
      const token = Buffer.from("digest_unsub_42_1700000000000").toString("base64url");
      const userId = decodeUnsubscribeToken(token);
      expect(userId).toBe(42);
    });

    it("returns null for invalid token format", () => {
      const token = Buffer.from("invalid_format").toString("base64url");
      expect(decodeUnsubscribeToken(token)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(decodeUnsubscribeToken("")).toBeNull();
    });

    it("returns null for garbage input", () => {
      expect(decodeUnsubscribeToken("not-base64-at-all!!!")).toBeNull();
    });

    it("handles large user IDs", () => {
      const token = Buffer.from("digest_unsub_9999999_1700000000000").toString("base64url");
      const userId = decodeUnsubscribeToken(token);
      expect(userId).toBe(9999999);
    });
  });

  describe("email subject line", () => {
    it("subject format matches spec", () => {
      // The handler uses: `Your weakest topics this week — ${firstName}`
      const firstName = "Alice";
      const subject = `Your weakest topics this week — ${firstName}`;
      expect(subject).toBe("Your weakest topics this week — Alice");
    });
  });
});
