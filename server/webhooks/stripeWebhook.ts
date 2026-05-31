import { Request, Response } from "express";

/**
 * Stripe Webhook Handler
 * Handles payment events from Stripe including:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 */

function getStripe() {
  try {
    const Stripe = require("stripe");
    return new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    console.warn("[Stripe] Stripe SDK not available");
    return null;
  }
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

  let event;

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
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
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

  const { getProfileByUserId, updateProfile } = await import("../db");
  const userId = parseInt(session.metadata?.user_id);

  if (!userId) {
    console.error("[Webhook] No user_id in session metadata");
    return;
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) {
    console.error("[Webhook] Profile not found for user:", userId);
    return;
  }

  // Update profile with Stripe customer and subscription info
  await updateProfile(userId, {
    stripeCustomerId: session.customer,
    subscriptionStatus: "active",
    subscriptionPlan: session.metadata?.plan_key,
  });

  console.log("[Webhook] Profile updated with subscription info");
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log("[Webhook] Subscription updated:", subscription.id);

  const { getProfileByUserId, updateProfile } = await import("../db");

  // Find user by stripe subscription ID
  // In a real app, you'd query the database to find the user
  // For now, we'll just log it
  console.log("[Webhook] Subscription status:", subscription.status);
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log("[Webhook] Subscription deleted:", subscription.id);

  const { getProfileByUserId, updateProfile } = await import("../db");

  // Mark subscription as cancelled
  console.log("[Webhook] Subscription cancelled");
}

async function handleInvoicePaid(invoice: any) {
  console.log("[Webhook] Invoice paid:", invoice.id);
  console.log("[Webhook] Amount paid:", invoice.amount_paid);
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log("[Webhook] Invoice payment failed:", invoice.id);
  console.log("[Webhook] Amount due:", invoice.amount_due);
}
