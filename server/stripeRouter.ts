import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { SUBSCRIPTION_PLANS } from "./products";

// Stripe will be dynamically required when needed
function getStripe() {
  try {
    const Stripe = require("stripe");
    return new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    console.warn("[Stripe] Stripe SDK not available or not configured");
    return null;
  }
}

export const stripeRouter = router({
  // Create checkout session for subscription
  createCheckoutSession: protectedProcedure
    .input(z.object({
      planKey: z.enum(["STARTER", "PROFESSIONAL", "ELITE"]),
      trialDays: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const stripe = getStripe();
        if (!stripe) {
          throw new Error("Stripe is not configured. Please add your Stripe API keys.");
        }

        const plan = SUBSCRIPTION_PLANS[input.planKey];
        if (!plan) {
          throw new Error("Invalid plan");
        }

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
          success_url: `${ctx.req.headers.origin}/dashboard?payment=success`,
          cancel_url: `${ctx.req.headers.origin}/pricing?payment=cancelled`,
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
            plan_key: input.planKey,
          },
          allow_promotion_codes: true,
          trial_period_days: input.trialDays,
        });

        return {
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        console.error("[Stripe] Error creating checkout session:", error);
        throw error;
      }
    }),

  // Get subscription status
  getSubscriptionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const stripe = getStripe();
        if (!stripe) {
          return {
            status: "inactive",
            plan: null,
            currentPeriodEnd: null,
          };
        }

        const { getProfileByUserId } = await import("./db");
        const profile = await getProfileByUserId(ctx.user.id);
        
        if (!profile || !profile.stripeSubscriptionId) {
          return {
            status: "inactive",
            plan: null,
            currentPeriodEnd: null,
          };
        }

        const subscription = await stripe.subscriptions.retrieve(
          profile.stripeSubscriptionId
        );

        return {
          status: subscription.status,
          plan: subscription.items.data[0]?.plan?.id,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      } catch (error) {
        console.error("[Stripe] Error getting subscription status:", error);
        throw error;
      }
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
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
          {
            cancel_at_period_end: true,
          }
        );

        return {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      } catch (error) {
        console.error("[Stripe] Error canceling subscription:", error);
        throw error;
      }
    }),

  // Get payment history
  getPaymentHistory: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const stripe = getStripe();
        if (!stripe) {
          return [];
        }

        const { getProfileByUserId } = await import("./db");
        const profile = await getProfileByUserId(ctx.user.id);

        if (!profile || !profile.stripeCustomerId) {
          return [];
        }

        const invoices = await stripe.invoices.list({
          customer: profile.stripeCustomerId,
          limit: 12,
        });

        return invoices.data.map((invoice: any) => ({
          id: invoice.id,
          date: new Date(invoice.created * 1000),
          amount: invoice.amount_paid / 100,
          currency: invoice.currency?.toUpperCase(),
          status: invoice.status,
          pdfUrl: invoice.pdf,
          description: invoice.description,
        }));
      } catch (error) {
        console.error("[Stripe] Error getting payment history:", error);
        throw error;
      }
    }),
});

export type StripeRouter = typeof stripeRouter;
