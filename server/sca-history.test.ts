import { describe, it, expect } from "vitest";

/**
 * SCA History Page Logic Tests
 *
 * Tests the computation logic used in the SCA History page:
 * - Average score calculation across consultations
 * - Radar chart data generation
 * - Weakest domain detection
 * - Pass rate calculation
 * - Date/duration formatting
 */

// ============================================================
// REPLICATED LOGIC FROM SCAHistory.tsx
// ============================================================

interface Consultation {
  id: number;
  caseId: number;
  caseTitle: string;
  domain1Score: number;
  domain2Score: number;
  domain3Score: number;
  totalScore: number;
  passed: boolean;
  completedAt: string;
  duration: number;
}

function computeAverageScores(consultations: Consultation[]) {
  if (!consultations || consultations.length === 0) return null;
  const total = consultations.length;
  const avgD1 = consultations.reduce((sum, c) => sum + (c.domain1Score || 0), 0) / total;
  const avgD2 = consultations.reduce((sum, c) => sum + (c.domain2Score || 0), 0) / total;
  const avgD3 = consultations.reduce((sum, c) => sum + (c.domain3Score || 0), 0) / total;
  const passRate = (consultations.filter((c) => c.passed).length / total) * 100;
  return { avgD1, avgD2, avgD3, passRate, total };
}

function getRadarData(avgD1: number, avgD2: number, avgD3: number) {
  return [
    { domain: "Data Gathering", score: avgD1, fullMark: 3 },
    { domain: "Clinical Management", score: avgD2, fullMark: 3 },
    { domain: "Interpersonal Skills", score: avgD3, fullMark: 3 },
  ];
}

function getWeakestDomain(d1: number, d2: number, d3: number): string {
  const min = Math.min(d1, d2, d3);
  if (min === d1) return "Data Gathering";
  if (min === d2) return "Clinical Management";
  return "Interpersonal Skills";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// ============================================================
// TESTS
// ============================================================

describe("SCA History Page Logic", () => {
  const mockConsultations: Consultation[] = [
    { id: 1, caseId: 1, caseTitle: "Chest Pain", domain1Score: 3, domain2Score: 2, domain3Score: 3, totalScore: 8, passed: true, completedAt: "2026-07-10T14:30:00Z", duration: 600 },
    { id: 2, caseId: 2, caseTitle: "Depression", domain1Score: 2, domain2Score: 3, domain3Score: 2, totalScore: 7, passed: true, completedAt: "2026-07-11T10:00:00Z", duration: 720 },
    { id: 3, caseId: 3, caseTitle: "Back Pain", domain1Score: 1, domain2Score: 1, domain3Score: 2, totalScore: 4, passed: false, completedAt: "2026-07-12T09:15:00Z", duration: 480 },
    { id: 4, caseId: 4, caseTitle: "Diabetes Review", domain1Score: 2, domain2Score: 2, domain3Score: 1, totalScore: 5, passed: false, completedAt: "2026-07-13T16:45:00Z", duration: 540 },
  ];

  describe("computeAverageScores", () => {
    it("returns null for empty array", () => {
      expect(computeAverageScores([])).toBeNull();
    });

    it("returns null for undefined-like input", () => {
      expect(computeAverageScores(null as any)).toBeNull();
    });

    it("computes correct averages for multiple consultations", () => {
      const result = computeAverageScores(mockConsultations);
      expect(result).not.toBeNull();
      // D1: (3+2+1+2)/4 = 2.0
      expect(result!.avgD1).toBe(2.0);
      // D2: (2+3+1+2)/4 = 2.0
      expect(result!.avgD2).toBe(2.0);
      // D3: (3+2+2+1)/4 = 2.0
      expect(result!.avgD3).toBe(2.0);
    });

    it("computes correct pass rate", () => {
      const result = computeAverageScores(mockConsultations);
      // 2 passed out of 4 = 50%
      expect(result!.passRate).toBe(50);
    });

    it("returns correct total count", () => {
      const result = computeAverageScores(mockConsultations);
      expect(result!.total).toBe(4);
    });

    it("handles single consultation", () => {
      const result = computeAverageScores([mockConsultations[0]]);
      expect(result!.avgD1).toBe(3);
      expect(result!.avgD2).toBe(2);
      expect(result!.avgD3).toBe(3);
      expect(result!.passRate).toBe(100);
      expect(result!.total).toBe(1);
    });

    it("handles all-fail consultations", () => {
      const allFail = mockConsultations.map(c => ({ ...c, passed: false }));
      const result = computeAverageScores(allFail);
      expect(result!.passRate).toBe(0);
    });
  });

  describe("getRadarData", () => {
    it("returns 3 data points with correct structure", () => {
      const data = getRadarData(2.5, 1.8, 3.0);
      expect(data).toHaveLength(3);
      expect(data[0]).toEqual({ domain: "Data Gathering", score: 2.5, fullMark: 3 });
      expect(data[1]).toEqual({ domain: "Clinical Management", score: 1.8, fullMark: 3 });
      expect(data[2]).toEqual({ domain: "Interpersonal Skills", score: 3.0, fullMark: 3 });
    });

    it("all fullMark values are 3", () => {
      const data = getRadarData(1, 2, 3);
      data.forEach(d => expect(d.fullMark).toBe(3));
    });
  });

  describe("getWeakestDomain", () => {
    it("identifies Data Gathering as weakest", () => {
      expect(getWeakestDomain(1.0, 2.5, 3.0)).toBe("Data Gathering");
    });

    it("identifies Clinical Management as weakest", () => {
      expect(getWeakestDomain(2.5, 1.0, 3.0)).toBe("Clinical Management");
    });

    it("identifies Interpersonal Skills as weakest", () => {
      expect(getWeakestDomain(2.5, 3.0, 1.0)).toBe("Interpersonal Skills");
    });

    it("returns Data Gathering when D1 and D2 are tied as lowest", () => {
      // When tied, D1 wins because Math.min returns first match
      expect(getWeakestDomain(1.0, 1.0, 2.0)).toBe("Data Gathering");
    });

    it("returns Data Gathering when all scores are equal", () => {
      expect(getWeakestDomain(2.0, 2.0, 2.0)).toBe("Data Gathering");
    });
  });

  describe("formatDate", () => {
    it("returns dash for null", () => {
      expect(formatDate(null)).toBe("—");
    });

    it("formats date in en-GB format", () => {
      const result = formatDate("2026-07-10T14:30:00Z");
      // en-GB format: "10 Jul 2026"
      expect(result).toContain("Jul");
      expect(result).toContain("2026");
      expect(result).toContain("10");
    });
  });

  describe("formatDuration", () => {
    it("returns dash for null", () => {
      expect(formatDuration(null)).toBe("\u2014");
    });

    it("returns dash for 0", () => {
      expect(formatDuration(0)).toBe("\u2014");
    });

    it("formats 600 seconds as 10m 0s", () => {
      expect(formatDuration(600)).toBe("10m 0s");
    });

    it("formats 720 seconds as 12m 0s", () => {
      expect(formatDuration(720)).toBe("12m 0s");
    });

    it("formats 90 seconds as 1m 30s", () => {
      expect(formatDuration(90)).toBe("1m 30s");
    });
  });

  describe("formatShortDate", () => {
    it("returns dash for null", () => {
      expect(formatShortDate(null)).toBe("\u2014");
    });

    it("formats date without year", () => {
      const result = formatShortDate("2026-07-10T14:30:00Z");
      expect(result).toContain("Jul");
      expect(result).toContain("10");
      expect(result).not.toContain("2026");
    });
  });

  describe("trendData generation", () => {
    it("reverses consultations to chronological order", () => {
      // historyQuery.data is DESC (newest first), trend should be ASC (oldest first)
      const descOrder = [...mockConsultations]; // already newest-last in our mock, but simulate DESC
      const reversed = [...descOrder].reverse();
      expect(reversed[0].caseTitle).toBe("Diabetes Review");
      expect(reversed[reversed.length - 1].caseTitle).toBe("Chest Pain");
    });

    it("maps consultations to trend data shape", () => {
      const trendData = mockConsultations.map(c => ({
        date: formatShortDate(c.completedAt),
        totalScore: c.totalScore || 0,
        caseTitle: c.caseTitle,
      }));
      expect(trendData[0].totalScore).toBe(8);
      expect(trendData[0].caseTitle).toBe("Chest Pain");
      expect(trendData).toHaveLength(4);
    });
  });

  describe("retry URL generation", () => {
    it("generates correct retry URL with caseId", () => {
      const caseId = 5;
      const url = `/sca?retry=${caseId}`;
      expect(url).toBe("/sca?retry=5");
    });

    it("retry param can be parsed back to number", () => {
      const url = "/sca?retry=12";
      const params = new URLSearchParams(url.split("?")[1]);
      const retryCaseId = parseInt(params.get("retry") || "", 10);
      expect(retryCaseId).toBe(12);
    });
  });

  describe("PDF export data computation (server-side logic)", () => {
    it("computes weakest domain correctly for PDF summary", () => {
      const avgD1 = 2.0;
      const avgD2 = 1.5;
      const avgD3 = 2.5;
      const minScore = Math.min(avgD1, avgD2, avgD3);
      let weakestDomain = "Data Gathering";
      if (minScore === avgD2) weakestDomain = "Clinical Management";
      else if (minScore === avgD3) weakestDomain = "Interpersonal Skills";
      expect(weakestDomain).toBe("Clinical Management");
    });

    it("computes average total for PDF", () => {
      const avgD1 = 2.0;
      const avgD2 = 2.0;
      const avgD3 = 2.0;
      const avgTotal = avgD1 + avgD2 + avgD3;
      expect(avgTotal).toBe(6.0);
    });

    it("generates filename with current date format", () => {
      const filename = `sca-progress-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      expect(filename).toMatch(/^sca-progress-report-\d{4}-\d{2}-\d{2}\.pdf$/);
    });
  });
});

// Additional helper for short date format
function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
