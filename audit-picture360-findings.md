# Picture360 Audit Findings

## 1. picture360_images table

- Total rows: 23
- Specialties: Dermatology (16), Ophthalmology (7)
- All 23 records have status = 'active'
- All 23 records have URLs in format: https://placehold.co/600x400?text=...
- These are PLACEHOLDER URLs (placehold.co), NOT real hosted images
- Note: The grep for 'placeholder' missed these because the URL uses 'placehold.co' not 'placeholder'

### Sample row structure:
- id, examId, specialty, conditionName, imageUrl, keyFeatures, examPearl
- optionA, optionB, optionC, optionD, correctAnswer, explanation
- status, createdAt
