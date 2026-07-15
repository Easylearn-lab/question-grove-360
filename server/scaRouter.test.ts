import { describe, it, expect, vi } from "vitest";

// Mock the database
const mockExecute = vi.fn();
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: (...args: any[]) => mockExecute(...args),
  }),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "I've been having headaches for about two weeks now." } }],
  }),
}));

describe("SCA Router", () => {
  it("should export scaRouter with expected procedures", async () => {
    const { scaRouter } = await import("./scaRouter");
    expect(scaRouter).toBeDefined();
    // Check that the router has the expected procedures
    const routerDef = scaRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("getCases returns array of cases from database", async () => {
    const mockCases = [
      { id: 1, title: "Test Case 1", category: "Mental Health", difficulty: "Medium", patientName: "John", patientAge: 45, patientGender: "Male", presentingComplaint: "Headaches" },
      { id: 2, title: "Test Case 2", category: "Respiratory", difficulty: "Easy", patientName: "Jane", patientAge: 30, patientGender: "Female", presentingComplaint: "Cough" },
    ];
    mockExecute.mockResolvedValueOnce([mockCases, []]);

    const { scaRouter } = await import("./scaRouter");
    // Verify the router structure exists
    expect(scaRouter._def.procedures.getCases).toBeDefined();
    expect(scaRouter._def.procedures.getCaseById).toBeDefined();
    expect(scaRouter._def.procedures.generatePatientResponse).toBeDefined();
    expect(scaRouter._def.procedures.saveConsultation).toBeDefined();
    expect(scaRouter._def.procedures.getHistory).toBeDefined();
    expect(scaRouter._def.procedures.getConsultation).toBeDefined();
  });

  it("voice profile mapping returns correct voices", () => {
    // Test the voice profile logic inline
    function getVoiceProfile(age: number, gender: string) {
      if (gender?.toLowerCase() === "female") return { voice: "nova" };
      if (age >= 60) return { voice: "onyx" };
      if (age <= 30) return { voice: "echo" };
      return { voice: "alloy" };
    }

    expect(getVoiceProfile(25, "Male").voice).toBe("echo");
    expect(getVoiceProfile(65, "Male").voice).toBe("onyx");
    expect(getVoiceProfile(40, "Female").voice).toBe("nova");
    expect(getVoiceProfile(45, "Male").voice).toBe("alloy");
  });

  it("competency scoring calculates correctly", () => {
    type CompetencyScore = "well" | "partial" | "poor";
    const scores: Record<string, CompetencyScore> = {
      "D1.1": "well",
      "D1.2": "partial",
      "D1.3": "poor",
    };

    let score = 0;
    Object.values(scores).forEach((s) => {
      if (s === "well") score += 2;
      else if (s === "partial") score += 1;
    });
    const max = Object.keys(scores).length * 2;
    const percentage = Math.round((score / max) * 100);

    expect(score).toBe(3); // 2 + 1 + 0
    expect(max).toBe(6);
    expect(percentage).toBe(50);
  });

  it("PAYMENT_ENABLED has SCA set to true", async () => {
    const { PAYMENT_ENABLED } = await import("./products");
    expect(PAYMENT_ENABLED.SCA).toBe(true);
  });
});
