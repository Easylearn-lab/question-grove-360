import { readFile, writeFile } from "node:fs/promises";

const targets = {
  Mathematics: [4, 5, 6, 7, 9, 26],
  Economics: [19, 34],
  Geography: [8],
  "Literature in English": [39],
  "Principles of Accounts": [25, 53, 64, 82],
  History: [12],
};

const output = {};
for (const [subject, positions] of Object.entries(targets)) {
  const filename = `${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-jamb-100.json`;
  const questions = JSON.parse(await readFile(`/home/ubuntu/jamb-import-workspace/${filename}`, "utf8"));
  output[subject] = positions.map((position) => ({ position, question: questions[position - 1] }));
}

await writeFile(
  "/home/ubuntu/jamb-import-workspace/jamb-quality-review-items.json",
  JSON.stringify(output, null, 2)
);
console.log("Extracted review items");
