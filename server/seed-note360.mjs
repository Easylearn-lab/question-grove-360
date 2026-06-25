import mysql from "mysql2/promise";

const NOTE360_CONTENT = [
  {
    specialty: "Cardiovascular",
    notes: [
      {
        title: "Hypertension Management",
        niceGuideline: "NG136",
        niceUrl: "https://www.nice.org.uk/guidance/ng136",
        content: `Diagnosis / Thresholds:
- BP ≥140/90 mmHg (NICE NG136)
- Home BP monitoring: ≥135/85 mmHg
- Ambulatory BP monitoring: ≥130/80 mmHg

First-line treatment:
- Lifestyle modifications (weight loss, salt reduction, exercise)
- ACE inhibitor or ARB for patients <55 years
- Calcium channel blocker or thiazide for patients ≥55 years

Second-line / escalation:
- Add second agent if BP not controlled
- Add third agent (usually a diuretic) if needed
- Consider specialist referral for resistant hypertension

Key targets:
- <140/90 mmHg for most patients
- <130/80 mmHg for high-risk patients (diabetes, CKD, CVD)

Referral criteria:
- Resistant hypertension (uncontrolled on 3+ drugs)
- Secondary hypertension suspected
- Hypertensive emergency`,
        examPearl: "ACE inhibitors first-line for <55 years; CCB/thiazide for older patients",
      },
      {
        title: "Acute Coronary Syndrome",
        niceGuideline: "NG185",
        niceUrl: "https://www.nice.org.uk/guidance/ng185",
        content: `Diagnosis / Thresholds:
- Chest pain + troponin elevation or ECG changes
- STEMI: ST elevation in ≥2 contiguous leads
- NSTEMI: Troponin elevation without ST elevation

First-line treatment:
- Dual antiplatelet therapy (aspirin + P2Y12 inhibitor)
- Anticoagulation (LMWH or fondaparinux)
- Beta-blocker, ACE inhibitor, statin
- PCI within 120 minutes for STEMI

Second-line / escalation:
- Inotropes for cardiogenic shock
- Mechanical circulatory support if needed

Key targets:
- Troponin normalization
- LVEF recovery

Referral criteria:
- All ACS patients to cardiology
- Cardiogenic shock to ICU`,
        examPearl: "PCI within 120 minutes for STEMI; dual antiplatelet therapy mandatory",
      },
      {
        title: "Heart Failure with Reduced Ejection Fraction",
        niceGuideline: "NG196",
        niceUrl: "https://www.nice.org.uk/guidance/ng196",
        content: `Diagnosis / Thresholds:
- LVEF ≤40%
- Symptoms of heart failure (dyspnea, fatigue, orthopnea)
- BNP >35 pg/mL or NT-proBNP >125 pg/mL

First-line treatment:
- ACE inhibitor or ARB
- Beta-blocker (bisoprolol, carvedilol, metoprolol)
- MRA (spironolactone or eplerenone)

Second-line / escalation:
- Add SGLT2 inhibitor (dapagliflozin, empagliflozin)
- Add hydralazine + nitrate if ACE-I intolerant
- Ivabradine if HR >70 bpm on beta-blocker

Key targets:
- LVEF improvement
- Symptom relief
- Reduced hospitalization

Referral criteria:
- Acute decompensation
- Cardiogenic shock
- Need for device therapy (CRT, ICD)`,
        examPearl: "ACE-I/ARB + beta-blocker + MRA + SGLT2i is current standard therapy",
      },
      {
        title: "Atrial Fibrillation",
        niceGuideline: "NG180",
        niceUrl: "https://www.nice.org.uk/guidance/ng180",
        content: `Diagnosis / Thresholds:
- Irregular pulse + irregular RR on ECG
- AF on 12-lead ECG or Holter monitoring

First-line treatment:
- Rate control: Beta-blocker or calcium channel blocker
- Anticoagulation: DOACs preferred (apixaban, edoxaban, dabigatran, rivaroxaban)
- Warfarin if DOAC contraindicated

Second-line / escalation:
- Rhythm control if symptomatic (amiodarone preferred)
- Catheter ablation for symptomatic AF

Key targets:
- Heart rate 110-140 bpm (lenient control acceptable)
- Stroke prevention with anticoagulation

Referral criteria:
- Symptomatic AF uncontrolled on rate control
- Haemodynamic instability
- Consideration for ablation`,
        examPearl: "NICE recommends rate control as first-line; DOACs preferred for stroke prevention",
      },
      {
        title: "Angina Pectoris",
        niceGuideline: "NG126",
        niceUrl: "https://www.nice.org.uk/guidance/ng126",
        content: `Diagnosis / Thresholds:
- Chest pain on exertion, relieved by rest or GTN
- ECG changes or positive stress test

First-line treatment:
- Beta-blocker or calcium channel blocker for symptom relief
- Aspirin 75 mg daily
- High-intensity statin
- ACE inhibitor

Second-line / escalation:
- Add long-acting nitrate if inadequate control
- Consider ranolazine
- Revascularization (PCI or CABG) if high-risk features

Key targets:
- Symptom relief
- Reduction in anginal episodes

Referral criteria:
- Unstable angina
- High-risk features
- Consideration for revascularization`,
        examPearl: "Beta-blockers or CCBs for symptom relief; aspirin and statin essential",
      },
    ],
  },
  {
    specialty: "Respiratory",
    notes: [
      {
        title: "Asthma Management",
        niceGuideline: "NG80",
        niceUrl: "https://www.nice.org.uk/guidance/ng80",
        content: `Diagnosis / Thresholds:
- Recurrent symptoms: wheeze, breathlessness, chest tightness, cough
- Variability in symptoms
- Reversible airflow obstruction on spirometry (FEV1 improvement ≥12%)

First-line treatment:
- Step 1: ICS inhaler (beclomethasone, fluticasone)
- Step 2: ICS + LABA (combination inhaler)
- Step 3: ICS + LABA + LTRA or increase ICS dose

Second-line / escalation:
- Step 4: ICS + LABA + LTRA + LAMA
- Step 5: Biologic therapy (omalizumab, mepolizumab, reslizumab)

Key targets:
- FEV1 >80% predicted
- ACQ score <0.75
- No exacerbations

Referral criteria:
- Uncontrolled asthma despite high-dose ICS
- Frequent exacerbations
- Severe asthma phenotypes`,
        examPearl: "ICS-formoterol as reliever preferred; avoid SABA monotherapy",
      },
      {
        title: "COPD Management",
        niceGuideline: "NG115",
        niceUrl: "https://www.nice.org.uk/guidance/ng115",
        content: `Diagnosis / Thresholds:
- FEV1/FVC <0.70
- Gold classification: FEV1 <80% predicted
- Exacerbation history

First-line treatment:
- Smoking cessation
- Pulmonary rehabilitation
- LAMA or LABA monotherapy for mild disease
- LAMA + LABA for moderate disease

Second-line / escalation:
- Add ICS if exacerbations (LAMA + LABA + ICS)
- Roflumilast for frequent exacerbators
- Long-term oxygen therapy if SpO2 <88%

Key targets:
- FEV1 stabilization
- Reduced exacerbation frequency
- Improved exercise capacity

Referral criteria:
- Frequent exacerbations
- Consideration for lung volume reduction
- Lung transplant evaluation`,
        examPearl: "LAMA + LABA preferred over ICS monotherapy; smoking cessation essential",
      },
      {
        title: "Pneumonia Management",
        niceGuideline: "NG191",
        niceUrl: "https://www.nice.org.uk/guidance/ng191",
        content: `Diagnosis / Thresholds:
- Cough, fever, dyspnea
- Consolidation on CXR
- Elevated inflammatory markers

First-line treatment:
- Community-acquired pneumonia: Amoxicillin or doxycycline
- Severe/hospitalized: Ceftriaxone + macrolide
- Atypical coverage if risk factors present

Second-line / escalation:
- Fluoroquinolone if beta-lactam allergy
- Broader spectrum if severe or ICU admission

Key targets:
- Clinical improvement within 48-72 hours
- Radiological resolution

Referral criteria:
- Severe pneumonia (CURB-65 ≥3)
- ICU admission if CURB-65 ≥4 or complications`,
        examPearl: "NICE recommends amoxicillin for community-acquired pneumonia",
      },
    ],
  },
  {
    specialty: "Gastroenterology",
    notes: [
      {
        title: "Peptic Ulcer Disease",
        niceGuideline: "NG1",
        niceUrl: "https://www.nice.org.uk/guidance/ng1",
        content: `Diagnosis / Thresholds:
- Epigastric pain + endoscopic ulcer
- H. pylori positive or NSAID use

First-line treatment:
- H. pylori eradication: PPI + amoxicillin + clarithromycin (7-14 days)
- NSAID cessation
- PPI for 4-8 weeks

Second-line / escalation:
- Bismuth-based triple therapy if clarithromycin resistance
- Quadruple therapy if first-line fails

Key targets:
- H. pylori eradication
- Ulcer healing

Referral criteria:
- Refractory ulcers
- Complications (perforation, bleeding)`,
        examPearl: "Triple therapy with PPI + amoxicillin + clarithromycin is standard",
      },
      {
        title: "Inflammatory Bowel Disease",
        niceGuideline: "NG12",
        niceUrl: "https://www.nice.org.uk/guidance/ng12",
        content: `Diagnosis / Thresholds:
- Crohn's disease or ulcerative colitis on colonoscopy
- Elevated inflammatory markers
- Symptoms: diarrhea, abdominal pain, blood in stool

First-line treatment:
- Induction: Corticosteroids (prednisolone 40-60 mg daily)
- Maintenance: 5-ASA agents (mesalazine)
- Azathioprine or 6-MP for steroid-dependent disease

Second-line / escalation:
- TNF-alpha inhibitors (infliximab, adalimumab)
- Vedolizumab or ustekinumab for inadequate response

Key targets:
- Remission (clinical and endoscopic)
- Reduced hospitalization

Referral criteria:
- Severe disease
- Complications (perforation, toxic megacolon)
- Consideration for biologic therapy`,
        examPearl: "Corticosteroids for induction; 5-ASA for maintenance in UC",
      },
    ],
  },
  {
    specialty: "Neurology",
    notes: [
      {
        title: "Epilepsy Management",
        niceGuideline: "NG137",
        niceUrl: "https://www.nice.org.uk/guidance/ng137",
        content: `Diagnosis / Thresholds:
- ≥2 unprovoked seizures or 1 seizure + high recurrence risk
- EEG abnormalities supporting diagnosis

First-line treatment:
- Levetiracetam, lamotrigine, or sodium valproate
- Avoid valproate in women of childbearing potential

Second-line / escalation:
- Add second AED if monotherapy fails
- Combination therapy if inadequate control

Key targets:
- Seizure freedom
- Minimal side effects

Referral criteria:
- Diagnostic uncertainty
- Drug-resistant epilepsy
- Status epilepticus`,
        examPearl: "Levetiracetam preferred first-line; avoid valproate in women",
      },
      {
        title: "Migraine Management",
        niceGuideline: "NG202",
        niceUrl: "https://www.nice.org.uk/guidance/ng202",
        content: `Diagnosis / Thresholds:
- Recurrent headaches with nausea/photophobia/phonophobia
- ≥4 hours duration
- ≥4 days per month for chronic migraine

First-line treatment:
- Acute: Triptans (sumatriptan) or NSAIDs
- Prophylaxis: Propranolol, topiramate, or amitriptyline

Second-line / escalation:
- Monoclonal antibodies (erenumab, fremanezumab) for chronic migraine
- Botulinum toxin for chronic migraine

Key targets:
- Reduced migraine frequency
- Improved quality of life

Referral criteria:
- Chronic migraine unresponsive to prophylaxis
- Atypical features`,
        examPearl: "Triptans effective for acute migraine; propranolol for prophylaxis",
      },
    ],
  },
  {
    specialty: "Paediatrics",
    notes: [
      {
        title: "Childhood Asthma",
        niceGuideline: "NG143",
        niceUrl: "https://www.nice.org.uk/guidance/ng143",
        content: `Diagnosis / Thresholds:
- Recurrent wheeze, cough, or breathlessness
- Reversible airflow obstruction on spirometry

First-line treatment:
- Step 1: ICS inhaler (beclomethasone 100-200 mcg BD)
- Step 2: ICS + LABA
- Step 3: High-dose ICS + LABA

Second-line / escalation:
- Biologic therapy for severe asthma

Key targets:
- No daytime symptoms
- No night-time awakening
- Normal lung function

Referral criteria:
- Uncontrolled asthma
- Severe exacerbations
- Diagnostic uncertainty`,
        examPearl: "ICS is gold standard; avoid SABA monotherapy",
      },
    ],
  },
  {
    specialty: "Dermatology",
    notes: [
      {
        title: "Psoriasis Management",
        niceGuideline: "NG153",
        niceUrl: "https://www.nice.org.uk/guidance/ng153",
        content: `Diagnosis / Thresholds:
- Erythematous plaques with silvery scale
- Auspitz sign positive
- Koebner phenomenon

First-line treatment:
- Topical corticosteroids (potency based on site)
- Topical calcineurin inhibitors for face/intertriginous areas
- Vitamin D analogues

Second-line / escalation:
- Phototherapy (UVB or PUVA)
- Systemic therapy: Methotrexate, acitretin, ciclosporin
- Biologic therapy: TNF-alpha inhibitors, IL-17/IL-23 inhibitors

Key targets:
- Clearance of lesions
- Improved quality of life

Referral criteria:
- Moderate-to-severe disease
- Failure of topical therapy`,
        examPearl: "Topical corticosteroids first-line; biologic therapy for severe disease",
      },
    ],
  },
  {
    specialty: "Musculoskeletal",
    notes: [
      {
        title: "Rheumatoid Arthritis",
        niceGuideline: "NG100",
        niceUrl: "https://www.nice.org.uk/guidance/ng100",
        content: `Diagnosis / Thresholds:
- ≥3 joints swollen for ≥6 weeks
- Elevated RF or anti-CCP
- Elevated ESR/CRP

First-line treatment:
- DMARDs: Methotrexate (first-line)
- Add biologic if inadequate response (TNF-alpha inhibitor)
- NSAIDs for symptom relief
- Low-dose corticosteroids

Second-line / escalation:
- Switch or add second biologic
- Consider JAK inhibitors

Key targets:
- Low disease activity or remission
- Functional improvement

Referral criteria:
- Early RA for DMARD initiation
- Inadequate response to therapy`,
        examPearl: "Early DMARD therapy improves outcomes; methotrexate is first-line",
      },
    ],
  },
  {
    specialty: "Endocrinology",
    notes: [
      {
        title: "Type 2 Diabetes Management",
        niceGuideline: "NG28",
        niceUrl: "https://www.nice.org.uk/guidance/ng28",
        content: `Diagnosis / Thresholds:
- Fasting glucose ≥7.0 mmol/L or HbA1c ≥47 mmol/mol
- 2-hour glucose ≥11.1 mmol/L on OGTT

First-line treatment:
- Lifestyle: Diet, exercise, weight loss
- Metformin (if not contraindicated)
- Add GLP-1 RA or SGLT2i if cardiovascular risk

Second-line / escalation:
- Add second agent if HbA1c not at target
- Insulin if multiple agents fail

Key targets:
- HbA1c <53 mmol/mol (7%)
- Cardiovascular risk reduction

Referral criteria:
- Diabetic complications
- Difficult-to-control diabetes`,
        examPearl: "Metformin first-line; GLP-1 RA preferred if cardiovascular disease",
      },
    ],
  },
  {
    specialty: "Renal & Urology",
    notes: [
      {
        title: "Chronic Kidney Disease",
        niceGuideline: "NG203",
        niceUrl: "https://www.nice.org.uk/guidance/ng203",
        content: `Diagnosis / Thresholds:
- eGFR <60 mL/min/1.73m² or albuminuria
- Persistent for >3 months

First-line treatment:
- ACE inhibitor or ARB (first-line for albuminuria)
- Blood pressure control (<120 mmHg)
- Statins for cardiovascular protection
- Avoid NSAIDs

Second-line / escalation:
- SGLT2 inhibitors for CKD progression
- Finerenone for albuminuria

Key targets:
- Slow CKD progression
- Cardiovascular risk reduction
- Blood pressure <120 mmHg

Referral criteria:
- eGFR <30 mL/min/1.73m²
- Rapid decline
- Complications`,
        examPearl: "ACE-I/ARB first-line for albuminuria; SGLT2i slows progression",
      },
    ],
  },
  {
    specialty: "Obstetrics & Gynaecology",
    notes: [
      {
        title: "Gestational Diabetes",
        niceGuideline: "NG63",
        niceUrl: "https://www.nice.org.uk/guidance/ng63",
        content: `Diagnosis / Thresholds:
- Fasting glucose 5.1-6.9 mmol/L or 2-hour glucose 8.5-11.0 mmol/L on OGTT

First-line treatment:
- Dietary modification
- Physical activity
- Blood glucose monitoring

Second-line / escalation:
- Metformin if lifestyle measures fail
- Insulin if metformin ineffective

Key targets:
- Fasting glucose <5.3 mmol/L
- 2-hour glucose <6.9 mmol/L

Referral criteria:
- Inadequate glycemic control
- Delivery planning`,
        examPearl: "Lifestyle modification first-line; metformin preferred agent",
      },
    ],
  },
  {
    specialty: "Ophthalmology",
    notes: [
      {
        title: "Diabetic Retinopathy",
        niceGuideline: "NG81",
        niceUrl: "https://www.nice.org.uk/guidance/ng81",
        content: `Diagnosis / Thresholds:
- Microaneurysms, hemorrhages, exudates on fundoscopy
- Macular edema on OCT

First-line treatment:
- Glycemic control (HbA1c <53 mmol/mol)
- Blood pressure control
- Statin therapy

Second-line / escalation:
- Anti-VEGF injections (ranibizumab, bevacizumab) for macular edema
- Laser photocoagulation for proliferative disease

Key targets:
- Prevention of vision loss
- Regression of retinopathy

Referral criteria:
- Any retinopathy
- Macular edema
- Proliferative disease`,
        examPearl: "Glycemic control is primary prevention; anti-VEGF for macular edema",
      },
    ],
  },
  {
    specialty: "Haematology",
    notes: [
      {
        title: "Iron Deficiency Anaemia",
        niceGuideline: "NG14",
        niceUrl: "https://www.nice.org.uk/guidance/ng14",
        content: `Diagnosis / Thresholds:
- Hemoglobin <130 g/L (men) or <120 g/L (women)
- MCV <80 fL
- Ferritin <15 mcg/L

First-line treatment:
- Identify and treat underlying cause
- Oral iron (ferrous sulfate 200 mg BD)
- Dietary counseling

Second-line / escalation:
- IV iron if oral intolerant or ineffective
- Blood transfusion if symptomatic

Key targets:
- Hemoglobin >130 g/L
- Iron stores replenished

Referral criteria:
- Refractory anemia
- Unclear etiology`,
        examPearl: "Identify cause first; oral iron is first-line treatment",
      },
    ],
  },
  {
    specialty: "Pharmacology & Prescribing",
    notes: [
      {
        title: "Drug Interactions and Polypharmacy",
        niceGuideline: "NG5",
        niceUrl: "https://www.nice.org.uk/guidance/ng5",
        content: `Key Principles:
- Review all medications regularly
- Minimize number of drugs
- Check for interactions using BNF

Common High-Risk Interactions:
- ACE-I + NSAIDs + diuretics (renal impairment)
- Warfarin + NSAIDs (bleeding risk)
- Metformin + contrast (lactic acidosis)
- Statins + fibrates (myopathy)

Management:
- Use BNF/electronic prescribing systems
- Monitor for adverse effects
- Patient education

Key targets:
- Appropriate prescribing
- Reduced adverse events

Referral criteria:
- Complex polypharmacy
- Adverse drug reactions`,
        examPearl: "Always check BNF for interactions; review medications regularly",
      },
    ],
  },
  {
    specialty: "Ethics & Organisational",
    notes: [
      {
        title: "Consent and Capacity",
        niceGuideline: "GMC Good Medical Practice 2024",
        niceUrl: "https://www.gmc-uk.org/registration-and-licensing/the-medical-register/good-medical-practice",
        content: `Key Principles (GMC 2024):
- Obtain informed consent before treatment
- Assess capacity using Mental Capacity Act 2005
- Respect patient autonomy

Capacity Assessment:
- Can patient understand information?
- Can patient retain information?
- Can patient weigh information?
- Can patient communicate decision?

If Lacking Capacity:
- Act in best interests
- Consult family/carers
- Consider advance directives
- Involve Mental Capacity Act assessor if needed

Key targets:
- Ethical practice
- Patient autonomy respected

Referral criteria:
- Capacity concerns
- Complex ethical issues`,
        examPearl: "Always assess capacity; respect patient autonomy; act in best interests",
      },
    ],
  },
  {
    specialty: "General Practice",
    notes: [
      {
        title: "Acute Bacterial Infection Management",
        niceGuideline: "NICE Antimicrobial Guidance",
        niceUrl: "https://www.nice.org.uk/guidance",
        content: `Key Principles:
- Only prescribe antibiotics for bacterial infections
- Use narrow-spectrum agents when possible
- Avoid unnecessary antibiotics

Common Infections:
- UTI: Nitrofurantoin or trimethoprim
- Respiratory: Amoxicillin or doxycycline
- Skin: Flucloxacillin or erythromycin

Duration:
- Most infections: 5-7 days
- Longer courses only if indicated

Key targets:
- Cure of infection
- Reduced antibiotic resistance

Referral criteria:
- Severe infections
- Immunocompromised patients`,
        examPearl: "Narrow-spectrum agents preferred; shorter courses reduce resistance",
      },
    ],
  },
  {
    specialty: "Statistics & EBM",
    notes: [
      {
        title: "Evidence-Based Medicine Principles",
        niceGuideline: "NICE Evidence Standards Framework",
        niceUrl: "https://www.nice.org.uk/guidance",
        content: `Key Concepts:
- Hierarchy of evidence: RCT > observational > case reports
- Number Needed to Treat (NNT): Patients to treat to prevent 1 adverse event
- Number Needed to Harm (NNH): Patients to treat to cause 1 adverse event
- Relative Risk (RR) vs Absolute Risk Reduction (ARR)

Critical Appraisal:
- Study design appropriate?
- Sample size adequate?
- Randomization adequate?
- Blinding used?
- Follow-up complete?

Application:
- Use best available evidence
- Consider patient preferences
- Individualize treatment

Key targets:
- Evidence-based practice
- Improved patient outcomes

Referral criteria:
- Complex clinical decisions`,
        examPearl: "NNT and NNH more clinically useful than RR; consider absolute risk",
      },
    ],
  },
  {
    specialty: "Infectious Disease",
    notes: [
      {
        title: "COVID-19 Management",
        niceGuideline: "NG191",
        niceUrl: "https://www.nice.org.uk/guidance/ng191",
        content: `Diagnosis / Thresholds:
- Cough, fever, loss of taste/smell
- PCR or antigen positive

First-line treatment:
- Supportive care (fluids, paracetamol)
- Isolation for 5 days if symptomatic

Second-line / escalation:
- Antivirals (nirmatrelvir/ritonavir) if high-risk
- Oxygen if SpO2 <94%
- Dexamethasone if hypoxic

Key targets:
- Clinical improvement
- Reduced mortality

Referral criteria:
- Severe disease
- ICU admission if respiratory failure`,
        examPearl: "Antivirals within 5 days for high-risk; supportive care for mild disease",
      },
    ],
  },
];

async function seedNote360() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(dbUrl);

  try {
    console.log("Starting Note360 seed...");

    for (const specialty of NOTE360_CONTENT) {
      for (const note of specialty.notes) {
        const query = `
          INSERT INTO notes (examId, specialty, title, content, niceGuideline, niceUrl, lastUpdated)
          VALUES (1, ?, ?, ?, ?, ?, NOW())
        `;

        await connection.execute(query, [
          specialty.specialty,
          note.title,
          note.content,
          note.niceGuideline,
          note.niceUrl,
        ]);

        console.log(`✓ Added: ${specialty.specialty} - ${note.title}`);
      }
    }

    console.log("✅ Note360 seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding Note360:", error);
  } finally {
    await connection.end();
  }
}

seedNote360();
