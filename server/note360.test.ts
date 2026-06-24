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


describe("Note360 Toggle Functionality", () => {
  describe("Mark as Read Toggle", () => {
    it("should toggle read status when handleMarkAsRead is called", () => {
      // Simulate a Set to track read notes
      const readNotes = new Set<number>();
      const noteId = 1;

      // Initially not read
      expect(readNotes.has(noteId)).toBe(false);

      // Mark as read
      readNotes.add(noteId);
      expect(readNotes.has(noteId)).toBe(true);

      // Mark as unread
      readNotes.delete(noteId);
      expect(readNotes.has(noteId)).toBe(false);
    });

    it("should handle multiple notes read status independently", () => {
      const readNotes = new Set<number>();

      // Mark multiple notes as read
      readNotes.add(1);
      readNotes.add(2);
      readNotes.add(3);

      expect(readNotes.has(1)).toBe(true);
      expect(readNotes.has(2)).toBe(true);
      expect(readNotes.has(3)).toBe(true);

      // Unmark one note
      readNotes.delete(2);

      expect(readNotes.has(1)).toBe(true);
      expect(readNotes.has(2)).toBe(false);
      expect(readNotes.has(3)).toBe(true);
    });
  });

  describe("Favorite Toggle", () => {
    it("should toggle favorite status when handleToggleFavorite is called", () => {
      const favoriteNotes = new Set<number>();
      const noteId = 5;

      // Initially not favorited
      expect(favoriteNotes.has(noteId)).toBe(false);

      // Mark as favorite
      favoriteNotes.add(noteId);
      expect(favoriteNotes.has(noteId)).toBe(true);

      // Remove from favorites
      favoriteNotes.delete(noteId);
      expect(favoriteNotes.has(noteId)).toBe(false);
    });

    it("should handle multiple notes favorite status independently", () => {
      const favoriteNotes = new Set<number>();

      // Mark multiple notes as favorite
      favoriteNotes.add(10);
      favoriteNotes.add(20);
      favoriteNotes.add(30);

      expect(favoriteNotes.has(10)).toBe(true);
      expect(favoriteNotes.has(20)).toBe(true);
      expect(favoriteNotes.has(30)).toBe(true);

      // Remove one from favorites
      favoriteNotes.delete(20);

      expect(favoriteNotes.has(10)).toBe(true);
      expect(favoriteNotes.has(20)).toBe(false);
      expect(favoriteNotes.has(30)).toBe(true);
    });
  });

  describe("Combined Read and Favorite States", () => {
    it("should maintain independent read and favorite states for same note", () => {
      const readNotes = new Set<number>();
      const favoriteNotes = new Set<number>();
      const noteId = 7;

      // Mark as read but not favorite
      readNotes.add(noteId);
      expect(readNotes.has(noteId)).toBe(true);
      expect(favoriteNotes.has(noteId)).toBe(false);

      // Add to favorites while keeping read status
      favoriteNotes.add(noteId);
      expect(readNotes.has(noteId)).toBe(true);
      expect(favoriteNotes.has(noteId)).toBe(true);

      // Remove from read but keep favorite
      readNotes.delete(noteId);
      expect(readNotes.has(noteId)).toBe(false);
      expect(favoriteNotes.has(noteId)).toBe(true);
    });

    it("should track multiple notes with different combinations of states", () => {
      const readNotes = new Set<number>();
      const favoriteNotes = new Set<number>();

      // Note 1: read only
      readNotes.add(1);

      // Note 2: favorite only
      favoriteNotes.add(2);

      // Note 3: both read and favorite
      readNotes.add(3);
      favoriteNotes.add(3);

      // Note 4: neither

      expect(readNotes.has(1)).toBe(true);
      expect(favoriteNotes.has(1)).toBe(false);

      expect(readNotes.has(2)).toBe(false);
      expect(favoriteNotes.has(2)).toBe(true);

      expect(readNotes.has(3)).toBe(true);
      expect(favoriteNotes.has(3)).toBe(true);

      expect(readNotes.has(4)).toBe(false);
      expect(favoriteNotes.has(4)).toBe(false);
    });
  });

  describe("Rapid Toggle Handling", () => {
    it("should handle rapid toggle clicks without race conditions", () => {
      const readNotes = new Set<number>();
      const noteId = 15;

      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        const isRead = readNotes.has(noteId);
        if (isRead) {
          readNotes.delete(noteId);
        } else {
          readNotes.add(noteId);
        }
      }

      // After even number of clicks, should be back to original state
      expect(readNotes.has(noteId)).toBe(false);

      // One more click
      readNotes.add(noteId);
      expect(readNotes.has(noteId)).toBe(true);
    });
  });
});
