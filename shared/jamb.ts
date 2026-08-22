export const JAMB_ATTEMPT_EXAM_ID = 70003;
export const JAMB_EXAM_CODE = "JAMB-UTME";

export const JAMB_SUBJECTS = [
  {
    name: "English Language",
    slug: "english-language",
    icon: "📖",
    description: "Comprehension, lexis and structure, oral English, and writing skills.",
    compulsory: true,
  },
  {
    name: "Mathematics",
    slug: "mathematics",
    icon: "➗",
    description: "Number work, algebra, geometry, trigonometry, calculus, and statistics.",
    compulsory: true,
  },
  {
    name: "Biology",
    slug: "biology",
    icon: "🧬",
    description: "Cell biology, genetics, ecology, evolution, and human physiology.",
    compulsory: false,
  },
  {
    name: "Chemistry",
    slug: "chemistry",
    icon: "⚗️",
    description: "Organic, inorganic, and physical chemistry for JAMB UTME.",
    compulsory: false,
  },
  {
    name: "Physics",
    slug: "physics",
    icon: "⚡",
    description: "Mechanics, waves, electricity, magnetism, and modern physics.",
    compulsory: false,
  },
  {
    name: "Economics",
    slug: "economics",
    icon: "📈",
    description: "Economic principles, microeconomics, macroeconomics, and applied economics.",
    compulsory: false,
  },
  {
    name: "Government",
    slug: "government",
    icon: "🏛️",
    description: "Government systems, Nigerian political development, and international relations.",
    compulsory: false,
  },
  {
    name: "Geography",
    slug: "geography",
    icon: "🌍",
    description: "Practical, physical, human, and regional geography.",
    compulsory: false,
  },
  {
    name: "Literature in English",
    slug: "literature-in-english",
    icon: "📚",
    description: "Literary appreciation, drama, prose, poetry, and prescribed-text skills.",
    compulsory: false,
  },
  {
    name: "Commerce",
    slug: "commerce",
    icon: "🛍️",
    description: "Trade, business organisations, finance, marketing, and consumer protection.",
    compulsory: false,
  },
  {
    name: "Principles of Accounts",
    slug: "principles-of-accounts",
    icon: "🧾",
    description: "Bookkeeping, double entry, final accounts, and financial control.",
    compulsory: false,
  },
  {
    name: "History",
    slug: "history",
    icon: "🏺",
    description: "Nigerian, African, and global historical developments.",
    compulsory: false,
  },
] as const;

export type JambSubject = (typeof JAMB_SUBJECTS)[number]["name"];
export type JambSubjectSlug = (typeof JAMB_SUBJECTS)[number]["slug"];

export const JAMB_SUBJECT_ORDER = JAMB_SUBJECTS.map((subject) => subject.name);

export function getJambSubjectBySlug(slug: string | undefined) {
  return JAMB_SUBJECTS.find((subject) => subject.slug === slug);
}

export const JAMB_PAYMENT_PLANS = {
  monthly: {
    amountMinor: 150000,
    label: "Monthly",
    displayAmount: 1500,
    intervalLabel: "per month",
  },
  quarterly: {
    amountMinor: 400000,
    label: "Quarterly",
    displayAmount: 4000,
    intervalLabel: "every 3 months",
    savingsLabel: "Save 11%",
  },
} as const;

export type JambPlanKey = keyof typeof JAMB_PAYMENT_PLANS;
