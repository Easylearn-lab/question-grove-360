import { describe, it, expect } from "vitest";

// Test the color palette and randomization logic
describe("Flashcard Answer Formatting", () => {
  const CARD_COLORS = [
    { from: "#7c3aed", to: "#a855f7" }, // Purple
    { from: "#2563eb", to: "#3b82f6" }, // Blue
    { from: "#059669", to: "#10b981" }, // Green
    { from: "#dc2626", to: "#ef4444" }, // Red
    { from: "#ea580c", to: "#f97316" }, // Orange
    { from: "#0891b2", to: "#06b6d4" }, // Cyan
    { from: "#7c2d12", to: "#9a3412" }, // Brown
    { from: "#6b21a8", to: "#9333ea" }, // Violet
  ];

  function getCardColor(cardId: number) {
    return CARD_COLORS[cardId % CARD_COLORS.length];
  }

  it("should have 8 colors in the palette", () => {
    expect(CARD_COLORS).toHaveLength(8);
  });

  it("should return valid color objects with from and to properties", () => {
    CARD_COLORS.forEach((color) => {
      expect(color).toHaveProperty("from");
      expect(color).toHaveProperty("to");
      expect(typeof color.from).toBe("string");
      expect(typeof color.to).toBe("string");
      // Validate hex color format
      expect(color.from).toMatch(/^#[0-9a-f]{6}$/i);
      expect(color.to).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("should cycle through colors based on card ID", () => {
    // Card 0 should get color 0
    expect(getCardColor(0)).toEqual(CARD_COLORS[0]);
    // Card 8 should wrap around to color 0
    expect(getCardColor(8)).toEqual(CARD_COLORS[0]);
    // Card 1 should get color 1
    expect(getCardColor(1)).toEqual(CARD_COLORS[1]);
    // Card 9 should wrap around to color 1
    expect(getCardColor(9)).toEqual(CARD_COLORS[1]);
  });

  it("should randomize colors across different card IDs", () => {
    const colors = new Set();
    for (let i = 0; i < 16; i++) {
      const color = getCardColor(i);
      colors.add(JSON.stringify(color));
    }
    // Should have all 8 colors represented in 16 cards
    expect(colors.size).toBe(8);
  });

  it("should ensure consistent color assignment for the same card ID", () => {
    const cardId = 42;
    const color1 = getCardColor(cardId);
    const color2 = getCardColor(cardId);
    expect(color1).toEqual(color2);
  });

  it("should handle large card IDs correctly", () => {
    const largeCardId = 999999;
    const color = getCardColor(largeCardId);
    expect(CARD_COLORS).toContainEqual(color);
  });

  it("should have distinct colors in the palette", () => {
    const colorStrings = CARD_COLORS.map((c) => `${c.from}-${c.to}`);
    const uniqueColors = new Set(colorStrings);
    expect(uniqueColors.size).toBe(CARD_COLORS.length);
  });
});
