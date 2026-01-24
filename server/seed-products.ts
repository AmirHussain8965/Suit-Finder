// Seed script to create subscription products in Stripe
// Run manually: npx tsx server/seed-products.ts

import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Checking for existing products...');
  
  // Check and create Premium product
  const existingPremium = await stripe.products.search({ 
    query: "name:'Formal Findings Premium'" 
  });

  if (existingPremium.data.length > 0) {
    console.log('Premium product already exists:', existingPremium.data[0].id);
  } else {
    console.log('Creating Formal Findings Premium product...');

    const premiumProduct = await stripe.products.create({
      name: 'Formal Findings Premium',
      description: 'Access to messaging, events, location privacy, and group chats.',
      metadata: {
        app: 'formal_findings',
        tier: 'premium',
      },
    });

    console.log('Created Premium product:', premiumProduct.id);

    console.log('Creating Premium monthly price ($9.99/month)...');
    const premiumMonthlyPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 999,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: {
        plan: 'monthly',
        tier: 'premium',
      },
    });
    console.log('Created Premium monthly price:', premiumMonthlyPrice.id);

    console.log('Creating Premium yearly price ($99/year)...');
    const premiumYearlyPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 9900,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: {
        plan: 'yearly',
        tier: 'premium',
      },
    });
    console.log('Created Premium yearly price:', premiumYearlyPrice.id);
  }

  // Check and create Platinum product
  const existingPlatinum = await stripe.products.search({ 
    query: "name:'Formal Findings Platinum'" 
  });

  if (existingPlatinum.data.length > 0) {
    console.log('Platinum product already exists:', existingPlatinum.data[0].id);
  } else {
    console.log('Creating Formal Findings Platinum product...');

    const platinumProduct = await stripe.products.create({
      name: 'Formal Findings Platinum',
      description: 'All Premium features plus Virtual Wardrobe, Auctions, and Multi-City Roaming.',
      metadata: {
        app: 'formal_findings',
        tier: 'platinum',
      },
    });

    console.log('Created Platinum product:', platinumProduct.id);

    console.log('Creating Platinum monthly price ($12.99/month)...');
    const platinumMonthlyPrice = await stripe.prices.create({
      product: platinumProduct.id,
      unit_amount: 1299,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: {
        plan: 'monthly',
        tier: 'platinum',
      },
    });
    console.log('Created Platinum monthly price:', platinumMonthlyPrice.id);
  }

  console.log('\nProducts setup complete!');
}

createProducts().catch(console.error);
