import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const manifest = JSON.parse(await readFile("/home/ubuntu/review_jamb_subject_banks.json", "utf8"));
const outputDirectory = "/home/ubuntu/jamb-import-workspace/reviews";
await mkdir(outputDirectory, { recursive: true });

for (const result of manifest.results ?? []) {
  const subject = result.output?.subject;
  const reviewUrl = result.output?.review_file;
  if (!subject || !reviewUrl) continue;
  const response = await fetch(reviewUrl);
  if (!response.ok) throw new Error(`Could not download review for ${subject}`);
  const review = await response.json();
  const filename = `${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  await writeFile(path.join(outputDirectory, filename), JSON.stringify(review, null, 2));
}

console.log(`Saved ${manifest.results?.length ?? 0} quality reviews to ${outputDirectory}`);
