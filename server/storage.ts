import { db } from "./db";
import {
  profiles,
  favorites,
  photos,
  conversations,
  conversationParticipants,
  messages,
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
} from "@shared/schema";
import { eq, sql, and, desc, inArray } from "drizzle-orm";

// Fuzz location within approximately half a mile (~0.8km) for privacy
// Uses haversine-based destination point formula for accuracy
function fuzzLocation(lat: number, lng: number): { lat: number; lng: number } {
  // Half mile in meters = 804.672 meters
  const halfMileMeters = 804.672;
  
  // Earth's radius in meters
  const R = 6371000;
  
  // Random bearing (0-360 degrees) and distance (uniform within circle)
  const bearing = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * halfMileMeters;
  
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
}

export const storage = new DatabaseStorage();
