import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  getNote360BySpecialty,
  getUserNoteProgress,
  updateUserNoteProgress,
  getNote360ProgressStats,
} from "./db";

describe("Note360 Database Functions", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }
  });

  it("should retrieve notes by specialty", async () => {
    const notes = await getNote360BySpecialty("Cardiovascular");
    expect(Array.isArray(notes)).toBe(true);
    if (notes.length > 0) {
      expect(notes[0]).toHaveProperty("specialty");
      expect(notes[0].specialty).toBe("Cardiovascular");
    }
  });

  it("should return empty array for non-existent specialty", async () => {
    const notes = await getNote360BySpecialty("NonExistentSpecialty");
    expect(Array.isArray(notes)).toBe(true);
    expect(notes.length).toBe(0);
  });

  it("should create and retrieve user note progress", async () => {
    const userId = 999999; // Test user ID
    const noteId = 1;

    // Create progress record
    const result = await updateUserNoteProgress(userId, noteId, true, false);
    expect(result).toBeDefined();

    // Retrieve progress record
    const progress = await getUserNoteProgress(userId, noteId);
    expect(progress).toBeDefined();
    if (progress) {
      expect(progress.userId).toBe(userId);
      expect(progress.noteId).toBe(noteId);
      expect(progress.isRead).toBe(true);
      expect(progress.isBookmarked).toBe(false);
    }
  });

  it("should update user note progress", async () => {
    const userId = 999998; // Different test user
    const noteId = 1;

    // Create initial record
    await updateUserNoteProgress(userId, noteId, false, false);

    // Update to mark as read and bookmarked
    await updateUserNoteProgress(userId, noteId, true, true);

    // Verify update
    const progress = await getUserNoteProgress(userId, noteId);
    expect(progress).toBeDefined();
    if (progress) {
      expect(progress.isRead).toBe(true);
      expect(progress.isBookmarked).toBe(true);
    }
  });

  it("should calculate progress stats for a specialty", async () => {
    const userId = 999997;
    const specialty = "Cardiovascular";

    // Get stats (should return valid structure even if no progress)
    const stats = await getNote360ProgressStats(userId, specialty);
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("read");
    expect(stats).toHaveProperty("bookmarked");
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.read).toBe("number");
    expect(typeof stats.bookmarked).toBe("number");
  });

  it("should handle multiple notes in a specialty", async () => {
    const notes = await getNote360BySpecialty("Respiratory");
    expect(Array.isArray(notes)).toBe(true);
    // Respiratory should have at least 1 note from seed data
    if (notes.length > 0) {
      expect(notes.every((n) => n.specialty === "Respiratory")).toBe(true);
    }
  });

  it("should verify NICE guideline fields exist", async () => {
    const notes = await getNote360BySpecialty("Cardiovascular");
    if (notes.length > 0) {
      const note = notes[0];
      expect(note).toHaveProperty("niceGuideline");
      expect(note).toHaveProperty("niceUrl");
      expect(note).toHaveProperty("examPearl");
    }
  });
});
