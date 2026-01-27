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
  role: text("role"), // "Top", "Bottom", "Vers"
  interestType: text("interest_type"), // Legacy field - no longer used in UI
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
  // Privacy settings
  wardrobePublic: boolean("wardrobe_public").default(false), // Allow others to view wardrobe
  // Online status
  lastActiveAt: timestamp("last_active_at"),
  isUnderDressed: boolean("is_under_dressed").default(false), // Invisible mode - don't show as online
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
  isFaceless: boolean("is_faceless").default(false),
  caption: text("caption"),
  displayOrder: integer("display_order").default(0),
  positionX: integer("position_x").default(50),
  positionY: integer("position_y").default(50),
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
  url: z.string().max(2000, "URL too long").refine(
    (val) => val.startsWith('/objects/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: "Must be a valid URL or object storage path" }
  ),
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

// Wardrobe access permissions - tracks who can view each user's wardrobe
export const wardrobeAccess = pgTable("wardrobe_access", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => authUsers.id), // The wardrobe owner
  grantedUserId: text("granted_user_id").notNull().references(() => authUsers.id), // User who can view
  createdAt: timestamp("created_at").defaultNow(),
});

export const wardrobeAccessRelations = relations(wardrobeAccess, ({ one }) => ({
  owner: one(authUsers, {
    fields: [wardrobeAccess.ownerId],
    references: [authUsers.id],
    relationName: "wardrobe_owner",
  }),
  grantedUser: one(authUsers, {
    fields: [wardrobeAccess.grantedUserId],
    references: [authUsers.id],
    relationName: "wardrobe_viewer",
  }),
}));

export type WardrobeAccess = typeof wardrobeAccess.$inferSelect;

// Photo access permissions - tracks who can view each user's private photos
export const photoAccess = pgTable("photo_access", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => authUsers.id), // The photo owner
  grantedUserId: text("granted_user_id").notNull().references(() => authUsers.id), // User who can view
  createdAt: timestamp("created_at").defaultNow(),
});

export const photoAccessRelations = relations(photoAccess, ({ one }) => ({
  owner: one(authUsers, {
    fields: [photoAccess.ownerId],
    references: [authUsers.id],
    relationName: "photo_owner",
  }),
  grantedUser: one(authUsers, {
    fields: [photoAccess.grantedUserId],
    references: [authUsers.id],
    relationName: "photo_viewer",
  }),
}));

export type PhotoAccess = typeof photoAccess.$inferSelect;

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

// Event categories
export const eventCategories = [
  "drinks_only",
  "dinner_cocktails", 
  "side_enjoyment",
  "tying_more_than_tie",
  "black_tie_meetup",
  "sock_enjoyment",
  "suit_as_rag",
  "one_suit_for_all",
  "group_meeting"
] as const;

export type EventCategory = typeof eventCategories[number];

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  hostId: text("host_id").notNull().references(() => authUsers.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // One of eventCategories
  eventDate: timestamp("event_date").notNull(),
  location: text("location"), // General location description (not exact)
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  maxAttendees: integer("max_attendees"),
  isPublic: boolean("is_public").default(true), // If false, invite-only
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(authUsers, {
    fields: [events.hostId],
    references: [authUsers.id],
  }),
  attendees: many(eventAttendees),
}));

// Event attendees table
export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: text("user_id").notNull().references(() => authUsers.id),
  status: text("status").notNull().default("pending"), // pending, approved, declined
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendees.eventId],
    references: [events.id],
  }),
  user: one(authUsers, {
    fields: [eventAttendees.userId],
    references: [authUsers.id],
  }),
}));

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  hostId: true,
});

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  joinedAt: true,
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;

// Extended types for frontend
export type EventWithDetails = Event & {
  host: { userId: string; displayName: string | null; profileImageUrl: string | null };
  attendeeCount: number;
  isAttending: boolean;
  attendees?: { userId: string; displayName: string | null; profileImageUrl: string | null; status: string }[];
};

// Wardrobe categories
export const wardrobeCategories = [
  "suits",
  "jackets",
  "shirts",
  "ties",
  "pocket_squares",
  "shoes",
  "belts",
  "watches",
  "cufflinks",
  "accessories",
  "pants",
  "vests",
  "overcoats",
  "other"
] as const;

export type WardrobeCategory = typeof wardrobeCategories[number];

// Wardrobe items table
export const wardrobeItems = pgTable("wardrobe_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id),
  name: text("name").notNull(),
  category: text("category").notNull(), // One of wardrobeCategories
  description: text("description"),
  brand: text("brand"),
  color: text("color"),
  imageUrl: text("image_url"),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wardrobeItemsRelations = relations(wardrobeItems, ({ one }) => ({
  user: one(authUsers, {
    fields: [wardrobeItems.userId],
    references: [authUsers.id],
  }),
}));

export const insertWardrobeItemSchema = createInsertSchema(wardrobeItems).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = z.infer<typeof insertWardrobeItemSchema>;

// Auction statuses
export const auctionStatuses = ["active", "ended", "cancelled"] as const;
export type AuctionStatus = typeof auctionStatuses[number];

// Auctions table
export const auctions = pgTable("auctions", {
  id: serial("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => authUsers.id),
  wardrobeItemId: integer("wardrobe_item_id").references(() => wardrobeItems.id),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  startingPrice: integer("starting_price").notNull(), // In cents
  currentPrice: integer("current_price").notNull(), // In cents
  buyNowPrice: integer("buy_now_price"), // Optional buy now price in cents
  status: text("status").notNull().default("active"),
  endDate: timestamp("end_date").notNull(),
  winnerId: text("winner_id").references(() => authUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auctionsRelations = relations(auctions, ({ one, many }) => ({
  seller: one(authUsers, {
    fields: [auctions.sellerId],
    references: [authUsers.id],
  }),
  winner: one(authUsers, {
    fields: [auctions.winnerId],
    references: [authUsers.id],
  }),
  wardrobeItem: one(wardrobeItems, {
    fields: [auctions.wardrobeItemId],
    references: [wardrobeItems.id],
  }),
  bids: many(bids),
}));

// Bids table
export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  auctionId: integer("auction_id").notNull().references(() => auctions.id),
  bidderId: text("bidder_id").notNull().references(() => authUsers.id),
  amount: integer("amount").notNull(), // In cents
  createdAt: timestamp("created_at").defaultNow(),
});

export const bidsRelations = relations(bids, ({ one }) => ({
  auction: one(auctions, {
    fields: [bids.auctionId],
    references: [auctions.id],
  }),
  bidder: one(authUsers, {
    fields: [bids.bidderId],
    references: [authUsers.id],
  }),
}));

export const insertAuctionSchema = createInsertSchema(auctions).omit({
  id: true,
  sellerId: true,
  currentPrice: true,
  status: true,
  winnerId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  bidderId: true,
  createdAt: true,
});

export type Auction = typeof auctions.$inferSelect;
export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;

export type AuctionWithDetails = Auction & {
  seller: { displayName: string | null };
  bidCount: number;
  highestBidder?: { displayName: string | null };
};

// Report reasons
export const reportReasons = [
  "harassment",
  "inappropriate_content", 
  "fake_profile",
  "underage",
  "spam",
  "threats",
  "non_consensual",
  "other"
] as const;
export type ReportReason = typeof reportReasons[number];

// Reports table for flagging bad behavior
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => authUsers.id),
  reportedUserId: text("reported_user_id").notNull().references(() => authUsers.id),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, reviewed, resolved, dismissed
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(authUsers, {
    fields: [reports.reporterId],
    references: [authUsers.id],
  }),
  reportedUser: one(authUsers, {
    fields: [reports.reportedUserId],
    references: [authUsers.id],
  }),
}));

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  reporterId: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  reviewNotes: true,
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
