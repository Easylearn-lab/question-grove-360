import 'dotenv/config';
import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const url = new URL(DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '4000'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true },
});

// Load the search results
const data = JSON.parse(readFileSync('/home/ubuntu/find_clinical_images.json', 'utf8'));
const results = data.results;

// Map input strings to condition names (the input format is "Specialty - Condition details")
// We need to match these to the conditionName in the database
const conditionMap = {
  'Dermatology - Impetigo': 'Impetigo',
  'Dermatology - Herpes Zoster': 'Herpes Zoster',
  'Dermatology - Herpes Simplex oral': 'Herpes Simplex',
  'Dermatology - Molluscum Contagiosum': 'Molluscum Contagiosum',
  'Dermatology - Erythema Multiforme target lesions': 'Erythema Multiforme',
  'Dermatology - Stevens-Johnson Syndrome': 'Stevens-Johnson Syndrome',
  'Dermatology - Seborrhoeic Dermatitis face': 'Seborrhoeic Dermatitis',
  'Dermatology - Tinea Capitis scalp': 'Tinea Capitis',
  'Dermatology - Tinea Versicolor pityriasis': 'Tinea Versicolor',
  'Dermatology - Onychomycosis fungal nail': 'Onychomycosis',
  'Dermatology - Pemphigus Vulgaris blisters': 'Pemphigus Vulgaris',
  'Dermatology - Pyoderma Gangrenosum ulcer': 'Pyoderma Gangrenosum',
  'Dermatology - Erythema Nodosum shins': 'Erythema Nodosum',
  'Dermatology - Alopecia Areata patch': 'Alopecia Areata',
  'Dermatology - Hidradenitis Suppurativa axilla': 'Hidradenitis Suppurativa',
  'Dermatology - Actinic Keratosis sun damage': 'Actinic Keratosis',
  'Dermatology - Drug Rash Morbilliform': 'Drug Rash Morbilliform',
  'Dermatology - Necrotising Fasciitis': 'Necrotising Fasciitis',
  'Dermatology - Keratoacanthoma dome shaped': 'Keratoacanthoma',
  'Dermatology - Kaposi Sarcoma violaceous lesions': 'Kaposi Sarcoma',
  'Ophthalmology - Optic Neuritis fundoscopy': 'Optic Neuritis',
  'Ophthalmology - Retinitis Pigmentosa fundus': 'Retinitis Pigmentosa',
  'Ophthalmology - Blepharitis eyelid': 'Blepharitis',
  'Ophthalmology - Dacryocystitis lacrimal sac': 'Dacryocystitis',
  'Ophthalmology - Periorbital Cellulitis': 'Periorbital Cellulitis',
  'Ophthalmology - Orbital Cellulitis proptosis': 'Orbital Cellulitis',
  'Ophthalmology - Xanthelasma eyelid': 'Xanthelasma',
  'Ophthalmology - Entropion eyelid': 'Entropion',
  'Ophthalmology - Ectropion eyelid': 'Ectropion',
  'Ophthalmology - Pinguecula eye': 'Pinguecula',
  'Ophthalmology - Anisocoria unequal pupils': 'Anisocoria',
  'Ophthalmology - Argyll Robertson Pupil': 'Argyll Robertson Pupil',
  'Ophthalmology - Holmes-Adie tonic Pupil': 'Holmes-Adie Pupil',
  'Ophthalmology - Leukocoria white pupil reflex': 'Leukocoria',
  'Ophthalmology - Nystagmus eye movement': 'Nystagmus',
  'Ophthalmology - Trachoma eye infection': 'Trachoma',
  'Ophthalmology - Coloboma iris defect': 'Coloboma',
  'Ophthalmology - Trichiasis ingrown eyelash': 'Trichiasis',
  'Ophthalmology - Strabismus squint': 'Strabismus',
  'Ophthalmology - Amblyopia lazy eye': 'Amblyopia',
  'ECG - Sinus Bradycardia electrocardiogram': 'Sinus Bradycardia',
  'ECG - Sinus Tachycardia electrocardiogram': 'Sinus Tachycardia',
  'ECG - Pericarditis ECG saddle ST elevation': 'Pericarditis',
  'ECG - Pulmonary Embolism S1Q3T3 ECG': 'Pulmonary Embolism S1Q3T3 pattern',
  'ECG - Brugada Syndrome ECG pattern': 'Brugada Syndrome',
  'ECG - Left Ventricular Hypertrophy ECG': 'Left Ventricular Hypertrophy',
  'ECG - Right Ventricular Hypertrophy ECG': 'Right Ventricular Hypertrophy',
  'ECG - Hypothermia Osborn J waves ECG': 'Hypothermia Osborn J waves',
  'ECG - Hypercalcaemia short QT ECG': 'Hypercalcaemia',
  'ECG - Hypertrophic Cardiomyopathy ECG': 'Hypertrophic Cardiomyopathy',
  'ENT - Acoustic Neuroma MRI cerebellopontine angle': 'Acoustic Neuroma',
  'ENT - Otosclerosis audiogram': 'Otosclerosis',
  'ENT - Parotid Gland Tumour swelling': 'Parotid Gland Tumour',
  'ENT - Submandibular Gland Stone sialolithiasis': 'Submandibular Gland Stone',
  'ENT - Ludwig Angina submandibular swelling': "Ludwig's Angina",
  'ENT - Laryngeal Carcinoma laryngoscopy': 'Laryngeal Carcinoma',
  'ENT - Sinusitis CT scan paranasal': 'Sinusitis on imaging',
  'ENT - Angiofibroma nasopharyngeal': 'Angiofibroma',
  'ENT - Zenker Diverticulum barium swallow': "Zenker's Diverticulum",
  'ENT - Periorbital Cellulitis from sinusitis child': 'Periorbital Cellulitis from Sinusitis',
  'Chest X-ray - Bronchiectasis tram track sign': 'Bronchiectasis',
  'Chest X-ray - Aspiration Pneumonia right lower lobe': 'Aspiration Pneumonia',
  'Chest X-ray - Lung Abscess air fluid level': 'Lung Abscess',
  'Chest X-ray - Diaphragmatic Hernia bowel in chest': 'Diaphragmatic Hernia',
  'Chest X-ray - Thoracic Aortic Aneurysm widened mediastinum': 'Aortic Aneurysm',
  'Chest X-ray - Mediastinal Widening lymphoma': 'Mediastinal Widening',
  'Chest X-ray - Atelectasis lobar collapse': 'Atelectasis',
  'Chest X-ray - Foreign Body Inhalation child hyperinflation': 'Foreign Body Inhalation',
  'Chest X-ray - Empyema loculated pleural effusion': 'Empyema',
  'Chest X-ray - Pancoast Tumour apical mass': 'Pancoast Tumour',
  'Paediatrics - Eczema Herpeticum child': 'Eczema Herpeticum',
  'Paediatrics - Mumps parotid swelling child': 'Mumps',
  'Paediatrics - Rubella rash child': 'Rubella',
  'Paediatrics - Pertussis whooping cough child': 'Pertussis',
  'Paediatrics - Rickets bowed legs child': 'Rickets',
  'Paediatrics - Osteogenesis Imperfecta blue sclera': 'Osteogenesis Imperfecta',
  'Paediatrics - Down Syndrome facial features child': 'Down Syndrome facial features',
  'Paediatrics - Turner Syndrome webbed neck': 'Turner Syndrome',
  'Paediatrics - Neonatal Jaundice yellow baby': 'Neonatal Jaundice',
  'Paediatrics - Congenital Hypothyroidism newborn': 'Congenital Hypothyroidism',
};

let updated = 0;
let failed = 0;

for (const result of results) {
  const input = result.input;
  const imageUrl = result.output?.image_url;
  const conditionName = conditionMap[input];

  if (!conditionName) {
    console.error('No mapping for:', input);
    failed++;
    continue;
  }

  if (!imageUrl || !imageUrl.startsWith('http')) {
    console.error('No valid URL for:', conditionName);
    failed++;
    continue;
  }

  try {
    const [result2] = await conn.execute(
      'UPDATE picture360_images SET imageUrl = ? WHERE conditionName = ? AND imageUrl LIKE ?',
      [imageUrl, conditionName, '%placeholder%']
    );
    if (result2.affectedRows > 0) {
      updated++;
      console.log('OK:', conditionName);
    } else {
      console.error('No match found for:', conditionName);
      failed++;
    }
  } catch (err) {
    console.error('DB error for', conditionName, ':', err.message.slice(0, 100));
    failed++;
  }
}

console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);

// Verify
const [remaining] = await conn.execute("SELECT COUNT(*) as cnt FROM picture360_images WHERE imageUrl LIKE '%placeholder%'");
console.log('Remaining placeholders:', remaining[0].cnt);

await conn.end();
process.exit(0);
