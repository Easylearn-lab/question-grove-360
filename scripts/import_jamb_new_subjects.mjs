import { readFile, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const inputPath = "/home/ubuntu/jamb-import-workspace/jamb-new-subjects-validated.json";
const receiptPath = "/home/ubuntu/jamb-import-workspace/jamb-import-receipt.json";
const expectedSubjects = [
  "Mathematics",
  "Economics",
  "Government",
  "Geography",
  "Literature in English",
  "Commerce",
  "Principles of Accounts",
  "History",
];

function normalise(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not available");

  const questions = JSON.parse(await readFile(inputPath, "utf8"));
  if (!Array.isArray(questions) || questions.length !== 800) {
    throw new Error("Expected exactly 800 validated JAMB questions");
  }

  const importedCounts = Object.fromEntries(expectedSubjects.map((subject) => [subject, 0]));
  for (const question of questions) {
    if (!expectedSubjects.includes(question.subject)) throw new Error(`Unexpected subject: ${question.subject}`);
    if (!["A", "B", "C", "D"].includes(question.correct_answer)) throw new Error(`Invalid answer key for ${question.subject}`);
    importedCounts[question.subject] += 1;
  }
  for (const subject of expectedSubjects) {
    if (importedCounts[subject] !== 100) throw new Error(`${subject} must have exactly 100 questions`);
  }

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [beforeRows] = await connection.query("SELECT COUNT(*) AS total FROM jamb_questions");
    const [existingRows] = await connection.query("SELECT question_text FROM jamb_questions");
    const existingPrompts = new Set(existingRows.map((row) => normalise(row.question_text)));
    const duplicateAgainstExisting = questions.find((question) => existingPrompts.has(normalise(question.question_text)));
    if (duplicateAgainstExisting) throw new Error(`Duplicate question prompt already exists: ${duplicateAgainstExisting.question_text.slice(0, 100)}`);

    await connection.beginTransaction();
    const insertSql = `INSERT INTO jamb_questions
      (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic, country, region)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    for (const question of questions) {
      await connection.execute(insertSql, [
        question.question_text,
        question.option_a,
        question.option_b,
        question.option_c,
        question.option_d,
        question.correct_answer,
        question.explanation,
        question.subject,
        question.topic,
        question.country,
        question.region,
      ]);
    }

    const [afterRows] = await connection.query("SELECT COUNT(*) AS total FROM jamb_questions");
    const [afterSubjectRows] = await connection.query(
      "SELECT subject, COUNT(*) AS count FROM jamb_questions WHERE subject IN (?) GROUP BY subject ORDER BY subject",
      [expectedSubjects]
    );
    const afterCounts = Object.fromEntries(afterSubjectRows.map((row) => [row.subject, Number(row.count)]));
    const missingOrWrong = expectedSubjects.filter((subject) => afterCounts[subject] !== 100);
    if (Number(afterRows[0].total) !== Number(beforeRows[0].total) + 800 || missingOrWrong.length) {
      throw new Error(`Post-import validation failed: ${missingOrWrong.join(", ") || "total count mismatch"}`);
    }

    await connection.commit();
    const receipt = {
      status: "committed",
      targetTable: "jamb_questions",
      beforeCount: Number(beforeRows[0].total),
      afterCount: Number(afterRows[0].total),
      inserted: 800,
      newSubjects: afterCounts,
    };
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
