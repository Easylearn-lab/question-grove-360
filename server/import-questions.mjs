import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importQuestions() {
  console.log('[Import] Starting question import...');
  
  try {
    // Read both JSON files
    const batchAPath = '/home/ubuntu/upload/completion_batch_a.json';
    const batchBPath = '/home/ubuntu/upload/completion_batch_b.json';
    
    let allQuestions = [];
    
    if (fs.existsSync(batchAPath)) {
      const batchA = JSON.parse(fs.readFileSync(batchAPath, 'utf-8'));
      allQuestions = allQuestions.concat(batchA);
      console.log(`[Import] Loaded ${batchA.length} questions from batch A`);
    }
    
    if (fs.existsSync(batchBPath)) {
      const batchB = JSON.parse(fs.readFileSync(batchBPath, 'utf-8'));
      allQuestions = allQuestions.concat(batchB);
      console.log(`[Import] Loaded ${batchB.length} questions from batch B`);
    }
    
    console.log(`[Import] Total questions to import: ${allQuestions.length}`);
    
    // Get database connection
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    // Import questions
    let imported = 0;
    let skipped = 0;
    const specialtyCounts = {};
    
    for (const q of allQuestions) {
      try {
        // Validate required fields
        if (!q.id || !q.exam || !q.specialty || !q.question) {
          console.warn(`[Import] Skipping question with missing required fields: ${q.id}`);
          skipped++;
          continue;
        }
        
        // Track specialty counts
        specialtyCounts[q.specialty] = (specialtyCounts[q.specialty] || 0) + 1;
        
        // Insert or update question
        await db.execute(`
          INSERT INTO questions (
            id, exam, domain, specialty, difficulty, question,
            option_a, option_b, option_c, option_d, option_e,
            correct_answer, explanation_correct, explanation_a, explanation_b,
            explanation_c, explanation_d, explanation_e, reference_text, tags
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            exam = VALUES(exam),
            domain = VALUES(domain),
            specialty = VALUES(specialty),
            difficulty = VALUES(difficulty),
            question = VALUES(question),
            option_a = VALUES(option_a),
            option_b = VALUES(option_b),
            option_c = VALUES(option_c),
            option_d = VALUES(option_d),
            option_e = VALUES(option_e),
            correct_answer = VALUES(correct_answer),
            explanation_correct = VALUES(explanation_correct),
            explanation_a = VALUES(explanation_a),
            explanation_b = VALUES(explanation_b),
            explanation_c = VALUES(explanation_c),
            explanation_d = VALUES(explanation_d),
            explanation_e = VALUES(explanation_e),
            reference_text = VALUES(reference_text),
            tags = VALUES(tags)
        `, [
          q.id,
          q.exam,
          q.domain || null,
          q.specialty,
          q.difficulty || 'Medium',
          q.question,
          q.options?.A || '',
          q.options?.B || '',
          q.options?.C || '',
          q.options?.D || '',
          q.options?.E || '',
          q.correct_answer,
          q.explanation?.correct || '',
          q.explanation?.A || '',
          q.explanation?.B || '',
          q.explanation?.C || '',
          q.explanation?.D || '',
          q.explanation?.E || '',
          q.reference || '',
          JSON.stringify(q.tags || [])
        ]);
        
        imported++;
        if (imported % 50 === 0) {
          console.log(`[Import] Imported ${imported} questions...`);
        }
      } catch (error) {
        console.error(`[Import] Error importing question ${q.id}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`\n[Import] Import complete!`);
    console.log(`[Import] Imported: ${imported}`);
    console.log(`[Import] Skipped: ${skipped}`);
    console.log(`[Import] Specialty breakdown:`);
    
    Object.entries(specialtyCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([specialty, count]) => {
        console.log(`  ${specialty}: ${count}`);
      });
    
    process.exit(0);
  } catch (error) {
    console.error('[Import] Fatal error:', error);
    process.exit(1);
  }
}

importQuestions();
