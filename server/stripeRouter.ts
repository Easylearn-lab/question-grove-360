import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { SUBSCRIPTION_PLANS } from "./products";
import Stripe from "stripe";

// Initialize Stripe with the secret key
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "placeholder") {
    return null;
  }
  return new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
}

export const stripeRouter = router({
  // Create checkout session for subscription
  createCheckoutSession: protectedProcedure
    .input(z.object({
      planKey: z.enum(["STARTER", "PROFESSIONAL", "ELITE"]),
      trialDays: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new Error("Stripe is not configured. Please add your Stripe API keys in Settings → Payment.");
      }

      const plan = SUBSCRIPTION_PLANS[input.planKey];
      if (!plan) {
        throw new Error("Invalid plan selected");
      }

      const origin = ctx.req.headers.origin || ctx.req.headers.referer?.replace(/\/$/, "") || "";

      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${origin}/dashboard?payment=success`,
        cancel_url: `${origin}/pricing?payment=cancelled`,
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          plan_key: input.planKey,
        },
        allow_promotion_codes: true,
        subscription_data: input.trialDays ? {
          trial_period_days: input.trialDays,
        } : undefined,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  // Get subscription status from local DB (no Stripe API call needed)
  getSubscriptionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const { getProfileByUserId } = await import("./db");
      const profile = await getProfileByUserId(ctx.user.id);

      if (!profile) {
        return {
          status: "inactive" as const,
          plan: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }

      // If we have a stripe subscription ID, try to get live status
      const stripe = getStripe();
      if (stripe && profile.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId) as any;
          return {
            status: subscription.status,
            plan: profile.subscriptionPlan,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          };
        } catch (error) {
          console.warn("[Stripe] Could not retrieve subscription, using local data:", error);
        }
      }

      // Fallback to local profile data
      return {
        status: profile.subscriptionStatus || "inactive",
        plan: profile.subscriptionPlan || null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new Error("Stripe is not configured");
      }

      const { getProfileByUserId } = await import("./db");
      const profile = await getProfileByUserId(ctx.user.id);

      if (!profile || !profile.stripeSubscriptionId) {
        throw new Error("No active subscription found");
      }

      const subscription = await stripe.subscriptions.update(
        profile.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      return {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    }),

  // Get payment history
  getPaymentHistory: protectedProcedure
    .query(async ({ ctx }) => {
      const stripe = getStripe();
      if (!stripe) {
        return [];
      }

      const { getProfileByUserId } = await import("./db");
      const profile = await getProfileByUserId(ctx.user.id);

      if (!profile || !profile.stripeCustomerId) {
        return [];
      }

      try {
        const invoices = await stripe.invoices.list({
          customer: profile.stripeCustomerId,
          limit: 12,
        });

        return invoices.data.map((invoice) => ({
          id: invoice.id,
          date: new Date((invoice.created || 0) * 1000),
          amount: (invoice.amount_paid || 0) / 100,
          currency: invoice.currency?.toUpperCase() || "GBP",
          status: invoice.status,
          pdfUrl: invoice.invoice_pdf,
          description: invoice.description,
        }));
      } catch (error) {
        console.error("[Stripe] Error getting payment history:", error);
        return [];
      }
    }),
});

export type StripeRouter = typeof stripeRouter;
