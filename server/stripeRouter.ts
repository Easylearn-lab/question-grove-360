import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { SUBSCRIPTION_PLANS, PAYMENT_ENABLED, type PlanKey, type ExamTrack, PICTURE360_PRODUCT } from "./products";
import Stripe from "stripe";

// Initialize Stripe with the secret key
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "placeholder") {
    return null;
  }
  return new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
}

const PLAN_KEYS = Object.keys(SUBSCRIPTION_PLANS) as PlanKey[];

export const stripeRouter = router({
  // Create checkout session for subscription
  createCheckoutSession: protectedProcedure
    .input(z.object({
      planKey: z.string().refine((val): val is PlanKey => PLAN_KEYS.includes(val as PlanKey), {
        message: "Invalid plan key",
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new Error("Stripe is not configured. Please add your Stripe API keys in Settings → Payment.");
      }

      const plan = SUBSCRIPTION_PLANS[input.planKey as PlanKey];
      if (!plan) {
        throw new Error("Invalid plan selected");
      }

      // Check if payment is enabled for this exam track
      if (!PAYMENT_ENABLED[plan.examTrack as ExamTrack]) {
        throw new Error(`${plan.examTrack} subscriptions are coming soon. Please check back later.`);
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
        success_url: plan.examTrack === "SCA" ? `${origin}/sca?payment=success` : `${origin}/dashboard?payment=success`,
        cancel_url: `${origin}/pricing?payment=cancelled`,
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          plan_key: input.planKey,
          exam_track: plan.examTrack,
        },
        allow_promotion_codes: true,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  /**
   * Get subscription status — returns ALL active subscriptions for the user.
   * 
   * MULTI-SUBSCRIPTION FIX (July 2026):
   * Previously returned a single { status, plan } from the profiles table.
   * Now returns an array of ALL subscriptions from the subscriptions table,
   * so a user with both AKT and SCA subscriptions gets access to both.
   * 
   * Also returns a legacy single-subscription shape for backward compatibility.
   */
  getSubscriptionStatus: publicProcedure
    .query(async ({ ctx }) => {
      // Return inactive for unauthenticated users (prevents UNAUTHORIZED error
      // from triggering global redirect during OAuth callback race condition)
      if (!ctx.user) {
        return {
          status: "inactive" as const,
          plan: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          subscriptions: [] as Array<{
            plan: string;
            status: string;
            currentPeriodEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            stripeSubscriptionId: string | null;
          }>,
        };
      }

      const { getProfileByUserId, getSubscriptionsByUserId } = await import("./db");
      const stripe = getStripe();

      // Get ALL subscriptions from the subscriptions table
      const allSubscriptions = await getSubscriptionsByUserId(ctx.user.id);

      // The fallback to profiles table should ONLY trigger if the subscriptions table
      // has absolutely zero rows for this user (not just zero active ones)
      const hasAnySubscriptionRows = allSubscriptions.length > 0;

      // Build the subscriptions array with live Stripe data where possible
      const subscriptionsResult: Array<{
        plan: string;
        status: string;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
        stripeSubscriptionId: string | null;
      }> = [];

      for (const sub of allSubscriptions) {
        // Skip cancelled subscriptions
        if (sub.status === "cancelled") continue;

        let status = sub.status;
        let currentPeriodEnd = sub.currentPeriodEnd;
        let cancelAtPeriodEnd = false;

        // Try to get live status from Stripe
        if (stripe && sub.stripeSubscriptionId) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId) as any;
            status = stripeSub.status;
            currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
            cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
          } catch (error) {
            // Use local data if Stripe call fails
            console.warn(`[Stripe] Could not retrieve subscription ${sub.stripeSubscriptionId}:`, error);
          }
        }

        subscriptionsResult.push({
          plan: sub.planType,
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd,
          stripeSubscriptionId: sub.stripeSubscriptionId,
        });
      }

      // If subscriptions table is empty, fall back to profiles table (migration period)
      // Only fall back if the subscriptions table has NO rows at all for this user
      // If there ARE rows but they're all cancelled, that's intentional — don't fall back
      if (!hasAnySubscriptionRows) {
        const profile = await getProfileByUserId(ctx.user.id);
        if (profile && profile.subscriptionPlan && profile.subscriptionStatus !== "inactive") {
          let status = profile.subscriptionStatus || "inactive";
          let currentPeriodEnd: Date | null = null;
          let cancelAtPeriodEnd = false;

          if (stripe && profile.stripeSubscriptionId) {
            try {
              const subscription = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId) as any;
              status = subscription.status;
              currentPeriodEnd = new Date(subscription.current_period_end * 1000);
              cancelAtPeriodEnd = subscription.cancel_at_period_end;
            } catch (error) {
              console.warn("[Stripe] Could not retrieve subscription, using local data:", error);
            }
          }

          subscriptionsResult.push({
            plan: profile.subscriptionPlan,
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            stripeSubscriptionId: profile.stripeSubscriptionId,
          });
        }
      }

      // Legacy single-subscription response (use the first active one or the first one)
      const activeSubs = subscriptionsResult.filter(s => s.status === "active" || s.status === "trialing");
      const primarySub = activeSubs.length > 0 ? activeSubs[0] : subscriptionsResult[0];

      return {
        status: primarySub?.status || "inactive",
        plan: primarySub?.plan || null,
        currentPeriodEnd: primarySub?.currentPeriodEnd || null,
        cancelAtPeriodEnd: primarySub?.cancelAtPeriodEnd || false,
        subscriptions: subscriptionsResult,
      };
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(z.object({
      stripeSubscriptionId: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new Error("Stripe is not configured");
      }

      let subscriptionId: string | undefined;

      // If a specific subscription ID is provided, use it
      if (input?.stripeSubscriptionId) {
        subscriptionId = input.stripeSubscriptionId;
      } else {
        // Fall back to the profile's subscription ID
        const { getProfileByUserId } = await import("./db");
        const profile = await getProfileByUserId(ctx.user.id);
        if (!profile || !profile.stripeSubscriptionId) {
          throw new Error("No active subscription found");
        }
        subscriptionId = profile.stripeSubscriptionId;
      }

      if (!subscriptionId) {
        throw new Error("No subscription ID provided");
      }

      const subscription = await stripe.subscriptions.update(
        subscriptionId,
        { cancel_at_period_end: true }
      );

      return {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    }),

  // Create Picture360 checkout session (standalone £9 / 3-month product)
  createPicture360Checkout: protectedProcedure
    .mutation(async ({ ctx }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new Error("Stripe is not configured. Please add your Stripe API keys in Settings → Payment.");
      }

      // Extract origin from headers, falling back to referer origin
      let origin = ctx.req.headers.origin || "";
      if (!origin && ctx.req.headers.referer) {
        try {
          const refUrl = new URL(ctx.req.headers.referer as string);
          origin = refUrl.origin;
        } catch {}
      }
      if (!origin) {
        origin = "https://questiongrove360.com";
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: "Picture360 — Visual Diagnosis Training",
                description: "3 months access to all Picture360 specialties",
              },
              unit_amount: 900, // £9.00 in pence
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/picture360?payment=success`,
        cancel_url: `${origin}/picture360?payment=cancelled`,
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          product_type: "PICTURE360",
        },
        allow_promotion_codes: true,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  // Get Picture360 access status for current user
  getPicture360Access: protectedProcedure
    .query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) {
        return { hasAccess: false, status: "no_purchase" as const, expiresAt: null };
      }
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(
        sql`SELECT id, purchasedAt, expiresAt, status FROM picture360_access WHERE userId = ${ctx.user.id} ORDER BY expiresAt DESC LIMIT 1`
      );
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      const row = (rows as any[])[0];

      if (!row) {
        return { hasAccess: false, status: "no_purchase" as const, expiresAt: null };
      }

      const expiresAt = new Date(row.expiresAt);
      const now = new Date();

      if (expiresAt > now && row.status === "active") {
        return { hasAccess: true, status: "active" as const, expiresAt };
      }

      return { hasAccess: false, status: "expired" as const, expiresAt };
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
