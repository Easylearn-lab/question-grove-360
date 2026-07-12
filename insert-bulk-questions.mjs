#!/usr/bin/env node
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read SQL file
const sqlFile = path.join(__dirname, 'bulk-hard-questions.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

// Parse statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s && s.startsWith('INSERT'));

console.log(`Found ${statements.length} INSERT statements`);

// Create connection
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'question_grove',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  try {
    await connection.execute(statements[i]);
    successCount++;
    
    if ((i + 1) % 10 === 0) {
      console.log(`Inserted ${i + 1}/${statements.length} questions`);
    }
  } catch (error) {
    errorCount++;
    console.error(`Error on statement ${i}: ${error.message}`);
  }
}

await connection.end();

console.log(`\nCompleted: ${successCount}/${statements.length} questions inserted`);
if (errorCount > 0) {
  console.log(`Errors: ${errorCount}`);
}
