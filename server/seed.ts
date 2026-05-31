import { getDb } from "./db";
import {
  users,
  profiles,
  exams,
  questions,
  notes,
  flashcards,
  scaCases,
  coupons,
} from "../drizzle/schema";

/**
 * Seed script for initial data
 * Run with: npx tsx server/seed.ts
 */

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  try {
    console.log("🌱 Starting database seeding...");

    // 1. Create admin user
    console.log("📝 Creating admin user...");
    const adminUser = await db
      .insert(users)
      .values({
        openId: "admin-user-001",
        name: "Admin User",
        email: "admin@questiongrove360.com",
        loginMethod: "manus",
        role: "admin",
      })
      .catch(() => console.log("Admin user already exists"));

    // 2. Create admin profile
    console.log("👤 Creating admin profile...");
    await db
      .insert(profiles)
      .values({
        userId: 1,
        fullName: "Admin User",
        specialty: "General Medicine",
        trainingYear: "Consultant",
        targetExam: "MRCGP",
        country: "United Kingdom",
        currency: "GBP",
      })
      .catch(() => console.log("Admin profile already exists"));

    // 3. Create exam types
    console.log("📚 Creating exam types...");
    const examIds: number[] = [];
    const examTypes = [
      { name: "MRCGP AKT", description: "Royal College of General Practitioners" },
      { name: "PLAB 2 OSCE", description: "Professional and Linguistic Assessments Board" },
      { name: "USMLE Step 1", description: "United States Medical Licensing Examination" },
      { name: "USMLE Step 2 CK", description: "Clinical Knowledge" },
      { name: "MRCP Part 1", description: "Membership of Royal College of Physicians" },
    ];

    for (const exam of examTypes) {
      await db
        .insert(exams)
        .values({
          code: exam.name.toLowerCase().replace(/\s+/g, "-"),
          name: exam.name,
          description: exam.description,
          passMark: "70" as any,
          isActive: true,
        })
        .catch(() => null);
      examIds.push(1); // Simplified for now
    }

    // 4. Create sample questions
    console.log("❓ Creating sample questions...");
    const specialties = ["Cardiology", "Respiratory", "Gastroenterology", "Neurology", "Rheumatology"];
    const difficulties = ["Easy", "Medium", "Hard"];

    for (let i = 0; i < 50; i++) {
      const specialty = specialties[Math.floor(Math.random() * specialties.length)];
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      const examId = examIds[Math.floor(Math.random() * examIds.length)] || 1;

      await db
        .insert(questions)
        .values({
          examId,
          question: `Sample Question ${i + 1}: A ${specialty} question about medical management`,
          specialty,
          difficulty: difficulty as "Easy" | "Medium" | "Hard",
          domain: "Clinical Knowledge",
          optionA: "Option A - Correct answer",
          optionB: "Option B - Incorrect",
          optionC: "Option C - Incorrect",
          optionD: "Option D - Incorrect",
          correctAnswer: "A",
          explanationCorrect: "This is the correct answer because...",
          tags: JSON.stringify(["Key point 1", "Key point 2", "Key point 3"]),
        })
        .catch(() => null);
    }

    // 5. Create sample notes
    console.log("📖 Creating sample notes...");
    for (const specialty of specialties) {
      await db
        .insert(notes)
        .values({
          examId: examIds[0] || 1,
          specialty,
          title: `${specialty} Revision Notes`,
          content: `# ${specialty}\n\n## Key Concepts\n- Concept 1\n- Concept 2\n- Concept 3\n\n## Clinical Features\n- Feature 1\n- Feature 2`,
          highYieldCount: 2,
          curriculumVersion: "2024",
        })
        .catch(() => null);
    }

    // 6. Create sample flashcards
    console.log("🎴 Creating sample flashcards...");
    for (let i = 0; i < 30; i++) {
      const specialty = specialties[Math.floor(Math.random() * specialties.length)];
      await db
        .insert(flashcards)
        .values({
          examId: examIds[0] || 1,
          category: specialty,
          front: `Question ${i + 1}: What is the pathophysiology of...?`,
          back: `Answer: The pathophysiology involves... [detailed explanation]`,
          tags: JSON.stringify([specialty, "Pathophysiology", "High-Yield"]),
          createdAt: new Date(),
        })
        .catch(() => null);
    }

    // 7. Create sample SCA cases
    console.log("🏥 Creating sample SCA cases...");
    const scaCaseData = [
      {
        title: "Acute Chest Pain",
        category: "Cardiology",
        patientName: "John Smith",
        patientAge: 55,
        patientGender: "Male",
        presentingComplaint: "Acute onset chest pain radiating to left arm",
      },
      {
        title: "Shortness of Breath",
        category: "Respiratory",
        patientName: "Jane Doe",
        patientAge: 42,
        patientGender: "Female",
        presentingComplaint: "Progressive dyspnea with orthopnea",
      },
      {
        title: "Abdominal Pain",
        category: "Gastroenterology",
        patientName: "Robert Johnson",
        patientAge: 38,
        patientGender: "Male",
        presentingComplaint: "Right upper quadrant pain with jaundice",
      },
    ];

    for (const caseData of scaCaseData) {
      await db
        .insert(scaCases)
        .values({
          title: caseData.title,
          category: caseData.category,
          difficulty: "Medium",
          patientName: caseData.patientName,
          patientAge: caseData.patientAge,
          patientGender: caseData.patientGender,
          presentingComplaint: caseData.presentingComplaint,
          backgroundContext: "Patient with relevant medical history",
          aiPatientPersona: "Cooperative patient, English-speaking, willing to describe symptoms",
          markSheet: JSON.stringify({
            domain1: { name: "History Taking", maxScore: 10 },
            domain2: { name: "Examination", maxScore: 10 },
            domain3: { name: "Management", maxScore: 10 },
          }),
          createdAt: new Date(),
        })
        .catch(() => null);
    }

    // 8. Create sample coupons
    console.log("🎟️ Creating sample coupons...");
    const couponCodes = [
      { code: "WELCOME20", discountValue: "20", discountType: "percentage" },
      { code: "STUDENT15", discountValue: "15", discountType: "percentage" },
      { code: "EARLYBIRD10", discountValue: "10", discountType: "percentage" },
      { code: "FRIEND5", discountValue: "5", discountType: "percentage" },
    ];

    for (const coupon of couponCodes) {
      await db
        .insert(coupons)
        .values({
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue as any,
          maxUsageCount: 100,
          usageCount: 0,
          isActive: true,
        })
        .catch(() => null);
    }

    console.log("✅ Database seeding completed successfully!");
    console.log("\n📊 Seeded data:");
    console.log(`  - Admin user: admin@questiongrove360.com`);
    console.log(`  - Exams: ${examTypes.length}`);
    console.log(`  - Questions: 50`);
    console.log(`  - Notes: ${specialties.length}`);
    console.log(`  - Flashcards: 30`);
    console.log(`  - SCA Cases: ${scaCaseData.length}`);
    console.log(`  - Coupons: ${couponCodes.length}`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
