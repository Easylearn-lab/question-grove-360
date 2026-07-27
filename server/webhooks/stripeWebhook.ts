import { Request, Response } from "express";
import Stripe from "stripe";

/**
 * Stripe Webhook Handler
 * Handles payment events from Stripe including:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 *
 * Supports TWO webhook endpoints with separate signing secrets:
 * 1. STRIPE_WEBHOOK_SECRET — existing endpoint at questgrove-ghmhikmd.manus.space (AKT subscriptions)
 * 2. STRIPE_PICTURE360_WEBHOOK_SECRET — new endpoint at questiongrove360.com (Picture360 purchases)
 *
 * The handler tries both secrets in order. If the first fails signature verification,
 * it tries the second. This ensures both endpoints can share the same handler code.
 *
 * MULTI-SUBSCRIPTION FIX (July 2026):
 * Previously, handleCheckoutSessionCompleted only updated the profiles table (single subscription columns),
 * which caused the overwrite bug when a user subscribed to a second product.
 * Now we ALSO write to the `subscriptions` table so each subscription is tracked independently.
 * The profiles table is still updated for backward compatibility (stores the LATEST subscription).
 */

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "placeholder") {
    return null;
  }
  return new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
}

/**
 * Attempt to verify the webhook signature against multiple secrets.
 * Returns the verified event on success, or null if all secrets fail.
 */
function verifyWebhookSignature(
  stripe: Stripe,
  payload: Buffer | string,
  signature: string,
  secrets: string[]
): Stripe.Event | null {
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      // Signature didn't match this secret, try the next one
      continue;
    }
  }
  return null;
}

/**
 * Map a plan_key to an examId for the subscriptions table.
 * AKT plans → examId 1
 * SCA plans → examId 30001 (first SCA case)
 * MSRA plans → null (no specific exam)
 */
function getExamIdFromPlanKey(planKey: string): number | null {
  const upper = (planKey || "").toUpperCase();
  if (upper.startsWith("AKT")) return 1;
  if (upper.startsWith("SCA")) return 30001;
  if (upper.startsWith("MSRA")) return null;
  return null;
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: "Stripe not configured" });
  }

  const sig = req.headers["stripe-signature"] as string;
  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  // Collect all available webhook secrets
  const secrets: string[] = [];
  const existingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const picture360Secret = process.env.STRIPE_PICTURE360_WEBHOOK_SECRET;

  if (existingSecret && existingSecret !== "placeholder") {
    secrets.push(existingSecret);
  }
  if (picture360Secret && picture360Secret !== "placeholder") {
    secrets.push(picture360Secret);
  }

  if (secrets.length === 0) {
    console.error("[Webhook] No webhook secrets configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  // Try to verify against all available secrets
  const event = verifyWebhookSignature(stripe, req.body, sig, secrets);

  if (!event) {
    console.error("[Webhook] Signature verification failed against all configured secrets");
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  console.log(`[Webhook] Event verified: ${event.type} (id: ${event.id})`);

  // Handle test events for verification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as any);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as any);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as any);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as any);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as any);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log("[Webhook] Checkout session completed:", session.id);

  const userId = parseInt(session.metadata?.user_id);

  if (!userId) {
    console.error("[Webhook] No user_id in session metadata");
    return;
  }

  // Check if this is a Picture360 purchase
  if (session.metadata?.product_type === "PICTURE360") {
    await handlePicture360Purchase(userId, session.id);
    return;
  }

  // Otherwise, handle as AKT/SCA/MSRA subscription
  const { getProfileByUserId, updateProfile, getOrCreateProfile, upsertSubscription } = await import("../db");

  // Ensure profile exists
  await getOrCreateProfile(userId);

  const planKey = session.metadata?.plan_key || "AKT_3MONTH";
  const stripeSubscriptionId = session.subscription;

  // 1. Update profiles table (backward compat — stores the LATEST subscription)
  await updateProfile(userId, {
    stripeCustomerId: session.customer,
    stripeSubscriptionId: stripeSubscriptionId,
    subscriptionStatus: "active",
    subscriptionPlan: planKey,
  });

  // 2. ALSO insert/upsert into the subscriptions table (multi-subscription support)
  if (stripeSubscriptionId) {
    const examId = getExamIdFromPlanKey(planKey);

    // Try to get period dates from Stripe
    let currentPeriodStart: Date | null = null;
    let currentPeriodEnd: Date | null = null;

    try {
      const stripe = getStripe();
      if (stripe) {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;
        if (sub.current_period_start) {
          currentPeriodStart = new Date(sub.current_period_start * 1000);
        }
        if (sub.current_period_end) {
          currentPeriodEnd = new Date(sub.current_period_end * 1000);
        }
      }
    } catch (err) {
      console.warn("[Webhook] Could not retrieve subscription period dates:", err);
    }

    await upsertSubscription({
      userId,
      planType: planKey,
      examId,
      status: "active",
      paymentProvider: "stripe",
      stripeSubscriptionId,
      currentPeriodStart,
      currentPeriodEnd,
    });

    console.log(`[Webhook] Subscription upserted in subscriptions table: userId=${userId}, plan=${planKey}, stripeSubId=${stripeSubscriptionId}`);
  }

  console.log("[Webhook] Profile updated with subscription info for user:", userId);
}

async function handlePicture360Purchase(userId: number, sessionId: string) {
  console.log("[Webhook] Picture360 purchase for user:", userId);

  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) {
    console.error("[Webhook] Database not available for Picture360 purchase");
    return;
  }

  const { sql } = await import("drizzle-orm");

  // Calculate expiry: now + 3 months
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  await db.execute(
    sql`INSERT INTO picture360_access (userId, purchasedAt, expiresAt, status, stripeSessionId) VALUES (${userId}, ${now}, ${expiresAt}, 'active', ${sessionId})`
  );

  console.log("[Webhook] Picture360 access granted until:", expiresAt.toISOString());
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log("[Webhook] Subscription updated:", subscription.id, "status:", subscription.status);

  const { updateProfileByStripeSubscriptionId, updateSubscriptionByStripeId } = await import("../db");

  // Update profiles table (backward compat)
  await updateProfileByStripeSubscriptionId(subscription.id, {
    subscriptionStatus: subscription.status,
  });

  // Also update the subscriptions table
  const updateData: Record<string, any> = {
    status: subscription.status,
  };
  if (subscription.current_period_start) {
    updateData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  }
  if (subscription.current_period_end) {
    updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }
  if (subscription.canceled_at) {
    updateData.cancelledAt = new Date(subscription.canceled_at * 1000);
  }

  await updateSubscriptionByStripeId(subscription.id, updateData);
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log("[Webhook] Subscription deleted:", subscription.id);

  const { updateProfileByStripeSubscriptionId, updateSubscriptionByStripeId } = await import("../db");

  // Update profiles table (backward compat)
  await updateProfileByStripeSubscriptionId(subscription.id, {
    subscriptionStatus: "cancelled",
    stripeSubscriptionId: null,
  });

  // Also update the subscriptions table
  await updateSubscriptionByStripeId(subscription.id, {
    status: "cancelled",
    cancelledAt: new Date(),
  });
}

async function handleInvoicePaid(invoice: any) {
  console.log("[Webhook] Invoice paid:", invoice.id, "amount:", invoice.amount_paid);
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log("[Webhook] Invoice payment failed:", invoice.id);

  // If subscription payment fails, we could downgrade access
  if (invoice.subscription) {
    const { updateProfileByStripeSubscriptionId, updateSubscriptionByStripeId } = await import("../db");

    // Update profiles table
    await updateProfileByStripeSubscriptionId(invoice.subscription, {
      subscriptionStatus: "past_due",
    });

    // Also update subscriptions table
    await updateSubscriptionByStripeId(invoice.subscription, {
      status: "past_due",
    });
  }
}
