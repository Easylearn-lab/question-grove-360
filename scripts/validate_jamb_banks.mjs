import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = "/home/ubuntu/generate_jamb_subject_banks.json";
const outputDirectory = "/home/ubuntu/jamb-import-workspace";
const expectedSubjects = [
  "Mathematics",
  "Economics",
  "Government",
  "Geography",
  "Literature in English",
  "Commerce",
  "Principles of Accounts",
  "History",
];

const requiredFields = [
  "subject",
  "topic",
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_answer",
  "explanation",
  "country",
  "region",
];

function normalized(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function validateQuestion(question, expectedSubject, position) {
  const errors = [];
  for (const field of requiredFields) {
    if (typeof question[field] !== "string" || !question[field].trim()) {
      errors.push(`Question ${position}: ${field} is missing or blank`);
    }
  }

  if (question.subject !== expectedSubject) {
    errors.push(`Question ${position}: subject must be ${expectedSubject}`);
  }
  if (!["A", "B", "C", "D"].includes(question.correct_answer)) {
    errors.push(`Question ${position}: correct_answer must be A, B, C, or D`);
  }
  if (question.country !== "Nigeria" || question.region !== "West Africa") {
    errors.push(`Question ${position}: country/region must be Nigeria/West Africa`);
  }

  const options = [question.option_a, question.option_b, question.option_c, question.option_d].map(normalized);
  if (new Set(options).size !== 4) {
    errors.push(`Question ${position}: answer options must be distinct`);
  }
  if (String(question.question_text ?? "").trim().length < 15) {
    errors.push(`Question ${position}: question_text is too short`);
  }
  if (String(question.explanation ?? "").trim().length < 20) {
    errors.push(`Question ${position}: explanation is too short`);
  }

  return errors;
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const results = manifest.results ?? [];
  const manifestSubjects = results.map((entry) => entry.output?.subject);
  const missingSubjects = expectedSubjects.filter((subject) => !manifestSubjects.includes(subject));
  if (missingSubjects.length) {
    throw new Error(`Missing generated files for: ${missingSubjects.join(", ")}`);
  }

  await mkdir(outputDirectory, { recursive: true });
  const combined = [];
  const validation = [];

  for (const subject of expectedSubjects) {
    const entry = results.find((result) => result.output?.subject === subject);
    const response = await fetch(entry.output.content_file);
    if (!response.ok) {
      throw new Error(`Could not download ${subject} bank: HTTP ${response.status}`);
    }

    const questions = await response.json();
    const errors = [];
    if (!Array.isArray(questions) || questions.length !== 100) {
      errors.push(`${subject}: expected exactly 100 questions, received ${Array.isArray(questions) ? questions.length : "non-array"}`);
    }

    const seenQuestions = new Set();
    questions.forEach((question, index) => {
      errors.push(...validateQuestion(question, subject, index + 1));
      const signature = normalized(question.question_text);
      if (seenQuestions.has(signature)) {
        errors.push(`${subject}: duplicate question text at position ${index + 1}`);
      }
      seenQuestions.add(signature);
    });

    if (errors.length) {
      throw new Error(`Validation failed for ${subject}:\n${errors.slice(0, 25).join("\n")}`);
    }

    const filename = `${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jamb-100.json`;
    await writeFile(path.join(outputDirectory, filename), JSON.stringify(questions, null, 2));
    combined.push(...questions);
    validation.push({ subject, count: questions.length, sourceNotes: entry.output.source_notes });
  }

  await writeFile(
    path.join(outputDirectory, "jamb-new-subjects-validated.json"),
    JSON.stringify(combined, null, 2)
  );
  await writeFile(
    path.join(outputDirectory, "jamb-new-subjects-validation.json"),
    JSON.stringify({ total: combined.length, banks: validation }, null, 2)
  );

  console.log(JSON.stringify({ status: "valid", total: combined.length, banks: validation.map(({ subject, count }) => ({ subject, count })) }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
