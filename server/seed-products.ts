// Seed script to create subscription products in Stripe
// Run manually: npx tsx server/seed-products.ts

import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Checking for existing products...');
  
  const existingProducts = await stripe.products.search({ 
    query: "name:'Formal Findings Premium'" 
  });

  if (existingProducts.data.length > 0) {
    console.log('Premium product already exists:', existingProducts.data[0].id);
    return;
  }

  console.log('Creating Formal Findings Premium product...');

  const product = await stripe.products.create({
    name: 'Formal Findings Premium',
    description: 'Full access to all Formal Findings features: messaging, events, location privacy, multi-city roaming, and group chats.',
    metadata: {
      app: 'formal_findings',
      tier: 'premium',
    },
  });

  console.log('Created product:', product.id);

  console.log('Creating monthly price ($9.99/month)...');
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      plan: 'monthly',
    },
  });
  console.log('Created monthly price:', monthlyPrice.id);

  console.log('Creating yearly price ($99/year)...');
  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 9900,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: {
      plan: 'yearly',
    },
  });
  console.log('Created yearly price:', yearlyPrice.id);

  console.log('\nProducts created successfully!');
  console.log('Monthly Price ID:', monthlyPrice.id);
  console.log('Yearly Price ID:', yearlyPrice.id);
}

createProducts().catch(console.error);
