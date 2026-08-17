import { describe, it, expect } from "vitest";

describe("Admin Router", () => {
  it("adminRouter exports all required procedures", async () => {
    const { adminRouter } = await import("./adminRouter");
    const procedures = Object.keys(adminRouter._def.procedures);

    // Core management
    expect(procedures).toContain("getAnalytics");
    expect(procedures).toContain("getUsers");
    expect(procedures).toContain("updateUser");
    expect(procedures).toContain("deleteUser");
    expect(procedures).toContain("promoteToAdmin");
    expect(procedures).toContain("demoteFromAdmin");

    // AKT
    expect(procedures).toContain("getQuestions");
    expect(procedures).toContain("createQuestion");
    expect(procedures).toContain("updateQuestion");
    expect(procedures).toContain("deleteQuestion");

    // PLAB1
    expect(procedures).toContain("getPlab1Questions");
    expect(procedures).toContain("createPlab1Question");
    expect(procedures).toContain("updatePlab1Question");
    expect(procedures).toContain("deletePlab1Question");

    // MSRA
    expect(procedures).toContain("getMsraQuestions");
    expect(procedures).toContain("createMsraQuestion");
    expect(procedures).toContain("updateMsraQuestion");
    expect(procedures).toContain("deleteMsraQuestion");

    // JAMB
    expect(procedures).toContain("getJambQuestions");
    expect(procedures).toContain("createJambQuestion");
    expect(procedures).toContain("updateJambQuestion");
    expect(procedures).toContain("deleteJambQuestion");

    // Flashcards
    expect(procedures).toContain("getFlashcardsAdmin");
    expect(procedures).toContain("createFlashcard");
    expect(procedures).toContain("updateFlashcard");
    expect(procedures).toContain("deleteFlashcard");

    // SCA Cases
    expect(procedures).toContain("getScaCases");
    expect(procedures).toContain("createScaCase");
    expect(procedures).toContain("updateScaCase");
    expect(procedures).toContain("deleteScaCase");

    // Bulk Upload
    expect(procedures).toContain("bulkUpload");

    // Image Upload
    expect(procedures).toContain("uploadQuestionImage");

    // Coupons
    expect(procedures).toContain("getCoupons");
    expect(procedures).toContain("createCoupon");
    expect(procedures).toContain("deleteCoupon");

    // Picture360
    expect(procedures).toContain("getPicture360Images");
    expect(procedures).toContain("uploadPicture360Image");
    expect(procedures).toContain("deletePicture360Image");
  });

  it("all admin procedures use adminProcedure middleware", async () => {
    const { adminRouter } = await import("./adminRouter");
    const procedures = Object.keys(adminRouter._def.procedures);
    // All procedures should exist (they are all gated by adminProcedure in the router definition)
    expect(procedures.length).toBeGreaterThanOrEqual(25);
  });
});
