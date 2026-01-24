import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users as authUsers } from "./models/auth";
import { relations } from "drizzle-orm";

// Re-export auth models
export * from "./models/auth";

// Extend the users table from auth or define extra profile data
// Since auth.ts defines 'users', we can add fields to it in a migration or just use a separate 'profiles' table linked to users.
// However, the blueprint says "The users and sessions tables are mandatory - don't drop them".
// But we can usually EXTEND them if we modify the file or add a new table.
// To be safe and modular, let's create a 'profiles' table that references 'users.id'.
// Actually, modifying shared/models/auth.ts is risky if the blueprint updates. 
// But the instructions say "export * from ./models/auth".
// Let's use a separate table for app-specific user data to keep it clean.

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id),
  displayName: text("display_name"),
  bio: text("bio"),
  // Location data
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  locationUpdatedAt: timestamp("location_updated_at"),
  isVisible: boolean("is_visible").default(true),
  // Style preferences
  styleInterests: text("style_interests"), // e.g. "Tuxedos, Vintage, Modern"
  role: text("role"), // "submissive", "dominant", "vers"
  interestType: text("interest_type"), // "styling", "fetish"
  contactInfo: text("contact_info"), // Optional contact method
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(authUsers, {
    fields: [profiles.userId],
    references: [authUsers.id],
  }),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({ 
  id: true, 
  userId: true,
  locationUpdatedAt: true 
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

// API Schemas
export type CreateProfileRequest = InsertProfile;
export type UpdateProfileRequest = Partial<InsertProfile>;

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id),
  targetUserId: text("target_user_id").notNull().references(() => authUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(authUsers, {
    fields: [favorites.userId],
    references: [authUsers.id],
    relationName: "user_favorites",
  }),
  targetUser: one(authUsers, {
    fields: [favorites.targetUserId],
    references: [authUsers.id],
    relationName: "favorite_target",
  }),
}));

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

// Combined User + Profile for the frontend
export type UserWithProfile = {
  user: typeof authUsers.$inferSelect;
  profile: Profile | null;
};

// Response for map pins
export type MapUser = {
  id: string; // userId
  displayName: string | null;
  profileImageUrl: string | null;
  latitude: number;
  longitude: number;
  bio: string | null;
  styleInterests: string | null;
  updatedAt: Date | null;
};
