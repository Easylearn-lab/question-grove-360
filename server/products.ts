/**
 * Stripe Products and Pricing Configuration
 * Two exam tracks: AKT (active) and SCA (coming soon)
 * Two billing tiers per track: 3-month (£20) and 6-month (£35)
 * Monthly rate (£7.99/month) is shown as reference only to highlight the discount.
 *
 * Price IDs are stored for both test and live mode.
 * The correct ID is selected at runtime based on the STRIPE_SECRET_KEY prefix.
 */

export type ExamTrack = "AKT" | "SCA";

export const PAYMENT_ENABLED: Record<ExamTrack, boolean> = {
  AKT: true,   // Live and active
  SCA: false,  // Coming soon — do not activate until content is ready
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
  "Full SCA case bank access",
  "Note360 study notes (SCA)",
  "SCA consultation simulator",
  "AI Coach360 assistant",
  "Unlimited mock SCA consultations",
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
  return track === "AKT" ? AKT_FEATURES : SCA_FEATURES;
}

export function getAllPlans() {
  return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    key,
    ...plan,
  }));
}
