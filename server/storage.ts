import { db } from "./db";
import {
  profiles,
  favorites,
  type Profile,
  type InsertProfile,
  type UpdateProfileRequest,
  type Favorite,
} from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

export interface IStorage {
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: UpdateProfileRequest): Promise<Profile>;
  updateLocation(userId: string, lat: number, lng: number): Promise<Profile>;
  getNearbyProfiles(lat?: number, lng?: number, radiusKm?: number): Promise<Profile[]>;
  
  // Favorites
  getFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(userId: string, targetUserId: string): Promise<void>;
  removeFavorite(userId: string, targetUserId: string): Promise<void>;
  isFavorite(userId: string, targetUserId: string): Promise<boolean>;
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
    
    // Calculate if traveling: if physical location is known and differs from map location
    let isTraveling = false;
    const pLat = physicalLat ?? (existing?.physicalLatitude);
    const pLng = physicalLng ?? (existing?.physicalLongitude);

    if (pLat && pLng) {
      // Very simple distance check: if more than ~1km away
      const dist = Math.sqrt(Math.pow(lat - pLat, 2) + Math.pow(lng - pLng, 2));
      isTraveling = dist > 0.01; // ~1.1km
    }

    if (!existing) {
      return this.createProfile({
        userId,
        latitude: lat,
        longitude: lng,
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
        latitude: lat,
        longitude: lng,
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
}

export const storage = new DatabaseStorage();
