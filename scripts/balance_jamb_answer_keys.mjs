import { readFile, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const workspace = "/home/ubuntu/jamb-import-workspace";
const subjects = ["Mathematics", "Economics", "Government", "Geography", "Literature in English", "Commerce", "Principles of Accounts", "History"];
const letters = ["A", "B", "C", "D"];
const banks = {};

for (const subject of subjects) {
  const filename = `${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jamb-100.json`;
  banks[subject] = JSON.parse(await readFile(`${workspace}/${filename}`, "utf8"));
  if (banks[subject].length !== 100) throw new Error(`${subject}: expected 100 questions`);
}

for (const subject of subjects) {
  for (let index = 0; index < banks[subject].length; index += 1) {
    const question = banks[subject][index];
    const originalOptions = Object.fromEntries(letters.map((letter) => [letter, question[`option_${letter.toLowerCase()}`]]));
    const correctText = originalOptions[question.correct_answer];
    if (!correctText) throw new Error(`${subject}: missing correct option at position ${index + 1}`);
    const distractors = letters.filter((letter) => letter !== question.correct_answer).map((letter) => originalOptions[letter]);
    const targetLetter = letters[index % letters.length];
    let distractorIndex = 0;
    for (const letter of letters) {
      question[`option_${letter.toLowerCase()}`] = letter === targetLetter ? correctText : distractors[distractorIndex++];
    }
    question.correct_answer = targetLetter;
  }
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.beginTransaction();
  for (const subject of subjects) {
    const [rows] = await connection.query("SELECT id FROM jamb_questions WHERE subject = ? ORDER BY id", [subject]);
    if (rows.length !== 100) throw new Error(`${subject}: expected 100 database rows`);
    for (let index = 0; index < 100; index += 1) {
      const question = banks[subject][index];
      await connection.execute(
        "UPDATE jamb_questions SET option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ? WHERE id = ?",
        [question.option_a, question.option_b, question.option_c, question.option_d, question.correct_answer, rows[index].id]
      );
    }
  }
  await connection.commit();

  for (const subject of subjects) {
    const filename = `${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jamb-100.json`;
    await writeFile(`${workspace}/${filename}`, JSON.stringify(banks[subject], null, 2));
  }
  await writeFile(`${workspace}/jamb-new-subjects-validated.json`, JSON.stringify(subjects.flatMap((subject) => banks[subject]), null, 2));
  console.log("Balanced correct-answer positions to 25 A, 25 B, 25 C, and 25 D per new JAMB subject.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
