import { Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

export async function paystackWebhookHandler(req: Request, res: Response) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: "Paystack not configured" });
  }

  // Verify webhook signature
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;

  if (event.event === "charge.success") {
    const { reference, metadata, customer } = event.data;
    const userId = metadata?.user_id;
    const plan = metadata?.plan;

    if (userId && plan) {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        // Calculate expiry based on plan
        const daysMap: Record<string, number> = {
          monthly: 30,
          quarterly: 90,
        };
        const days = daysMap[plan] || 30;

        // Insert or update subscription
        await db.execute(
          sql`INSERT INTO subscriptions (userId, planType, status, provider, providerSubscriptionId, currentPeriodStart, currentPeriodEnd, createdAt)
              VALUES (${userId}, ${"jamb"}, ${"active"}, ${"paystack"}, ${reference}, NOW(), DATE_ADD(NOW(), INTERVAL ${sql.raw(String(days))} DAY), NOW())
              ON DUPLICATE KEY UPDATE status = 'active', currentPeriodEnd = DATE_ADD(NOW(), INTERVAL ${sql.raw(String(days))} DAY)`
        );

        console.log(`[Paystack] Subscription activated for user ${userId}, plan: ${plan}, ref: ${reference}`);
      } catch (err) {
        console.error("[Paystack] Error processing webhook:", err);
      }
    }
  }

  res.status(200).json({ received: true });
}
