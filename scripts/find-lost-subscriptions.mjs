/**
 * Find lost AKT subscriptions for affected users by querying Stripe API.
 * 
 * userId 1560001 → customer cus_UxiqZtTefij6mv
 * userId 2130006 → customer cus_UxiqQIl50UnsGV
 * 
 * Run with: node scripts/find-lost-subscriptions.mjs
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
console.log('Using key prefix:', key?.substring(0, 10) + '...');
const stripe = new Stripe(key);

const AFFECTED_USERS = [
  { userId: 1560001, customerId: 'cus_UxiqZtTefij6mv', name: 'Olalekan Ogungbemi (owner)' },
  { userId: 2130006, customerId: 'cus_UxiqQIl50UnsGV', name: 'juniorworld4great' },
];

async function main() {
  for (const user of AFFECTED_USERS) {
    console.log(`\n=== ${user.name} (userId: ${user.userId}, customer: ${user.customerId}) ===`);
    
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.customerId,
        limit: 10,
        status: 'all', // Get all subscriptions including cancelled
      });
      
      console.log(`Found ${subscriptions.data.length} subscription(s):`);
      
      for (const sub of subscriptions.data) {
        const periodEnd = new Date(sub.current_period_end * 1000);
        const items = sub.items.data.map(item => item.price?.id || 'unknown').join(', ');
        console.log(`  - ${sub.id}: status=${sub.status}, period_end=${periodEnd.toISOString()}, prices=[${items}]`);
        
        // Check metadata for plan_key
        if (sub.metadata?.plan_key) {
          console.log(`    metadata.plan_key = ${sub.metadata.plan_key}`);
        }
      }
    } catch (error) {
      console.error(`  Error querying Stripe for ${user.customerId}:`, error.message);
    }
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
