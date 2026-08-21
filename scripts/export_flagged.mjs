import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`
  SELECT id, specialty, topic, question, optionA, optionB, optionC, optionD, optionE, correctAnswer, explanationCorrect
  FROM questions WHERE reviewFlag = 'answer_mismatch' ORDER BY specialty, id
`);

let report = `# AKT Questions Flagged for Review — Answer-Explanation Mismatches\n\n`;
report += `**Total flagged:** ${rows.length} questions\n`;
report += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
report += `These questions have a discrepancy between the \`correctAnswer\` field and what the explanation text suggests is correct.\n\n---\n\n`;

for (const q of rows) {
  report += `## Question ${q.id} — ${q.specialty}\n\n`;
  report += `**Topic:** ${q.topic || 'Not tagged'}\n\n`;
  report += `**Stem:** ${q.question}\n\n`;
  report += `| Option | Text |\n|--------|------|\n`;
  report += `| A | ${(q.optionA || '').replace(/\|/g, '\\|').substring(0, 200)} |\n`;
  report += `| B | ${(q.optionB || '').replace(/\|/g, '\\|').substring(0, 200)} |\n`;
  report += `| C | ${(q.optionC || '').replace(/\|/g, '\\|').substring(0, 200)} |\n`;
  report += `| D | ${(q.optionD || '').replace(/\|/g, '\\|').substring(0, 200)} |\n`;
  report += `| E | ${(q.optionE || '').replace(/\|/g, '\\|').substring(0, 200)} |\n\n`;
  report += `**Database correctAnswer:** ${q.correctAnswer}\n\n`;
  report += `**Explanation text:**\n> ${(q.explanationCorrect || '').substring(0, 500)}\n\n`;
  report += `---\n\n`;
}

fs.writeFileSync('/home/ubuntu/akt_flagged_questions_review.md', report);
console.log(`Exported ${rows.length} flagged questions to /home/ubuntu/akt_flagged_questions_review.md`);
await conn.end();
process.exit(0);
