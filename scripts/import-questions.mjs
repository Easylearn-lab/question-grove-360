#!/usr/bin/env node
/**
 * MRCGP AKT Question Bank Bulk Import
 * Imports all JSON files into the questions table (auto-increment id)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES = [
  { file: 'mrcgp_akt_cardiovascular_qg.json', specialty: 'Cardiovascular' },
  { file: 'mrcgp_akt_cardiovascular.json', specialty: 'Cardiovascular' },
  { file: 'mrcgp_akt_dermatology_qg.json', specialty: 'Dermatology' },
  { file: 'mrcgp_akt_dermatology.json', specialty: 'Dermatology' },
  { file: 'mrcgp_akt_endocrinology_qg.json', specialty: 'Endocrinology' },
  { file: 'mrcgp_akt_endocrinology.json', specialty: 'Endocrinology' },
  { file: 'mrcgp_akt_gastroenterology_qg.json', specialty: 'Gastroenterology' },
  { file: 'mrcgp_akt_gastroenterology.json', specialty: 'Gastroenterology' },
  { file: 'mrcgp_akt_musculoskeletal.json', specialty: 'Musculoskeletal' },
  { file: 'mrcgp_akt_neurology_qg.json', specialty: 'Neurology' },
  { file: 'mrcgp_akt_neurology.json', specialty: 'Neurology' },
  { file: 'mrcgp_akt_obstetrics_gynaecology_qg.json', specialty: 'Obstetrics & Gynaecology' },
  { file: 'mrcgp_akt_obstetrics_gynaecology.json', specialty: 'Obstetrics & Gynaecology' },
  { file: 'mrcgp_akt_paediatrics_qg.json', specialty: 'Paediatrics' },
  { file: 'mrcgp_akt_psychiatry_qg.json', specialty: 'Psychiatry' },
  { file: 'mrcgp_akt_psychiatry.json', specialty: 'Psychiatry' },
  { file: 'mrcgp_akt_renal.json', specialty: 'Renal' },
  { file: 'mrcgp_akt_respiratory_qg.json', specialty: 'Respiratory' },
  { file: 'mrcgp_akt_respiratory.json', specialty: 'Respiratory' },
];

const DATA_DIR = path.join(__dirname, '..', 'data', 'questions');

// Escape SQL string value - handles NULL, quotes, backslashes
function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `'${s}'`;
}

function parseDatabaseUrl(urlStr) {
  const url = new URL(urlStr);
  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
}

function normaliseQuestion(q, meta) {
  let optA = '', optB = '', optC = '', optD = '', optE = null;

  if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
    optA = q.options.A || '';
    optB = q.options.B || '';
    optC = q.options.C || '';
    optD = q.options.D || '';
    optE = q.options.E || null;
  } else if (Array.isArray(q.options)) {
    optA = q.options[0] || '';
    optB = q.options[1] || '';
    optC = q.options[2] || '';
    optD = q.options[3] || '';
    optE = q.options[4] || null;
  } else {
    optA = q.option_a || q.option_1 || '';
    optB = q.option_b || q.option_2 || '';
    optC = q.option_c || q.option_3 || '';
    optD = q.option_d || q.option_4 || '';
    optE = q.option_e || q.option_5 || null;
  }

  let correctAnswer = q.correct_answer || q.answer || q.correctAnswer || 'A';
  if (typeof correctAnswer === 'number') {
    correctAnswer = ['A', 'B', 'C', 'D', 'E'][correctAnswer] || ['A', 'B', 'C', 'D', 'E'][correctAnswer - 1] || 'A';
  }
  correctAnswer = String(correctAnswer).toUpperCase().trim().charAt(0);
  if (!['A', 'B', 'C', 'D', 'E'].includes(correctAnswer)) correctAnswer = 'A';

  let explanationCorrect = null;
  let expA = null, expB = null, expC = null, expD = null, expE = null;

  if (q.explanation && typeof q.explanation === 'object') {
    explanationCorrect = q.explanation.correct || null;
    expA = q.explanation.A || null;
    expB = q.explanation.B || null;
    expC = q.explanation.C || null;
    expD = q.explanation.D || null;
    expE = q.explanation.E || null;
  } else if (typeof q.explanation === 'string') {
    explanationCorrect = q.explanation;
  }

  return {
    examId: 1,
    domain: q.domain || 'Clinical Medicine',
    specialty: q.specialty || meta.specialty,
    subSpecialty: null,
    difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
    question: q.question || q.question_text || q.stem || '',
    optionA: optA,
    optionB: optB,
    optionC: optC,
    optionD: optD,
    optionE: optE,
    correctAnswer,
    explanationCorrect,
    explanationA: expA,
    explanationB: expB,
    explanationC: expC,
    explanationD: expD,
    explanationE: expE,
  };
}

async function importAllQuestions() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   QUESTION GROVE 360 — AKT QUESTION BANK IMPORT     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL || '');
  console.log(`🔌 Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...\n`);
  
  const connection = await mysql.createConnection(dbConfig);
  console.log('✅ Connected!\n');

  // Load all questions from files
  let allQuestions = [];

  for (const meta of FILES) {
    const filePath = path.join(DATA_DIR, meta.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠️  NOT FOUND: ${meta.file}`);
      continue;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = JSON.parse(raw.replace(/,(\s*[}\]])/g, '$1')); }

      const questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || Object.values(parsed));
      if (!Array.isArray(questions) || questions.length === 0) {
        console.warn(`   ⚠️  EMPTY: ${meta.file}`);
        continue;
      }

      const normalised = questions
        .filter(q => q && (q.question || q.question_text || q.stem))
        .map(q => normaliseQuestion(q, meta));

      allQuestions = allQuestions.concat(normalised);
      console.log(`   ✅ ${meta.file.padEnd(48)} ${normalised.length} questions`);
    } catch (err) {
      console.error(`   ❌ ERROR: ${meta.file} — ${err.message}`);
    }
  }

  console.log(`\n📊 Total loaded: ${allQuestions.length} questions`);

  // Deduplicate by question text (since we're not using string IDs anymore)
  const seen = new Set();
  const deduped = [];
  for (const q of allQuestions) {
    const key = q.question.substring(0, 100).toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(q);
  }

  console.log(`📝 After deduplication: ${deduped.length} unique questions\n`);
  console.log('🔄 Inserting into database...\n');

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < deduped.length; i++) {
    const q = deduped[i];
    try {
      const sql = `INSERT INTO questions (examId, domain, specialty, subSpecialty, difficulty, question, optionA, optionB, optionC, optionD, optionE, correctAnswer, explanationCorrect, explanationA, explanationB, explanationC, explanationD, explanationE) VALUES (${q.examId}, ${esc(q.domain)}, ${esc(q.specialty)}, ${esc(q.subSpecialty)}, ${esc(q.difficulty)}, ${esc(q.question)}, ${esc(q.optionA)}, ${esc(q.optionB)}, ${esc(q.optionC)}, ${esc(q.optionD)}, ${esc(q.optionE)}, ${esc(q.correctAnswer)}, ${esc(q.explanationCorrect)}, ${esc(q.explanationA)}, ${esc(q.explanationB)}, ${esc(q.explanationC)}, ${esc(q.explanationD)}, ${esc(q.explanationE)})`;
      
      await connection.query(sql);
      inserted++;
      
      if (inserted % 50 === 0) {
        console.log(`   ✅ Progress: ${inserted} inserted (${i + 1}/${deduped.length})`);
      }
    } catch (err) {
      failed++;
      console.error(`   ❌ Failed [${i}]: ${err.message.substring(0, 80)}`);
    }
  }

  console.log(`\n✨ Import complete!`);
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total: ${deduped.length}\n`);

  // Verify
  const [rows] = await connection.query('SELECT COUNT(*) as count FROM questions');
  console.log(`📋 Total questions in database: ${rows[0].count}\n`);

  await connection.end();
}

importAllQuestions().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
