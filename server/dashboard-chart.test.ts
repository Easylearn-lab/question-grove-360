import { describe, it, expect } from "vitest";

// Replicate the date range filtering logic from DashboardRedesigned.tsx
const allAccuracyData = [
  { date: "2026-04-01", accuracy: 58, questions: 12 },
  { date: "2026-04-03", accuracy: 61, questions: 18 },
  { date: "2026-04-05", accuracy: 63, questions: 15 },
  { date: "2026-04-07", accuracy: 60, questions: 20 },
  { date: "2026-04-10", accuracy: 65, questions: 22 },
  { date: "2026-04-12", accuracy: 68, questions: 14 },
  { date: "2026-04-14", accuracy: 66, questions: 25 },
  { date: "2026-04-17", accuracy: 70, questions: 30 },
  { date: "2026-04-19", accuracy: 72, questions: 18 },
  { date: "2026-04-21", accuracy: 74, questions: 28 },
  { date: "2026-04-24", accuracy: 73, questions: 22 },
  { date: "2026-04-26", accuracy: 76, questions: 35 },
  { date: "2026-04-28", accuracy: 78, questions: 20 },
  { date: "2026-05-01", accuracy: 77, questions: 32 },
  { date: "2026-05-03", accuracy: 80, questions: 25 },
  { date: "2026-05-05", accuracy: 79, questions: 28 },
  { date: "2026-05-08", accuracy: 82, questions: 30 },
  { date: "2026-05-10", accuracy: 81, questions: 22 },
  { date: "2026-05-12", accuracy: 83, questions: 35 },
  { date: "2026-05-15", accuracy: 82, questions: 28 },
  { date: "2026-05-17", accuracy: 84, questions: 40 },
  { date: "2026-05-19", accuracy: 83, questions: 32 },
  { date: "2026-05-22", accuracy: 85, questions: 25 },
  { date: "2026-05-24", accuracy: 86, questions: 38 },
  { date: "2026-05-26", accuracy: 84, questions: 30 },
  { date: "2026-05-28", accuracy: 87, questions: 42 },
  { date: "2026-05-30", accuracy: 85, questions: 35 },
  { date: "2026-06-01", accuracy: 88, questions: 28 },
  { date: "2026-06-02", accuracy: 86, questions: 45 },
  { date: "2026-06-03", accuracy: 85, questions: 32 },
];

type DateRange = "1W" | "2W" | "1M" | "3M" | "All";

function getDaysForRange(range: DateRange): number {
  switch (range) {
    case "1W": return 7;
    case "2W": return 14;
    case "1M": return 30;
    case "3M": return 90;
    case "All": return 9999;
  }
}

function filterDataByRange(range: DateRange, referenceDate: Date = new Date("2026-06-03")) {
  const days = getDaysForRange(range);
  const cutoff = new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000);
  return allAccuracyData.filter((d) => new Date(d.date) >= cutoff);
}

function calculateTrend(data: typeof allAccuracyData) {
  if (data.length < 2) return { value: 0, direction: "flat" as const };
  const first = data[0].accuracy;
  const last = data[data.length - 1].accuracy;
  const diff = last - first;
  return {
    value: Math.abs(diff),
    direction: diff > 0 ? ("up" as const) : diff < 0 ? ("down" as const) : ("flat" as const),
  };
}

describe("Dashboard Accuracy Chart - Date Range Filter", () => {
  it("should return only data within the last 7 days for 1W range", () => {
    const filtered = filterDataByRange("1W");
    // Reference date is 2026-06-03, so cutoff is 2026-05-27
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(allAccuracyData.length);
    
    // All dates should be after May 27
    filtered.forEach((d) => {
      expect(new Date(d.date).getTime()).toBeGreaterThanOrEqual(
        new Date("2026-05-27").getTime()
      );
    });
  });

  it("should return only data within the last 14 days for 2W range", () => {
    const filtered = filterDataByRange("2W");
    // Reference date is 2026-06-03, so cutoff is 2026-05-20
    expect(filtered.length).toBeGreaterThan(0);
    
    filtered.forEach((d) => {
      expect(new Date(d.date).getTime()).toBeGreaterThanOrEqual(
        new Date("2026-05-20").getTime()
      );
    });
  });

  it("should return data within the last 30 days for 1M range", () => {
    const filtered = filterDataByRange("1M");
    // Reference date is 2026-06-03, so cutoff is 2026-05-04
    expect(filtered.length).toBeGreaterThan(0);
    
    filtered.forEach((d) => {
      expect(new Date(d.date).getTime()).toBeGreaterThanOrEqual(
        new Date("2026-05-04").getTime()
      );
    });
  });

  it("should return data within the last 90 days for 3M range", () => {
    const filtered = filterDataByRange("3M");
    // Reference date is 2026-06-03, so cutoff is 2026-03-05
    // All our data starts from 2026-04-01, so all data should be included
    expect(filtered.length).toBe(allAccuracyData.length);
  });

  it("should return all data for All range", () => {
    const filtered = filterDataByRange("All");
    expect(filtered.length).toBe(allAccuracyData.length);
  });

  it("should return progressively more data as range increases", () => {
    const w1 = filterDataByRange("1W").length;
    const w2 = filterDataByRange("2W").length;
    const m1 = filterDataByRange("1M").length;
    const m3 = filterDataByRange("3M").length;
    const all = filterDataByRange("All").length;

    expect(w1).toBeLessThanOrEqual(w2);
    expect(w2).toBeLessThanOrEqual(m1);
    expect(m1).toBeLessThanOrEqual(m3);
    expect(m3).toBeLessThanOrEqual(all);
  });
});

describe("Dashboard Accuracy Chart - Trend Calculation", () => {
  it("should calculate upward trend correctly", () => {
    const data = [
      { date: "2026-05-01", accuracy: 70, questions: 20 },
      { date: "2026-05-10", accuracy: 80, questions: 25 },
      { date: "2026-05-20", accuracy: 85, questions: 30 },
    ];
    const trend = calculateTrend(data);
    expect(trend.direction).toBe("up");
    expect(trend.value).toBe(15);
  });

  it("should calculate downward trend correctly", () => {
    const data = [
      { date: "2026-05-01", accuracy: 85, questions: 20 },
      { date: "2026-05-10", accuracy: 78, questions: 25 },
      { date: "2026-05-20", accuracy: 72, questions: 30 },
    ];
    const trend = calculateTrend(data);
    expect(trend.direction).toBe("down");
    expect(trend.value).toBe(13);
  });

  it("should calculate flat trend when no change", () => {
    const data = [
      { date: "2026-05-01", accuracy: 80, questions: 20 },
      { date: "2026-05-10", accuracy: 75, questions: 25 },
      { date: "2026-05-20", accuracy: 80, questions: 30 },
    ];
    const trend = calculateTrend(data);
    expect(trend.direction).toBe("flat");
    expect(trend.value).toBe(0);
  });

  it("should return flat for single data point", () => {
    const data = [{ date: "2026-05-01", accuracy: 80, questions: 20 }];
    const trend = calculateTrend(data);
    expect(trend.direction).toBe("flat");
    expect(trend.value).toBe(0);
  });

  it("should return flat for empty data", () => {
    const trend = calculateTrend([]);
    expect(trend.direction).toBe("flat");
    expect(trend.value).toBe(0);
  });

  it("should show upward trend for the 1M filtered data", () => {
    const filtered = filterDataByRange("1M");
    const trend = calculateTrend(filtered);
    // From early May to June 3, accuracy went from ~79 to 85
    expect(trend.direction).toBe("up");
    expect(trend.value).toBeGreaterThan(0);
  });
});

describe("Dashboard Accuracy Chart - getDaysForRange", () => {
  it("should return correct days for each range option", () => {
    expect(getDaysForRange("1W")).toBe(7);
    expect(getDaysForRange("2W")).toBe(14);
    expect(getDaysForRange("1M")).toBe(30);
    expect(getDaysForRange("3M")).toBe(90);
    expect(getDaysForRange("All")).toBe(9999);
  });
});
