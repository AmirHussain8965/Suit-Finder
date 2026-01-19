import { db } from "./db";
import { users } from "@shared/models/auth";
import { profiles } from "@shared/schema";
import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");

  // clear existing data for clean seed (optional, be careful in prod)
  // await db.delete(profiles).execute();
  // await db.delete(users).execute();

  const demoUsers = [
    {
      email: "james.bond@example.com",
      firstName: "James",
      lastName: "Bond",
      profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
      displayName: "007",
      bio: "Shaken, not stirred. Prefer classic black tie.",
      styleInterests: "Tuxedos, Tom Ford, Omega",
      latitude: 40.7128,
      longitude: -74.0060, // NYC
    },
    {
      email: "harvey.specter@example.com",
      firstName: "Harvey",
      lastName: "Specter",
      profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Harvey",
      displayName: "The Closer",
      bio: "I don't play the odds, I play the man. Windsor knots only.",
      styleInterests: "Tom Ford, Three-piece suits, Wide lapels",
      latitude: 40.7300,
      longitude: -73.9950, // NYC
    },
    {
      email: "barney.stinson@example.com",
      firstName: "Barney",
      lastName: "Stinson",
      profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Barney",
      displayName: "Legendary",
      bio: "Suit up!",
      styleInterests: "Italian silk, Skinny ties",
      latitude: 40.7580,
      longitude: -73.9855, // Times Square
    }
  ];

  for (const u of demoUsers) {
    // 1. Create auth user
    // We use a random ID for simplicity, or we could specify one
    const [user] = await db.insert(users).values({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImageUrl: u.profileImageUrl,
    }).returning();

    // 2. Create profile
    await storage.createProfile({
      userId: user.id,
      displayName: u.displayName,
      bio: u.bio,
      styleInterests: u.styleInterests,
      latitude: u.latitude,
      longitude: u.longitude,
      isVisible: true,
      locationUpdatedAt: new Date(),
    });
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
