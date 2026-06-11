import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data/questions");

// Parse DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL);
const config = {
  host: dbUrl.hostname,
  port: dbUrl.port || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl: {
    rejectUnauthorized: false,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Files to import (new batch only)
const FILES_TO_IMPORT = [
  "mrcgp_akt_cardiovascular_qg.json",
  "mrcgp_akt_endocrinology_qg.json",
  "mrcgp_akt_ethics_organisational_qg.json",
  "mrcgp_akt_gastroenterology_qg.json",
  "mrcgp_akt_general_practice_qg.json",
  "mrcgp_akt_haematology_ent_psychiatry_dermatology_qg.json",
  "mrcgp_akt_haematology_qg.json",
  "mrcgp_akt_musculoskeletal_qg.json",
  "mrcgp_akt_musculoskeletal_qg2.json",
  "mrcgp_akt_neurology_qg.json",
  "mrcgp_akt_obstetrics_gynaecology_qg.json",
  "mrcgp_akt_pharmacology_prescribing_qg.json",
  "mrcgp_akt_remaining_specialties_qg.json",
  "mrcgp_akt_renal_qg.json",
  "mrcgp_akt_renal_urology_qg.json",
  "mrcgp_akt_respiratory_qg.json",
  "mrcgp_akt_sexual_health_qg.json",
  "mrcgp_akt_urology_qg.json",
  "mrcgp_aky_statistics_ebm_qp.json",
];

function transformQuestion(q, examId) {
  return {
    examId: examId,
    domain: q.domain || q.specialty || "General Practice",
    specialty: q.specialty || "General Practice",
    subSpecialty: q.subSpecialty || "",
    difficulty: q.difficulty || "Medium",
    question: q.question || "",
    optionA: q.options?.A || q.option_a || q.optionA || "",
    optionB: q.options?.B || q.option_b || q.optionB || "",
    optionC: q.options?.C || q.option_c || q.optionC || "",
    optionD: q.options?.D || q.option_d || q.optionD || "",
    optionE: q.options?.E || q.option_e || q.optionE || "",
    correctAnswer: q.correct_answer || q.correctAnswer || "",
    explanationCorrect: q.explanation?.correct || q.explanation_correct || q.explanationCorrect || "",
    explanationA: q.explanation?.A || q.explanation_a || q.explanationA || "",
    explanationB: q.explanation?.B || q.explanation_b || q.explanationB || "",
    explanationC: q.explanation?.C || q.explanation_c || q.explanationC || "",
    explanationD: q.explanation?.D || q.explanation_d || q.explanationD || "",
    explanationE: q.explanation?.E || q.explanation_e || q.explanationE || "",
  };
}

async function importBatch() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log("✅ Connected to database");

    // Get exam ID (assuming exam ID 1 exists from previous import)
    const [exams] = await connection.query("SELECT id FROM exams LIMIT 1");
    const examId = exams.length > 0 ? exams[0].id : 1;
    console.log(`📋 Using exam ID: ${examId}`);

    // Get existing questions to check for duplicates
    const [existing] = await connection.query("SELECT question FROM questions");
    const existingQuestions = new Set(existing.map((q) => q.question));
    console.log(`📊 Found ${existingQuestions.size} existing questions`);

    let totalImported = 0;
    let totalSkipped = 0;
    const specialtyCount = {};

    for (const file of FILES_TO_IMPORT) {
      const filePath = path.join(dataDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${file}`);
        continue;
      }

      const fileContent = fs.readFileSync(filePath, "utf-8");
      let questions = [];

      try {
        const parsed = JSON.parse(fileContent);
        questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      } catch (e) {
        console.log(`❌ Failed to parse ${file}: ${e.message}`);
        continue;
      }

      console.log(`\n📄 Processing ${file} (${questions.length} questions)`);

      let fileImported = 0;
      let fileSkipped = 0;

      for (const q of questions) {
        if (existingQuestions.has(q.question)) {
          fileSkipped++;
          totalSkipped++;
          continue;
        }

        const transformed = transformQuestion(q, examId);
        const specialty = transformed.specialty;
        specialtyCount[specialty] = (specialtyCount[specialty] || 0) + 1;

        const cols = Object.keys(transformed);
        const placeholders = cols.map(() => "?").join(",");
        const vals = cols.map((c) => transformed[c]);

        const sql = `INSERT INTO questions (${cols.join(",")}) VALUES (${placeholders})`;
        try {
          await connection.query(sql, vals);
          fileImported++;
          totalImported++;
        } catch (e) {
          console.log(`  ⚠️  Insert failed: ${e.message}`);
        }
      }

      console.log(`  ✅ Imported: ${fileImported}, Skipped: ${fileSkipped}`);
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📈 IMPORT SUMMARY`);
    console.log("=".repeat(50));
    console.log(`Total Imported: ${totalImported}`);
    console.log(`Total Skipped (duplicates): ${totalSkipped}`);
    console.log(`\nSpecialty Breakdown:`);
    Object.entries(specialtyCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([specialty, count]) => {
        console.log(`  ${specialty}: ${count}`);
      });

    // Verify final count
    const [result] = await connection.query("SELECT COUNT(*) as count FROM questions");
    console.log(`\n✅ Total questions in database: ${result[0].count}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

importBatch();
