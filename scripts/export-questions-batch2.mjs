import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const configPath = resolve(process.cwd(), '.project-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const dbUrl = config.env_vars.DATABASE_URL;

const ids = [270614, 270657, 270677, 270680, 270695, 270699, 270707, 270716, 270834, 300035, 420008, 420012, 420014, 420017, 420029, 420037, 420040, 720100, 780016, 780021, 780024, 780025, 780029, 780030, 780032, 780033, 780041, 810001, 870004, 870005, 870007, 870009, 870011, 870012, 870013, 870019, 870022, 870023, 870025, 870026, 870027, 870028, 870029, 870030, 870031, 870032, 870033, 870035, 870036, 870038, 870039, 870040, 870041, 870042, 870043, 870044, 870045, 870046, 870047, 870048, 870050, 870051, 870052, 870053, 900001, 900004, 900005, 900006, 900007, 900009, 900010, 900011, 900014, 900015, 900016, 900017, 900018, 900019, 900020, 900021, 900023, 900024, 900025, 900026, 900028, 900029, 900030, 900032, 900033, 900034, 900035, 900036, 900038, 900039, 900040, 960007, 1020002, 1110002, 1170008, 1170009, 1200003, 1200004, 1200006, 1200009, 1200010, 1230004, 1230005, 1260004, 1260008, 1260014, 1260035, 1290005, 1290010, 1290017, 1290018, 1290025, 1290037, 1320003, 1320005, 1320008, 1320009, 1320011, 1320014, 1320020, 1320030, 1320031, 1320040];

async function main() {
  const connection = await mysql.createConnection(dbUrl);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT id, question, optionA, optionB, optionC, optionD, optionE, correctAnswer FROM questions WHERE id IN (${placeholders})`,
    ids
  );
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
