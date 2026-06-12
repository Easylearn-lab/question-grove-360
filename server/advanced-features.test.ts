import { describe, it, expect } from "vitest";
import { calculateSM2, calculateDifficultyAdjustment, calculatePassProbability } from "./adaptiveAlgorithm";

describe("Adaptive Learning Algorithm", () => {
  describe("SM-2 Spaced Repetition", () => {
    it("should set interval to 1 day for first correct response", () => {
      const result = calculateSM2({
        quality: 4,
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
      });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it("should set interval to 6 days for second correct response", () => {
      const result = calculateSM2({
        quality: 4,
        repetitions: 1,
        interval: 1,
        easeFactor: 2.5,
      });
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
    });

    it("should multiply interval by ease factor for subsequent responses", () => {
      const result = calculateSM2({
        quality: 4,
        repetitions: 2,
        interval: 6,
        easeFactor: 2.5,
      });
      expect(result.interval).toBe(15); // 6 * 2.5 = 15
      expect(result.repetitions).toBe(3);
    });

    it("should reset on incorrect response (quality < 3)", () => {
      const result = calculateSM2({
        quality: 1,
        repetitions: 5,
        interval: 30,
        easeFactor: 2.5,
      });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
    });

    it("should decrease ease factor for low quality", () => {
      const result = calculateSM2({
        quality: 3,
        repetitions: 2,
        interval: 6,
        easeFactor: 2.5,
      });
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it("should increase ease factor for high quality", () => {
      const result = calculateSM2({
        quality: 5,
        repetitions: 2,
        interval: 6,
        easeFactor: 2.5,
      });
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });

    it("should never let ease factor go below 1.3", () => {
      const result = calculateSM2({
        quality: 0,
        repetitions: 0,
        interval: 1,
        easeFactor: 1.3,
      });
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it("should return a future date for nextReviewDate", () => {
      const result = calculateSM2({
        quality: 4,
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
      });
      expect(result.nextReviewDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Difficulty Adjustment", () => {
    it("should return Medium for insufficient data", () => {
      const result = calculateDifficultyAdjustment([
        { correct: true, difficulty: "Easy" },
      ]);
      expect(result).toBe("Medium");
    });

    it("should recommend Hard when performance is high (>= 80%)", () => {
      const performance = Array(10).fill({ correct: true, difficulty: "Medium" });
      performance[0] = { correct: false, difficulty: "Medium" }; // 90% correct
      const result = calculateDifficultyAdjustment(performance);
      expect(result).toBe("Hard");
    });

    it("should recommend Medium when performance is moderate (50-80%)", () => {
      const performance = Array(10).fill(null).map((_, i) => ({
        correct: i < 6, // 60% correct
        difficulty: "Medium",
      }));
      const result = calculateDifficultyAdjustment(performance);
      expect(result).toBe("Medium");
    });

    it("should recommend Easy when performance is low (< 50%)", () => {
      const performance = Array(10).fill(null).map((_, i) => ({
        correct: i < 3, // 30% correct
        difficulty: "Medium",
      }));
      const result = calculateDifficultyAdjustment(performance);
      expect(result).toBe("Easy");
    });

    it("should only consider last 10 attempts", () => {
      // 20 attempts: first 10 wrong, last 10 correct
      const performance = [
        ...Array(10).fill({ correct: false, difficulty: "Medium" }),
        ...Array(10).fill({ correct: true, difficulty: "Medium" }),
      ];
      const result = calculateDifficultyAdjustment(performance);
      expect(result).toBe("Hard"); // Should only look at last 10 (all correct)
    });
  });

  describe("Pass Probability", () => {
    it("should return 0 for empty scores", () => {
      const result = calculatePassProbability({});
      expect(result).toBe(0);
    });

    it("should return high probability for scores well above pass mark", () => {
      const result = calculatePassProbability({
        Cardiology: 90,
        Respiratory: 85,
        Neurology: 88,
      });
      expect(result).toBeGreaterThan(70);
    });

    it("should return low probability for scores below pass mark", () => {
      const result = calculatePassProbability({
        Cardiology: 40,
        Respiratory: 35,
        Neurology: 45,
      });
      expect(result).toBeLessThan(30);
    });

    it("should return ~50% for scores at the pass mark", () => {
      const result = calculatePassProbability({
        Cardiology: 70,
        Respiratory: 70,
        Neurology: 70,
      }, 70);
      // With all scores at pass mark, probability should be around 50%
      expect(result).toBeGreaterThan(40);
      expect(result).toBeLessThan(60);
    });

    it("should use custom pass mark", () => {
      const result = calculatePassProbability({
        Cardiology: 60,
        Respiratory: 65,
        Neurology: 55,
      }, 50);
      expect(result).toBeGreaterThan(50);
    });
  });
});

describe("Email Trigger Service", () => {
  it("should export triggerEmailNotification function", async () => {
    const { triggerEmailNotification } = await import("./emailService");
    expect(typeof triggerEmailNotification).toBe("function");
  });

  it("should export triggerWelcomeNotification function", async () => {
    const { triggerWelcomeNotification } = await import("./emailService");
    expect(typeof triggerWelcomeNotification).toBe("function");
  });

  it("should export triggerExamResultNotification function", async () => {
    const { triggerExamResultNotification } = await import("./emailService");
    expect(typeof triggerExamResultNotification).toBe("function");
  });

  it("should export triggerSubscriptionNotification function", async () => {
    const { triggerSubscriptionNotification } = await import("./emailService");
    expect(typeof triggerSubscriptionNotification).toBe("function");
  });
});

describe("Voice Router", () => {
  it("should export voiceRouter", async () => {
    const { voiceRouter } = await import("./voiceRouter");
    expect(voiceRouter).toBeDefined();
    expect(voiceRouter._def).toBeDefined();
  });
});

describe("Two-Factor Authentication Router", () => {
  it("should export twoFactorRouter", async () => {
    const { twoFactorRouter } = await import("./twoFactorRouter");
    expect(twoFactorRouter).toBeDefined();
    expect(twoFactorRouter._def).toBeDefined();
  });
});
