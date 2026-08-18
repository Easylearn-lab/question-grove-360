import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const url = new URL(DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '4000'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
  multipleStatements: true,
});

const files = [
  'scripts/picture360_derm_batch2.sql',
  'scripts/picture360_ophthal_batch2.sql',
  'scripts/picture360_ecg_batch2.sql',
  'scripts/picture360_ent_batch2.sql',
  'scripts/picture360_cxr_batch2.sql',
  'scripts/picture360_paeds_batch2.sql',
];

// Get before count
const [beforeRows] = await conn.execute('SELECT COUNT(*) as total FROM picture360_images');
console.log('Before count:', beforeRows[0].total);

for (const file of files) {
  try {
    const sql = readFileSync(file, 'utf8');
    await conn.execute(sql);
    const [countRows] = await conn.execute('SELECT COUNT(*) as total FROM picture360_images');
    console.log(`✓ ${file} — total now: ${countRows[0].total}`);
  } catch (err) {
    console.error(`✗ ${file} — ERROR:`, err.message.slice(0, 200));
  }
}

// Get after count with breakdown
const [afterRows] = await conn.execute('SELECT COUNT(*) as total FROM picture360_images');
console.log('\nAfter count:', afterRows[0].total);

const [breakdown] = await conn.execute('SELECT specialty, COUNT(*) as count FROM picture360_images GROUP BY specialty ORDER BY specialty');
console.log('\nBreakdown:');
for (const row of breakdown) {
  console.log(`  ${row.specialty}: ${row.count}`);
}

await conn.end();
