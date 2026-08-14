/**
 * Stripe Products and Pricing Configuration
 * Two exam tracks: AKT (active) and SCA (coming soon)
 * Two billing tiers per track: 3-month (£20) and 6-month (£35)
 * Monthly rate (£7.99/month) is shown as reference only to highlight the discount.
 *
 * Price IDs are stored for both test and live mode.
 * The correct ID is selected at runtime based on the STRIPE_SECRET_KEY prefix.
 */

export type ExamTrack = "AKT" | "SCA" | "MSRA" | "PLAB1";

export const PAYMENT_ENABLED: Record<ExamTrack, boolean> = {
  AKT: true,   // Live and active
  SCA: true,   // Live — 60 cases available
  MSRA: true,  // Live and active
  PLAB1: true, // Live and active
};

export const AKT_FEATURES = [
  "Full AKT question bank access",
  "Note360 study notes (AKT)",
  "Pattern recognition flashcards",
  "AI Coach360 assistant",
  "Unlimited mock AKT exams",
  "Priority support",
];

export const SCA_FEATURES = [
  "60 SCA consultation cases",
  "Note360 study notes (SCA)",
  "SCA consultation simulator",
  "AI Coach360 assistant",
  "Unlimited mock SCA consultations",
  "Priority support",
];

export const MSRA_FEATURES = [
  "Clinical Problem Solving question bank (SBA + EMQ)",
  "Professional Dilemmas practice (Ranking + Pick 3)",
  "MSRA flashcards with spaced repetition",
  "AI Coach360 assistant",
  "Full mock MSRA exams",
  "Priority support",
];

export const PLAB1_FEATURES = [
  "648+ PLAB1 SBA questions across 8 specialties",
  "Full-length 180-question mock exams (3-hour timer)",
  "Topic-level filtering and analytics",
  "Spaced repetition and weak-topic targeting",
  "AI Coach360 assistant",
  "Priority support",
];

// Detect if we're running in live mode based on the Stripe key
function isLiveMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || "";
  return key.startsWith("sk_live_");
}

// Price IDs for both modes
const PRICE_IDS = {
  AKT_3MONTH: {
    test: "price_1Tj1epIVrH3MHAvaSQrfCd0l",
    live: "price_1Tj1ctIVrH3MHAvaTRmgqVsw",
  },
  AKT_6MONTH: {
    test: "price_1Tj1eqIVrH3MHAvaw910M1Yo",
    live: "price_1Tj1ctIVrH3MHAvag6I5W549",
  },
  SCA_3MONTH: {
    test: "price_1Tj1eqIVrH3MHAvabRzSv4wr",
    live: "price_1Tj1ctIVrH3MHAvaJolIHylh",
  },
  SCA_6MONTH: {
    test: "price_1Tj1eqIVrH3MHAvaSeVG3yMu",
    live: "price_1Tj1ctIVrH3MHAvaDMZPapav",
  },
  PICTURE360: {
    test: "price_picture360_test",
    live: "price_picture360_live",
  },
  MSRA_3MONTH: {
    test: "price_1U2fTZIVrH3MHAvapPeNeGPp",
    live: "price_1U2fTZIVrH3MHAvapPeNeGPp",
  },
  MSRA_6MONTH: {
    test: "price_1U2fVPIVrH3MHAvahldKVigf",
    live: "price_1U2fVPIVrH3MHAvahldKVigf",
  },
  PLAB1_3MONTH: {
    test: "price_1U4LSZIVrH3MHAvaXMUMNs6H",
    live: "price_1U4LSZIVrH3MHAvaXMUMNs6H",
  },
  PLAB1_6MONTH: {
    test: "price_1U4LSZIVrH3MHAvayjScAE0r",
    live: "price_1U4LSZIVrH3MHAvayjScAE0r",
  },
};

function getPriceId(planKey: keyof typeof PRICE_IDS): string {
  const mode = isLiveMode() ? "live" : "test";
  return PRICE_IDS[planKey][mode];
}

export const SUBSCRIPTION_PLANS = {
  AKT_3MONTH: {
    name: "AKT 3-Month Access",
    description: "Great for focused exam sprints",
    price: 20,
    monthlyEquivalent: 6.67,
    monthlyReference: 7.99,
    fullPrice: 23.97, // £7.99 × 3
    savings: 3.97,
    interval: "3 months" as const,
    intervalCount: 3,
    examTrack: "AKT" as ExamTrack,
    get stripePriceId() { return getPriceId("AKT_3MONTH"); },
  },
  AKT_6MONTH: {
    name: "AKT 6-Month Access",
    description: "Ideal study timeline — best value",
    price: 35,
    monthlyEquivalent: 5.83,
    monthlyReference: 7.99,
    fullPrice: 47.94, // £7.99 × 6
    savings: 12.94,
    interval: "6 months" as const,
    intervalCount: 6,
    examTrack: "AKT" as ExamTrack,
    get stripePriceId() { return getPriceId("AKT_6MONTH"); },
    popular: true,
  },
  SCA_3MONTH: {
    name: "SCA 3-Month Access",
    description: "Great for focused exam sprints",
    price: 20,
    monthlyEquivalent: 6.67,
    monthlyReference: 7.99,
    fullPrice: 23.97, // £7.99 × 3
    savings: 3.97,
    interval: "3 months" as const,
    intervalCount: 3,
    examTrack: "SCA" as ExamTrack,
    get stripePriceId() { return getPriceId("SCA_3MONTH"); },
  },
  SCA_6MONTH: {
    name: "SCA 6-Month Access",
    description: "Ideal study timeline — best value",
    price: 35,
    monthlyEquivalent: 5.83,
    monthlyReference: 7.99,
    fullPrice: 47.94, // £7.99 × 6
    savings: 12.94,
    interval: "6 months" as const,
    intervalCount: 6,
    examTrack: "SCA" as ExamTrack,
    get stripePriceId() { return getPriceId("SCA_6MONTH"); },
    popular: true,
  },
  MSRA_3MONTH: {
    name: "MSRA 3-Month Access",
    description: "Great for focused exam sprints",
    price: 25,
    monthlyEquivalent: 8.33,
    monthlyReference: 9.99,
    fullPrice: 29.97, // £9.99 × 3
    savings: 4.97,
    interval: "3 months" as const,
    intervalCount: 3,
    examTrack: "MSRA" as ExamTrack,
    get stripePriceId() { return getPriceId("MSRA_3MONTH"); },
  },
  MSRA_6MONTH: {
    name: "MSRA 6-Month Access",
    description: "Ideal study timeline — best value",
    price: 40,
    monthlyEquivalent: 6.67,
    monthlyReference: 9.99,
    fullPrice: 59.94, // £9.99 × 6
    savings: 19.94,
    interval: "6 months" as const,
    intervalCount: 6,
    examTrack: "MSRA" as ExamTrack,
    get stripePriceId() { return getPriceId("MSRA_6MONTH"); },
    popular: true,
  },
  PLAB1_3MONTH: {
    name: "PLAB1 3-Month Access",
    description: "Great for focused exam sprints",
    price: 20,
    monthlyEquivalent: 6.67,
    monthlyReference: 7.99,
    fullPrice: 23.97,
    savings: 3.97,
    interval: "3 months" as const,
    intervalCount: 3,
    examTrack: "PLAB1" as ExamTrack,
    get stripePriceId() { return getPriceId("PLAB1_3MONTH"); },
  },
  PLAB1_6MONTH: {
    name: "PLAB1 6-Month Access",
    description: "Ideal study timeline — best value",
    price: 35,
    monthlyEquivalent: 5.83,
    monthlyReference: 7.99,
    fullPrice: 47.94,
    savings: 12.94,
    interval: "6 months" as const,
    intervalCount: 6,
    examTrack: "PLAB1" as ExamTrack,
    get stripePriceId() { return getPriceId("PLAB1_6MONTH"); },
    popular: true,
  },
};

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

export function getSubscriptionPlan(planKey: PlanKey) {
  return SUBSCRIPTION_PLANS[planKey];
}

export function getPlansForTrack(track: ExamTrack) {
  return Object.entries(SUBSCRIPTION_PLANS)
    .filter(([, plan]) => plan.examTrack === track)
    .map(([key, plan]) => ({ key, ...plan }));
}

export function getFeaturesForTrack(track: ExamTrack) {
  if (track === "AKT") return AKT_FEATURES;
  if (track === "MSRA") return MSRA_FEATURES;
  if (track === "PLAB1") return PLAB1_FEATURES;
  return SCA_FEATURES;
}

export function getAllPlans() {
  return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    key,
    ...plan,
  }));
}

/**
 * Picture360 Standalone Product
 * One-time payment of £9 GBP for 3 months access.
 * NOT included in any AKT/SCA subscription bundle.
 */
export const PICTURE360_PRODUCT = {
  name: "Picture360",
  description: "Visual Diagnosis Training — 3 months access",
  price: 9, // £9 GBP
  currency: "gbp",
  durationMonths: 3,
  get stripePriceId() { return getPriceId("PICTURE360"); },
};
