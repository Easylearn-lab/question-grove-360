import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load DATABASE_URL from .project-config.json
const configPath = resolve(process.cwd(), '.project-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const dbUrl = config.env_vars.DATABASE_URL;

const ids = [127, 134, 136, 145, 156, 232, 243, 263, 300, 305, 425, 428, 443, 447, 490, 499, 30001, 30133, 30238, 270013, 270085, 270092, 270094, 270103, 270114, 270230, 270245, 270267, 270515];

async function main() {
  const connection = await mysql.createConnection(dbUrl);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT id, question, optionA, optionB, optionC, optionD, optionE, correctAnswer FROM questions WHERE id IN (${placeholders})`,
    ids
  );
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

main().catch(e => { console.error(e); process.exit(1); });
