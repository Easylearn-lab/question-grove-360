import { getDb } from "./db";
import { questions as questionsTable, exams } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

async function bulkImportQuestions() {
  console.log("🚀 Starting bulk import of 430 MRCGP AKT questions...\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }

  try {
    // Get MRCGP AKT exam ID
    const examResult = await db
      .select()
      .from(exams)
      .where(eq(exams.code, "MRCGP_AKT"))
      .limit(1);

    if (examResult.length === 0) {
      console.error("❌ MRCGP AKT exam not found");
      process.exit(1);
    }

    const examId = examResult[0].id;
    console.log(`✓ Found MRCGP AKT exam with ID: ${examId}\n`);

    // Load questions from JSON file
    const questionsData = JSON.parse(
      fs.readFileSync("public/questions/batch_c.json", "utf-8")
    );

    console.log(`📥 Loaded ${questionsData.length} questions from batch_c.json`);
    console.log("Starting import...\n");

    let imported = 0;
    let updated = 0;
    let errors = 0;

    // Process in batches of 50 for better performance
    const batchSize = 50;
    for (let i = 0; i < questionsData.length; i += batchSize) {
      const batch = questionsData.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(questionsData.length / batchSize);

      console.log(`Processing batch ${batchNum}/${totalBatches}...`);

      for (const q of batch) {
        try {
          // Insert or update question
          await db
            .insert(questionsTable)
            .values({
              examId,
              domain: q.domain || null,
              specialty: q.specialty || null,
              subSpecialty: q.specialty || null,
              difficulty: q.difficulty || "Medium",
              question: q.question,
              optionA: q.options?.A || "",
              optionB: q.options?.B || "",
              optionC: q.options?.C || "",
              optionD: q.options?.D || "",
              optionE: q.options?.E || null,
              correctAnswer: q.correct_answer,
              explanationCorrect:
                q.explanation?.correct ||
                q.explanation?.[q.correct_answer] ||
                null,
              explanationA: q.explanation?.A || null,
              explanationB: q.explanation?.B || null,
              explanationC: q.explanation?.C || null,
              explanationD: q.explanation?.D || null,
              explanationE: q.explanation?.E || null,
              reference: q.reference || null,
              tags: JSON.stringify(q.tags || []),
              status: "active",
            })
            .onConflictDoUpdate({
              target: questionsTable.id,
              set: {
                domain: q.domain || null,
                specialty: q.specialty || null,
                difficulty: q.difficulty || "Medium",
                question: q.question,
                optionA: q.options?.A || "",
                optionB: q.options?.B || "",
                optionC: q.options?.C || "",
                optionD: q.options?.D || "",
                optionE: q.options?.E || null,
                correctAnswer: q.correct_answer,
                explanationCorrect:
                  q.explanation?.correct ||
                  q.explanation?.[q.correct_answer] ||
                  null,
                explanationA: q.explanation?.A || null,
                explanationB: q.explanation?.B || null,
                explanationC: q.explanation?.C || null,
                explanationD: q.explanation?.D || null,
                explanationE: q.explanation?.E || null,
                reference: q.reference || null,
                tags: JSON.stringify(q.tags || []),
              },
            });

          imported++;
        } catch (err) {
          console.error(`  ❌ Error importing question ${q.id}:`, err);
          errors++;
        }
      }

      console.log(`  ✓ Batch ${batchNum} complete\n`);
    }

    console.log("\n✅ Import completed!");
    console.log(`   Imported: ${imported}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${questionsData.length}`);

    // Verify import
    const count = await db
      .select({ total: db.count() })
      .from(questionsTable)
      .where(eq(questionsTable.examId, examId));

    console.log(`\n📊 Total MRCGP AKT questions in database: ${count[0]?.total || 0}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

bulkImportQuestions();
