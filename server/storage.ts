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
  photoAccess,
  auctions,
  bids,
  reports,
  users,
  soireeMessages,
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
  type PhotoAccess,
  type Auction,
  type InsertAuction,
  type Bid,
  type InsertBid,
  type Report,
  type InsertReport,
  type SoireeMessage,
  type SoireeMessageWithSender,
} from "@shared/schema";
import { eq, sql, and, desc, asc, inArray, gte, or } from "drizzle-orm";

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
  getAllProfiles(): Promise<Profile[]>;
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
  reorderPhotos(userId: string, photoIds: number[]): Promise<void>;
  
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
  
  // Photo Access
  getPhotoAccessList(ownerId: string): Promise<PhotoAccess[]>;
  grantPhotoAccess(ownerId: string, grantedUserId: string): Promise<PhotoAccess>;
  revokePhotoAccess(ownerId: string, grantedUserId: string): Promise<void>;
  hasPhotoAccess(ownerId: string, viewerId: string): Promise<boolean>;
  
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
  
  // Online Status
  updateLastActive(userId: string): Promise<void>;
  setUnderDressed(userId: string, isUnderDressed: boolean): Promise<Profile>;
  getOnlineUsers(minutesThreshold?: number): Promise<(Profile & { profileImageUrl: string | null })[]>;
  
  // Account Management
  deleteUserData(userId: string): Promise<void>;
  
  // Suit Soiree (Public Chat)
  getSoireeMessages(limit?: number, offset?: number): Promise<SoireeMessageWithSender[]>;
  sendSoireeMessage(senderId: string, content: string): Promise<SoireeMessage>;
  deleteSoireeMessage(messageId: number, senderId: string): Promise<void>;
  
  // Unread Messages
  getTotalUnreadCount(userId: string): Promise<number>;
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

  async getAllProfiles(): Promise<Profile[]> {
    return db.select().from(profiles);
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
        .orderBy(asc(photos.displayOrder), desc(photos.createdAt));
    }
    return await db
      .select()
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.isPublic, true)))
      .orderBy(asc(photos.displayOrder), desc(photos.createdAt));
  }

  async getProfilePhoto(userId: string): Promise<Photo | undefined> {
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.isProfilePhoto, true)));
    return photo;
  }

  async addPhoto(userId: string, data: InsertPhoto): Promise<Photo> {
    // If this is a profile photo, first unset any existing profile photos
    if (data.isProfilePhoto) {
      await db
        .update(photos)
        .set({ isProfilePhoto: false })
        .where(and(eq(photos.userId, userId), eq(photos.isProfilePhoto, true)));
    }
    
    const [photo] = await db
      .insert(photos)
      .values({ ...data, userId })
      .returning();
    
    // If this is a profile photo, update the user's profileImageUrl
    if (data.isProfilePhoto && photo.url) {
      await db
        .update(users)
        .set({ profileImageUrl: photo.url })
        .where(eq(users.id, userId));
    }
    
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
    
    // Also update the user's profileImageUrl so it shows in the avatar
    if (updated && updated.url) {
      await db
        .update(users)
        .set({ profileImageUrl: updated.url })
        .where(eq(users.id, userId));
    }
    
    return updated;
  }

  async reorderPhotos(userId: string, photoIds: number[]): Promise<void> {
    // Update display order for each photo
    for (let i = 0; i < photoIds.length; i++) {
      await db
        .update(photos)
        .set({ displayOrder: i })
        .where(and(eq(photos.id, photoIds[i]), eq(photos.userId, userId)));
    }
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
    
    // Batch fetch: conversations
    const convos = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.updatedAt));

    if (convos.length === 0) return [];

    // Batch fetch: all participants for all conversations at once
    const allParticipants = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        odId: conversationParticipants.userId,
        lastReadAt: conversationParticipants.lastReadAt,
      })
      .from(conversationParticipants)
      .where(inArray(conversationParticipants.conversationId, conversationIds));

    // Collect all unique user IDs from participants
    const allUserIds = Array.from(new Set(allParticipants.map(p => p.odId)));

    // Batch fetch: all profiles for all participants at once
    const allProfiles = allUserIds.length > 0 ? await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, allUserIds)) : [];
    const profileMap = new Map(allProfiles.map(p => [p.userId, p]));

    // Batch fetch: all profile photos at once (photos marked as profile photos)
    const allPhotos = allUserIds.length > 0 ? await db
      .select()
      .from(photos)
      .where(and(
        inArray(photos.userId, allUserIds),
        eq(photos.isProfilePhoto, true)
      )) : [];
    const photoMap = new Map(allPhotos.map(p => [p.userId, p]));

    // Batch fetch: last message for each conversation using window function
    // Use a single query with DISTINCT ON to get the latest message per conversation
    const allLastMessages = await db.execute(sql`
      SELECT DISTINCT ON (conversation_id) *
      FROM messages
      WHERE conversation_id = ANY(${conversationIds})
      ORDER BY conversation_id, created_at DESC
    `);
    const lastMessageMap = new Map<number, typeof messages.$inferSelect>();
    for (const row of allLastMessages.rows as any[]) {
      lastMessageMap.set(row.conversation_id, {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content,
        imageUrl: row.image_url,
        createdAt: row.created_at ? new Date(row.created_at) : null,
      });
    }

    // Batch fetch: unread counts for all conversations in a single query
    // Join with conversation_participants to get lastReadAt per user, then count messages
    const unreadCountsResult = await db.execute(sql`
      SELECT 
        m.conversation_id,
        COUNT(*) as unread_count
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ${userId}
      WHERE m.conversation_id = ANY(${conversationIds})
        AND m.sender_id != ${userId}
        AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      GROUP BY m.conversation_id
    `);
    const unreadCountMap = new Map<number, number>();
    for (const row of unreadCountsResult.rows as any[]) {
      unreadCountMap.set(row.conversation_id, Number(row.unread_count || 0));
    }

    // Build result
    const result: ConversationWithParticipants[] = convos.map(convo => {
      const participants = allParticipants
        .filter(p => p.conversationId === convo.id)
        .map(p => ({
          userId: p.odId,
          displayName: profileMap.get(p.odId)?.displayName || null,
          profileImageUrl: photoMap.get(p.odId)?.url || null,
        }));

      return {
        ...convo,
        participants,
        lastMessage: lastMessageMap.get(convo.id) || null,
        unreadCount: unreadCountMap.get(convo.id) || 0,
      };
    });

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
        const profilePhoto = await this.getProfilePhoto(p.userId);
        return {
          userId: p.userId,
          displayName: profile?.displayName || null,
          profileImageUrl: profilePhoto?.url || null,
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
    // Use a single optimized query to find existing 1-on-1 conversation
    // Join conversation_participants twice to find conversations where both users are participants
    
    const existingConvo = await db
      .select({ conversation: conversations })
      .from(conversations)
      .innerJoin(
        conversationParticipants,
        and(
          eq(conversationParticipants.conversationId, conversations.id),
          eq(conversationParticipants.userId, userId)
        )
      )
      .where(
        and(
          eq(conversations.isGroup, false),
          inArray(
            conversations.id,
            db
              .select({ id: conversationParticipants.conversationId })
              .from(conversationParticipants)
              .where(eq(conversationParticipants.userId, otherUserId))
          )
        )
      )
      .limit(1);

    if (existingConvo.length > 0) {
      return existingConvo[0].conversation;
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

    if (msgs.length === 0) return [];

    // Batch fetch: collect all unique sender IDs
    const senderIds = Array.from(new Set(msgs.map(m => m.senderId))) as string[];

    // Batch fetch: all sender profiles at once
    const senderProfiles = senderIds.length > 0 ? await db
      .select()
      .from(profiles)
      .where(inArray(profiles.userId, senderIds)) : [];
    const profileMap = new Map(senderProfiles.map(p => [p.userId, p]));

    // Batch fetch: all sender profile photos at once
    const senderPhotos = senderIds.length > 0 ? await db
      .select()
      .from(photos)
      .where(and(
        inArray(photos.userId, senderIds),
        eq(photos.isProfilePhoto, true)
      )) : [];
    const photoMap = new Map(senderPhotos.map(p => [p.userId, p]));

    // Build result with sender info
    const result: MessageWithSender[] = msgs.map(msg => ({
      ...msg,
      sender: {
        displayName: profileMap.get(msg.senderId)?.displayName || null,
        profileImageUrl: photoMap.get(msg.senderId)?.url || null,
      },
    }));

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

    // Mark conversation as read for the sender so they don't see red dot for their own message
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, senderId)
        )
      );

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

  // Photo Access methods
  async getPhotoAccessList(ownerId: string): Promise<PhotoAccess[]> {
    return db
      .select()
      .from(photoAccess)
      .where(eq(photoAccess.ownerId, ownerId));
  }

  async grantPhotoAccess(ownerId: string, grantedUserId: string): Promise<PhotoAccess> {
    // Check if access already exists
    const existing = await db
      .select()
      .from(photoAccess)
      .where(and(
        eq(photoAccess.ownerId, ownerId),
        eq(photoAccess.grantedUserId, grantedUserId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [access] = await db
      .insert(photoAccess)
      .values({ ownerId, grantedUserId })
      .returning();
    return access;
  }

  async revokePhotoAccess(ownerId: string, grantedUserId: string): Promise<void> {
    await db
      .delete(photoAccess)
      .where(and(
        eq(photoAccess.ownerId, ownerId),
        eq(photoAccess.grantedUserId, grantedUserId)
      ));
  }

  async hasPhotoAccess(ownerId: string, viewerId: string): Promise<boolean> {
    const access = await db
      .select()
      .from(photoAccess)
      .where(and(
        eq(photoAccess.ownerId, ownerId),
        eq(photoAccess.grantedUserId, viewerId)
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

  // Online Status
  async updateLastActive(userId: string): Promise<void> {
    const existing = await this.getProfile(userId);
    if (existing) {
      await db
        .update(profiles)
        .set({ lastActiveAt: new Date() })
        .where(eq(profiles.userId, userId));
    }
  }

  async setUnderDressed(userId: string, isUnderDressed: boolean): Promise<Profile> {
    const existing = await this.getProfile(userId);
    if (!existing) {
      throw new Error("Profile not found");
    }
    
    const [updated] = await db
      .update(profiles)
      .set({ isUnderDressed })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  async getOnlineUsers(minutesThreshold: number = 15): Promise<(Profile & { profileImageUrl: string | null })[]> {
    const thresholdTime = new Date(Date.now() - minutesThreshold * 60 * 1000);
    
    const onlineProfiles = await db
      .select()
      .from(profiles)
      .where(
        and(
          gte(profiles.lastActiveAt, thresholdTime),
          eq(profiles.isUnderDressed, false),
          eq(profiles.ageVerified, true)
        )
      )
      .orderBy(desc(profiles.lastActiveAt));
    
    // Fetch profile photos and user data for these users
    const userIds = onlineProfiles.map(p => p.userId);
    const [profilePhotos, userRecords] = await Promise.all([
      userIds.length > 0
        ? db.select().from(photos).where(and(inArray(photos.userId, userIds), eq(photos.isProfilePhoto, true)))
        : Promise.resolve([]),
      userIds.length > 0
        ? db.select().from(users).where(inArray(users.id, userIds))
        : Promise.resolve([]),
    ]);
    
    return onlineProfiles.map(profile => {
      const photo = profilePhotos.find(p => p.userId === profile.userId);
      const userRecord = userRecords.find(u => u.id === profile.userId);
      return {
        ...profile,
        profileImageUrl: photo?.url || userRecord?.profileImageUrl || null,
      };
    });
  }
  
  async deleteUserData(userId: string): Promise<void> {
    // Delete all user data in the correct order to respect foreign key constraints
    // Note: This only deletes data owned by the user, not the auth user record itself
    
    // Delete wardrobe access (both granted and received)
    await db.delete(wardrobeAccess).where(
      or(
        eq(wardrobeAccess.ownerId, userId),
        eq(wardrobeAccess.grantedUserId, userId)
      )
    );
    
    // Delete wardrobe items
    await db.delete(wardrobeItems).where(eq(wardrobeItems.userId, userId));
    
    // Delete bids placed by user
    await db.delete(bids).where(eq(bids.bidderId, userId));
    
    // Delete auctions created by user
    await db.delete(auctions).where(eq(auctions.sellerId, userId));
    
    // Delete event attendees
    await db.delete(eventAttendees).where(eq(eventAttendees.userId, userId));
    
    // Delete events hosted by user
    await db.delete(events).where(eq(events.hostId, userId));
    
    // Delete messages sent by user
    await db.delete(messages).where(eq(messages.senderId, userId));
    
    // Delete conversation participants
    await db.delete(conversationParticipants).where(eq(conversationParticipants.userId, userId));
    
    // Delete photos
    await db.delete(photos).where(eq(photos.userId, userId));
    
    // Delete favorites (both ways)
    await db.delete(favorites).where(
      or(
        eq(favorites.userId, userId),
        eq(favorites.targetUserId, userId)
      )
    );
    
    // Delete reports (both created by and against user)
    await db.delete(reports).where(
      or(
        eq(reports.reporterId, userId),
        eq(reports.reportedUserId, userId)
      )
    );
    
    // Finally, delete profile
    await db.delete(profiles).where(eq(profiles.userId, userId));
  }

  // Suit Soiree (Public Chat) Methods
  async getSoireeMessages(limit: number = 100, offset: number = 0): Promise<SoireeMessageWithSender[]> {
    const messagesData = await db
      .select({
        id: soireeMessages.id,
        senderId: soireeMessages.senderId,
        content: soireeMessages.content,
        createdAt: soireeMessages.createdAt,
      })
      .from(soireeMessages)
      .orderBy(desc(soireeMessages.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get sender info for each message
    const result: SoireeMessageWithSender[] = [];
    for (const msg of messagesData) {
      const [profile] = await db
        .select({
          displayName: profiles.displayName,
        })
        .from(profiles)
        .where(eq(profiles.userId, msg.senderId));
      
      // Get profile photo
      const [photo] = await db
        .select({ url: photos.url })
        .from(photos)
        .where(and(
          eq(photos.userId, msg.senderId),
          eq(photos.isProfilePhoto, true)
        ));
      
      result.push({
        ...msg,
        senderName: profile?.displayName || null,
        senderProfileImageUrl: photo?.url || null,
      });
    }
    
    // Reverse to get oldest first for display
    return result.reverse();
  }

  async sendSoireeMessage(senderId: string, content: string): Promise<SoireeMessage> {
    const [message] = await db
      .insert(soireeMessages)
      .values({ senderId, content })
      .returning();
    return message;
  }

  async deleteSoireeMessage(messageId: number, senderId: string): Promise<void> {
    await db.delete(soireeMessages).where(
      and(
        eq(soireeMessages.id, messageId),
        eq(soireeMessages.senderId, senderId)
      )
    );
  }

  async getTotalUnreadCount(userId: string): Promise<number> {
    // Get all conversations the user is part of
    const userConversations = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        lastReadAt: conversationParticipants.lastReadAt,
      })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    let totalUnread = 0;
    
    for (const convo of userConversations) {
      if (convo.lastReadAt) {
        // Count messages after last read that weren't sent by this user
        const unread = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, convo.conversationId),
              sql`${messages.createdAt} > ${convo.lastReadAt}`,
              sql`${messages.senderId} != ${userId}`
            )
          );
        totalUnread += Number(unread[0]?.count || 0);
      } else {
        // If never read, count all messages not sent by this user
        const unread = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, convo.conversationId),
              sql`${messages.senderId} != ${userId}`
            )
          );
        totalUnread += Number(unread[0]?.count || 0);
      }
    }
    
    return totalUnread;
  }
}

export const storage = new DatabaseStorage();
