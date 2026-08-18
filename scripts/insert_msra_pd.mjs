import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Read the generated results
  const raw = fs.readFileSync("/home/ubuntu/generate_msra_pd_questions.json", "utf8");
  const data = JSON.parse(raw);
  
  let allQuestions = [];
  let parseErrors = 0;
  
  for (const result of data.results) {
    if (result.error) { console.error("Subtask error:", result.error); continue; }
    const jsonStr = result.output.questions_json;
    try {
      // Try to parse the JSON - handle markdown code blocks if present
      let cleaned = jsonStr.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
      }
      const questions = JSON.parse(cleaned);
      if (Array.isArray(questions)) {
        allQuestions.push(...questions);
      }
    } catch (e) {
      parseErrors++;
      console.error("Parse error for topic:", result.output.topic, e.message);
      // Try to extract JSON array from the string
      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const questions = JSON.parse(match[0]);
          allQuestions.push(...questions);
          parseErrors--;
          console.log("  Recovered via regex extraction");
        } catch (e2) {
          console.error("  Recovery failed:", e2.message);
        }
      }
    }
  }
  
  console.log(`Total questions parsed: ${allQuestions.length}`);
  console.log(`Parse errors: ${parseErrors}`);
  
  // Insert in batches
  let inserted = 0;
  let errors = 0;
  
  for (const q of allQuestions) {
    try {
      const isRanking = q.questionType === "RANKING";
      
      await conn.execute(
        `INSERT INTO msra_pd_questions (questionType, domain, scenario, actionA, actionB, actionC, actionD, actionE, correctRanking, explanationRanking, optionA, optionB, optionC, optionD, optionE, correctOptions, explanationOptions, reference, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.questionType,
          q.domain || null,
          q.scenario || null,
          isRanking ? (q.actionA || null) : null,
          isRanking ? (q.actionB || null) : null,
          isRanking ? (q.actionC || null) : null,
          isRanking ? (q.actionD || null) : null,
          isRanking ? (q.actionE || null) : null,
          isRanking && q.correctRanking ? JSON.stringify(q.correctRanking) : null,
          isRanking ? (q.explanationRanking || null) : null,
          !isRanking ? (q.optionA || null) : null,
          !isRanking ? (q.optionB || null) : null,
          !isRanking ? (q.optionC || null) : null,
          !isRanking ? (q.optionD || null) : null,
          !isRanking ? (q.optionE || null) : null,
          !isRanking && q.correctOptions ? JSON.stringify(q.correctOptions) : null,
          !isRanking ? (q.explanationOptions || null) : null,
          q.reference || "GMC Good Medical Practice",
          q.status || "active",
        ]
      );
      inserted++;
    } catch (e) {
      errors++;
      console.error(`Insert error for question: ${e.message}`);
    }
  }
  
  console.log(`\nInserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  
  // Verify
  const [countResult] = await conn.query("SELECT COUNT(*) as total FROM msra_pd_questions");
  console.log(`\nFinal row count: ${countResult[0].total}`);
  
  // Breakdown by topic and type
  const [breakdown] = await conn.query("SELECT domain, questionType, COUNT(*) as cnt FROM msra_pd_questions GROUP BY domain, questionType ORDER BY domain, questionType");
  console.log("\nBreakdown:");
  for (const row of breakdown) {
    console.log(`  ${row.domain} | ${row.questionType}: ${row.cnt}`);
  }
  
  await conn.end();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
