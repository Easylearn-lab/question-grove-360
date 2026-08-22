import { readFile, writeFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const workspace = "/home/ubuntu/jamb-import-workspace";
const files = {
  Mathematics: "mathematics-jamb-100.json",
  Economics: "economics-jamb-100.json",
  Geography: "geography-jamb-100.json",
  "Literature in English": "literature-in-english-jamb-100.json",
  "Principles of Accounts": "principles-of-accounts-jamb-100.json",
  History: "history-jamb-100.json",
};

const banks = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([subject, filename]) => [subject, JSON.parse(await readFile(`${workspace}/${filename}`, "utf8"))])));

const math = banks.Mathematics;
math[3].question_text = "Express the repeating decimal 0.363636... as a fraction in simplest form.";
math[4].question_text = "The price of a book rose from ₦250 to ₦325. What is the percentage increase to the nearest whole percent?";
math[4].explanation = "Percentage increase = ((325 − 250) / 250) × 100% = (75 / 250) × 100% = 30%.";
math[5].explanation = "0.004678 = 4.678 × 10⁻³; to two significant figures, this is 4.7 × 10⁻³ = 0.0047.";
math[6].explanation = "15% of 2/3 = 0.15 × (2/3) = (15/100) × (2/3) = 30/300 = 1/10.";
math[8].explanation = "Let the original price be P. After a 40% increase it is 1.4P. A 40% decrease then gives 1.4P × 0.6 = 0.84P, a 16% decrease.";
math[25].correct_answer = "B";
math[25].explanation = "Real coefficients require −3i to be a root as well. The product of the five roots is 2 × 2 × (−1) × 3i × (−3i) = −36. For a monic polynomial of degree 5, the constant term is (−1)⁵ times the product of the roots, so it is 36.";

const economics = banks.Economics;
economics[18].option_b = "Substitution effect (buy less) and income effect (buy less), both reducing quantity demanded.";
economics[18].explanation = "For a normal good, a price rise makes substitutes relatively cheaper and reduces real income. Both the substitution effect and income effect therefore reduce quantity demanded.";
economics[33].question_text = "Given demand P = 50 − Q and supply P = 10 + Q, what is the equilibrium price?";
economics[33].explanation = "At equilibrium, 50 − Q = 10 + Q, so 40 = 2Q and Q = 20. Substituting into either equation gives P = 30.";

const geography = banks.Geography;
geography[7].question_text = geography[7].question_text.replace("chloropleth", "choropleth");
const letters = ["A", "B", "C", "D"];
for (let index = 0; index < geography.length; index += 1) {
  const question = geography[index];
  if (question.correct_answer !== "A") throw new Error(`Expected Geography question ${index + 1} to have original answer A`);
  const correctText = question.option_a;
  const distractors = [question.option_b, question.option_c, question.option_d];
  const targetLetter = letters[index % letters.length];
  let distractorIndex = 0;
  for (const letter of letters) {
    const property = `option_${letter.toLowerCase()}`;
    question[property] = letter === targetLetter ? correctText : distractors[distractorIndex++];
  }
  question.correct_answer = targetLetter;
}

const literature = banks["Literature in English"];
literature[38].option_a = "Odejimi";
literature[38].explanation = "Odejimi is the protagonist who challenges injustice and the prevailing order in the kingdom.";

const accounts = banks["Principles of Accounts"];
accounts[24].question_text = accounts[24].question_text.replace("₦14,300", "₦15,200");
accounts[52].question_text = accounts[52].question_text.replace("and discount received ₦2,000", "and proceeds from sale of an old office chair ₦2,000");
accounts[52].explanation = "Cash sales = total cash receipts − (receipts from debtors + bank loan + capital introduced + proceeds from sale of an old office chair) = 200,000 − (120,000 + 30,000 + 10,000 + 2,000) = ₦38,000.";
accounts[63].option_b = "₦182,000";
accounts[63].option_c = "₦170,000";
accounts[63].correct_answer = "B";
accounts[63].explanation = "Closing Accumulated Fund = opening fund + entrance fees + surplus = 150,000 + 20,000 + 12,000 = ₦182,000. Purchasing a desk changes the form of assets and does not reduce the Accumulated Fund.";

const history = banks.History;
history[11].question_text = history[11].question_text.replace("Akurinu", "Ibegwu");
history[11].explanation = "The Igala people of the Niger-Benue confluence are governed by the Attah of Igala and are associated with the Ibegwu ancestral-mask tradition.";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not available");
const connection = await mysql.createConnection(databaseUrl);

try {
  await connection.beginTransaction();
  for (const [subject, questions] of Object.entries(banks)) {
    const [rows] = await connection.query(
      "SELECT id, question_text FROM jamb_questions WHERE subject = ? ORDER BY id",
      [subject]
    );
    if (rows.length !== 100) throw new Error(`${subject}: expected 100 database rows, found ${rows.length}`);

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      if (rows[index].question_text !== question.question_text && !["Mathematics", "Economics", "Geography", "Principles of Accounts", "History"].includes(subject)) {
        // Literature only changes options/explanation, so its prompt must still match exactly.
        throw new Error(`${subject}: unexpected prompt mismatch at position ${index + 1}`);
      }
      await connection.execute(
        `UPDATE jamb_questions SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ?, explanation = ?, topic = ?, country = ?, region = ? WHERE id = ?`,
        [question.question_text, question.option_a, question.option_b, question.option_c, question.option_d, question.correct_answer, question.explanation, question.topic, question.country, question.region, rows[index].id]
      );
    }
  }
  await connection.commit();

  for (const [subject, filename] of Object.entries(files)) {
    await writeFile(`${workspace}/${filename}`, JSON.stringify(banks[subject], null, 2));
  }
  const orderedSubjects = ["Mathematics", "Economics", "Government", "Geography", "Literature in English", "Commerce", "Principles of Accounts", "History"];
  const allQuestions = await Promise.all(orderedSubjects.map(async (subject) => {
    const filename = `${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jamb-100.json`;
    return JSON.parse(await readFile(`${workspace}/${filename}`, "utf8"));
  }));
  await writeFile(`${workspace}/jamb-new-subjects-validated.json`, JSON.stringify(allQuestions.flat(), null, 2));
  console.log("Applied verified JAMB quality corrections and balanced Geography answer positions.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
