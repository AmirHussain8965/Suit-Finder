// Seed script to create subscription products and prices in Stripe
// Run this script manually: npx tsx server/seed-stripe-products.ts
import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating Formal Findings subscription products...');

  // Archive any existing products first
  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'formal_findings'" 
  });

  if (existingProducts.data.length > 0) {
    console.log('Archiving existing products...');
    for (const product of existingProducts.data) {
      await stripe.products.update(product.id, { active: false });
      console.log(`Archived: ${product.name}`);
    }
  }

  // Create The Tailored Circle product
  const tailoredCircle = await stripe.products.create({
    name: 'The Tailored Circle',
    description: 'Premium membership for formal attire enthusiasts',
    metadata: {
      app: 'formal_findings',
      tier: 'premium',
      features: JSON.stringify([
        'Access to all member profiles',
        'Unlimited messaging',
        'View member galleries',
        'Create events',
        'Add favorites'
      ])
    }
  });

  // Create monthly price for The Tailored Circle ($9.99/month)
  const tailoredCircleMonthly = await stripe.prices.create({
    product: tailoredCircle.id,
    unit_amount: 999, // $9.99 in cents
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  // Create yearly price for The Tailored Circle ($99/year)
  const tailoredCircleYearly = await stripe.prices.create({
    product: tailoredCircle.id,
    unit_amount: 9900, // $99 in cents
    currency: 'usd',
    recurring: { interval: 'year' },
  });

  console.log('Created The Tailored Circle:', { 
    productId: tailoredCircle.id, 
    monthlyPriceId: tailoredCircleMonthly.id,
    yearlyPriceId: tailoredCircleYearly.id
  });

  // Create The Krug Society product
  const krugSociety = await stripe.products.create({
    name: 'The Krug Society',
    description: 'Platinum membership with exclusive access to wardrobes and auctions',
    metadata: {
      app: 'formal_findings',
      tier: 'platinum',
      features: JSON.stringify([
        'All Tailored Circle features',
        'Virtual wardrobe access',
        'Suit auctions access',
        'Priority support',
        'Exclusive events'
      ])
    }
  });

  // Create monthly price for The Krug Society ($12.99/month)
  const krugSocietyMonthly = await stripe.prices.create({
    product: krugSociety.id,
    unit_amount: 1299, // $12.99 in cents
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  console.log('Created The Krug Society:', { 
    productId: krugSociety.id, 
    monthlyPriceId: krugSocietyMonthly.id 
  });

  console.log('\nProducts created successfully!');
  console.log('Summary:');
  console.log('- The Tailored Circle: $9.99/month or $99/year');
  console.log('- The Krug Society: $12.99/month');
  console.log('\nThese will sync to the database automatically via webhooks.');
}

createProducts().catch(console.error);
