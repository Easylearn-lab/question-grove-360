# MRCGP AKT New Batch Import Notes

## Summary
- **Total Questions:** 126 across 19 specialties
- **Files:** 20 JSON files (11 main + 9 additional)
- **Action:** Import into existing `questions` table using UPSERT to handle duplicates
- **Schema:** Same as existing questions table (no changes needed)

## Files to Import (20 total)
1. cardiovascular.json - 20 questions
2. respiratory.json - 12 questions
3. endocrinology.json - 11 questions
4. haematology_ent_psychiatry_dermatology.json - 11 questions
5. remaining_specialties.json - 23 questions
6. neurology.json - 10 questions
7. renal_urology.json - 9 questions
8. general_practice.json - 9 questions
9. musculoskeletal.json - 8 questions
10. gastroenterology.json - 7 questions
11. obstetrics_gynaecology.json - 6 questions
12. (Additional files from new batch)

## JSON Schema
Each question object has:
- `id`: Unique identifier (e.g., "QG-B2-CV-SDB-001")
- `exam`: "MRCGP AKT"
- `domain`: Specialty name (e.g., "Cardiovascular")
- `specialty`: Specific area (e.g., "Cardiovascular")
- `difficulty`: "Easy | Medium | Hard"
- `question`: Full clinical vignette text
- `options`: Nested object with keys A, B, C, D, E (each containing text)
- `correct_answer`: Single letter (A-E)
- `explanation`: Object with `correct` and `A`, `B`, `C`, `D`, `E` explanations
- `reference`: Citation/source
- `tags`: Array of tags
- `source_file`: Filename (optional)

## Database Columns (Flat Schema)
- id (INT, auto-increment) - NOT imported, auto-generated
- source_file (TEXT)
- exam (TEXT)
- domain (TEXT)
- specialty (TEXT)
- difficulty (TEXT)
- question (TEXT)
- option_a, option_b, option_c, option_d, option_e (TEXT)
- correct_answer (TEXT)
- explanation_correct (TEXT)
- explanation_a, explanation_b, explanation_c, explanation_d, explanation_e (TEXT)
- reference (TEXT)
- tags (JSON)
- status (TEXT, DEFAULT 'active')
- createdAt (TIMESTAMP, DEFAULT NOW())
- updatedAt (TIMESTAMP, DEFAULT NOW())

## Transformation Logic
1. Flatten nested options object (options.A → option_a, etc.)
2. Flatten nested explanation object (explanation.correct → explanation_correct, etc.)
3. Convert tags array to JSON string
4. Omit `id` field (let database auto-increment)
5. Set source_file to filename
6. Deduplicate by question text (if same question exists, skip)

## Import Approach
- Use UPSERT/INSERT IGNORE to handle duplicates
- Batch insert 50 questions at a time
- Log success/failure for each batch
- Verify final count matches expected total
