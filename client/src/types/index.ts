/**
 * Frontend-only types (no backend/database dependencies).
 * Replaces @shared/schema and @shared/models/auth for the client.
 */

import { z } from "zod";

// ----- Auth / User -----
export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ----- Profile -----
export interface Profile {
  id: number;
  userId: string;
  displayName: string | null;
  bio: string | null;
  birthDate: string | null;
  ageVerified: boolean | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  isVisible: boolean | null;
  styleInterests: string | null;
  role: string | null;
  hairColor: string | null;
  eyeColor: string | null;
  build: string | null;
  ethnicity: string | null;
  height: string | null;
  weight: string | null;
  wardrobePublic: boolean | null;
  lastActiveAt: string | null;
  isUnderDressed: boolean | null;
  [key: string]: unknown;
}

export type UpdateProfileRequest = Partial<Omit<Profile, "id" | "userId">>;

// ----- Photo -----
export interface Photo {
  id: number;
  userId: string;
  url: string;
  isPublic: boolean | null;
  isProfilePhoto: boolean | null;
  isFaceless: boolean | null;
  caption: string | null;
  displayOrder: number | null;
  positionX: number | null;
  positionY: number | null;
  createdAt: string | null;
}

export interface InsertPhoto {
  url: string;
  isPublic?: boolean;
  isProfilePhoto?: boolean;
  isFaceless?: boolean;
  caption?: string | null;
  displayOrder?: number;
  positionX?: number;
  positionY?: number;
}

// ----- Events -----
export const eventCategories = [
  "drinks_only",
  "dinner_cocktails",
  "side_enjoyment",
  "tying_more_than_tie",
  "black_tie_meetup",
  "sock_enjoyment",
  "suit_as_rag",
  "one_suit_for_all",
  "group_meeting",
] as const;

export type EventCategory = (typeof eventCategories)[number];

export interface Event {
  id: number;
  hostId: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  eventDate: string | null;
  startAt: string;
  endAt: string | null;
  timezone: string | null;
  location: string | null;
  locationName: string | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  rsvpUrl: string | null;
  priceCents: number | null;
  currency: string | null;
  maxAttendees: number | null;
  isPublic: boolean | null;
  isPublished: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EventWithDetails extends Event {
  host: { userId: string; displayName: string | null; profileImageUrl: string | null };
  attendeeCount: number;
  isAttending: boolean;
  attendees?: { userId: string; displayName: string | null; profileImageUrl: string | null; status: string }[];
}

// ----- Wardrobe -----
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
  "other",
] as const;

export type WardrobeCategory = (typeof wardrobeCategories)[number];

export interface WardrobeItem {
  id: number;
  userId: string;
  name: string;
  category: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  imageUrl: string | null;
  isFavorite: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ----- Auctions -----
export interface Auction {
  id: number;
  sellerId: string;
  wardrobeItemId: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  startingPrice: number;
  currentPrice: number;
  buyNowPrice: number | null;
  status: string;
  endDate: string;
  winnerId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Bid {
  id: number;
  auctionId: number;
  bidderId: string;
  amount: number;
  createdAt: string | null;
}

export interface AuctionWithDetails extends Auction {
  seller: { displayName: string | null };
  bidCount: number;
  highestBidder?: { displayName: string | null };
}

// ----- Conversations & Messages -----
export interface ConversationWithParticipants {
  id: number;
  name: string | null;
  isGroup: boolean | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  participants: { userId: string; displayName: string | null; profileImageUrl: string | null }[];
  lastMessage?: { id: number; content: string | null; createdAt: string } | null;
  unreadCount?: number;
}

export interface MessageWithSender {
  id: number;
  conversationId: number;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  sender: { displayName: string | null; profileImageUrl: string | null };
}

// ----- Soiree -----
export interface SoireeMessageWithSender {
  id: number;
  senderId: string;
  content: string;
  createdAt: string | null;
  senderName: string | null;
  senderProfileImageUrl: string | null;
}

// ----- Map -----
export interface MapUser {
  id: string;
  displayName: string | null;
  profileImageUrl: string | null;
  latitude: number;
  longitude: number;
  bio: string | null;
  styleInterests: string | null;
  updatedAt: string | null;
}

// ----- Profile form schema (for react-hook-form) -----
export const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .refine(
      (val) => val.toLowerCase() !== "unknown" && val !== "?",
      "Please choose a proper display name"
    ),
  bio: z.string().optional(),
  styleInterests: z.string().optional(),
  role: z.string().optional(),
  hairColor: z.string().optional(),
  eyeColor: z.string().optional(),
  build: z.string().optional(),
  ethnicity: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  contactInfo: z.string().optional(),
  locationName: z.string().optional(),
  wardrobePublic: z.boolean().optional(),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ----- Helpers -----
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
