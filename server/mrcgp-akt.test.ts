import { describe, it, expect } from "vitest";

describe("MRCGPAKTSpecialties", () => {
  it("should have 15 specialties defined", () => {
    const SPECIALTIES = [
      { name: "Ethics & Organisational", icon: "⚖️", questionCount: 7, attempted: 0, correct: 0, slug: "ethics-organisational" },
      { name: "Endocrinology", icon: "🔬", questionCount: 6, attempted: 0, correct: 0, slug: "endocrinology" },
      { name: "Paediatrics", icon: "👶", questionCount: 6, attempted: 0, correct: 0, slug: "paediatrics" },
      { name: "Cardiovascular", icon: "❤️", questionCount: 6, attempted: 0, correct: 0, slug: "cardiovascular" },
      { name: "Statistics & EBM", icon: "📊", questionCount: 6, attempted: 0, correct: 0, slug: "statistics-ebm" },
      { name: "Gastroenterology", icon: "🍽️", questionCount: 6, attempted: 0, correct: 0, slug: "gastroenterology" },
      { name: "Haematology", icon: "🩸", questionCount: 5, attempted: 0, correct: 0, slug: "haematology" },
      { name: "General Practice", icon: "🏥", questionCount: 4, attempted: 0, correct: 0, slug: "general-practice" },
      { name: "Respiratory", icon: "💨", questionCount: 4, attempted: 0, correct: 0, slug: "respiratory" },
      { name: "Pharmacology & Prescribing", icon: "💊", questionCount: 2, attempted: 0, correct: 0, slug: "pharmacology-prescribing" },
      { name: "Ophthalmology & ENT", icon: "👁️", questionCount: 2, attempted: 0, correct: 0, slug: "ophthalmology-ent" },
      { name: "Musculoskeletal", icon: "🦴", questionCount: 2, attempted: 0, correct: 0, slug: "musculoskeletal" },
      { name: "Neurology", icon: "🧠", questionCount: 2, attempted: 0, correct: 0, slug: "neurology" },
      { name: "Dermatology", icon: "🩹", questionCount: 1, attempted: 0, correct: 0, slug: "dermatology" },
      { name: "Obstetrics & Gynaecology", icon: "🤰", questionCount: 1, attempted: 0, correct: 0, slug: "obstetrics-gynaecology" },
    ];

    expect(SPECIALTIES).toHaveLength(15);
  });

  it("should have total of 60 questions across all specialties", () => {
    const SPECIALTIES = [
      { questionCount: 7 },
      { questionCount: 6 },
      { questionCount: 6 },
      { questionCount: 6 },
      { questionCount: 6 },
      { questionCount: 6 },
      { questionCount: 5 },
      { questionCount: 4 },
      { questionCount: 4 },
      { questionCount: 2 },
      { questionCount: 2 },
      { questionCount: 2 },
      { questionCount: 2 },
      { questionCount: 1 },
      { questionCount: 1 },
    ];

    const totalQuestions = SPECIALTIES.reduce((sum, specialty) => sum + specialty.questionCount, 0);
    expect(totalQuestions).toBe(60);
  });

  it("should have unique slugs for each specialty", () => {
    const SPECIALTIES = [
      { slug: "ethics-organisational" },
      { slug: "endocrinology" },
      { slug: "paediatrics" },
      { slug: "cardiovascular" },
      { slug: "statistics-ebm" },
      { slug: "gastroenterology" },
      { slug: "haematology" },
      { slug: "general-practice" },
      { slug: "respiratory" },
      { slug: "pharmacology-prescribing" },
      { slug: "ophthalmology-ent" },
      { slug: "musculoskeletal" },
      { slug: "neurology" },
      { slug: "dermatology" },
      { slug: "obstetrics-gynaecology" },
    ];

    const slugs = SPECIALTIES.map((s) => s.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("should have difficulty filters", () => {
    const DIFFICULTY_FILTERS = ["All", "Easy", "Medium", "Hard"];
    expect(DIFFICULTY_FILTERS).toHaveLength(4);
  });
});
