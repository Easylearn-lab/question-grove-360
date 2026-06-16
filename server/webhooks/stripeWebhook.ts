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
 */

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "placeholder") {
    return null;
  }
  return new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: "Stripe not configured" });
  }

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

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

  const { getProfileByUserId, updateProfile, getOrCreateProfile } = await import("../db");
  const userId = parseInt(session.metadata?.user_id);

  if (!userId) {
    console.error("[Webhook] No user_id in session metadata");
    return;
  }

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
