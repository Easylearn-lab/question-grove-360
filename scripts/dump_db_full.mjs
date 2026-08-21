import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  
  const conn = await mysql.createConnection(url);
  const output = [];
  const timestamp = new Date().toISOString().split('T')[0];
  
  output.push(`-- Question Grove 360 Database Backup`);
  output.push(`-- Date: ${new Date().toISOString()}`);
  output.push(`-- Full backup of all tables\n`);
  output.push(`SET FOREIGN_KEY_CHECKS=0;\n`);
  
  // Get all tables
  const [tables] = await conn.query("SHOW TABLES");
  const tableKey = Object.keys(tables[0])[0];
  const tableNames = tables.map(t => t[tableKey]);
  
  console.log(`Found ${tableNames.length} tables\n`);
  console.log('Table Row Counts:');
  console.log('─'.repeat(50));
  
  let totalRows = 0;
  
  for (const table of tableNames) {
    // Get CREATE TABLE
    const [createResult] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    const createSQL = createResult[0]['Create Table'];
    output.push(`-- ─── TABLE: ${table} ───`);
    output.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    output.push(createSQL + ';\n');
    
    // Get row count and data
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    console.log(`  ${table}: ${rows.length} rows`);
    totalRows += rows.length;
    
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const colList = columns.map(c => `\`${c}\``).join(', ');
      
      // Batch inserts in groups of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const values = batch.map(row => {
          const vals = columns.map(col => {
            const v = row[col];
            if (v === null || v === undefined) return 'NULL';
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof v === 'number') return v;
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (Buffer.isBuffer(v)) return v.length > 0 ? v[0] : 0;
            return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
          });
          return `(${vals.join(', ')})`;
        });
        output.push(`INSERT INTO \`${table}\` (${colList}) VALUES\n${values.join(',\n')};\n`);
      }
    }
    output.push('');
  }
  
  output.push(`SET FOREIGN_KEY_CHECKS=1;\n`);
  output.push(`-- End of backup. Total: ${tableNames.length} tables, ${totalRows} rows.`);
  
  const filename = `/home/ubuntu/questiongrove360_backup_${timestamp}.sql`;
  fs.writeFileSync(filename, output.join('\n'), 'utf8');
  
  const stats = fs.statSync(filename);
  console.log('─'.repeat(50));
  console.log(`\nTotal: ${totalRows} rows across ${tableNames.length} tables`);
  console.log(`File: ${filename}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
