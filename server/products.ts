/**
 * Stripe Products and Pricing Configuration
 * 6 subscription plans matching the correct pricing structure
 */

export const SUBSCRIPTION_PLANS = {
  SINGLE_EXAM_MONTHLY: {
    name: "Single Exam Monthly",
    description: "Access to a single exam preparation track",
    price: 7.99,
    interval: "month" as const,
    intervalCount: 1,
    features: [
      "Access to one exam question bank",
      "Mock exams for selected exam",
      "Basic study notes",
      "Email support",
    ],
    stripePriceId: "price_1ThyRRIVrH3MHAva2mYcjXtc",
  },
  SINGLE_EXAM_3MONTH: {
    name: "Single Exam 3-Month",
    description: "Access to a single exam - save with 3-month plan",
    price: 20,
    interval: "3 months" as const,
    intervalCount: 3,
    features: [
      "Access to one exam question bank",
      "Mock exams for selected exam",
      "Basic study notes",
      "Email support",
      "Save vs monthly",
    ],
    stripePriceId: "price_1ThyRSIVrH3MHAvaLEcEKL2q",
  },
  UK_ALL_ACCESS_MONTHLY: {
    name: "UK All-Access Monthly",
    description: "Full access to all UK exam tracks",
    price: 39.99,
    interval: "month" as const,
    intervalCount: 1,
    features: [
      "All UK exam question banks",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "SCA consultation simulator",
      "Priority support",
    ],
    stripePriceId: "price_1ThyRSIVrH3MHAvaI1617Hwx",
    popular: true,
  },
  UK_ALL_ACCESS_3MONTH: {
    name: "UK All-Access 3-Month",
    description: "Full UK access - save with 3-month plan",
    price: 99.99,
    interval: "3 months" as const,
    intervalCount: 3,
    features: [
      "All UK exam question banks",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "SCA consultation simulator",
      "Priority support",
      "Save vs monthly",
    ],
    stripePriceId: "price_1ThyRSIVrH3MHAvaptRMhRrW",
  },
  INTERNATIONAL_MONTHLY: {
    name: "International Monthly",
    description: "Full access to all international exam tracks",
    price: 39.99,
    interval: "month" as const,
    intervalCount: 1,
    features: [
      "All international exam question banks",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "AI Coach360 assistant",
      "Priority support",
    ],
    stripePriceId: "price_1ThyRTIVrH3MHAvaWraqw72Y",
  },
  INTERNATIONAL_3MONTH: {
    name: "International 3-Month",
    description: "Full international access - save with 3-month plan",
    price: 99.99,
    interval: "3 months" as const,
    intervalCount: 3,
    features: [
      "All international exam question banks",
      "Unlimited mock exams",
      "Note360 study notes",
      "Pattern recognition flashcards",
      "AI Coach360 assistant",
      "Priority support",
      "Save vs monthly",
    ],
    stripePriceId: "price_1ThyRTIVrH3MHAvaJykyE5vT",
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
