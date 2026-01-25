import { db } from "./db";
import {
  profiles,
  favorites,
  photos,
  conversations,
  conversationParticipants,
  messages,
  events,
  eventAttendees,
  wardrobeItems,
  wardrobeAccess,
  auctions,
  bids,
  reports,
  type Profile,
  type InsertProfile,
  type UpdateProfileRequest,
  type Favorite,
  type Photo,
  type InsertPhoto,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type ConversationWithParticipants,
  type MessageWithSender,
  type Event,
  type InsertEvent,
  type EventAttendee,
  type EventWithDetails,
  type WardrobeItem,
  type InsertWardrobeItem,
  type WardrobeAccess,
  type Auction,
  type InsertAuction,
  type Bid,
  type InsertBid,
  type Report,
  type InsertReport,
} from "@shared/schema";
import { eq, sql, and, desc, inArray, gte, or } from "drizzle-orm";

// Fuzz location within approximately 500 feet (~150m) for privacy
// Uses haversine-based destination point formula for accuracy
function fuzzLocation(lat: number, lng: number): { lat: number; lng: number } {
  // 500 feet in meters = 152.4 meters
  const fuzzDistanceMeters = 152.4;
  
  // Earth's radius in meters
  const R = 6371000;
  
  // Random bearing (0-360 degrees) and distance (uniform within circle)
  const bearing = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * fuzzDistanceMeters;
  
  // Convert to radians
  const lat1 = lat * Math.PI / 180;
  const lng1 = lng * Math.PI / 180;
  const angularDistance = distance / R;
  
  // Destination point formula (simplified for small distances)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return {
    lat: lat2 * 180 / Math.PI,
    lng: lng2 * 180 / Math.PI,
  };
}

export interface IStorage {
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: UpdateProfileRequest): Promise<Profile>;
  updateLocation(userId: string, lat: number, lng: number): Promise<Profile>;
  getNearbyProfiles(lat?: number, lng?: number, radiusKm?: number): Promise<Profile[]>;
  verifyAge(userId: string, birthDate: Date): Promise<Profile>;
  
  // Favorites
  getFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(userId: string, targetUserId: string): Promise<void>;
  removeFavorite(userId: string, targetUserId: string): Promise<void>;
  isFavorite(userId: string, targetUserId: string): Promise<boolean>;
  
  // Photos
  getPhotos(userId: string, includePrivate?: boolean): Promise<Photo[]>;
  getProfilePhoto(userId: string): Promise<Photo | undefined>;
  addPhoto(userId: string, data: InsertPhoto): Promise<Photo>;
  updatePhoto(userId: string, photoId: number, updates: Partial<InsertPhoto>): Promise<Photo>;
  deletePhoto(userId: string, photoId: number): Promise<void>;
  setProfilePhoto(userId: string, photoId: number): Promise<Photo>;
  
  // Conversations
  getConversations(userId: string): Promise<ConversationWithParticipants[]>;
  getConversation(conversationId: number, userId: string): Promise<ConversationWithParticipants | undefined>;
  createConversation(userId: string, participantIds: string[], name?: string, isGroup?: boolean): Promise<Conversation>;
  getOrCreateDirectConversation(userId: string, otherUserId: string): Promise<Conversation>;
  addParticipantsToConversation(conversationId: number, userIds: string[]): Promise<void>;
  
  // Messages
  getMessages(conversationId: number, userId: string, limit?: number, offset?: number): Promise<MessageWithSender[]>;
  sendMessage(conversationId: number, senderId: string, content?: string, imageUrl?: string): Promise<Message>;
  markConversationRead(conversationId: number, userId: string): Promise<void>;
  
  // Events
  createEvent(hostId: string, data: InsertEvent): Promise<Event>;
  getEvents(userId: string): Promise<EventWithDetails[]>;
  getEvent(eventId: number, userId: string): Promise<EventWithDetails | undefined>;
  getHostEvents(hostId: string, userId: string): Promise<EventWithDetails[]>;
  joinEvent(eventId: number, userId: string): Promise<EventAttendee>;
  leaveEvent(eventId: number, userId: string): Promise<void>;
  updateAttendeeStatus(eventId: number, hostId: string, userId: string, status: string): Promise<EventAttendee>;
  deleteEvent(eventId: number, hostId: string): Promise<void>;
  isEventParticipant(eventId: number, userId: string): Promise<boolean>;
  
  // Wardrobe
  getWardrobeItems(userId: string, category?: string): Promise<WardrobeItem[]>;
  getWardrobeItem(userId: string, itemId: number): Promise<WardrobeItem | undefined>;
  createWardrobeItem(userId: string, data: InsertWardrobeItem): Promise<WardrobeItem>;
  updateWardrobeItem(userId: string, itemId: number, updates: Partial<InsertWardrobeItem>): Promise<WardrobeItem>;
  deleteWardrobeItem(userId: string, itemId: number): Promise<void>;
  toggleWardrobeFavorite(userId: string, itemId: number): Promise<WardrobeItem>;
  
  // Wardrobe Access
  getWardrobeAccessList(ownerId: string): Promise<WardrobeAccess[]>;
  grantWardrobeAccess(ownerId: string, grantedUserId: string): Promise<WardrobeAccess>;
  revokeWardrobeAccess(ownerId: string, grantedUserId: string): Promise<void>;
  hasWardrobeAccess(ownerId: string, viewerId: string): Promise<boolean>;
  
  // Auctions
  getAuctions(userId?: string): Promise<AuctionWithDetails[]>;
  getAuction(auctionId: number): Promise<AuctionWithDetails | undefined>;
  createAuction(sellerId: string, data: InsertAuction): Promise<Auction>;
  updateAuction(auctionId: number, sellerId: string, updates: Partial<InsertAuction>): Promise<Auction>;
  deleteAuction(auctionId: number, sellerId: string): Promise<void>;
  endAuction(auctionId: number, sellerId: string): Promise<Auction>;
  
  // Bids
  getBids(auctionId: number): Promise<BidWithBidder[]>;
  placeBid(auctionId: number, bidderId: string, amount: number): Promise<Bid>;
  
  // Reports
  createReport(reporterId: string, data: InsertReport): Promise<Report>;
  getReportsByUser(reportedUserId: string): Promise<Report[]>;
}

export interface AuctionWithDetails extends Auction {
  seller: { id: string; displayName: string | null } | null;
  winner: { id: string; displayName: string | null } | null;
  wardrobeItem: WardrobeItem | null;
  bidCount: number;
  highestBid: number | null;
}

export interface BidWithBidder extends Bid {
  bidder: { id: string; displayName: string | null } | null;
}

export class DatabaseStorage implements IStorage {
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [newProfile] = await db.insert(profiles).values(profile).returning();
    return newProfile;
  }

  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<Profile> {
    // Check if profile exists first
    const existing = await this.getProfile(userId);
    
    if (!existing) {
      // Create it if it doesn't exist (handle lazy creation)
      // We need userId which is in the updates if called correctly, or passed as arg
      return this.createProfile({ ...updates, userId } as InsertProfile);
    }

    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  async updateLocation(userId: string, lat: number, lng: number, physicalLat?: number, physicalLng?: number): Promise<Profile> {
    const existing = await this.getProfile(userId);
    
    // Fuzz the location for privacy (within half a mile)
    const fuzzed = fuzzLocation(lat, lng);
    
    // Calculate if traveling: if physical location is known and differs from map location
    let isTraveling = false;
    const pLat = physicalLat ?? (existing?.physicalLatitude);
    const pLng = physicalLng ?? (existing?.physicalLongitude);

    if (pLat && pLng) {
      // Very simple distance check: if more than ~1km away (use original coords for accuracy)
      const dist = Math.sqrt(Math.pow(lat - pLat, 2) + Math.pow(lng - pLng, 2));
      isTraveling = dist > 0.01; // ~1.1km
    }

    if (!existing) {
      return this.createProfile({
        userId,
        latitude: fuzzed.lat,
        longitude: fuzzed.lng,
        physicalLatitude: pLat,
        physicalLongitude: pLng,
        isTraveling,
        locationUpdatedAt: new Date(),
        isVisible: true,
      });
    }

    const [updated] = await db
      .update(profiles)
      .set({
        latitude: fuzzed.lat,
        longitude: fuzzed.lng,
        physicalLatitude: pLat,
        physicalLongitude: pLng,
        isTraveling,
        locationUpdatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  async getNearbyProfiles(lat?: number, lng?: number, radiusKm: number = 50): Promise<Profile[]> {
    // Simple bounding box or just return all visible profiles for MVP if dataset is small
    // For MVP, returning all visible profiles is safer and easier than complex geo-queries in plain SQL/Drizzle without PostGIS extensions
    // But we can filter client side if needed. 
    // Let's return all visible profiles that have a location.
    
    return await db
      .select()
      .from(profiles)
      .where(
        sql`${profiles.isVisible} = true AND ${profiles.latitude} IS NOT NULL AND ${profiles.longitude} IS NOT NULL`
      );
  }

  async verifyAge(userId: string, birthDate: Date): Promise<Profile> {
    const existing = await this.getProfile(userId);
    
    if (!existing) {
      return this.createProfile({
        userId,
        birthDate,
        ageVerified: true,
        isVisible: true,
      } as any);
    }

    const [updated] = await db
      .update(profiles)
      .set({
        birthDate,
        ageVerified: true,
      })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  async getFavorites(userId: string): Promise<Favorite[]> {
    return await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId));
  }

  async addFavorite(userId: string, targetUserId: string): Promise<void> {
    const existing = await this.isFavorite(userId, targetUserId);
    if (!existing) {
      await db.insert(favorites).values({ userId, targetUserId });
    }
  }

  async removeFavorite(userId: string, targetUserId: string): Promise<void> {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.targetUserId, targetUserId)
        )
      );
  }

  async isFavorite(userId: string, targetUserId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.targetUserId, targetUserId)
        )
      );
    return !!existing;
  }

  // Photo methods
  async getPhotos(userId: string, includePrivate: boolean = false): Promise<Photo[]> {
    if (includePrivate) {
      return await db
        .select()
        .from(photos)
        .where(eq(photos.userId, userId))
        .orderBy(desc(photos.createdAt));
    }
    return await db
      .select()
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.isPublic, true)))
      .orderBy(desc(photos.createdAt));
  }

  async getProfilePhoto(userId: string): Promise<Photo | undefined> {
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.isProfilePhoto, true)));
    return photo;
  }

  async addPhoto(userId: string, data: InsertPhoto): Promise<Photo> {
    const [photo] = await db
      .insert(photos)
      .values({ ...data, userId })
      .returning();
    return photo;
  }

  async updatePhoto(userId: string, photoId: number, updates: Partial<InsertPhoto>): Promise<Photo> {
    const [updated] = await db
      .update(photos)
      .set(updates)
      .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
      .returning();
    return updated;
  }

  async deletePhoto(userId: string, photoId: number): Promise<void> {
    await db
      .delete(photos)
      .where(and(eq(photos.id, photoId), eq(photos.userId, userId)));
  }

  async setProfilePhoto(userId: string, photoId: number): Promise<Photo> {
    // First, unset any existing profile photo
    await db
      .update(photos)
      .set({ isProfilePhoto: false })
      .where(and(eq(photos.userId, userId), eq(photos.isProfilePhoto, true)));
    
    // Then set the new one
    const [updated] = await db
      .update(photos)
      .set({ isProfilePhoto: true })
      .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
      .returning();
    return updated;
  }

  // Conversation methods
  async getConversations(userId: string): Promise<ConversationWithParticipants[]> {
    // Get all conversations the user is a part of
    const userParticipations = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    if (userParticipations.length === 0) return [];

    const conversationIds = userParticipations.map(p => p.conversationId);
    
    const convos = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.updatedAt));

    // For each conversation, get participants and last message
    const result: ConversationWithParticipants[] = [];
    
    for (const convo of convos) {
      const participants = await db
        .select({
          conversationId: conversationParticipants.conversationId,
          userId: conversationParticipants.userId,
          lastReadAt: conversationParticipants.lastReadAt,
        })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, convo.id));

      // Get display names for participants
      const participantDetails = await Promise.all(
        participants.map(async (p) => {
          const profile = await this.getProfile(p.userId);
          return {
            userId: p.userId,
            displayName: profile?.displayName || null,
            profileImageUrl: null,
          };
        })
      );

      // Get last message
      const [lastMsg] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, convo.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Count unread messages for this user
      const userParticipation = userParticipations.find(p => p.conversationId === convo.id);
      let unreadCount = 0;
      if (userParticipation?.lastReadAt) {
        const unread = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, convo.id),
              sql`${messages.createdAt} > ${userParticipation.lastReadAt}`
            )
          );
        unreadCount = Number(unread[0]?.count || 0);
      } else {
        // If never read, all messages are unread
        const unread = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(eq(messages.conversationId, convo.id));
        unreadCount = Number(unread[0]?.count || 0);
      }

      result.push({
        ...convo,
        participants: participantDetails,
        lastMessage: lastMsg || null,
        unreadCount,
      });
    }

    return result;
  }

  async getConversation(conversationId: number, userId: string): Promise<ConversationWithParticipants | undefined> {
    // Verify user is a participant
    const [participation] = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    if (!participation) return undefined;

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!convo) return undefined;

    const participants = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));

    const participantDetails = await Promise.all(
      participants.map(async (p) => {
        const profile = await this.getProfile(p.userId);
        return {
          userId: p.userId,
          displayName: profile?.displayName || null,
          profileImageUrl: null,
        };
      })
    );

    return {
      ...convo,
      participants: participantDetails,
    };
  }

  async createConversation(userId: string, participantIds: string[], name?: string, isGroup?: boolean): Promise<Conversation> {
    const [convo] = await db
      .insert(conversations)
      .values({
        name: name || null,
        isGroup: isGroup || participantIds.length > 1,
        createdBy: userId,
      })
      .returning();

    // Add creator and all participants
    const allParticipants = [userId, ...participantIds.filter(id => id !== userId)];
    for (const participantId of allParticipants) {
      await db.insert(conversationParticipants).values({
        conversationId: convo.id,
        userId: participantId,
      });
    }

    return convo;
  }

  async getOrCreateDirectConversation(userId: string, otherUserId: string): Promise<Conversation> {
    // Find existing 1-on-1 conversation between these two users
    const userConvos = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    for (const uc of userConvos) {
      const [convo] = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, uc.conversationId), eq(conversations.isGroup, false)));

      if (convo) {
        // Check if other user is also in this conversation
        const [otherParticipant] = await db
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, convo.id),
              eq(conversationParticipants.userId, otherUserId)
            )
          );

        if (otherParticipant) {
          return convo;
        }
      }
    }

    // No existing conversation found, create one
    return this.createConversation(userId, [otherUserId], undefined, false);
  }

  async addParticipantsToConversation(conversationId: number, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      // Check if already a participant
      const [existing] = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, userId)
          )
        );

      if (!existing) {
        await db.insert(conversationParticipants).values({
          conversationId,
          userId,
        });
      }
    }
  }

  async getMessages(conversationId: number, userId: string, limit: number = 50, offset: number = 0): Promise<MessageWithSender[]> {
    // Verify user is a participant
    const [participation] = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    if (!participation) return [];

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    // Get sender info for each message
    const result: MessageWithSender[] = await Promise.all(
      msgs.map(async (msg) => {
        const profile = await this.getProfile(msg.senderId);
        return {
          ...msg,
          sender: {
            displayName: profile?.displayName || null,
            profileImageUrl: null,
          },
        };
      })
    );

    return result.reverse(); // Return in chronological order
  }

  async sendMessage(conversationId: number, senderId: string, content?: string, imageUrl?: string): Promise<Message> {
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content: content || null,
        imageUrl: imageUrl || null,
      })
      .returning();

    // Update conversation's updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return msg;
  }

  async markConversationRead(conversationId: number, userId: string): Promise<void> {
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }

  // Event methods
  async createEvent(hostId: string, data: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values({
        ...data,
        hostId,
      })
      .returning();
    
    // Host automatically attends their own event
    await db
      .insert(eventAttendees)
      .values({
        eventId: event.id,
        userId: hostId,
        status: "approved",
      });
    
    return event;
  }

  async getEvents(userId: string): Promise<EventWithDetails[]> {
    // Get all public events and events user is attending
    const allEvents = await db
      .select()
      .from(events)
      .where(gte(events.eventDate, new Date()))
      .orderBy(events.eventDate);

    return this.enrichEvents(allEvents, userId);
  }

  async getEvent(eventId: number, userId: string): Promise<EventWithDetails | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event) return undefined;
    
    const enriched = await this.enrichEvents([event], userId);
    return enriched[0];
  }

  async getHostEvents(hostId: string, userId: string): Promise<EventWithDetails[]> {
    const hostEvents = await db
      .select()
      .from(events)
      .where(eq(events.hostId, hostId))
      .orderBy(desc(events.eventDate));
    
    return this.enrichEvents(hostEvents, userId);
  }

  private async enrichEvents(eventList: Event[], userId: string): Promise<EventWithDetails[]> {
    if (eventList.length === 0) return [];

    const eventIds = eventList.map(e => e.id);
    
    // Get all attendees for these events
    const attendees = await db
      .select()
      .from(eventAttendees)
      .where(inArray(eventAttendees.eventId, eventIds));

    // Get host profiles
    const hostIds = Array.from(new Set(eventList.map(e => e.hostId)));
    const hostProfiles = await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, hostIds));

    // Get attendee profiles
    const attendeeUserIds = Array.from(new Set(attendees.map(a => a.userId)));
    const attendeeProfiles = attendeeUserIds.length > 0 
      ? await db.select().from(profiles).where(inArray(profiles.userId, attendeeUserIds))
      : [];

    // Get profile photos for hosts and attendees
    const allUserIds = Array.from(new Set(hostIds.concat(attendeeUserIds)));
    const profilePhotos = allUserIds.length > 0
      ? await db.select().from(photos).where(and(inArray(photos.userId, allUserIds), eq(photos.isProfilePhoto, true)))
      : [];

    return eventList.map(event => {
      const eventAttendeesList = attendees.filter(a => a.eventId === event.id);
      const hostProfile = hostProfiles.find(p => p.userId === event.hostId);
      const hostPhoto = profilePhotos.find(p => p.userId === event.hostId);
      const isAttending = eventAttendeesList.some(a => a.userId === userId);
      const isHost = event.hostId === userId;
      const canSeeDetails = isAttending || isHost;

      return {
        ...event,
        // Redact sensitive details for non-attendees/non-hosts
        description: canSeeDetails ? event.description : null,
        location: canSeeDetails ? event.location : null,
        latitude: canSeeDetails ? event.latitude : null,
        longitude: canSeeDetails ? event.longitude : null,
        host: {
          userId: event.hostId,
          displayName: hostProfile?.displayName || null,
          profileImageUrl: hostPhoto?.url || null,
        },
        attendeeCount: eventAttendeesList.filter(a => a.status === "approved").length,
        isAttending: canSeeDetails,
        attendees: canSeeDetails ? eventAttendeesList.map(a => {
          const profile = attendeeProfiles.find(p => p.userId === a.userId);
          const photo = profilePhotos.find(p => p.userId === a.userId);
          return {
            userId: a.userId,
            displayName: profile?.displayName || null,
            profileImageUrl: photo?.url || null,
            status: a.status,
          };
        }) : undefined,
      };
    });
  }

  async joinEvent(eventId: number, userId: string): Promise<EventAttendee> {
    // Check if already attending
    const [existing] = await db
      .select()
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
    
    if (existing) return existing;

    const [attendee] = await db
      .insert(eventAttendees)
      .values({
        eventId,
        userId,
        status: "pending",
      })
      .returning();
    
    return attendee;
  }

  async leaveEvent(eventId: number, userId: string): Promise<void> {
    await db
      .delete(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
  }

  async updateAttendeeStatus(eventId: number, hostId: string, userId: string, status: string): Promise<EventAttendee> {
    // Verify requester is the host
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event || event.hostId !== hostId) {
      throw new Error("Not authorized");
    }

    const [attendee] = await db
      .update(eventAttendees)
      .set({ status })
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
      .returning();
    
    return attendee;
  }

  async deleteEvent(eventId: number, hostId: string): Promise<void> {
    // Verify requester is the host
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event || event.hostId !== hostId) {
      throw new Error("Not authorized");
    }

    // Delete attendees first
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));
    await db.delete(events).where(eq(events.id, eventId));
  }

  async isEventParticipant(eventId: number, userId: string): Promise<boolean> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    
    if (!event) return false;
    if (event.hostId === userId) return true;
    
    const [attendee] = await db
      .select()
      .from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
    
    return !!attendee;
  }

  // Wardrobe methods
  async getWardrobeItems(userId: string, category?: string): Promise<WardrobeItem[]> {
    if (category) {
      return await db
        .select()
        .from(wardrobeItems)
        .where(and(eq(wardrobeItems.userId, userId), eq(wardrobeItems.category, category)))
        .orderBy(desc(wardrobeItems.createdAt));
    }
    return await db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, userId))
      .orderBy(desc(wardrobeItems.createdAt));
  }

  async getWardrobeItem(userId: string, itemId: number): Promise<WardrobeItem | undefined> {
    const [item] = await db
      .select()
      .from(wardrobeItems)
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, userId)));
    return item;
  }

  async createWardrobeItem(userId: string, data: InsertWardrobeItem): Promise<WardrobeItem> {
    const [item] = await db
      .insert(wardrobeItems)
      .values({ ...data, userId })
      .returning();
    return item;
  }

  async updateWardrobeItem(userId: string, itemId: number, updates: Partial<InsertWardrobeItem>): Promise<WardrobeItem> {
    const [item] = await db
      .update(wardrobeItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, userId)))
      .returning();
    if (!item) throw new Error("Wardrobe item not found");
    return item;
  }

  async deleteWardrobeItem(userId: string, itemId: number): Promise<void> {
    await db
      .delete(wardrobeItems)
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, userId)));
  }

  async toggleWardrobeFavorite(userId: string, itemId: number): Promise<WardrobeItem> {
    const existing = await this.getWardrobeItem(userId, itemId);
    if (!existing) throw new Error("Wardrobe item not found");
    
    const [item] = await db
      .update(wardrobeItems)
      .set({ isFavorite: !existing.isFavorite, updatedAt: new Date() })
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, userId)))
      .returning();
    return item;
  }

  // Wardrobe Access methods
  async getWardrobeAccessList(ownerId: string): Promise<WardrobeAccess[]> {
    return db
      .select()
      .from(wardrobeAccess)
      .where(eq(wardrobeAccess.ownerId, ownerId));
  }

  async grantWardrobeAccess(ownerId: string, grantedUserId: string): Promise<WardrobeAccess> {
    // Check if access already exists
    const existing = await db
      .select()
      .from(wardrobeAccess)
      .where(and(
        eq(wardrobeAccess.ownerId, ownerId),
        eq(wardrobeAccess.grantedUserId, grantedUserId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [access] = await db
      .insert(wardrobeAccess)
      .values({ ownerId, grantedUserId })
      .returning();
    return access;
  }

  async revokeWardrobeAccess(ownerId: string, grantedUserId: string): Promise<void> {
    await db
      .delete(wardrobeAccess)
      .where(and(
        eq(wardrobeAccess.ownerId, ownerId),
        eq(wardrobeAccess.grantedUserId, grantedUserId)
      ));
  }

  async hasWardrobeAccess(ownerId: string, viewerId: string): Promise<boolean> {
    const access = await db
      .select()
      .from(wardrobeAccess)
      .where(and(
        eq(wardrobeAccess.ownerId, ownerId),
        eq(wardrobeAccess.grantedUserId, viewerId)
      ));
    return access.length > 0;
  }

  // Auction methods
  async getAuctions(userId?: string): Promise<AuctionWithDetails[]> {
    const auctionList = await db
      .select()
      .from(auctions)
      .orderBy(desc(auctions.createdAt));
    
    const results: AuctionWithDetails[] = [];
    for (const auction of auctionList) {
      const details = await this.enrichAuction(auction);
      results.push(details);
    }
    return results;
  }

  async getAuction(auctionId: number): Promise<AuctionWithDetails | undefined> {
    const [auction] = await db
      .select()
      .from(auctions)
      .where(eq(auctions.id, auctionId));
    
    if (!auction) return undefined;
    return this.enrichAuction(auction);
  }

  private async enrichAuction(auction: Auction): Promise<AuctionWithDetails> {
    const [sellerProfile] = await db
      .select({ id: profiles.userId, displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.userId, auction.sellerId));
    
    let winnerProfile = null;
    if (auction.winnerId) {
      const [winner] = await db
        .select({ id: profiles.userId, displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.userId, auction.winnerId));
      winnerProfile = winner || null;
    }
    
    let wardrobeItem = null;
    if (auction.wardrobeItemId) {
      const [item] = await db
        .select()
        .from(wardrobeItems)
        .where(eq(wardrobeItems.id, auction.wardrobeItemId));
      wardrobeItem = item || null;
    }
    
    const bidList = await db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auction.id))
      .orderBy(desc(bids.amount));
    
    return {
      ...auction,
      seller: sellerProfile || null,
      winner: winnerProfile,
      wardrobeItem,
      bidCount: bidList.length,
      highestBid: bidList.length > 0 ? Number(bidList[0].amount) : null,
    };
  }

  async createAuction(sellerId: string, data: InsertAuction): Promise<Auction> {
    const [auction] = await db
      .insert(auctions)
      .values({ ...data, sellerId })
      .returning();
    return auction;
  }

  async updateAuction(auctionId: number, sellerId: string, updates: Partial<InsertAuction>): Promise<Auction> {
    const [auction] = await db
      .update(auctions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(auctions.id, auctionId), eq(auctions.sellerId, sellerId)))
      .returning();
    if (!auction) throw new Error("Auction not found or not authorized");
    return auction;
  }

  async deleteAuction(auctionId: number, sellerId: string): Promise<void> {
    await db.delete(bids).where(eq(bids.auctionId, auctionId));
    await db
      .delete(auctions)
      .where(and(eq(auctions.id, auctionId), eq(auctions.sellerId, sellerId)));
  }

  async endAuction(auctionId: number, sellerId: string): Promise<Auction> {
    const bidList = await db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.amount))
      .limit(1);
    
    const winnerId = bidList.length > 0 ? bidList[0].bidderId : null;
    const finalPriceCents = bidList.length > 0 ? Number(bidList[0].amount) : null;
    
    const [auction] = await db
      .update(auctions)
      .set({
        status: 'ended',
        winnerId,
        currentPrice: finalPriceCents ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(auctions.id, auctionId), eq(auctions.sellerId, sellerId)))
      .returning();
    
    if (!auction) throw new Error("Auction not found or not authorized");
    return auction;
  }

  async getBids(auctionId: number): Promise<BidWithBidder[]> {
    const bidList = await db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.amount));
    
    const results: BidWithBidder[] = [];
    for (const bid of bidList) {
      const [bidderProfile] = await db
        .select({ id: profiles.userId, displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.userId, bid.bidderId));
      
      results.push({
        ...bid,
        bidder: bidderProfile || null,
      });
    }
    return results;
  }

  async placeBid(auctionId: number, bidderId: string, amountCents: number): Promise<Bid> {
    const [auction] = await db
      .select()
      .from(auctions)
      .where(eq(auctions.id, auctionId));
    
    if (!auction) throw new Error("Auction not found");
    if (auction.status !== 'active') throw new Error("Auction is not active");
    if (auction.endDate && new Date(auction.endDate) < new Date()) {
      throw new Error("Auction has ended");
    }
    if (auction.sellerId === bidderId) throw new Error("Cannot bid on your own auction");
    
    const existingBids = await db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.amount))
      .limit(1);
    
    const currentHighestCents = existingBids.length > 0 ? Number(existingBids[0].amount) : Number(auction.startingPrice);
    const minBidCents = 100;
    
    if (amountCents <= currentHighestCents) {
      throw new Error(`Bid must be higher than current highest bid of $${(currentHighestCents / 100).toFixed(2)}`);
    }
    
    if (amountCents < currentHighestCents + minBidCents) {
      throw new Error(`Minimum bid increment is $${(minBidCents / 100).toFixed(2)}`);
    }
    
    const [bid] = await db
      .insert(bids)
      .values({
        auctionId,
        bidderId,
        amount: amountCents,
      })
      .returning();
    
    await db
      .update(auctions)
      .set({ currentPrice: amountCents, updatedAt: new Date() })
      .where(eq(auctions.id, auctionId));
    
    return bid;
  }

  // Reports
  async createReport(reporterId: string, data: InsertReport): Promise<Report> {
    const [report] = await db
      .insert(reports)
      .values({
        ...data,
        reporterId,
      })
      .returning();
    return report;
  }

  async getReportsByUser(reportedUserId: string): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(eq(reports.reportedUserId, reportedUserId))
      .orderBy(desc(reports.createdAt));
  }
}

export const storage = new DatabaseStorage();
