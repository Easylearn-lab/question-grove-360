import fs from 'fs';
import mysql from 'mysql2/promise';

// Read the 430 questions JSON
const questionsData = JSON.parse(fs.readFileSync('/home/ubuntu/question-grove-360/public/questions/batch_c.json', 'utf-8'));

console.log(`📥 Loaded ${questionsData.length} questions from batch_c.json`);

// Database connection
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'question_grove_360',
});

try {
  // Get the MRCGP AKT exam ID
  const [examRows] = await connection.query(
    'SELECT id FROM exams WHERE name = ? OR code = ?',
    ['MRCGP AKT', 'MRCGP_AKT']
  );
  
  if (examRows.length === 0) {
    console.error('❌ MRCGP AKT exam not found in database');
    process.exit(1);
  }
  
  const examId = examRows[0].id;
  console.log(`✓ Found MRCGP AKT exam with ID: ${examId}`);

  // Prepare insert statement
  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const q of questionsData) {
    try {
      // Map JSON structure to database columns
      const values = [
        examId,
        q.domain || null,
        q.specialty || null,
        q.specialty || null, // subSpecialty
        q.difficulty || null,
        q.question,
        q.options?.A || '',
        q.options?.B || '',
        q.options?.C || '',
        q.options?.D || '',
        q.options?.E || null,
        q.correct_answer,
        q.explanation?.correct || q.explanation?.B || null,
        q.explanation?.A || null,
        q.explanation?.B || null,
        q.explanation?.C || null,
        q.explanation?.D || null,
        q.explanation?.E || null,
        q.reference || null,
        JSON.stringify(q.tags || []),
        'active',
        0, // attemptCount
        0, // correctCount
        0, // flagCount
        0, // reportCount
      ];

      // Upsert: Try insert, if duplicate then update
      const sql = `
        INSERT INTO questions (
          examId, domain, specialty, subSpecialty, difficulty,
          question, optionA, optionB, optionC, optionD, optionE,
          correctAnswer, explanationCorrect, explanationA, explanationB,
          explanationC, explanationD, explanationE, reference, tags,
          status, attemptCount, correctCount, flagCount, reportCount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          domain = VALUES(domain),
          specialty = VALUES(specialty),
          difficulty = VALUES(difficulty),
          question = VALUES(question),
          optionA = VALUES(optionA),
          optionB = VALUES(optionB),
          optionC = VALUES(optionC),
          optionD = VALUES(optionD),
          optionE = VALUES(optionE),
          correctAnswer = VALUES(correctAnswer),
          explanationCorrect = VALUES(explanationCorrect),
          explanationA = VALUES(explanationA),
          explanationB = VALUES(explanationB),
          explanationC = VALUES(explanationC),
          explanationD = VALUES(explanationD),
          explanationE = VALUES(explanationE),
          reference = VALUES(reference),
          tags = VALUES(tags),
          updatedAt = NOW()
      `;

      const [result] = await connection.query(sql, values);
      
      if (result.affectedRows === 1) {
        if (result.insertId) {
          imported++;
        } else {
          updated++;
        }
      }
    } catch (err) {
      console.error(`❌ Error importing question ${q.id}:`, err.message);
      errors++;
    }
  }

  console.log(`\n✅ Import complete:`);
  console.log(`   Imported: ${imported} new questions`);
  console.log(`   Updated: ${updated} existing questions`);
  console.log(`   Errors: ${errors}`);

  // Verify the import
  const [countResult] = await connection.query(
    'SELECT COUNT(*) as count FROM questions WHERE examId = ?',
    [examId]
  );
  console.log(`\n📊 Total MRCGP AKT questions in database: ${countResult[0].count}`);

  // Show specialty breakdown
  const [specialties] = await connection.query(
    'SELECT specialty, COUNT(*) as count FROM questions WHERE examId = ? GROUP BY specialty ORDER BY count DESC',
    [examId]
  );
  
  console.log(`\n📋 Specialty breakdown (${specialties.length} specialties):`);
  specialties.forEach(row => {
    console.log(`   ${row.specialty}: ${row.count}`);
  });

} catch (error) {
  console.error('❌ Database error:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
