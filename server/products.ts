/**
 * Stripe Products and Pricing Configuration
 * Only 3-month (quarterly) billing is offered.
 * Monthly rate (£7.99/month) is shown as reference only to highlight the discount.
 */

export const SUBSCRIPTION_PLANS = {
  QUARTERLY: {
    name: "3-Month Access",
    description: "Full access to all exam preparation resources",
    price: 20,
    monthlyReference: 7.99,
    interval: "3 months" as const,
    intervalCount: 3,
    features: [
      "Full question bank access",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "SCA consultation simulator",
      "AI Coach360 assistant",
      "Priority support",
    ],
    stripePriceId: "price_1ThyRSIVrH3MHAvaLEcEKL2q",
  },
};

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
