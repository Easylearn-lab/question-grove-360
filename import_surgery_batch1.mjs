import mysql from 'mysql2/promise';
import fs from 'fs';

const sql = fs.readFileSync('/tmp/plab1_surgery_batch1_clean.sql', 'utf-8');

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'question_grove_360',
});

try {
  console.log('Executing Surgery Batch 1 import...');
  const result = await connection.query(sql);
  console.log(`Import successful: ${result[0].affectedRows} rows inserted`);
} catch (err) {
  console.error('Import failed:', err.message);
  console.error('SQL:', sql.substring(0, 500));
} finally {
  await connection.end();
}
