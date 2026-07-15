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

  // Otherwise, handle as AKT/SCA subscription
  const { getProfileByUserId, updateProfile, getOrCreateProfile } = await import("../db");

  // Ensure profile exists
  await getOrCreateProfile(userId);

  // Update profile with Stripe customer and subscription info
  await updateProfile(userId, {
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    subscriptionStatus: "active",
    subscriptionPlan: session.metadata?.plan_key || "AKT_3MONTH",
  });

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

  const { updateProfileByStripeSubscriptionId } = await import("../db");

  await updateProfileByStripeSubscriptionId(subscription.id, {
    subscriptionStatus: subscription.status,
  });
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log("[Webhook] Subscription deleted:", subscription.id);

  const { updateProfileByStripeSubscriptionId } = await import("../db");

  await updateProfileByStripeSubscriptionId(subscription.id, {
    subscriptionStatus: "cancelled",
    stripeSubscriptionId: null,
  });
}

async function handleInvoicePaid(invoice: any) {
  console.log("[Webhook] Invoice paid:", invoice.id, "amount:", invoice.amount_paid);
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log("[Webhook] Invoice payment failed:", invoice.id);

  // If subscription payment fails, we could downgrade access
  if (invoice.subscription) {
    const { updateProfileByStripeSubscriptionId } = await import("../db");
    await updateProfileByStripeSubscriptionId(invoice.subscription, {
      subscriptionStatus: "past_due",
    });
  }
}
