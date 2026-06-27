import { describe, it, expect, vi } from "vitest";

// Test the readiness score calculation logic
describe("Readiness Score Calculation", () => {
  it("should return 'Not Ready' for score below 50%", () => {
    const score = 35;
    let label: string;
    let colour: string;
    if (score >= 80) { label = "Exam Ready"; colour = "green"; }
    else if (score >= 66) { label = "Borderline"; colour = "amber"; }
    else if (score >= 50) { label = "High Risk"; colour = "orange"; }
    else { label = "Not Ready"; colour = "red"; }
    expect(label).toBe("Not Ready");
    expect(colour).toBe("red");
  });

  it("should return 'High Risk' for score 50-65%", () => {
    const score = 58;
    let label: string;
    let colour: string;
    if (score >= 80) { label = "Exam Ready"; colour = "green"; }
    else if (score >= 66) { label = "Borderline"; colour = "amber"; }
    else if (score >= 50) { label = "High Risk"; colour = "orange"; }
    else { label = "Not Ready"; colour = "red"; }
    expect(label).toBe("High Risk");
    expect(colour).toBe("orange");
  });

  it("should return 'Borderline' for score 66-79%", () => {
    const score = 72;
    let label: string;
    let colour: string;
    if (score >= 80) { label = "Exam Ready"; colour = "green"; }
    else if (score >= 66) { label = "Borderline"; colour = "amber"; }
    else if (score >= 50) { label = "High Risk"; colour = "orange"; }
    else { label = "Not Ready"; colour = "red"; }
    expect(label).toBe("Borderline");
    expect(colour).toBe("amber");
  });

  it("should return 'Exam Ready' for score 80%+", () => {
    const score = 85;
    let label: string;
    let colour: string;
    if (score >= 80) { label = "Exam Ready"; colour = "green"; }
    else if (score >= 66) { label = "Borderline"; colour = "amber"; }
    else if (score >= 50) { label = "High Risk"; colour = "orange"; }
    else { label = "Not Ready"; colour = "red"; }
    expect(label).toBe("Exam Ready");
    expect(colour).toBe("green");
  });

  it("should calculate weighted average correctly with both QB and mock data", () => {
    const qbAccuracy = 70; // 70% question bank
    const mockAvg = 80; // 80% mock average
    const readinessScore = Math.round(qbAccuracy * 0.6 + mockAvg * 0.4);
    expect(readinessScore).toBe(74); // 42 + 32 = 74
  });

  it("should use 100% QB when no mocks available", () => {
    const qbAccuracy = 65;
    const hasMocks = false;
    const readinessScore = hasMocks ? Math.round(qbAccuracy * 0.6 + 0 * 0.4) : Math.round(qbAccuracy);
    expect(readinessScore).toBe(65);
  });

  it("should find top 2 weakest specialties", () => {
    const specialtyMap: Record<string, { correct: number; total: number }> = {
      "Respiratory": { correct: 8, total: 10 },
      "Neurology": { correct: 3, total: 10 },
      "Cardiology": { correct: 5, total: 10 },
      "Dermatology": { correct: 2, total: 10 },
      "Paediatrics": { correct: 7, total: 10 },
    };

    const weakestSpecialties = Object.entries(specialtyMap)
      .filter(([, s]) => s.total >= 3)
      .map(([name, s]) => ({ name, accuracy: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 2);

    expect(weakestSpecialties).toHaveLength(2);
    expect(weakestSpecialties[0].name).toBe("Dermatology");
    expect(weakestSpecialties[0].accuracy).toBe(20);
    expect(weakestSpecialties[1].name).toBe("Neurology");
    expect(weakestSpecialties[1].accuracy).toBe(30);
  });
});

// Test the weakness fingerprint status logic
describe("Weakness Fingerprint Status", () => {
  function getStatus(accuracy: number | null): { status: string; label: string } {
    if (accuracy === null) return { status: "grey", label: "Not started" };
    if (accuracy >= 70) return { status: "green", label: `${accuracy}%` };
    if (accuracy >= 50) return { status: "amber", label: `${accuracy}%` };
    return { status: "red", label: `${accuracy}%` };
  }

  it("should return grey for no attempts", () => {
    const result = getStatus(null);
    expect(result.status).toBe("grey");
    expect(result.label).toBe("Not started");
  });

  it("should return red for accuracy below 50%", () => {
    const result = getStatus(35);
    expect(result.status).toBe("red");
    expect(result.label).toBe("35%");
  });

  it("should return amber for accuracy 50-69%", () => {
    const result = getStatus(62);
    expect(result.status).toBe("amber");
    expect(result.label).toBe("62%");
  });

  it("should return green for accuracy 70%+", () => {
    const result = getStatus(85);
    expect(result.status).toBe("green");
    expect(result.label).toBe("85%");
  });

  it("should return green at exactly 70%", () => {
    const result = getStatus(70);
    expect(result.status).toBe("green");
    expect(result.label).toBe("70%");
  });

  it("should return amber at exactly 50%", () => {
    const result = getStatus(50);
    expect(result.status).toBe("amber");
    expect(result.label).toBe("50%");
  });

  it("should cover all 17 specialties", () => {
    const ALL_SPECIALTIES = [
      "Neurology", "Endocrinology", "Dermatology", "Renal & Urology",
      "Cardiovascular", "Respiratory", "Gastroenterology", "Musculoskeletal",
      "Obstetrics & Gynaecology", "Ethics & Organisational", "Paediatrics",
      "Haematology", "Pharmacology & Prescribing", "Statistics & EBM",
      "Ophthalmology", "ENT", "Infectious Disease",
    ];
    expect(ALL_SPECIALTIES).toHaveLength(17);
  });
});
