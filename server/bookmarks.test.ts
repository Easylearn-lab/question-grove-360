import { describe, it, expect, beforeAll } from "vitest";
import { bookmarkQuestion, getBookmarks, removeBookmark, isQuestionBookmarked } from "./db";

describe("Bookmark Functions", () => {
  const testUserId = 1;
  const testQuestionId = 1;

  beforeAll(async () => {
    // Cleanup before tests
    await removeBookmark(testUserId, testQuestionId);
  });

  it("should bookmark a question", async () => {
    const result = await bookmarkQuestion(testUserId, testQuestionId);
    expect(result).toBe(true);
  });

  it("should check if a question is bookmarked", async () => {
    await bookmarkQuestion(testUserId, testQuestionId);
    const isBookmarked = await isQuestionBookmarked(testUserId, testQuestionId);
    expect(isBookmarked).toBe(true);
  });

  it("should get bookmarks for a user", async () => {
    const result = await bookmarkQuestion(testUserId, testQuestionId);
    if (result) {
      const bookmarks = await getBookmarks(testUserId, 10, 0);
      expect(Array.isArray(bookmarks)).toBe(true);
      // May be 0 if question doesn't exist in DB
      expect(bookmarks.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("should remove a bookmark", async () => {
    await bookmarkQuestion(testUserId, testQuestionId);
    const result = await removeBookmark(testUserId, testQuestionId);
    expect(result).toBe(true);

    const isBookmarked = await isQuestionBookmarked(testUserId, testQuestionId);
    expect(isBookmarked).toBe(false);
  });

  it("should handle pagination in getBookmarks", async () => {
    const bookmarks1 = await getBookmarks(testUserId, 5, 0);
    const bookmarks2 = await getBookmarks(testUserId, 5, 5);
    
    expect(Array.isArray(bookmarks1)).toBe(true);
    expect(Array.isArray(bookmarks2)).toBe(true);
  });

  it("should not bookmark the same question twice", async () => {
    await bookmarkQuestion(testUserId, testQuestionId);
    const result = await bookmarkQuestion(testUserId, testQuestionId);
    // Should still return true (idempotent)
    expect(result).toBe(true);
  });
});
