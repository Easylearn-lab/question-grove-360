/**
 * Stripe Products and Pricing Configuration
 * Define all subscription plans and one-time products here
 */

export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: "Starter",
    description: "Perfect for beginners",
    pricePerMonth: 9.99,
    features: [
      "Access to Question Bank (limited)",
      "1 Mock Exam per month",
      "Basic Study Notes",
      "Email support",
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
  },
  PROFESSIONAL: {
    name: "Professional",
    description: "Most popular for serious students",
    pricePerMonth: 29.99,
    features: [
      "Unlimited Question Bank access",
      "Unlimited Mock Exams",
      "Note360 Study Notes",
      "Pattern Recognition Flashcards",
      "Priority email support",
      "Weekly progress reports",
    ],
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "price_professional",
    popular: true,
  },
  ELITE: {
    name: "Elite",
    description: "Complete exam mastery",
    pricePerMonth: 59.99,
    features: [
      "Everything in Professional",
      "SCA AI Consultation Simulator",
      "AI Coach360 (24/7 available)",
      "Real-time voice feedback",
      "1-on-1 strategy sessions (monthly)",
      "Personalized study plans",
      "Phone support",
    ],
    stripePriceId: process.env.STRIPE_ELITE_PRICE_ID || "price_elite",
  },
};

export const ONE_TIME_PRODUCTS = {
  COURSE_BUNDLE: {
    name: "Complete Course Bundle",
    description: "All courses and materials",
    price: 199.99,
    stripePriceId: process.env.STRIPE_BUNDLE_PRICE_ID || "price_bundle",
  },
};

export const TRIAL_PERIOD_DAYS = 7;

export function getSubscriptionPlan(planKey: keyof typeof SUBSCRIPTION_PLANS) {
  return SUBSCRIPTION_PLANS[planKey];
}

export function getAllPlans() {
  return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
    key,
    ...plan,
  }));
}
