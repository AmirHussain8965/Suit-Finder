import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
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
  // Age verification
  birthDate: timestamp("birth_date"),
  ageVerified: boolean("age_verified").default(false),
  // Location data
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  physicalLatitude: doublePrecision("physical_latitude"),
  physicalLongitude: doublePrecision("physical_longitude"),
  locationUpdatedAt: timestamp("location_updated_at"),
  isVisible: boolean("is_visible").default(true),
  isTraveling: boolean("is_traveling").default(false),
  // Style preferences
  styleInterests: text("style_interests"), // e.g. "Tuxedos, Vintage, Modern"
  role: text("role"), // "submissive", "dominant", "vers"
  interestType: text("interest_type"), // "styling", "fetish"
  categories: jsonb("categories"), // Array of { name: string, mode: 'give' | 'receive' | 'both' }
  contactInfo: text("contact_info"), // Optional contact method
  // Physical description
  hairColor: text("hair_color"),
  eyeColor: text("eye_color"),
  build: text("build"), // athletic, large, slim, regular
  ethnicity: text("ethnicity"),
  height: text("height"), // stored as string like "5'10" or "178cm"
  weight: text("weight"), // stored as string like "180lbs" or "82kg"
  bodyHair: text("body_hair"), // smooth, hairy, trimmed
  // Health info
  hivStatus: text("hiv_status"), // negative, positive, undetectable, prefer not to say
  onPrep: boolean("on_prep"),
  lastStdScreening: timestamp("last_std_screening"),
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

// Photos table for user galleries
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id),
  url: text("url").notNull(),
  isPublic: boolean("is_public").default(true),
  isProfilePhoto: boolean("is_profile_photo").default(false),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const photosRelations = relations(photos, ({ one }) => ({
  user: one(authUsers, {
    fields: [photos.userId],
    references: [authUsers.id],
  }),
}));

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  url: z.string().url("Must be a valid URL").max(2000, "URL too long"),
});

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;

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

// Conversations table - supports both 1-on-1 and group chats
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: text("name"), // Optional name for group chats
  isGroup: boolean("is_group").default(false),
  createdBy: text("created_by").notNull().references(() => authUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  creator: one(authUsers, {
    fields: [conversations.createdBy],
    references: [authUsers.id],
  }),
  participants: many(conversationParticipants),
  messages: many(messages),
}));

// Conversation participants - tracks who is in each conversation
export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  userId: text("user_id").notNull().references(() => authUsers.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(authUsers, {
    fields: [conversationParticipants.userId],
    references: [authUsers.id],
  }),
}));

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: text("sender_id").notNull().references(() => authUsers.id),
  content: text("content"),
  imageUrl: text("image_url"), // For photo messages
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(authUsers, {
    fields: [messages.senderId],
    references: [authUsers.id],
  }),
}));

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  senderId: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;

// Extended types for frontend
export type ConversationWithParticipants = Conversation & {
  participants: { userId: string; displayName: string | null; profileImageUrl: string | null }[];
  lastMessage?: Message | null;
  unreadCount?: number;
};

export type MessageWithSender = Message & {
  sender: { displayName: string | null; profileImageUrl: string | null };
};
