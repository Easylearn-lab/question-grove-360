/**
 * Backfill the subscriptions table from the profiles table.
 * This migrates existing single-subscription data to the multi-subscription model.
 * 
 * Run with: node scripts/backfill-subscriptions.mjs
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL + "&ssl={}");
  
  try {
    // 1. Check current state of subscriptions table
    const [existingRows] = await connection.execute("SELECT COUNT(*) as cnt FROM subscriptions");
    console.log("Current subscriptions table count:", existingRows[0].cnt);

    // 2. Get all profiles with active subscriptions
    const [profiles] = await connection.execute(`
      SELECT p.userId, p.stripeSubscriptionId, p.subscriptionStatus, p.subscriptionPlan, p.stripeCustomerId
      FROM profiles p
      WHERE p.stripeSubscriptionId IS NOT NULL
        AND p.subscriptionStatus IN ('active', 'trialing', 'past_due')
      ORDER BY p.userId
    `);

    console.log(`\nFound ${profiles.length} profiles with active subscriptions to backfill:`);
    
    for (const profile of profiles) {
      console.log(`  userId=${profile.userId}, plan=${profile.subscriptionPlan}, status=${profile.subscriptionStatus}, subId=${profile.stripeSubscriptionId}`);
      
      // Determine examId from plan
      let examId = null;
      const plan = (profile.subscriptionPlan || "").toUpperCase();
      if (plan.startsWith("AKT")) examId = 1;
      else if (plan.startsWith("SCA")) examId = 30001;
      
      // Check if already exists in subscriptions table
      const [existing] = await connection.execute(
        "SELECT id FROM subscriptions WHERE stripeSubscriptionId = ?",
        [profile.stripeSubscriptionId]
      );
      
      if (existing.length > 0) {
        console.log(`    → Already exists in subscriptions table (id=${existing[0].id}), skipping`);
        continue;
      }
      
      // Insert into subscriptions table
      await connection.execute(
        `INSERT INTO subscriptions (userId, planType, examId, status, paymentProvider, stripeSubscriptionId, createdAt)
         VALUES (?, ?, ?, ?, 'stripe', ?, NOW())`,
        [profile.userId, profile.subscriptionPlan, examId, profile.subscriptionStatus, profile.stripeSubscriptionId]
      );
      console.log(`    → Inserted into subscriptions table`);
    }

    // 3. Verify final state
    const [finalRows] = await connection.execute("SELECT * FROM subscriptions ORDER BY userId");
    console.log(`\nFinal subscriptions table (${finalRows.length} rows):`);
    for (const row of finalRows) {
      console.log(`  id=${row.id}, userId=${row.userId}, plan=${row.planType}, status=${row.status}, stripeSubId=${row.stripeSubscriptionId}`);
    }
    
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
