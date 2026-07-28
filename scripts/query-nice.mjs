import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const configPath = resolve(process.cwd(), '.project-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const dbUrl = config.env_vars.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(dbUrl);
  const [rows] = await connection.execute(
    `SELECT id, question FROM questions WHERE question LIKE '%Per NICE%' ORDER BY id`
  );
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
