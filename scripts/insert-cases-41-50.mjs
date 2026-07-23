import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse the DATABASE_URL
const url = new URL(DATABASE_URL);
const connection = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
  multipleStatements: true,
});

// Check count before
const [beforeRows] = await connection.execute('SELECT COUNT(*) as total FROM sca_cases');
console.log(`Before insertion: ${beforeRows[0].total} cases`);

// Read and execute the SQL file
const sqlContent = readFileSync('/home/ubuntu/upload/SCA_Cases_41_to_50.sql', 'utf-8');

// Remove comment lines and execute
const cleanSql = sqlContent
  .split('\n')
  .filter(line => !line.startsWith('--'))
  .join('\n')
  .trim();

await connection.query(cleanSql);
console.log('SQL executed successfully');

// Check count after
const [afterRows] = await connection.execute('SELECT COUNT(*) as total FROM sca_cases');
console.log(`After insertion: ${afterRows[0].total} cases`);

await connection.end();
console.log('Done!');
