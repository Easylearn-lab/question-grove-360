import { db } from "./server/db";
import fs from "fs";

const sql = fs.readFileSync("/tmp/plab1_surgery_batch1_clean.sql", "utf-8");

async function importBatch() {
  try {
    console.log("Importing Surgery Batch 1...");
    // Execute raw SQL
    const result = await db.raw(sql);
    console.log("Import successful!");
  } catch (err) {
    console.error("Import failed:", err);
  }
}

importBatch();
