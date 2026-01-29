import { db } from "./db";
import { events, users } from "@shared/schema";

async function seedEvents() {
  console.log("Seeding sample events...");

  // Get first user from database
  const [firstUser] = await db.select().from(users).limit(1);
  if (!firstUser) {
    console.log("No users found in database. Create a user first.");
    return;
  }
  const hostId = firstUser.id;
  console.log(`Using host: ${hostId}`);

  const now = new Date();
  
  // 1 past event
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - 30);
  
  // 2 upcoming events
  const upcoming1 = new Date(now);
  upcoming1.setDate(upcoming1.getDate() + 14);
  
  const upcoming2 = new Date(now);
  upcoming2.setDate(upcoming2.getDate() + 45);

  const sampleEvents = [
    {
      hostId,
      title: "Spring Gala 2025",
      slug: "spring-gala-2025",
      description: "An elegant evening of fine dining and networking with fellow gentlemen. Black tie required.",
      category: "black_tie_meetup",
      eventDate: pastDate,
      startAt: pastDate,
      endAt: new Date(pastDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours later
      timezone: "America/Chicago",
      locationName: "The Grand Ballroom",
      locationAddress: "123 Main Street, Chicago, IL 60601",
      coverImageUrl: null,
      rsvpUrl: "https://example.com/rsvp/spring-gala",
      priceCents: 15000, // $150.00
      currency: "USD",
      isPublic: true,
      isPublished: true,
    },
    {
      hostId,
      title: "Summer Cocktail Hour",
      slug: "summer-cocktail-hour",
      description: "Join us for an afternoon of craft cocktails and sophisticated conversation on the rooftop terrace.",
      category: "drinks_only",
      eventDate: upcoming1,
      startAt: upcoming1,
      endAt: new Date(upcoming1.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
      timezone: "America/Chicago",
      locationName: "Rooftop Lounge at The Metropolitan",
      locationAddress: "456 Lake Shore Drive, Chicago, IL 60611",
      coverImageUrl: null,
      rsvpUrl: null,
      priceCents: 5000, // $50.00
      currency: "USD",
      isPublic: true,
      isPublished: true,
    },
    {
      hostId,
      title: "Autumn Dinner & Discussion",
      slug: "autumn-dinner-discussion",
      description: "A formal dinner followed by a roundtable discussion on classic menswear and timeless style. Jacket required.",
      category: "dinner_cocktails",
      eventDate: upcoming2,
      startAt: upcoming2,
      endAt: new Date(upcoming2.getTime() + 5 * 60 * 60 * 1000), // 5 hours later
      timezone: "America/New_York",
      locationName: "The Gentleman's Club",
      locationAddress: "789 Fifth Avenue, New York, NY 10022",
      coverImageUrl: null,
      rsvpUrl: "https://example.com/rsvp/autumn-dinner",
      priceCents: 20000, // $200.00
      currency: "USD",
      isPublic: true,
      isPublished: true,
    },
  ];

  for (const event of sampleEvents) {
    try {
      const [created] = await db.insert(events).values(event).returning();
      console.log(`  Created: ${created.title} (id: ${created.id})`);
    } catch (err: any) {
      console.log(`  Error creating ${event.title}: ${err.message}`);
    }
  }

  console.log("Done seeding events!");
}

seedEvents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error seeding events:", err);
    process.exit(1);
  });
