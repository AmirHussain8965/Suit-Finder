// Seed script to create subscription products and prices in Stripe
// Run this script manually: npx tsx server/seed-stripe-products.ts
import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating Formal Findings subscription products...');

  // Check if products already exist
  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'formal_findings'" 
  });

  if (existingProducts.data.length > 0) {
    console.log('Products already exist. Skipping creation.');
    console.log('Existing products:', existingProducts.data.map(p => ({ id: p.id, name: p.name })));
    return;
  }

  // Create The Tailored Circle (Premium) product
  const premiumProduct = await stripe.products.create({
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

  // Create price for Premium ($19.99/month)
  const premiumPrice = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 1999, // $19.99 in cents
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  console.log('Created The Tailored Circle:', { 
    productId: premiumProduct.id, 
    priceId: premiumPrice.id 
  });

  // Create The Krug Society (Platinum) product
  const platinumProduct = await stripe.products.create({
    name: 'The Krug Society',
    description: 'Platinum membership with exclusive access to auctions and wardrobes',
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

  // Create price for Platinum ($49.99/month)
  const platinumPrice = await stripe.prices.create({
    product: platinumProduct.id,
    unit_amount: 4999, // $49.99 in cents
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  console.log('Created The Krug Society:', { 
    productId: platinumProduct.id, 
    priceId: platinumPrice.id 
  });

  console.log('\nProducts created successfully!');
  console.log('These will sync to the database automatically via webhooks.');
}

createProducts().catch(console.error);
