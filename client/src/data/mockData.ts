/**
 * Mock data for frontend-only mode. Replaces all API responses.
 */

import type {
  User,
  Profile,
  Photo,
  Event,
  EventWithDetails,
  WardrobeItem,
  ConversationWithParticipants,
  MessageWithSender,
  SoireeMessageWithSender,
  Auction,
  Bid,
  AuctionWithDetails,
} from "@/types";

const DEMO_USER_ID = "demo-user-1";

export const MOCK_USER: User = {
  id: DEMO_USER_ID,
  email: "demo@example.com",
  firstName: "Demo",
  lastName: "User",
  profileImageUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_PROFILE: Profile = {
  id: 1,
  userId: DEMO_USER_ID,
  displayName: "Demo User",
  bio: "A demo profile for Formal Findings.",
  birthDate: null,
  ageVerified: true,
  latitude: 29.76,
  longitude: -95.37,
  locationName: "Houston, TX",
  isVisible: true,
  styleInterests: "Classic, Modern",
  role: null,
  hairColor: null,
  eyeColor: null,
  build: null,
  ethnicity: null,
  height: null,
  weight: null,
  wardrobePublic: false,
  lastActiveAt: new Date().toISOString(),
  isUnderDressed: false,
};

export const MOCK_PHOTOS: Photo[] = [];

export const MOCK_EVENTS: EventWithDetails[] = [
  {
    id: 1,
    hostId: DEMO_USER_ID,
    title: "Black Tie Soirée",
    slug: "black-tie-soiree",
    description: "An evening of formal attire and good company.",
    category: "black_tie_meetup",
    eventDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    startAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    endAt: new Date(Date.now() + 86400000 * 7 + 7200000).toISOString(),
    timezone: "America/Chicago",
    location: "Houston",
    locationName: "The Grand Ballroom",
    locationAddress: "123 Main St, Houston, TX",
    latitude: 29.76,
    longitude: -95.37,
    coverImageUrl: null,
    rsvpUrl: null,
    priceCents: 0,
    currency: "USD",
    maxAttendees: 50,
    isPublic: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    host: { userId: DEMO_USER_ID, displayName: "Demo User", profileImageUrl: null },
    attendeeCount: 3,
    isAttending: true,
    attendees: [],
  },
  {
    id: 2,
    hostId: DEMO_USER_ID,
    title: "Suit & Tie Meetup",
    slug: "suit-tie-meetup",
    description: "Casual meetup for suit enthusiasts.",
    category: "suit_as_rag",
    eventDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    startAt: new Date(Date.now() + 86400000 * 14).toISOString(),
    endAt: new Date(Date.now() + 86400000 * 14 + 7200000).toISOString(),
    timezone: "America/Chicago",
    location: "Houston",
    locationName: "Downtown Lounge",
    locationAddress: "456 Oak Ave, Houston, TX",
    latitude: 29.77,
    longitude: -95.38,
    coverImageUrl: null,
    rsvpUrl: null,
    priceCents: null,
    currency: "USD",
    maxAttendees: 20,
    isPublic: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    host: { userId: DEMO_USER_ID, displayName: "Demo User", profileImageUrl: null },
    attendeeCount: 0,
    isAttending: false,
    attendees: [],
  },
];

export const MOCK_WARDROBE: WardrobeItem[] = [
  {
    id: 1,
    userId: DEMO_USER_ID,
    name: "Navy Blue Suit",
    category: "suits",
    description: "Classic two-piece.",
    brand: "Demo Brand",
    color: "Navy",
    imageUrl: null,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const MOCK_FAVORITES: { userId: string; displayName: string | null; profileImageUrl: string | null }[] = [];

export const MOCK_CONVERSATIONS: ConversationWithParticipants[] = [];

export const MOCK_MESSAGES: MessageWithSender[] = [];

export const MOCK_WHOS_ON: (Profile & { userId: string })[] = [
  { ...MOCK_PROFILE, userId: DEMO_USER_ID },
];

export const MOCK_SOIREE_MESSAGES: SoireeMessageWithSender[] = [];

export const MOCK_SUBSCRIPTION = {
  isPremium: false,
  isPlatinum: false,
  isAdmin: false,
  tier: "free" as const,
  status: null as string | null,
  plan: null as string | null,
  endDate: null as string | null,
  messagesRemaining: null as number | null,
  messageLimit: null as number | null,
};

export const MOCK_AUCTIONS: AuctionWithDetails[] = [];

export const MOCK_BIDS: Bid[] = [];

export const MOCK_PRICES = [
  { id: "price_1", nickname: "Premium", unit_amount: 999, currency: "usd" },
  { id: "price_2", nickname: "Platinum", unit_amount: 1999, currency: "usd" },
];

export const MOCK_ADMIN_STATS = {
  totalMembers: 1,
  premiumMembers: 0,
  platinumMembers: 0,
};

export const MOCK_ADMIN_MEMBERS = [
  {
    userId: DEMO_USER_ID,
    email: MOCK_USER.email,
    displayName: MOCK_PROFILE.displayName,
    tier: "free",
    subscriptionStatus: null,
  },
];

export const MOCK_WARDROBE_ACCESS: { id: number; grantedUserId: string; displayName: string; profileImageUrl: string | null; createdAt: string }[] = [];
export const MOCK_PHOTO_ACCESS: { id: number; grantedUserId: string; displayName: string; profileImageUrl: string | null; createdAt: string }[] = [];
export const MOCK_UNREAD_COUNT = { count: 0 };

/**
 * Resolve mock data for a given query key (e.g. ["/api/auth/user"] or ["/api/events", "black-tie-soiree"]).
 */
export function getMockData(queryKey: unknown[]): unknown {
  const path = Array.isArray(queryKey) ? String(queryKey[0]) : "";
  if (path === "/api/auth/user") return MOCK_USER;
  if (path === "/api/profiles/me") return MOCK_PROFILE;
  if (path === "/api/subscription") return MOCK_SUBSCRIPTION;
  if (path === "/api/favorites") return MOCK_FAVORITES;
  if (path === "/api/wardrobe") return MOCK_WARDROBE;
  if (path === "/api/whos-on") return MOCK_WHOS_ON;
  if (path === "/api/soiree/messages") return MOCK_SOIREE_MESSAGES;
  if (path === "/api/conversations") return MOCK_CONVERSATIONS;
  if (path === "/api/auctions") return MOCK_AUCTIONS;
  if (path === "/api/prices") return MOCK_PRICES;
  if (path === "/api/admin/stats") return MOCK_ADMIN_STATS;
  if (path === "/api/admin/members") return MOCK_ADMIN_MEMBERS;
  if (path === "/api/wardrobe-access") return MOCK_WARDROBE_ACCESS;
  if (path === "/api/photo-access") return MOCK_PHOTO_ACCESS;
  if (path === "/api/messages/unread-count") return MOCK_UNREAD_COUNT;

  if (path === "/api/events") {
    if (queryKey[1] && typeof queryKey[1] === "string" && !queryKey[1].startsWith("{")) {
      const slug = String(queryKey[1]);
      return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
    }
    return MOCK_EVENTS.filter((e) => e.isPublished);
  }
  if (path.startsWith("/api/events/") && queryKey[1]) {
    const slug = String(queryKey[1]);
    return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
  }

  if (path === "/api/internal/events") {
    if (queryKey[1] !== undefined) {
      const id = Number(queryKey[1]);
      return MOCK_EVENTS.find((e) => e.id === id) ?? null;
    }
    return MOCK_EVENTS;
  }

  if (path.startsWith("/api/profiles/") && queryKey[1]) {
    const userId = String(queryKey[1]);
    if (userId === DEMO_USER_ID) return { ...MOCK_PROFILE, userId: DEMO_USER_ID };
    return { userId, displayName: "Other User", bio: null, profileImageUrl: null, styleInterests: null, role: null, interestType: null, categories: null, hairColor: null, eyeColor: null, build: null, ethnicity: null, height: null, weight: null, bodyHair: null, hivStatus: null, onPrep: null, lastStdScreening: null };
  }

  if (path.startsWith("/api/wardrobe-access/check/") || path.startsWith("/api/photo-access/check/")) return { allowed: false };
  if (path.startsWith("/api/profiles/") && queryKey[2] === "wardrobe") return MOCK_WARDROBE;
  if (path.startsWith("/api/photos/")) {
    if (queryKey[1] === "me") return MOCK_PHOTOS;
    return MOCK_PHOTOS;
  }

  if (path === "/api/conversations" && queryKey[2] === "messages") return MOCK_MESSAGES;

  if (path.startsWith("/api/auctions/") && queryKey[2] === "bids") return MOCK_BIDS;

  if (path === "/api/admin/verify") return { valid: true };
  if (path === "/api/admin/events") return MOCK_EVENTS;
  if (path.startsWith("/api/admin/events/")) {
    const slug = String(queryKey[1]);
    return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
  }

  return null;
}
