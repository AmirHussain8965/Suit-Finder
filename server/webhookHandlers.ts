// Stripe webhook handlers for Replit integration
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';

// Extended subscription type to handle all Stripe API versions
type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

// Extended invoice type
type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

// Known product to tier mapping - configure with actual Stripe product IDs
const PRODUCT_TIER_MAP: Record<string, { tier: string }> = {
  // The Tailored Circle (Premium) products
  'prod_TrMufnr0kwDq5f': { tier: 'premium' },
  'prod_TqqeWUQpxCKwmz': { tier: 'premium' }, // Legacy Formal Findings Premium
  'prod_TrMGaWGzZFOdUZ': { tier: 'premium' },
  'prod_TrMjuO0DmuDVqy': { tier: 'premium' },
  'prod_TrMrAd5k8PSyNU': { tier: 'premium' },
  
  // The Krug Society (Platinum) products
  'prod_TrMuLabq1gL9lk': { tier: 'platinum' },
  'prod_TrMHKokiOeGqoY': { tier: 'platinum' },
  'prod_TrMjiDuDzfKCos': { tier: 'platinum' },
  'prod_TrMrU6tiqCS4MU': { tier: 'platinum' },
};

// Helper to determine tier from subscription using known product IDs
// Returns null if the product is unknown (prevents mis-assignment)
function getTierFromSubscription(subscription: SubscriptionWithPeriod): { tier: string; plan: string } | null {
  let tier: string | null = null;
  let plan = 'monthly';

  try {
    // Get price info from subscription items
    const items = subscription.items?.data;
    if (items && items.length > 0) {
      const priceItem = items[0];
      const interval = priceItem?.price?.recurring?.interval;
      
      // Set plan based on interval
      plan = interval === 'year' ? 'yearly' : 'monthly';
      
      // Get product ID to determine tier
      const productId = typeof priceItem?.price?.product === 'string' 
        ? priceItem.price.product 
        : priceItem?.price?.product?.id;
        
      if (productId && PRODUCT_TIER_MAP[productId]) {
        tier = PRODUCT_TIER_MAP[productId].tier;
        console.log(`Mapped product ${productId} to tier: ${tier}`);
      } else {
        console.error(`ALERT: Unknown product ID in subscription: ${productId}. Skipping tier update to prevent mis-assignment.`);
        return null; // Return null to indicate unknown product - caller should skip update
      }
    } else {
      console.error('ALERT: Subscription has no items. Skipping tier update.');
      return null;
    }
  } catch (error) {
    console.error('Error determining tier from subscription:', error);
    return null;
  }

  return { tier, plan };
}

// Sync subscription data to user account
async function syncSubscriptionToUser(customerId: string, subscription: SubscriptionWithPeriod | null): Promise<void> {
  try {
    // Get user ID from customer metadata
    const customerResult = await db.execute(sql`
      SELECT metadata FROM stripe.customers WHERE id = ${customerId}
    `);

    if (!customerResult.rows || customerResult.rows.length === 0) {
      console.log(`No customer found for ID: ${customerId}`);
      return;
    }

    const customerMetadata = customerResult.rows[0].metadata as any;
    const userId = customerMetadata?.userId;

    if (!userId) {
      console.log(`No userId in customer metadata for: ${customerId}`);
      return;
    }

    // Check if we already processed this subscription status to avoid stale updates
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      console.log(`User not found: ${userId}`);
      return;
    }

    if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
      // Active subscription - update user
      const tierInfo = getTierFromSubscription(subscription);
      
      // If product is unknown, skip update to prevent mis-assignment
      if (!tierInfo) {
        console.log(`Skipping update for user ${userId}: unknown product in subscription`);
        return;
      }
      
      const { tier, plan } = tierInfo;
      
      // Check timestamp-based idempotency: only update if this subscription is newer
      const existingEndDate = existingUser.subscriptionEndDate ? new Date(existingUser.subscriptionEndDate).getTime() : 0;
      const newEndDate = subscription.current_period_end ? subscription.current_period_end * 1000 : 0;
      
      // Skip if already at same or higher tier to prevent race conditions
      // Also check if subscription end date is newer (prevents stale event overwrites)
      const tierPriority: Record<string, number> = { 'free': 0, 'premium': 1, 'platinum': 2 };
      const currentTierPriority = tierPriority[existingUser.subscriptionTier || 'free'] || 0;
      const newTierPriority = tierPriority[tier] || 0;
      
      // Update if: new tier is higher, OR same subscription ID with newer/equal end date
      const shouldUpdate = newTierPriority > currentTierPriority || 
        (existingUser.stripeSubscriptionId === subscription.id && newEndDate >= existingEndDate) ||
        (!existingUser.stripeSubscriptionId); // No existing subscription
      
      if (shouldUpdate) {
        console.log(`Syncing subscription for user ${userId}: tier=${tier}, plan=${plan}, status=${subscription.status}`);
        
        await db.update(users)
          .set({
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionTier: tier,
            subscriptionPlan: plan,
            subscriptionEndDate: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000) 
              : null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
          
        console.log(`Updated user ${userId} subscription: ${tier} (${plan})`);
      } else {
        console.log(`Skipping update for user ${userId}: current tier (${existingUser.subscriptionTier}) or subscription is not newer`);
      }
    } else if (subscription && (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'past_due')) {
      // Subscription canceled or has payment issues - only clear if it's the matching subscription
      if (existingUser.stripeSubscriptionId === subscription.id) {
        console.log(`Clearing subscription for user ${userId} (status: ${subscription.status})`);
        
        await db.update(users)
          .set({
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionTier: null,
            subscriptionPlan: null,
            subscriptionEndDate: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000) 
              : null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
          
        console.log(`Cleared user ${userId} subscription`);
      } else {
        console.log(`Ignoring cancellation for different subscription: ${subscription.id} vs ${existingUser.stripeSubscriptionId}`);
      }
    }
  } catch (error) {
    console.error('Error syncing subscription to user:', error);
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // First, let stripe-replit-sync process the webhook (syncs to stripe tables)
    // This handles signature verification internally
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Now, verify and parse the event ourselves for user subscription sync
    try {
      const stripe = await getUncachableStripeClient();
      
      // Get webhook secret from the sync configuration
      const webhookResult = await db.execute(sql`
        SELECT secret FROM stripe.webhook LIMIT 1
      `);
      
      // Security: Require webhook secret for signature verification
      // Do not process events without verified signature
      if (!webhookResult.rows || webhookResult.rows.length === 0 || !webhookResult.rows[0].secret) {
        console.error('SECURITY: No webhook secret configured. Cannot verify event signature. Skipping user sync.');
        console.log('The stripe-replit-sync library already synced data to stripe tables. User table sync skipped for security.');
        return;
      }
      
      const webhookSecret = webhookResult.rows[0].secret as string;
      // Verify the event using Stripe's constructEvent - this ensures authenticity
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      
      console.log(`Processing Stripe event: ${event.type} (${event.id})`);
      
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.resumed': {
          const subscription = event.data.object as SubscriptionWithPeriod;
          await syncSubscriptionToUser(subscription.customer as string, subscription);
          break;
        }
        
        case 'customer.subscription.deleted':
        case 'customer.subscription.paused': {
          const subscription = event.data.object as SubscriptionWithPeriod;
          await syncSubscriptionToUser(subscription.customer as string, subscription);
          break;
        }
        
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === 'subscription' && session.subscription) {
            // Fetch full subscription details
            const subscriptionId = typeof session.subscription === 'string' 
              ? session.subscription 
              : (session.subscription as any).id;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as SubscriptionWithPeriod;
            await syncSubscriptionToUser(session.customer as string, subscription);
          }
          break;
        }
        
        case 'invoice.paid': {
          const invoice = event.data.object as InvoiceWithSubscription;
          if (invoice.subscription) {
            // Fetch full subscription details
            const subscriptionId = typeof invoice.subscription === 'string' 
              ? invoice.subscription 
              : (invoice.subscription as any).id;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as SubscriptionWithPeriod;
            await syncSubscriptionToUser(invoice.customer as string, subscription);
          }
          break;
        }
        
        default:
          // Other events - no action needed
          break;
      }
    } catch (error) {
      console.error('Error processing webhook for user sync:', error);
      // Don't throw - the main webhook processing already succeeded
    }
  }
}
