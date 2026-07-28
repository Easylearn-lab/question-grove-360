/**
 * Audit questions for answer option length imbalance.
 * 
 * Criteria:
 * 1. >40% longer than average of other 4 options → "affected"
 * 2. >100% longer (double) than average of other 4 options → "worst offender"
 * 
 * Run with: node scripts/audit-answer-lengths.mjs
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL + "&ssl={}");
  
  try {
    // Get all questions with their options
    const [rows] = await connection.execute(`
      SELECT id, specialty, optionA, optionB, optionC, optionD, optionE, correctAnswer
      FROM questions
      ORDER BY id
    `);

    console.log(`Total questions: ${rows.length}\n`);

    const affected40 = []; // >40% longer
    const affected100 = []; // >100% longer (worst offenders)

    for (const q of rows) {
      const options = [
        { key: 'A', text: q.optionA || '' },
        { key: 'B', text: q.optionB || '' },
        { key: 'C', text: q.optionC || '' },
        { key: 'D', text: q.optionD || '' },
        { key: 'E', text: q.optionE || '' },
      ].filter(o => o.text.length > 0); // Only count non-empty options

      if (options.length < 3) continue; // Skip questions with too few options

      // For each option, calculate if it's significantly longer than the others
      for (const opt of options) {
        const otherLengths = options.filter(o => o.key !== opt.key).map(o => o.text.length);
        const avgOtherLength = otherLengths.reduce((a, b) => a + b, 0) / otherLengths.length;
        
        if (avgOtherLength === 0) continue;
        
        const ratio = (opt.text.length - avgOtherLength) / avgOtherLength;
        
        if (ratio > 1.0) {
          // >100% longer (worst offender)
          affected100.push({
            id: q.id,
            specialty: q.specialty,
            longOption: opt.key,
            isCorrect: opt.key === q.correctAnswer,
            optionLength: opt.text.length,
            avgOtherLength: Math.round(avgOtherLength),
            ratio: Math.round(ratio * 100),
            text: opt.text.substring(0, 80) + (opt.text.length > 80 ? '...' : ''),
          });
        } else if (ratio > 0.4) {
          // >40% longer
          affected40.push({
            id: q.id,
            specialty: q.specialty,
            longOption: opt.key,
            isCorrect: opt.key === q.correctAnswer,
            optionLength: opt.text.length,
            avgOtherLength: Math.round(avgOtherLength),
            ratio: Math.round(ratio * 100),
            text: opt.text.substring(0, 80) + (opt.text.length > 80 ? '...' : ''),
          });
        }
      }
    }

    // Deduplicate by question ID (a question may have multiple long options)
    const uniqueAffected40Ids = [...new Set(affected40.map(q => q.id))];
    const uniqueAffected100Ids = [...new Set(affected100.map(q => q.id))];

    console.log(`=== SUMMARY ===`);
    console.log(`Questions with an option >40% longer than avg of others: ${uniqueAffected40Ids.length}`);
    console.log(`Questions with an option >100% longer (worst offenders): ${uniqueAffected100Ids.length}`);
    
    // Check how many of the long options are the correct answer
    const correctIs40 = affected40.filter(q => q.isCorrect).length;
    const correctIs100 = affected100.filter(q => q.isCorrect).length;
    console.log(`\nOf the >40% group: ${correctIs40}/${affected40.length} long options are the correct answer (${Math.round(correctIs40/affected40.length*100)}%)`);
    console.log(`Of the >100% group: ${correctIs100}/${affected100.length} long options are the correct answer (${Math.round(correctIs100/affected100.length*100)}%)`);

    console.log(`\n=== WORST OFFENDERS (>100% longer) ===`);
    for (const q of affected100.slice(0, 30)) {
      console.log(`  Q${q.id} [${q.specialty}] Option ${q.longOption}${q.isCorrect ? ' (CORRECT)' : ''}: ${q.optionLength} chars vs avg ${q.avgOtherLength} (${q.ratio}% longer)`);
      console.log(`    "${q.text}"`);
    }

    // Output the IDs for flagging
    console.log(`\n=== FLAGGED QUESTION IDs (>100% longer, for content review) ===`);
    console.log(JSON.stringify(uniqueAffected100Ids));

    console.log(`\n=== ALL AFFECTED QUESTION IDs (>40% longer) ===`);
    console.log(JSON.stringify(uniqueAffected40Ids));

  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
