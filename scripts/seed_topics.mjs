import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Seed subjects
await conn.execute(`INSERT INTO topic_subjects (name, slug, icon, description, displayOrder) VALUES
  ('Biology', 'biology', '🧬', 'Explore living systems from cells to ecosystems', 1),
  ('Mathematics', 'mathematics', '📐', 'Master mathematical concepts from algebra to calculus', 2)
ON DUPLICATE KEY UPDATE name=VALUES(name)`);

const [[bioSubj]] = await conn.execute(`SELECT id FROM topic_subjects WHERE slug='biology'`);
const [[mathSubj]] = await conn.execute(`SELECT id FROM topic_subjects WHERE slug='mathematics'`);
const bioId = bioSubj.id;
const mathId = mathSubj.id;

// Biology topics
const bioTopics = [
  ['Cardiovascular System', 'cardiovascular-system', 'Heart structure, blood circulation, and the vascular system', 'medium', 1, 'Human Physiology', 'CardiovascularDiagram'],
  ['Respiratory System', 'respiratory-system', 'Lungs, gas exchange, and the mechanics of breathing', 'medium', 2, 'Human Physiology', 'RespiratoryDiagram'],
  ['Digestive System', 'digestive-system', 'Food processing from ingestion to absorption and excretion', 'medium', 3, 'Human Physiology', 'DigestiveDiagram'],
  ['Nervous System', 'nervous-system', 'Brain regions, neurons, and signal transmission', 'hard', 4, 'Human Physiology', 'NervousDiagram'],
  ['Cell Structure and Organization', 'cell-structure', 'Animal and plant cell organelles and their functions', 'easy', 5, 'Cell Biology', 'CellDiagram'],
  ['Reproduction', 'reproduction', 'Male and female reproductive systems and processes', 'medium', 6, 'Human Physiology', 'ReproductionDiagram'],
  ['Genetics and Variation', 'genetics-variation', 'DNA, inheritance patterns, and genetic variation', 'hard', 7, 'Genetics and Variation', 'GeneticsDiagram'],
  ['Ecology and Environment', 'ecology-environment', 'Food webs, energy flow, and ecosystem dynamics', 'medium', 8, 'Ecology', 'EcologyDiagram'],
];

for (const [name, slug, desc, diff, order, tag, comp] of bioTopics) {
  await conn.execute(
    `INSERT INTO topics (subjectId, name, slug, description, difficultyLevel, displayOrder, linkedQuestionTopicTag, visualizeComponent) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    [bioId, name, slug, desc, diff, order, tag, comp]
  );
}

// Math topics
const mathTopics = [
  ['Algebra', 'algebra', 'Equations, expressions, and algebraic manipulation', 'medium', 1, null, 'AlgebraTool'],
  ['Number Bases', 'number-bases', 'Binary, octal, hexadecimal conversion and arithmetic', 'medium', 2, null, 'NumberBasesTool'],
  ['Indices, Logarithms and Surds', 'indices-logarithms-surds', 'Powers, roots, and logarithmic relationships', 'hard', 3, null, 'IndicesLogsTool'],
  ['Geometry', 'geometry', 'Shapes, angles, areas, and geometric properties', 'medium', 4, null, 'GeometryTool'],
  ['Trigonometry', 'trigonometry', 'Sine, cosine, tangent and triangle relationships', 'hard', 5, null, 'TrigonometryTool'],
  ['Statistics', 'statistics', 'Mean, median, mode, standard deviation and data analysis', 'medium', 6, null, 'StatisticsTool'],
  ['Calculus Basics', 'calculus-basics', 'Differentiation, gradients, and rates of change', 'hard', 7, null, 'CalculusTool'],
  ['Sets and Probability', 'sets-probability', 'Venn diagrams, set operations, and probability theory', 'medium', 8, null, 'SetsProbabilityTool'],
];

for (const [name, slug, desc, diff, order, tag, comp] of mathTopics) {
  await conn.execute(
    `INSERT INTO topics (subjectId, name, slug, description, difficultyLevel, displayOrder, linkedQuestionTopicTag, visualizeComponent) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    [mathId, name, slug, desc, diff, order, tag, comp]
  );
}

// Get topic IDs for content seeding
const [allTopics] = await conn.execute(`SELECT id, slug FROM topics`);
const topicMap = {};
for (const t of allTopics) topicMap[t.slug] = t.id;

// Seed topic content (learn markdown + key points)
const contents = {
  'cardiovascular-system': {
    learn: `## The Cardiovascular System\n\nThe cardiovascular system consists of the **heart**, **blood vessels**, and **blood**. It is responsible for transporting oxygen, nutrients, hormones, and waste products throughout the body.\n\n### The Heart\nThe heart is a muscular organ with **four chambers**: two atria (upper) and two ventricles (lower). The right side pumps deoxygenated blood to the lungs (pulmonary circulation), while the left side pumps oxygenated blood to the body (systemic circulation).\n\n### Blood Vessels\n- **Arteries** carry blood away from the heart (thick walls, high pressure)\n- **Veins** carry blood toward the heart (thin walls, valves prevent backflow)\n- **Capillaries** are tiny vessels where gas exchange occurs\n\n### Blood Circulation\nDeoxygenated blood enters the right atrium → right ventricle → pulmonary artery → lungs → pulmonary vein → left atrium → left ventricle → aorta → body.`,
    keyPoints: ["The heart has four chambers: 2 atria and 2 ventricles", "Arteries carry blood away from the heart; veins carry blood to the heart", "Pulmonary circulation: heart ↔ lungs; Systemic circulation: heart ↔ body", "Valves prevent backflow of blood", "The left ventricle has the thickest wall as it pumps blood to the entire body"]
  },
  'respiratory-system': {
    learn: `## The Respiratory System\n\nThe respiratory system is responsible for **gas exchange** — taking in oxygen and removing carbon dioxide.\n\n### Structure\n- **Trachea (windpipe)**: Reinforced with C-shaped cartilage rings\n- **Bronchi**: Two main branches leading to each lung\n- **Bronchioles**: Smaller airways within the lungs\n- **Alveoli**: Tiny air sacs where gas exchange occurs\n\n### Gas Exchange\nAlveoli have thin walls (one cell thick), a large surface area, and a rich blood supply. Oxygen diffuses from alveoli into blood capillaries, while carbon dioxide diffuses from blood into alveoli.\n\n### Breathing Mechanics\n**Inhalation**: Diaphragm contracts (flattens), intercostal muscles contract, rib cage moves up and out, volume increases, pressure decreases.\n**Exhalation**: Diaphragm relaxes (domes up), intercostal muscles relax, rib cage moves down and in, volume decreases, pressure increases.`,
    keyPoints: ["Alveoli are the site of gas exchange in the lungs", "Gas exchange occurs by diffusion down concentration gradients", "Inhalation: diaphragm contracts, ribs move up and out, pressure decreases", "Exhalation: diaphragm relaxes, ribs move down and in, pressure increases", "Trachea is kept open by C-shaped cartilage rings"]
  },
  'digestive-system': {
    learn: `## The Digestive System\n\nThe digestive system breaks down food into nutrients that can be absorbed into the bloodstream.\n\n### Organs (in order)\n1. **Mouth**: Mechanical digestion (teeth) and chemical digestion (salivary amylase breaks down starch)\n2. **Oesophagus**: Moves food by peristalsis\n3. **Stomach**: Produces hydrochloric acid and pepsin (protein digestion)\n4. **Small intestine**: Main site of digestion and absorption. Villi increase surface area\n5. **Large intestine**: Absorbs water and minerals\n6. **Rectum/Anus**: Storage and elimination of waste\n\n### Key Enzymes\n- Amylase: starch → maltose\n- Protease/Pepsin: protein → amino acids\n- Lipase: fats → fatty acids + glycerol\n\n### The Liver and Pancreas\nThe liver produces bile (emulsifies fats). The pancreas produces digestive enzymes and releases them into the small intestine.`,
    keyPoints: ["Digestion begins in the mouth with salivary amylase", "The stomach uses HCl and pepsin for protein digestion", "The small intestine is the main site of absorption — villi increase surface area", "Bile from the liver emulsifies fats", "Peristalsis is the wave-like muscle contraction that moves food through the gut"]
  },
  'nervous-system': {
    learn: `## The Nervous System\n\nThe nervous system coordinates the body's responses to stimuli using electrical signals.\n\n### Central Nervous System (CNS)\n- **Brain**: Cerebrum (thinking, memory), cerebellum (balance, coordination), medulla oblongata (breathing, heart rate)\n- **Spinal cord**: Relay between brain and body, controls reflex actions\n\n### Peripheral Nervous System\nSensory neurons carry signals from receptors to CNS. Motor neurons carry signals from CNS to effectors (muscles/glands).\n\n### Neurons\nA neuron has a **cell body**, **dendrites** (receive signals), and an **axon** (transmits signals). The axon is insulated by a **myelin sheath** which speeds up transmission.\n\n### Synapse\nThe junction between two neurons. When an impulse arrives, neurotransmitters are released across the synaptic cleft to trigger the next neuron.\n\n### Reflex Arc\nStimulus → receptor → sensory neuron → relay neuron (in spinal cord) → motor neuron → effector → response.`,
    keyPoints: ["CNS = brain + spinal cord; PNS = sensory + motor neurons", "Cerebrum: thinking; Cerebellum: balance; Medulla: vital functions", "Neurons transmit electrical impulses along axons", "Synapses use chemical neurotransmitters to pass signals between neurons", "Reflex arcs bypass the brain for fast automatic responses"]
  },
  'cell-structure': {
    learn: `## Cell Structure and Organization\n\nAll living organisms are made of cells. There are two main types: **animal cells** and **plant cells**.\n\n### Animal Cell Organelles\n- **Nucleus**: Contains DNA, controls cell activities\n- **Cell membrane**: Controls what enters and leaves the cell\n- **Cytoplasm**: Jelly-like substance where chemical reactions occur\n- **Mitochondria**: Site of aerobic respiration (energy production)\n- **Ribosomes**: Site of protein synthesis\n- **Endoplasmic reticulum**: Transport network (rough ER has ribosomes)\n- **Golgi apparatus**: Packages and distributes proteins\n\n### Plant Cell (additional structures)\n- **Cell wall**: Rigid cellulose wall for support\n- **Chloroplasts**: Contain chlorophyll for photosynthesis\n- **Large central vacuole**: Stores cell sap, maintains turgor pressure\n\n### Levels of Organization\nCell → Tissue → Organ → Organ System → Organism`,
    keyPoints: ["Both animal and plant cells have: nucleus, cell membrane, cytoplasm, mitochondria, ribosomes", "Plant cells additionally have: cell wall, chloroplasts, large vacuole", "Mitochondria are the powerhouse of the cell (aerobic respiration)", "Chloroplasts are the site of photosynthesis in plant cells", "Organization: Cell → Tissue → Organ → Organ System → Organism"]
  },
  'reproduction': {
    learn: `## Reproduction\n\nReproduction is the biological process of producing new organisms.\n\n### Male Reproductive System\n- **Testes**: Produce sperm and testosterone\n- **Epididymis**: Stores and matures sperm\n- **Vas deferens**: Tube carrying sperm from testes\n- **Prostate gland**: Produces seminal fluid\n- **Urethra**: Passage for sperm and urine\n\n### Female Reproductive System\n- **Ovaries**: Produce eggs (ova) and hormones (oestrogen, progesterone)\n- **Fallopian tubes (oviducts)**: Where fertilization occurs\n- **Uterus (womb)**: Where the embryo develops\n- **Cervix**: Opening of the uterus\n- **Vagina**: Birth canal\n\n### Fertilization\nSperm meets egg in the fallopian tube. The fertilized egg (zygote) divides and implants in the uterine wall.\n\n### Menstrual Cycle\nA 28-day cycle controlled by hormones: FSH, LH, oestrogen, and progesterone.`,
    keyPoints: ["Testes produce sperm; ovaries produce eggs", "Fertilization occurs in the fallopian tube", "The zygote implants in the uterine wall", "The menstrual cycle is approximately 28 days", "Key hormones: FSH, LH, oestrogen, progesterone"]
  },
  'genetics-variation': {
    learn: `## Genetics and Variation\n\nGenetics is the study of heredity — how traits are passed from parents to offspring.\n\n### DNA\nDNA (deoxyribonucleic acid) is a double helix molecule found in the nucleus. It carries genetic information in the form of **genes**. A gene is a section of DNA that codes for a specific protein.\n\n### Key Terms\n- **Chromosome**: A long strand of DNA\n- **Gene**: A section of DNA coding for a trait\n- **Allele**: Different versions of a gene\n- **Genotype**: The genetic makeup (e.g., Bb)\n- **Phenotype**: The physical expression (e.g., brown eyes)\n- **Dominant**: Expressed when one copy is present (B)\n- **Recessive**: Only expressed when two copies are present (bb)\n\n### Punnett Square\nA tool to predict the probability of offspring genotypes. Cross the alleles of both parents to see possible combinations.\n\n### Variation\n- **Genetic variation**: Caused by mutations, meiosis, sexual reproduction\n- **Environmental variation**: Caused by lifestyle, diet, climate`,
    keyPoints: ["DNA is a double helix that carries genetic information", "Genes are sections of DNA that code for proteins", "Dominant alleles are expressed with one copy; recessive need two copies", "Punnett squares predict offspring genotype ratios", "Variation can be genetic, environmental, or both"]
  },
  'ecology-environment': {
    learn: `## Ecology and Environment\n\nEcology is the study of how organisms interact with each other and their environment.\n\n### Key Concepts\n- **Habitat**: Where an organism lives\n- **Population**: All organisms of one species in a habitat\n- **Community**: All populations in a habitat\n- **Ecosystem**: A community plus its physical environment\n\n### Food Chains and Webs\nA food chain shows energy flow: Producer → Primary consumer → Secondary consumer → Tertiary consumer. A food web shows interconnected food chains.\n\n### Energy Flow\nEnergy enters ecosystems through **photosynthesis** (producers). Only about 10% of energy is transferred between trophic levels — the rest is lost as heat through respiration.\n\n### Nutrient Cycling\nDecomposers break down dead organisms, returning nutrients to the soil. The carbon cycle and nitrogen cycle are key biogeochemical cycles.\n\n### Human Impact\nDeforestation, pollution, overfishing, and greenhouse gas emissions threaten biodiversity and ecosystem stability.`,
    keyPoints: ["Energy flows through ecosystems: producers → consumers → decomposers", "Only about 10% of energy transfers between trophic levels", "Food webs show interconnected food chains in an ecosystem", "Decomposers recycle nutrients back into the soil", "Human activities like deforestation and pollution threaten ecosystems"]
  },
};

// Math content
const mathContents = {
  'algebra': {
    learn: `## Algebra\n\nAlgebra uses letters and symbols to represent numbers and quantities in equations.\n\n### Key Concepts\n- **Expression**: A combination of terms (e.g., 3x + 2)\n- **Equation**: An expression set equal to something (e.g., 3x + 2 = 11)\n- **Variable**: A letter representing an unknown value\n\n### Solving Linear Equations\nIsolate the variable by performing inverse operations on both sides:\n- 3x + 2 = 11 → 3x = 9 → x = 3\n\n### Quadratic Equations\nForm: ax² + bx + c = 0. Solve by factoring, completing the square, or the quadratic formula:\nx = (-b ± √(b²-4ac)) / 2a\n\n### Simultaneous Equations\nTwo equations with two unknowns. Solve by substitution or elimination.`,
    keyPoints: ["An equation has an equals sign; an expression does not", "Solve equations by performing inverse operations on both sides", "Quadratic formula: x = (-b ± √(b²-4ac)) / 2a", "Factoring: find two numbers that multiply to ac and add to b", "Simultaneous equations can be solved by substitution or elimination"]
  },
  'number-bases': {
    learn: `## Number Bases\n\nA number base defines how many digits are used in a counting system.\n\n### Common Bases\n- **Base 10 (Decimal)**: Uses digits 0-9 (our everyday system)\n- **Base 2 (Binary)**: Uses digits 0 and 1 (used in computers)\n- **Base 8 (Octal)**: Uses digits 0-7\n- **Base 16 (Hexadecimal)**: Uses digits 0-9 and A-F\n\n### Converting Bases\n**Decimal to Binary**: Repeatedly divide by 2, read remainders bottom-up.\n**Binary to Decimal**: Multiply each digit by its place value (powers of 2) and sum.\n\n### Arithmetic in Other Bases\nAddition and subtraction follow the same rules as base 10, but carry/borrow at the base value instead of 10.`,
    keyPoints: ["Base 10 uses 0-9; Base 2 uses 0-1; Base 16 uses 0-F", "To convert decimal to binary: divide by 2, read remainders upward", "To convert binary to decimal: sum (digit × 2^position)", "Arithmetic in other bases follows the same rules but carries at the base value", "Hexadecimal: A=10, B=11, C=12, D=13, E=14, F=15"]
  },
  'indices-logarithms-surds': {
    learn: `## Indices, Logarithms and Surds\n\n### Index Laws\n- aᵐ × aⁿ = aᵐ⁺ⁿ\n- aᵐ ÷ aⁿ = aᵐ⁻ⁿ\n- (aᵐ)ⁿ = aᵐⁿ\n- a⁰ = 1\n- a⁻ⁿ = 1/aⁿ\n- a^(1/n) = ⁿ√a\n\n### Logarithms\nIf aˣ = b, then log_a(b) = x. Logarithms are the inverse of indices.\n- log(ab) = log(a) + log(b)\n- log(a/b) = log(a) - log(b)\n- log(aⁿ) = n·log(a)\n\n### Surds\nA surd is an irrational root (e.g., √2). Simplify by finding perfect square factors:\n√12 = √(4×3) = 2√3\n\nRationalise the denominator: 1/√2 = √2/2`,
    keyPoints: ["aᵐ × aⁿ = aᵐ⁺ⁿ and aᵐ ÷ aⁿ = aᵐ⁻ⁿ", "a⁰ = 1 and a⁻ⁿ = 1/aⁿ", "Logarithm is the inverse of an index: if aˣ = b then log_a(b) = x", "Simplify surds by extracting perfect square factors", "Rationalise denominators by multiplying by the conjugate"]
  },
  'geometry': {
    learn: `## Geometry\n\nGeometry deals with shapes, sizes, angles, and properties of space.\n\n### Angles\n- Acute: < 90°, Right: 90°, Obtuse: 90°-180°, Reflex: > 180°\n- Angles on a straight line = 180°\n- Angles at a point = 360°\n- Vertically opposite angles are equal\n\n### Triangles\n- Sum of interior angles = 180°\n- Area = ½ × base × height\n- Types: equilateral (60°,60°,60°), isosceles (two equal), scalene (all different)\n\n### Circles\n- Circumference = 2πr = πd\n- Area = πr²\n- Arc length = (θ/360) × 2πr\n- Sector area = (θ/360) × πr²\n\n### Quadrilaterals\n- Rectangle: A = l × w, P = 2(l+w)\n- Parallelogram: A = b × h\n- Trapezium: A = ½(a+b) × h`,
    keyPoints: ["Angles in a triangle sum to 180°; angles at a point sum to 360°", "Area of triangle = ½ × base × height", "Circle: C = 2πr, A = πr²", "Pythagoras' theorem: a² + b² = c² (right-angled triangles)", "Vertically opposite angles are equal"]
  },
  'trigonometry': {
    learn: `## Trigonometry\n\nTrigonometry relates angles to side lengths in triangles.\n\n### SOH-CAH-TOA\nFor a right-angled triangle:\n- **sin(θ)** = Opposite / Hypotenuse\n- **cos(θ)** = Adjacent / Hypotenuse\n- **tan(θ)** = Opposite / Adjacent\n\n### Finding Sides\nIf you know an angle and one side, use trig ratios to find the others.\n\n### Finding Angles\nUse inverse functions: θ = sin⁻¹(O/H), θ = cos⁻¹(A/H), θ = tan⁻¹(O/A)\n\n### Special Angles\n- sin(30°) = 0.5, cos(30°) = √3/2, tan(30°) = 1/√3\n- sin(45°) = √2/2, cos(45°) = √2/2, tan(45°) = 1\n- sin(60°) = √3/2, cos(60°) = 0.5, tan(60°) = √3`,
    keyPoints: ["SOH-CAH-TOA: sin = O/H, cos = A/H, tan = O/A", "Use inverse trig functions to find angles", "sin(30°) = 0.5, sin(45°) = √2/2, sin(60°) = √3/2", "The hypotenuse is always the longest side, opposite the right angle", "Trigonometry works with right-angled triangles"]
  },
  'statistics': {
    learn: `## Statistics\n\nStatistics involves collecting, organizing, and analysing data.\n\n### Measures of Central Tendency\n- **Mean**: Sum of all values ÷ number of values\n- **Median**: Middle value when data is ordered\n- **Mode**: Most frequently occurring value\n\n### Measures of Spread\n- **Range**: Highest value - lowest value\n- **Standard deviation**: Measures how spread out values are from the mean\n- **Variance**: The square of the standard deviation\n\n### Data Presentation\n- Bar charts, histograms, pie charts, frequency tables\n- Cumulative frequency curves for finding median and quartiles\n\n### Probability from Data\nProbability = Number of favourable outcomes / Total number of outcomes`,
    keyPoints: ["Mean = sum of values ÷ count; Median = middle value; Mode = most common", "Range = highest - lowest value", "Standard deviation measures spread from the mean", "Probability = favourable outcomes / total outcomes", "Cumulative frequency helps find median, quartiles, and interquartile range"]
  },
  'calculus-basics': {
    learn: `## Calculus Basics\n\nCalculus studies rates of change (differentiation) and accumulation (integration).\n\n### Differentiation\nThe derivative measures the **rate of change** of a function — the gradient of the curve at any point.\n\n**Power Rule**: If y = xⁿ, then dy/dx = nxⁿ⁻¹\n\nExamples:\n- y = x³ → dy/dx = 3x²\n- y = 5x² → dy/dx = 10x\n- y = 4 → dy/dx = 0 (constant)\n\n### Applications\n- Finding the gradient at a specific point\n- Finding maximum and minimum points (where dy/dx = 0)\n- Determining if a stationary point is a max or min (second derivative test)\n\n### Integration (reverse of differentiation)\n∫xⁿ dx = xⁿ⁺¹/(n+1) + C\n\nIntegration finds the area under a curve.`,
    keyPoints: ["Differentiation finds the gradient (rate of change) of a curve", "Power rule: if y = xⁿ then dy/dx = nxⁿ⁻¹", "Stationary points occur where dy/dx = 0", "Integration is the reverse of differentiation", "∫xⁿ dx = xⁿ⁺¹/(n+1) + C"]
  },
  'sets-probability': {
    learn: `## Sets and Probability\n\n### Sets\nA set is a collection of distinct objects. Notation: A = {1, 2, 3}\n\n**Operations**:\n- **Union (A ∪ B)**: All elements in A or B or both\n- **Intersection (A ∩ B)**: Elements in both A and B\n- **Complement (A')**: Elements not in A\n- **Difference (A - B)**: Elements in A but not in B\n\n### Venn Diagrams\nVisual representation of sets showing overlapping regions.\n\n### Probability\n- P(event) = favourable outcomes / total outcomes\n- 0 ≤ P(event) ≤ 1\n- P(A') = 1 - P(A)\n- P(A ∪ B) = P(A) + P(B) - P(A ∩ B)\n\n### Independent Events\nP(A and B) = P(A) × P(B) if events are independent.\n\n### Conditional Probability\nP(A|B) = P(A ∩ B) / P(B)`,
    keyPoints: ["Union (∪) combines all elements; Intersection (∩) finds common elements", "P(event) = favourable outcomes / total outcomes", "P(A ∪ B) = P(A) + P(B) - P(A ∩ B)", "For independent events: P(A and B) = P(A) × P(B)", "Venn diagrams visually represent set relationships"]
  },
};

// Insert topic content
for (const [slug, content] of Object.entries({...contents, ...mathContents})) {
  const topicId = topicMap[slug];
  if (!topicId) { console.log(`Skipping ${slug} — no topic found`); continue; }
  await conn.execute(
    `INSERT INTO topic_content (topicId, learnContentMarkdown, keyPointsJson) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE learnContentMarkdown=VALUES(learnContentMarkdown), keyPointsJson=VALUES(keyPointsJson)`,
    [topicId, content.learn, JSON.stringify(content.keyPoints)]
  );
}

console.log('Topics and content seeded successfully');

// Seed spelling words (200 words, 50 per category)
const spellingData = [
  // General Vocabulary (50)
  ['accommodate','General Vocabulary','hard','accommodate','Has double c and double m'],
  ['acknowledgement','General Vocabulary','hard','acknowledgement','Ends in -ment'],
  ['acquisition','General Vocabulary','hard','acquisition','Contains -qui-'],
  ['apparently','General Vocabulary','medium','apparently','Ends in -ently'],
  ['argument','General Vocabulary','medium','argument','No e after the u'],
  ['beautiful','General Vocabulary','easy','beautiful','Beau-ti-ful'],
  ['beginning','General Vocabulary','medium','beginning','Double n in the middle'],
  ['believe','General Vocabulary','easy','believe','i before e'],
  ['calendar','General Vocabulary','medium','calendar','Ends in -ar not -er'],
  ['cemetery','General Vocabulary','hard','cemetery','All e vowels'],
  ['colleague','General Vocabulary','medium','colleague','Ends in -eague'],
  ['committee','General Vocabulary','hard','committee','Double m, double t, double e'],
  ['conscience','General Vocabulary','hard','conscience','Contains -sci-'],
  ['conscious','General Vocabulary','medium','conscious','Contains -sci-'],
  ['definitely','General Vocabulary','medium','definitely','Contains -ite- not -ate-'],
  ['disappear','General Vocabulary','medium','disappear','One s, two p'],
  ['embarrass','General Vocabulary','hard','embarrass','Double r, double s'],
  ['environment','General Vocabulary','medium','environment','Contains -iron-'],
  ['exaggerate','General Vocabulary','hard','exaggerate','Double g'],
  ['existence','General Vocabulary','medium','existence','Ends in -ence'],
  ['experience','General Vocabulary','medium','experience','Ends in -ence'],
  ['foreign','General Vocabulary','medium','foreign','e before i (exception)'],
  ['government','General Vocabulary','medium','government','Contains -ern-'],
  ['guarantee','General Vocabulary','hard','guarantee','Starts with gua-'],
  ['harass','General Vocabulary','medium','harass','One r, double s'],
  ['immediately','General Vocabulary','medium','immediately','Ends in -ately'],
  ['independent','General Vocabulary','medium','independent','Ends in -ent'],
  ['intelligence','General Vocabulary','medium','intelligence','Ends in -ence'],
  ['jewellery','General Vocabulary','hard','jewellery','Double l, ends in -ery'],
  ['knowledge','General Vocabulary','medium','knowledge','Silent k'],
  ['lieutenant','General Vocabulary','hard','lieutenant','Contains -ieu-'],
  ['maintenance','General Vocabulary','hard','maintenance','Contains -ten-'],
  ['millennium','General Vocabulary','hard','millennium','Double l, double n'],
  ['miniature','General Vocabulary','hard','miniature','Contains -ia-'],
  ['miscellaneous','General Vocabulary','hard','miscellaneous','Contains -sce- and -eous'],
  ['necessary','General Vocabulary','medium','necessary','One c, double s'],
  ['noticeable','General Vocabulary','medium','noticeable','Keep the e before -able'],
  ['occasion','General Vocabulary','medium','occasion','Double c, one s'],
  ['occurrence','General Vocabulary','hard','occurrence','Double c, double r'],
  ['parliament','General Vocabulary','hard','parliament','Contains -ia-'],
  ['perseverance','General Vocabulary','hard','perseverance','Ends in -ance'],
  ['privilege','General Vocabulary','hard','privilege','No d, ends in -ege'],
  ['pronunciation','General Vocabulary','hard','pronunciation','No o after the n'],
  ['questionnaire','General Vocabulary','hard','questionnaire','Double n'],
  ['receive','General Vocabulary','easy','receive','e before i after c'],
  ['recommend','General Vocabulary','medium','recommend','One c, double m'],
  ['separate','General Vocabulary','medium','separate','Contains -par- not -per-'],
  ['successful','General Vocabulary','medium','successful','Double c, double s'],
  ['surprise','General Vocabulary','medium','surprise','Contains -rpri-'],
  ['tomorrow','General Vocabulary','easy','tomorrow','One m, double r'],
  // Science Terms (50)
  ['photosynthesis','Science Terms','medium','photosynthesis','Photo (light) + synthesis (making)'],
  ['mitochondria','Science Terms','hard','mitochondria','Powerhouse of the cell'],
  ['chromosome','Science Terms','medium','chromosome','Chromo (colour) + some (body)'],
  ['ecosystem','Science Terms','medium','ecosystem','Eco + system'],
  ['evaporation','Science Terms','medium','evaporation','Ends in -ation'],
  ['hypothesis','Science Terms','hard','hypothesis','Starts with hypo-'],
  ['molecule','Science Terms','medium','molecule','Ends in -cule'],
  ['nucleus','Science Terms','medium','nucleus','Ends in -eus'],
  ['organism','Science Terms','medium','organism','Ends in -ism'],
  ['respiration','Science Terms','medium','respiration','Ends in -ation'],
  ['acceleration','Science Terms','hard','acceleration','Double c'],
  ['algorithm','Science Terms','hard','algorithm','Contains -rithm'],
  ['anaerobic','Science Terms','hard','anaerobic','An-aer-obic'],
  ['biodegradable','Science Terms','hard','biodegradable','Bio-degrad-able'],
  ['carbohydrate','Science Terms','medium','carbohydrate','Carbo-hydrate'],
  ['centrifugal','Science Terms','hard','centrifugal','Centri-fugal'],
  ['chlorophyll','Science Terms','hard','chlorophyll','Double l at end'],
  ['combustion','Science Terms','medium','combustion','Ends in -tion'],
  ['condensation','Science Terms','medium','condensation','Ends in -ation'],
  ['crystallisation','Science Terms','hard','crystallisation','Double l, ends in -ation'],
  ['decomposition','Science Terms','hard','decomposition','De-compo-sition'],
  ['diffusion','Science Terms','medium','diffusion','Double f'],
  ['electrolysis','Science Terms','hard','electrolysis','Electro-lysis'],
  ['equilibrium','Science Terms','hard','equilibrium','Equi-librium'],
  ['fermentation','Science Terms','medium','fermentation','Ends in -ation'],
  ['fluorescence','Science Terms','hard','fluorescence','Contains -uo- and -sce-'],
  ['gravitational','Science Terms','medium','gravitational','Gravi-tational'],
  ['haemoglobin','Science Terms','hard','haemoglobin','Starts with haemo-'],
  ['immunisation','Science Terms','hard','immunisation','Double m, ends in -ation'],
  ['invertebrate','Science Terms','medium','invertebrate','In-vertebrate'],
  ['kinetic','Science Terms','medium','kinetic','Starts with kin-'],
  ['metamorphosis','Science Terms','hard','metamorphosis','Meta-morpho-sis'],
  ['neutralisation','Science Terms','hard','neutralisation','Neutral-isation'],
  ['oscillation','Science Terms','hard','oscillation','Double l'],
  ['oxidation','Science Terms','medium','oxidation','Oxi-dation'],
  ['parallelogram','Science Terms','hard','parallelogram','Double l'],
  ['peristalsis','Science Terms','hard','peristalsis','Peri-stalsis'],
  ['photovoltaic','Science Terms','hard','photovoltaic','Photo-voltaic'],
  ['precipitation','Science Terms','hard','precipitation','Pre-cipi-tation'],
  ['radioactive','Science Terms','medium','radioactive','Radio-active'],
  ['semiconductor','Science Terms','hard','semiconductor','Semi-conductor'],
  ['sublimation','Science Terms','hard','sublimation','Subli-mation'],
  ['symbiosis','Science Terms','hard','symbiosis','Sym-bio-sis'],
  ['thermometer','Science Terms','medium','thermometer','Thermo-meter'],
  ['ultraviolet','Science Terms','medium','ultraviolet','Ultra-violet'],
  ['vaccination','Science Terms','medium','vaccination','Double c'],
  ['vertebrate','Science Terms','medium','vertebrate','Verte-brate'],
  ['wavelength','Science Terms','medium','wavelength','Wave-length'],
  ['xerophyte','Science Terms','hard','xerophyte','Xero-phyte'],
  ['zoology','Science Terms','medium','zoology','Zoo-logy'],
  // Geography Terms (50)
  ['archipelago','Geography Terms','hard','archipelago','Contains -pel-'],
  ['atmosphere','Geography Terms','medium','atmosphere','Atmo-sphere'],
  ['biodiversity','Geography Terms','hard','biodiversity','Bio-diversity'],
  ['cartography','Geography Terms','hard','cartography','Carto-graphy'],
  ['continental','Geography Terms','medium','continental','Conti-nental'],
  ['deforestation','Geography Terms','hard','deforestation','De-forest-ation'],
  ['desertification','Geography Terms','hard','desertification','Desert-ification'],
  ['earthquake','Geography Terms','medium','earthquake','Earth-quake'],
  ['equatorial','Geography Terms','hard','equatorial','Equa-torial'],
  ['erosion','Geography Terms','medium','erosion','Ends in -sion'],
  ['geographical','Geography Terms','hard','geographical','Geo-graphical'],
  ['glacier','Geography Terms','medium','glacier','Ends in -ier'],
  ['hemisphere','Geography Terms','medium','hemisphere','Hemi-sphere'],
  ['hurricane','Geography Terms','medium','hurricane','Double r'],
  ['irrigation','Geography Terms','hard','irrigation','Double r'],
  ['latitude','Geography Terms','medium','latitude','Lati-tude'],
  ['longitude','Geography Terms','medium','longitude','Longi-tude'],
  ['Mediterranean','Geography Terms','hard','Mediterranean','Double r'],
  ['meteorology','Geography Terms','hard','meteorology','Meteor-ology'],
  ['monsoon','Geography Terms','medium','monsoon','Double o'],
  ['peninsula','Geography Terms','hard','peninsula','Pen-insula'],
  ['plateau','Geography Terms','medium','plateau','Ends in -eau'],
  ['precipitation','Geography Terms','hard','precipitation','Pre-cipi-tation'],
  ['reservoir','Geography Terms','hard','reservoir','Ends in -oir'],
  ['savannah','Geography Terms','medium','savannah','Double n, ends in -ah'],
  ['seismograph','Geography Terms','hard','seismograph','Seismo-graph'],
  ['stratosphere','Geography Terms','hard','stratosphere','Strato-sphere'],
  ['subterranean','Geography Terms','hard','subterranean','Sub-terr-anean'],
  ['temperature','Geography Terms','medium','temperature','Temper-ature'],
  ['topography','Geography Terms','hard','topography','Topo-graphy'],
  ['tributary','Geography Terms','hard','tributary','Tribu-tary'],
  ['tropical','Geography Terms','medium','tropical','Tropi-cal'],
  ['tsunami','Geography Terms','hard','tsunami','Silent t'],
  ['tundra','Geography Terms','medium','tundra','Tun-dra'],
  ['urbanisation','Geography Terms','hard','urbanisation','Urban-isation'],
  ['vegetation','Geography Terms','medium','vegetation','Vege-tation'],
  ['volcanic','Geography Terms','medium','volcanic','Volcan-ic'],
  ['watershed','Geography Terms','medium','watershed','Water-shed'],
  ['weathering','Geography Terms','medium','weathering','Weather-ing'],
  ['wilderness','Geography Terms','medium','wilderness','Wilder-ness'],
  ['agriculture','Geography Terms','medium','agriculture','Agri-culture'],
  ['avalanche','Geography Terms','medium','avalanche','Ava-lanche'],
  ['barometer','Geography Terms','hard','barometer','Baro-meter'],
  ['catastrophe','Geography Terms','hard','catastrophe','Cata-strophe'],
  ['circumference','Geography Terms','hard','circumference','Circum-ference'],
  ['confluence','Geography Terms','hard','confluence','Con-fluence'],
  ['demographic','Geography Terms','hard','demographic','Demo-graphic'],
  ['environment','Geography Terms','medium','environment','Environ-ment'],
  ['geothermal','Geography Terms','hard','geothermal','Geo-thermal'],
  ['hydrological','Geography Terms','hard','hydrological','Hydro-logical'],
  // Commonly Misspelled (50)
  ['absence','Commonly Misspelled','medium','absence','Ends in -ence'],
  ['acceptable','Commonly Misspelled','medium','acceptable','Ends in -able'],
  ['accidentally','Commonly Misspelled','hard','accidentally','Ends in -ally'],
  ['achieve','Commonly Misspelled','easy','achieve','i before e'],
  ['across','Commonly Misspelled','easy','across','One c, double s? No — one c, one s'],
  ['amateur','Commonly Misspelled','hard','amateur','Ends in -eur'],
  ['apparent','Commonly Misspelled','medium','apparent','Double p'],
  ['basically','Commonly Misspelled','medium','basically','Basic-ally'],
  ['boundary','Commonly Misspelled','medium','boundary','Bound-ary'],
  ['business','Commonly Misspelled','medium','business','Contains -usi-'],
  ['category','Commonly Misspelled','medium','category','Cate-gory'],
  ['changeable','Commonly Misspelled','hard','changeable','Keep the e before -able'],
  ['collectible','Commonly Misspelled','hard','collectible','Ends in -ible'],
  ['committed','Commonly Misspelled','medium','committed','Double t'],
  ['completely','Commonly Misspelled','medium','completely','Complete-ly'],
  ['controversial','Commonly Misspelled','hard','controversial','Contro-versial'],
  ['correspondence','Commonly Misspelled','hard','correspondence','Double r, ends in -ence'],
  ['curiosity','Commonly Misspelled','medium','curiosity','Curi-osity'],
  ['deceive','Commonly Misspelled','medium','deceive','e before i after c'],
  ['desperate','Commonly Misspelled','hard','desperate','Contains -per- not -par-'],
  ['dilemma','Commonly Misspelled','hard','dilemma','Double m'],
  ['discipline','Commonly Misspelled','hard','discipline','Contains -sci-'],
  ['eighth','Commonly Misspelled','hard','eighth','Contains -ghth'],
  ['eligible','Commonly Misspelled','hard','eligible','Ends in -ible'],
  ['equipped','Commonly Misspelled','hard','equipped','Double p'],
  ['especially','Commonly Misspelled','medium','especially','Especi-ally'],
  ['exhilarate','Commonly Misspelled','hard','exhilarate','Contains -hil-'],
  ['fascinate','Commonly Misspelled','hard','fascinate','Contains -sci-'],
  ['February','Commonly Misspelled','medium','February','Contains first r'],
  ['fiery','Commonly Misspelled','hard','fiery','Not firey'],
  ['grateful','Commonly Misspelled','medium','grateful','Grate-ful not great-ful'],
  ['height','Commonly Misspelled','medium','height','Ends in -ght'],
  ['humorous','Commonly Misspelled','hard','humorous','Humor-ous (no u before r)'],
  ['ignorance','Commonly Misspelled','medium','ignorance','Ignor-ance'],
  ['indispensable','Commonly Misspelled','hard','indispensable','Ends in -able'],
  ['inoculate','Commonly Misspelled','hard','inoculate','One n, one c'],
  ['irresistible','Commonly Misspelled','hard','irresistible','Ends in -ible'],
  ['liaison','Commonly Misspelled','hard','liaison','Contains -iai-'],
  ['manoeuvre','Commonly Misspelled','hard','manoeuvre','Contains -oeu-'],
  ['mischievous','Commonly Misspelled','hard','mischievous','No i after the v'],
  ['neighbour','Commonly Misspelled','medium','neighbour','Contains -eigh-'],
  ['occasionally','Commonly Misspelled','hard','occasionally','Double c, one s, double l'],
  ['parallel','Commonly Misspelled','hard','parallel','Double l in the middle'],
  ['particularly','Commonly Misspelled','medium','particularly','Particular-ly'],
  ['possession','Commonly Misspelled','hard','possession','Double s twice'],
  ['preferred','Commonly Misspelled','medium','preferred','Double r'],
  ['publicly','Commonly Misspelled','hard','publicly','No -ally, just -ly'],
  ['rhythm','Commonly Misspelled','hard','rhythm','No vowels'],
  ['schedule','Commonly Misspelled','medium','schedule','Starts with sch-'],
  ['weird','Commonly Misspelled','medium','weird','e before i (exception)'],
];

// Insert spelling words
for (const [word, cat, diff, pron, hint] of spellingData) {
  await conn.execute(
    `INSERT INTO spelling_words (word, category, difficultyLevel, audioPronunciationText, hint) VALUES (?, ?, ?, ?, ?)`,
    [word, cat, diff, pron, hint]
  );
}

console.log(`Inserted ${spellingData.length} spelling words`);

await conn.end();
console.log('Done!');
