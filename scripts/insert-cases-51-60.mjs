import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // Count before
  const [beforeRows] = await conn.execute('SELECT COUNT(*) as total FROM sca_cases');
  console.log('Before:', beforeRows[0].total);

  // Read the SQL file
  const raw = readFileSync('/home/ubuntu/upload/pasted_content_3.txt', 'utf8');

  // Extract just the SQL between the heredoc markers
  const startMarker = "INSERT INTO sca_cases (";
  let startIdx = raw.indexOf(startMarker);
  
  if (startIdx === -1) {
    console.error('Could not find INSERT start');
    process.exit(1);
  }
  
  // Find the closing ");" - it's the last one before SQLEOF
  const sqlEofIdx = raw.indexOf('SQLEOF');
  const relevantPart = sqlEofIdx > -1 ? raw.substring(startIdx, sqlEofIdx) : raw.substring(startIdx);
  
  // Find the last ");" in the relevant part
  const lastClosing = relevantPart.lastIndexOf(');');
  if (lastClosing === -1) {
    console.error('Could not find closing );');
    process.exit(1);
  }
  
  let sql = relevantPart.substring(0, lastClosing + 2);
  
  // Remove SQL comment lines (lines starting with --)
  sql = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
  
  // Clean up multiple blank lines
  sql = sql.replace(/\n{3,}/g, '\n\n');
  
  console.log('SQL length:', sql.length);
  console.log('First 100 chars:', sql.substring(0, 100));
  console.log('Last 50 chars:', sql.substring(sql.length - 50));

  try {
    const [result] = await conn.execute(sql);
    console.log('INSERT executed successfully, affected rows:', result.affectedRows);
  } catch (err) {
    console.error('SQL Error:', err.message.substring(0, 500));
    await conn.end();
    process.exit(1);
  }

  // Count after
  const [afterRows] = await conn.execute('SELECT COUNT(*) as total FROM sca_cases');
  console.log('After:', afterRows[0].total);

  await conn.end();
  console.log('Done');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
