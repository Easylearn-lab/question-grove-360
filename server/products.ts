/**
 * Stripe Products and Pricing Configuration
 * Two exam tracks: AKT (active) and SCA (coming soon)
 * Two billing tiers per track: 3-month (£20) and 6-month (£35)
 * Monthly rate (£7.99/month) is shown as reference only to highlight the discount.
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
    stripePriceId: "price_1Tj1PIIVrH3MHAvaFIYYeeey",
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
    stripePriceId: "price_1Tj1PIIVrH3MHAvayzsXp37U",
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
    stripePriceId: "price_1Tj1PJIVrH3MHAvamOSUS0FT",
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
    stripePriceId: "price_1Tj1PJIVrH3MHAva6Cms2qwk",
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
