/**
 * Stripe Products and Pricing Configuration
 * Three billing tiers offered: 3-month, 6-month, and annual.
 * Monthly rate (£7.99/month) is shown as reference only to highlight the discount.
 */

export const SUBSCRIPTION_PLANS = {
  QUARTERLY: {
    name: "3-Month Access",
    description: "Great for focused exam prep sprints",
    price: 20,
    monthlyReference: 7.99,
    fullPrice: 23.97, // £7.99 × 3
    savings: 3.97,
    interval: "3 months" as const,
    intervalCount: 3,
    stripePriceId: "price_1ThyRSIVrH3MHAvaLEcEKL2q",
  },
  BIANNUAL: {
    name: "6-Month Access",
    description: "Most popular — ideal study timeline",
    price: 35,
    monthlyReference: 7.99,
    fullPrice: 47.94, // £7.99 × 6
    savings: 12.94,
    interval: "6 months" as const,
    intervalCount: 6,
    stripePriceId: "price_1ThylrIVrH3MHAvavzdKvzYc",
  },
  ANNUAL: {
    name: "Annual Access",
    description: "Best value — full year of preparation",
    price: 60,
    monthlyReference: 7.99,
    fullPrice: 95.88, // £7.99 × 12
    savings: 35.88,
    interval: "12 months" as const,
    intervalCount: 12,
    stripePriceId: "price_1ThylrIVrH3MHAvaQIYG86eM",
  },
};

export const PLAN_FEATURES = [
  "Full question bank access",
  "Unlimited mock exams",
  "Note360 study notes",
  "Pattern recognition flashcards",
  "SCA consultation simulator",
  "AI Coach360 assistant",
  "Priority support",
];

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

export function getSubscriptionPlan(planKey: PlanKey) {
  return SUBSCRIPTION_PLANS[planKey];
}

export function getAllPlans() {
  return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    key,
    ...plan,
  }));
}
