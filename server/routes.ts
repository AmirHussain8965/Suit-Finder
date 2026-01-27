import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { insertAuctionSchema, insertBidSchema } from "@shared/schema";

// Check if email is in comma-separated list of platinum emails
function isPlatinumEmail(email: string): boolean {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (ownerEmail && email === ownerEmail) return true;
  
  const platinumEmails = process.env.PLATINUM_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return platinumEmails.includes(email.toLowerCase());
}

async function checkPlatinumTier(userId: string): Promise<boolean> {
  const user = await authStorage.getUser(userId);
  if (!user) return false;
  
  // Check if user email grants automatic platinum access
  if (isPlatinumEmail(user.email)) {
    return true;
  }
  
  const hasActiveSubscription = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
  return hasActiveSubscription && user.subscriptionTier === 'platinum';
}

async function checkPremiumTier(userId: string): Promise<boolean> {
  const user = await authStorage.getUser(userId);
  if (!user) return false;
  
  // Check if user email grants automatic premium/platinum access
  if (isPlatinumEmail(user.email)) {
    return true;
  }
  
  return user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth first
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup Object Storage routes
  registerObjectStorageRoutes(app);

  // === Profiles ===

  // Get my profile
  app.get(api.profiles.me.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const profile = await storage.getProfile(userId);
    
    // It's okay to return null/404 if profile doesn't exist yet, frontend should handle "Create Profile" UI
    if (!profile) {
      return res.status(404).json(null);
    }
    res.json(profile);
  });

  // Update my profile
  app.patch(api.profiles.update.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    
    try {
      const input = api.profiles.update.input.parse(req.body);
      const profile = await storage.updateProfile(userId, input);
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Update location
  app.patch(api.profiles.location.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;

    try {
      const input = api.profiles.location.input.parse(req.body);
      const profile = await storage.updateLocation(
        userId, 
        input.latitude, 
        input.longitude,
        (req.body as any).physicalLatitude,
        (req.body as any).physicalLongitude
      );
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Verify age
  app.post(api.profiles.verifyAge.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;

    try {
      const input = api.profiles.verifyAge.input.parse(req.body);
      const birthDate = new Date(input.birthDate);
      
      // Validate the date is valid
      if (isNaN(birthDate.getTime())) {
        return res.status(400).json({ 
          message: "Invalid date format." 
        });
      }

      const today = new Date();
      
      // Ensure birth date is not in the future
      if (birthDate > today) {
        return res.status(400).json({ 
          message: "Birth date cannot be in the future." 
        });
      }

      // Ensure birth date is within reasonable range (not more than 120 years ago)
      const minDate = new Date(today.getFullYear() - 120, 0, 1);
      if (birthDate < minDate) {
        return res.status(400).json({ 
          message: "Invalid birth date." 
        });
      }
      
      // Calculate age
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Ensure age is a valid number
      if (!Number.isFinite(age) || age < 0) {
        return res.status(400).json({ 
          message: "Invalid birth date." 
        });
      }

      if (age < 21) {
        return res.status(400).json({ 
          message: "You must be 21 years or older to use this application." 
        });
      }

      const profile = await storage.verifyAge(userId, birthDate);
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Get nearby profiles
  app.get(api.profiles.nearby.path, async (req, res) => {
    // Optional: require auth to see others? Yes, for privacy.
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { lat, lng, radius } = req.query;
    
    const profiles = await storage.getNearbyProfiles(
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
      radius ? Number(radius) : undefined
    );

    // Join with user data (names, avatars)
    // In a real app, do this with a JOIN in the DB. Here we'll map manually for simplicity with separate storages.
    const enrichedProfiles = await Promise.all(profiles.map(async (p) => {
      const user = await authStorage.getUser(p.userId);
      return {
        userId: p.userId,
        displayName: p.displayName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "Unknown"),
        latitude: p.latitude,
        longitude: p.longitude,
        bio: p.bio,
        profileImageUrl: user?.profileImageUrl || null,
        styleInterests: p.styleInterests,
        role: p.role,
        interestType: p.interestType,
        categories: p.categories,
        isTraveling: p.isTraveling,
      };
    }));

    res.json(enrichedProfiles);
  });

  // Get a specific user's profile (for viewing other users)
  app.get(api.profiles.getUser.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const targetUserId = req.params.userId as string;
    
    const profile = await storage.getProfile(targetUserId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const user = await authStorage.getUser(targetUserId);
    const profilePhoto = await storage.getProfilePhoto(targetUserId);

    // Check if viewer is premium (health info only visible to premium members)
    const viewerId = (req.user as any).claims?.sub || (req.user as any).userId;
    const viewerIsPremium = await checkPremiumTier(viewerId);

    res.json({
      userId: profile.userId,
      displayName: profile.displayName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "Unknown"),
      bio: profile.bio,
      profileImageUrl: profilePhoto?.url || user?.profileImageUrl || null,
      styleInterests: profile.styleInterests,
      role: profile.role,
      interestType: profile.interestType,
      categories: profile.categories,
      hairColor: profile.hairColor,
      eyeColor: profile.eyeColor,
      build: profile.build,
      ethnicity: profile.ethnicity,
      height: profile.height,
      weight: profile.weight,
      bodyHair: profile.bodyHair,
      // Health info only visible to premium members
      hivStatus: viewerIsPremium ? profile.hivStatus : null,
      onPrep: viewerIsPremium ? profile.onPrep : null,
      lastStdScreening: viewerIsPremium ? profile.lastStdScreening?.toISOString() : null,
      // Privacy settings
      wardrobePublic: profile.wardrobePublic ?? false,
    });
  });

  // Delete user account and all associated data
  app.delete("/api/account", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    
    try {
      // Delete all user data from the database
      await storage.deleteUserData(userId);
      
      // Delete the auth user record
      await authStorage.deleteUser(userId);
      
      // Destroy the session
      req.logout((err) => {
        if (err) {
          console.error("Logout error during account deletion:", err);
        }
        req.session.destroy((sessionErr) => {
          if (sessionErr) {
            console.error("Session destroy error during account deletion:", sessionErr);
          }
          res.json({ success: true, message: "Account deleted successfully" });
        });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // === View Other User's Wardrobe ===
  
  app.get(api.wardrobe.listByUser.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const viewerId = (req.user as any).claims?.sub || (req.user as any).userId;
    const targetUserId = req.params.userId;
    
    // Check if user is viewing their own wardrobe
    if (viewerId === targetUserId) {
      const items = await storage.getWardrobeItems(viewerId);
      return res.json(items);
    }
    
    // Check if target user exists
    const targetUser = await authStorage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if viewer has been granted access to this wardrobe
    const hasAccess = await storage.hasWardrobeAccess(targetUserId, viewerId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this wardrobe" });
    }
    
    // Return wardrobe items
    const items = await storage.getWardrobeItems(targetUserId);
    res.json(items);
  });

  // Wardrobe Access Management
  app.get("/api/wardrobe-access", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const accessList = await storage.getWardrobeAccessList(userId);
    
    // Enrich with user info
    const enriched = await Promise.all(accessList.map(async (access) => {
      const user = await authStorage.getUser(access.grantedUserId);
      const profile = await storage.getProfile(access.grantedUserId);
      return {
        id: access.id,
        grantedUserId: access.grantedUserId,
        displayName: profile?.displayName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "Unknown"),
        profileImageUrl: user?.profileImageUrl || null,
        createdAt: access.createdAt,
      };
    }));
    
    res.json(enriched);
  });

  app.post("/api/wardrobe-access/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const ownerId = (req.user as any).claims?.sub || (req.user as any).userId;
    const grantedUserId = req.params.userId;
    
    // Can't grant access to yourself
    if (ownerId === grantedUserId) {
      return res.status(400).json({ message: "Cannot grant access to yourself" });
    }
    
    // Check if target user exists
    const targetUser = await authStorage.getUser(grantedUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const access = await storage.grantWardrobeAccess(ownerId, grantedUserId);
    res.json(access);
  });

  app.delete("/api/wardrobe-access/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const ownerId = (req.user as any).claims?.sub || (req.user as any).userId;
    const grantedUserId = req.params.userId;
    
    await storage.revokeWardrobeAccess(ownerId, grantedUserId);
    res.json({ success: true });
  });

  app.get("/api/wardrobe-access/check/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const viewerId = (req.user as any).claims?.sub || (req.user as any).userId;
    const ownerId = req.params.userId;
    
    // Owner always has access to their own wardrobe
    if (viewerId === ownerId) {
      return res.json({ hasAccess: true });
    }
    
    const hasAccess = await storage.hasWardrobeAccess(ownerId, viewerId);
    res.json({ hasAccess });
  });

  // Photo Access Management
  app.get("/api/photo-access", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const accessList = await storage.getPhotoAccessList(userId);
    
    // Enrich with user info
    const enriched = await Promise.all(accessList.map(async (access) => {
      const user = await authStorage.getUser(access.grantedUserId);
      const profile = await storage.getProfile(access.grantedUserId);
      return {
        id: access.id,
        grantedUserId: access.grantedUserId,
        displayName: profile?.displayName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "Unknown"),
        profileImageUrl: user?.profileImageUrl || null,
        createdAt: access.createdAt,
      };
    }));
    
    res.json(enriched);
  });

  app.post("/api/photo-access/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const ownerId = (req.user as any).claims?.sub || (req.user as any).userId;
    const grantedUserId = req.params.userId;
    
    // Can't grant access to yourself
    if (ownerId === grantedUserId) {
      return res.status(400).json({ message: "Cannot grant access to yourself" });
    }
    
    // Check if target user exists
    const targetUser = await authStorage.getUser(grantedUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const access = await storage.grantPhotoAccess(ownerId, grantedUserId);
    res.json(access);
  });

  app.delete("/api/photo-access/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const ownerId = (req.user as any).claims?.sub || (req.user as any).userId;
    const grantedUserId = req.params.userId;
    
    await storage.revokePhotoAccess(ownerId, grantedUserId);
    res.json({ success: true });
  });

  app.get("/api/photo-access/check/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const viewerId = (req.user as any).claims?.sub || (req.user as any).userId;
    const ownerId = req.params.userId;
    
    // Owner always has access to their own photos
    if (viewerId === ownerId) {
      return res.json({ hasAccess: true });
    }
    
    const hasAccess = await storage.hasPhotoAccess(ownerId, viewerId);
    res.json({ hasAccess });
  });

  // === Favorites ===

  app.get(api.favorites.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const userFavorites = await storage.getFavorites(userId);
    
    const enrichedFavorites = await Promise.all(userFavorites.map(async (f) => {
      const user = await authStorage.getUser(f.targetUserId);
      const profile = await storage.getProfile(f.targetUserId);
      return {
        userId: f.targetUserId,
        displayName: profile?.displayName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "Unknown"),
        profileImageUrl: user?.profileImageUrl || null,
      };
    }));

    res.json(enrichedFavorites);
  });

  app.post(api.favorites.add.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const targetUserId = req.params.targetUserId;
    
    await storage.addFavorite(userId, targetUserId);
    res.json({ message: "Added to favorites" });
  });

  app.delete(api.favorites.remove.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const targetUserId = req.params.targetUserId;
    
    await storage.removeFavorite(userId, targetUserId);
    res.json({ message: "Removed from favorites" });
  });

  // === Photos ===

  // Get my photos (includes private)
  app.get(api.photos.myPhotos.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const photos = await storage.getPhotos(userId, true);
    res.json(photos);
  });

  // Get another user's photos (public only)
  app.get(api.photos.userPhotos.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const targetUserId = req.params.userId;
    const photos = await storage.getPhotos(targetUserId, false);
    res.json(photos);
  });

  // Add a photo
  app.post(api.photos.add.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    
    try {
      const input = api.photos.add.input.parse(req.body);
      const photo = await storage.addPhoto(userId, input);
      res.json(photo);
    } catch (err) {
      console.error("Error adding photo:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      return res.status(500).json({ message: "Failed to add photo" });
    }
  });

  // Update a photo
  app.patch(api.photos.update.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const photoId = parseInt(req.params.photoId);
    
    try {
      const input = api.photos.update.input.parse(req.body);
      const photo = await storage.updatePhoto(userId, photoId, input);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.json(photo);
    } catch (err) {
      console.error("Error updating photo:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      return res.status(500).json({ message: "Failed to update photo" });
    }
  });

  // Delete a photo
  app.delete(api.photos.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const photoId = parseInt(req.params.photoId);
    
    await storage.deletePhoto(userId, photoId);
    res.json({ message: "Photo deleted" });
  });

  // Set a photo as profile photo
  app.post(api.photos.setProfilePhoto.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const photoId = parseInt(req.params.photoId);
    
    const photo = await storage.setProfilePhoto(userId, photoId);
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }
    res.json(photo);
  });

  // Reorder photos
  app.post(api.photos.reorder.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    
    try {
      const input = api.photos.reorder.input.parse(req.body);
      await storage.reorderPhotos(userId, input.photoIds);
      res.json({ message: "Photos reordered" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === Conversations ===

  // List all conversations
  app.get(api.conversations.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const conversations = await storage.getConversations(userId);
    res.json(conversations);
  });

  // Get a single conversation
  app.get(api.conversations.get.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const conversationId = parseInt(req.params.conversationId);
    
    const conversation = await storage.getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  });

  // Create a new conversation (for group chats)
  app.post(api.conversations.create.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    
    try {
      const input = api.conversations.create.input.parse(req.body);
      const conversation = await storage.createConversation(
        userId, 
        input.participantIds,
        input.name,
        input.isGroup
      );
      res.json(conversation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Start or get a direct (1-on-1) conversation
  app.post(api.conversations.startDirect.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const otherUserId = req.params.userId;
    
    const conversation = await storage.getOrCreateDirectConversation(userId, otherUserId);
    res.json(conversation);
  });

  // Add participants to a group conversation
  app.post(api.conversations.addParticipants.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const conversationId = parseInt(req.params.conversationId);
    
    // Verify user is a participant before allowing them to add others
    const conversation = await storage.getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(403).json({ message: "You are not a member of this conversation" });
    }
    
    try {
      const input = api.conversations.addParticipants.input.parse(req.body);
      await storage.addParticipantsToConversation(conversationId, input.userIds);
      res.json({ message: "Participants added" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === Messages ===

  // Get messages in a conversation
  app.get(api.messages.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const conversationId = parseInt(req.params.conversationId);
    
    // Verify user is a member of this conversation
    const conversation = await storage.getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(403).json({ message: "You are not a member of this conversation" });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const messages = await storage.getMessages(conversationId, userId, limit, offset);
    res.json(messages);
  });

  // Send a message
  app.post(api.messages.send.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const conversationId = parseInt(req.params.conversationId);
    
    // Verify user is a member of this conversation
    const conversation = await storage.getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(403).json({ message: "You are not a member of this conversation" });
    }
    
    // Check free tier message limit (5 messages per day)
    const FREE_DAILY_MESSAGE_LIMIT = 5;
    const user = await authStorage.getUser(userId);
    
    // Determine user tier using centralized platinum email check
    const hasPlatinumEmail = user?.email ? isPlatinumEmail(user.email) : false;
    const hasActiveSubscription = hasPlatinumEmail || user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';
    const tier = hasPlatinumEmail ? 'platinum' : (hasActiveSubscription ? (user?.subscriptionTier || 'premium') : 'free');
    
    if (tier === 'free') {
      // Count messages sent today by this user
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const messageCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM messages 
        WHERE sender_id = ${userId} 
        AND created_at >= ${todayStart}
      `);
      const messagesSentToday = parseInt(messageCountResult.rows[0]?.count as string || '0');
      
      if (messagesSentToday >= FREE_DAILY_MESSAGE_LIMIT) {
        return res.status(403).json({ 
          message: `Free members can send ${FREE_DAILY_MESSAGE_LIMIT} messages per day. Upgrade to send unlimited messages.`,
          code: 'MESSAGE_LIMIT_REACHED',
          limit: FREE_DAILY_MESSAGE_LIMIT,
          used: messagesSentToday
        });
      }
    }
    
    try {
      const input = api.messages.send.input.parse(req.body);
      
      if (!input.content && !input.imageUrl) {
        return res.status(400).json({ message: "Message must have content or an image" });
      }
      
      const message = await storage.sendMessage(conversationId, userId, input.content, input.imageUrl);
      res.json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Mark a conversation as read
  app.post(api.messages.markRead.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const conversationId = parseInt(req.params.conversationId);
    
    // Verify user is a member of this conversation
    const conversation = await storage.getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(403).json({ message: "You are not a member of this conversation" });
    }
    
    await storage.markConversationRead(conversationId, userId);
    res.json({ message: "Marked as read" });
  });

  // === Events ===

  // Get all upcoming events
  app.get(api.events.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const events = await storage.getEvents(userId);
    res.json(events);
  });

  // Get a single event
  app.get(api.events.get.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const eventId = parseInt(req.params.eventId);
    
    const event = await storage.getEvent(eventId, userId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  });

  // Get events by host
  app.get(api.events.hostEvents.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const hostId = req.params.userId;
    
    const events = await storage.getHostEvents(hostId, userId);
    res.json(events);
  });

  // Create an event
  app.post(api.events.create.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    
    try {
      const input = api.events.create.input.parse(req.body);
      const event = await storage.createEvent(userId, {
        ...input,
        eventDate: new Date(input.eventDate as any),
      });
      res.json(event);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Join an event
  app.post(api.events.join.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const eventId = parseInt(req.params.eventId);
    
    const attendee = await storage.joinEvent(eventId, userId);
    res.json(attendee);
  });

  // Leave an event
  app.delete(api.events.leave.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const eventId = parseInt(req.params.eventId);
    
    await storage.leaveEvent(eventId, userId);
    res.json({ message: "Left event" });
  });

  // Update attendee status (host only)
  app.patch(api.events.updateAttendee.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const hostId = (req.user as any).claims?.sub || (req.user as any).userId;
    const eventId = parseInt(req.params.eventId);
    const targetUserId = req.params.userId;
    
    try {
      const input = api.events.updateAttendee.input.parse(req.body);
      const attendee = await storage.updateAttendeeStatus(eventId, hostId, targetUserId, input.status);
      res.json(attendee);
    } catch (err) {
      if (err instanceof Error && err.message === "Not authorized") {
        return res.status(403).json({ message: "Not authorized" });
      }
      throw err;
    }
  });

  // Delete an event (host only)
  app.delete(api.events.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const eventId = parseInt(req.params.eventId);
    
    try {
      await storage.deleteEvent(eventId, userId);
      res.json({ message: "Event deleted" });
    } catch (err) {
      if (err instanceof Error && err.message === "Not authorized") {
        return res.status(403).json({ message: "Not authorized" });
      }
      throw err;
    }
  });

  // === Subscription/Payment Routes (Stripe) ===

  // Get Stripe publishable key for frontend
  app.get("/api/payment/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err) {
      console.error("Error getting payment config:", err);
      res.status(500).json({ error: "Payment system unavailable" });
    }
  });

  // Get subscription status
  app.get("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    
    const user = await authStorage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email grants automatic platinum access
    const hasPlatinumEmail = isPlatinumEmail(user.email);
    
    // Check if user is admin (owner)
    const ownerEmail = process.env.OWNER_EMAIL;
    const isAdmin = !!(ownerEmail && user.email === ownerEmail);
    
    const hasActiveSubscription = hasPlatinumEmail || user.subscriptionStatus === 'active' || 
                                  user.subscriptionStatus === 'trialing';
    const tier = hasPlatinumEmail ? 'platinum' : (hasActiveSubscription ? (user.subscriptionTier || 'premium') : 'free');
    const isPremium = hasActiveSubscription;
    const isPlatinum = hasPlatinumEmail || (hasActiveSubscription && user.subscriptionTier === 'platinum');

    console.log(`[Subscription Check] User: ${user.email}, Status: ${user.subscriptionStatus}, Tier: ${user.subscriptionTier}, isPlatinum: ${isPlatinum}, isAdmin: ${isAdmin}`);

    // Calculate message limits for free tier
    const FREE_DAILY_MESSAGE_LIMIT = 5;
    let messagesRemaining = null;
    let messageLimit = null;
    
    if (tier === 'free') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const messageCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM messages 
        WHERE sender_id = ${userId} 
        AND created_at >= ${todayStart}
      `);
      const messagesSentToday = parseInt(messageCountResult.rows[0]?.count as string || '0');
      messagesRemaining = Math.max(0, FREE_DAILY_MESSAGE_LIMIT - messagesSentToday);
      messageLimit = FREE_DAILY_MESSAGE_LIMIT;
    }

    res.json({
      isPremium,
      isPlatinum,
      isAdmin,
      tier,
      status: hasPlatinumEmail ? 'active' : user.subscriptionStatus,
      plan: user.subscriptionPlan,
      endDate: user.subscriptionEndDate,
      messagesRemaining,
      messageLimit,
    });
  });

  // Get available membership tiers/prices from Stripe
  app.get("/api/prices", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `);

      const productsMap = new Map();
      for (const row of result.rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          const metadata = row.product_metadata || {};
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            tier: metadata.tier || 'premium',
            features: metadata.features ? JSON.parse(metadata.features) : [],
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            amount: row.unit_amount,
            currency: row.currency,
            interval: row.recurring?.interval || 'month',
          });
        }
      }

      res.json({ prices: Array.from(productsMap.values()) });
    } catch (err) {
      console.error("Error fetching prices:", err);
      res.status(500).json({ error: "Could not fetch prices" });
    }
  });

  // Create Stripe checkout session
  app.post("/api/checkout", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: "Price ID required" });
    }

    try {
      const user = await authStorage.getUser(userId);
      if (!user || !user.email) {
        return res.status(400).json({ error: "User email required for payment" });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        await authStorage.updateUserStripeCustomerId(userId, customer.id);
        customerId = customer.id;
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/subscription?success=true`,
        cancel_url: `${baseUrl}/subscription?canceled=true`,
        metadata: { userId },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Error creating checkout:", err);
      res.status(500).json({ error: "Could not create checkout session" });
    }
  });

  // Create Stripe customer portal session
  app.post("/api/billing/portal", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;

    try {
      const user = await authStorage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/subscription`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Error creating portal session:", err);
      res.status(500).json({ error: "Could not create portal session" });
    }
  });

  // === Wardrobe (Platinum-only) ===

  // List wardrobe items
  app.get(api.wardrobe.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const isPlatinum = await checkPlatinumTier(userId);
    if (!isPlatinum) {
      return res.status(403).json({ message: "Platinum subscription required" });
    }
    const category = req.query.category as string | undefined;
    
    try {
      const items = await storage.getWardrobeItems(userId, category);
      res.json(items);
    } catch (err) {
      console.error("Error fetching wardrobe items:", err);
      res.status(500).json({ message: "Failed to fetch wardrobe items" });
    }
  });

  // Get single wardrobe item
  app.get("/api/wardrobe/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const isPlatinum = await checkPlatinumTier(userId);
    if (!isPlatinum) {
      return res.status(403).json({ message: "Platinum subscription required" });
    }
    const itemId = parseInt(req.params.itemId);
    
    try {
      const item = await storage.getWardrobeItem(userId, itemId);
      if (!item) {
        return res.status(404).json({ message: "Wardrobe item not found" });
      }
      res.json(item);
    } catch (err) {
      console.error("Error fetching wardrobe item:", err);
      res.status(500).json({ message: "Failed to fetch wardrobe item" });
    }
  });

  // Create wardrobe item
  app.post(api.wardrobe.create.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const isPlatinum = await checkPlatinumTier(userId);
    if (!isPlatinum) {
      return res.status(403).json({ message: "Platinum subscription required" });
    }
    
    try {
      const input = api.wardrobe.create.input.parse(req.body);
      const item = await storage.createWardrobeItem(userId, input);
      res.status(201).json(item);
    } catch (err) {
      console.error("Error creating wardrobe item:", err);
      res.status(400).json({ message: "Failed to create wardrobe item" });
    }
  });

  // Update wardrobe item
  app.patch("/api/wardrobe/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const isPlatinum = await checkPlatinumTier(userId);
    if (!isPlatinum) {
      return res.status(403).json({ message: "Platinum subscription required" });
    }
    const itemId = parseInt(req.params.itemId);
    
    try {
      const existing = await storage.getWardrobeItem(userId, itemId);
      if (!existing) {
        return res.status(404).json({ message: "Wardrobe item not found" });
      }
      const input = api.wardrobe.update.input.parse(req.body);
      const item = await storage.updateWardrobeItem(userId, itemId, input);
      res.json(item);
    } catch (err) {
      console.error("Error updating wardrobe item:", err);
      res.status(400).json({ message: "Failed to update wardrobe item" });
    }
  });

  // Delete wardrobe item
  app.delete("/api/wardrobe/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const isPlatinum = await checkPlatinumTier(userId);
    if (!isPlatinum) {
      return res.status(403).json({ message: "Platinum subscription required" });
    }
    const itemId = parseInt(req.params.itemId);
    
    try {
      const existing = await storage.getWardrobeItem(userId, itemId);
      if (!existing) {
        return res.status(404).json({ message: "Wardrobe item not found" });
      }
      await storage.deleteWardrobeItem(userId, itemId);
      res.json({ message: "Wardrobe item deleted" });
    } catch (err) {
      console.error("Error deleting wardrobe item:", err);
      res.status(400).json({ message: "Failed to delete wardrobe item" });
    }
  });

  // Toggle wardrobe item favorite
  app.post("/api/wardrobe/:itemId/favorite", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    const isPlatinum = await checkPlatinumTier(userId);
    if (!isPlatinum) {
      return res.status(403).json({ message: "Platinum subscription required" });
    }
    const itemId = parseInt(req.params.itemId);
    
    try {
      const existing = await storage.getWardrobeItem(userId, itemId);
      if (!existing) {
        return res.status(404).json({ message: "Wardrobe item not found" });
      }
      const item = await storage.toggleWardrobeFavorite(userId, itemId);
      res.json(item);
    } catch (err) {
      console.error("Error toggling favorite:", err);
      res.status(400).json({ message: "Failed to toggle favorite" });
    }
  });

  // Auction routes (Platinum-only)
  app.get("/api/auctions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).claims?.sub || (req.user as any).userId;
      const isPlatinum = await checkPlatinumTier(userId);
      if (!isPlatinum) {
        return res.status(403).json({ message: "Platinum subscription required" });
      }
      const auctions = await storage.getAuctions(userId);
      res.json(auctions);
    } catch (err) {
      console.error("Error fetching auctions:", err);
      res.status(500).json({ message: "Failed to fetch auctions" });
    }
  });

  app.get("/api/auctions/:auctionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).claims?.sub || (req.user as any).userId;
      const isPlatinum = await checkPlatinumTier(userId);
      if (!isPlatinum) {
        return res.status(403).json({ message: "Platinum subscription required" });
      }
      const auctionId = parseInt(req.params.auctionId);
      if (isNaN(auctionId)) {
        return res.status(400).json({ message: "Invalid auction ID" });
      }
      const auction = await storage.getAuction(auctionId);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      res.json(auction);
    } catch (err) {
      console.error("Error fetching auction:", err);
      res.status(500).json({ message: "Failed to fetch auction" });
    }
  });

  const createAuctionSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    category: z.string().min(1),
    startingPrice: z.number().int().positive(),
    currentPrice: z.number().int().positive(),
    buyNowPrice: z.number().int().positive().optional(),
    endDate: z.string().datetime(),
    imageUrl: z.string().optional(),
  });

  app.post("/api/auctions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).claims?.sub || (req.user as any).userId;
      const isPlatinum = await checkPlatinumTier(userId);
      if (!isPlatinum) {
        return res.status(403).json({ message: "Platinum subscription required" });
      }
      const parsed = createAuctionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid auction data", errors: parsed.error.errors });
      }
      const auction = await storage.createAuction(userId, parsed.data);
      res.status(201).json(auction);
    } catch (err) {
      console.error("Error creating auction:", err);
      res.status(400).json({ message: "Failed to create auction" });
    }
  });

  app.patch("/api/auctions/:auctionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).claims?.sub || (req.user as any).userId;
      const isPlatinum = await checkPlatinumTier(userId);
      if (!isPlatinum) {
        return res.status(403).json({ message: "Platinum subscription required" });
      }
      const auctionId = parseInt(req.params.auctionId);
      if (isNaN(auctionId)) {
        return res.status(400).json({ message: "Invalid auction ID" });
      }
      const auction = await storage.updateAuction(auctionId, userId, req.body);
      res.json(auction);
    } catch (err) {
      console.error("Error updating auction:", err);
      res.status(400).json({ message: "Failed to update auction" });
    }
  });

  app.delete("/api/auctions/:auctionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).claims?.sub || (req.user as any).userId;
      const isPlatinum = await checkPlatinumTier(userId);
      if (!isPlatinum) {
        return res.status(403).json({ message: "Platinum subscription required" });
      }
      const auctionId = parseInt(req.params.auctionId);
      if (isNaN(auctionId)) {
        return res.status(400).json({ message: "Invalid auction ID" });
      }
      await storage.deleteAuction(auctionId, userId);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting auction:", err);
      res.status(400).json({ message: "Failed to delete auction" });
    }
  });

  app.post("/api/auctions/:auctionId/end", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).claims?.sub || (req.user as any).userId;
      const isPlatinum = await checkPlatinumTier(userId);
      if (!isPlatinum) {
        return res.status(403).json({ message: "Platinum subscription required" });
      }
      const auctionId = parseInt(req.params.auctionId);
      if (isNaN(auctionId)) {
        return res.status(400).json({ message: "Invalid auction ID" });
      }
      const auction = await storage.endAuction(auctionId, userId);
      res.json(auction);
    } catch (err) {
      console.error("Error ending auction:", err);
      res.status(400).json({ message: "Failed to end auction" });
    }
  });

  app.get("/api/auctions/:auctionId/bids", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).claims?.sub || (req.user as any).userId;
      const isPlatinum = await checkPlatinumTier(userId);
      if (!isPlatinum) {
        return res.status(403).json({ message: "Platinum subscription required" });
      }
      const auctionId = parseInt(req.params.auctionId);
      if (isNaN(auctionId)) {
        return res.status(400).json({ message: "Invalid auction ID" });
      }
      const bids = await storage.getBids(auctionId);
      res.json(bids);
    } catch (err) {
      console.error("Error fetching bids:", err);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  const placeBidSchema = z.object({
    amount: z.number().int().positive(),
  });

  app.post("/api/auctions/:auctionId/bids", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = (req.user as any).claims?.sub || (req.user as any).userId;
      const isPlatinum = await checkPlatinumTier(userId);
      if (!isPlatinum) {
        return res.status(403).json({ message: "Platinum subscription required" });
      }
      const auctionId = parseInt(req.params.auctionId);
      if (isNaN(auctionId)) {
        return res.status(400).json({ message: "Invalid auction ID" });
      }
      const parsed = placeBidSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid bid amount" });
      }
      const { amount } = parsed.data;
      if (!amount || isNaN(Number(amount))) {
        return res.status(400).json({ message: "Invalid bid amount" });
      }
      const bid = await storage.placeBid(auctionId, userId, Number(amount));
      res.status(201).json(bid);
    } catch (err: any) {
      console.error("Error placing bid:", err);
      res.status(400).json({ message: err.message || "Failed to place bid" });
    }
  });

  // Reports
  app.post("/api/reports", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { reportedUserId, reason, description } = req.body;
      
      if (!reportedUserId || !reason) {
        return res.status(400).json({ message: "Reported user and reason are required" });
      }
      
      if (reportedUserId === req.user.id) {
        return res.status(400).json({ message: "You cannot report yourself" });
      }
      
      const report = await storage.createReport(req.user.id, {
        reportedUserId,
        reason,
        description,
      });
      
      res.status(201).json(report);
    } catch (err: any) {
      console.error("Error creating report:", err);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // === Online Status ===

  // Get online users (who's on)
  app.get("/api/whos-on", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const onlineUsers = await storage.getOnlineUsers(15); // Active in last 15 minutes
      res.json(onlineUsers);
    } catch (err: any) {
      console.error("Error fetching online users:", err);
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });

  // Update activity (heartbeat)
  app.post("/api/activity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    try {
      await storage.updateLastActive(userId);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating activity:", err);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  // Toggle under dressed mode
  app.patch("/api/under-dressed", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    try {
      const { isUnderDressed } = req.body;
      if (typeof isUnderDressed !== "boolean") {
        return res.status(400).json({ message: "isUnderDressed must be a boolean" });
      }
      const profile = await storage.setUnderDressed(userId, isUnderDressed);
      res.json(profile);
    } catch (err: any) {
      console.error("Error toggling under dressed mode:", err);
      res.status(500).json({ message: "Failed to update visibility" });
    }
  });

  // ========== ADMIN ROUTES ==========
  
  // Helper to check if user is owner
  async function isOwner(req: Request): Promise<boolean> {
    if (!req.isAuthenticated()) return false;
    const userId = (req.user as any).claims?.sub || (req.user as any).userId;
    if (!userId) return false;
    const user = await authStorage.getUser(userId);
    if (!user) return false;
    const ownerEmail = process.env.OWNER_EMAIL;
    return !!(ownerEmail && user.email === ownerEmail);
  }

  // Get all members (admin only)
  app.get("/api/admin/members", async (req, res) => {
    try {
      if (!await isOwner(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const result = await db.execute(sql`
        SELECT 
          u.id, 
          u.email, 
          u.first_name, 
          u.last_name, 
          u.subscription_status, 
          u.subscription_plan, 
          u.subscription_tier,
          u.created_at,
          p.display_name,
          p.age_verified
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        ORDER BY u.created_at DESC
      `);
      
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching admin members:", err);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Update member subscription (admin only)
  app.patch("/api/admin/members/:userId/subscription", async (req, res) => {
    try {
      if (!await isOwner(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { userId } = req.params;
      const { tier, status } = req.body;
      
      // Validate tier
      const validTiers = ['free', 'premium', 'platinum'];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({ message: "Invalid tier. Must be: free, premium, or platinum" });
      }
      
      // Set subscription fields based on tier
      let subscriptionStatus = status || 'active';
      let subscriptionPlan = tier === 'free' ? null : 'monthly';
      let subscriptionEndDate = tier === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      
      if (tier === 'free') {
        subscriptionStatus = null;
        subscriptionPlan = null;
        subscriptionEndDate = null;
      }
      
      console.log(`[Admin] Updating user ${userId} subscription to tier: ${tier}, status: ${subscriptionStatus}`);
      
      const result = await db.execute(sql`
        UPDATE users 
        SET subscription_tier = ${tier === 'free' ? null : tier},
            subscription_status = ${subscriptionStatus},
            subscription_plan = ${subscriptionPlan},
            subscription_end_date = ${subscriptionEndDate},
            updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, email, subscription_tier, subscription_status
      `);
      
      console.log(`[Admin] Update result:`, result.rows[0]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        success: true, 
        message: `User subscription updated to ${tier}`,
        user: result.rows[0]
      });
    } catch (err) {
      console.error("Error updating member subscription:", err);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Get admin stats (admin only)
  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!await isOwner(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get total users
      const totalUsersResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      const totalUsers = parseInt(totalUsersResult.rows[0]?.count as string || '0');
      
      // Get verified profiles
      const verifiedResult = await db.execute(sql`SELECT COUNT(*) as count FROM profiles WHERE age_verified = true`);
      const verifiedProfiles = parseInt(verifiedResult.rows[0]?.count as string || '0');
      
      // Get subscription counts by tier (include both active and trialing)
      const premiumResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM users 
        WHERE (subscription_status = 'active' OR subscription_status = 'trialing') 
        AND subscription_tier = 'premium'
      `);
      const premiumSubscribers = parseInt(premiumResult.rows[0]?.count as string || '0');
      
      const platinumResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM users 
        WHERE (subscription_status = 'active' OR subscription_status = 'trialing') 
        AND subscription_tier = 'platinum'
      `);
      const platinumSubscribers = parseInt(platinumResult.rows[0]?.count as string || '0');
      
      // Get detailed subscription breakdown by plan for revenue calculation
      const subscriptionDetails = await db.execute(sql`
        SELECT subscription_tier, subscription_plan, COUNT(*) as count 
        FROM users 
        WHERE subscription_status = 'active' OR subscription_status = 'trialing'
        GROUP BY subscription_tier, subscription_plan
      `);
      
      // Calculate estimated monthly revenue
      // Monthly prices: Premium: $9.99/month, Platinum: $12.99/month
      // Yearly prices: Premium: $99/year (~$8.25/month), Platinum: $129/year (~$10.75/month)
      let estimatedMonthlyRevenue = 0;
      for (const row of subscriptionDetails.rows) {
        const count = parseInt(row.count as string || '0');
        const tier = row.subscription_tier as string;
        const plan = row.subscription_plan as string;
        
        if (tier === 'premium') {
          if (plan && plan.toLowerCase().includes('year')) {
            estimatedMonthlyRevenue += count * (99 / 12); // Yearly premium
          } else {
            estimatedMonthlyRevenue += count * 9.99; // Monthly premium
          }
        } else if (tier === 'platinum') {
          if (plan && plan.toLowerCase().includes('year')) {
            estimatedMonthlyRevenue += count * (129 / 12); // Yearly platinum
          } else {
            estimatedMonthlyRevenue += count * 12.99; // Monthly platinum
          }
        }
      }
      
      // Get new users this month
      const newUsersResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM users 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      `);
      const newUsersThisMonth = parseInt(newUsersResult.rows[0]?.count as string || '0');
      
      res.json({
        totalUsers,
        verifiedProfiles,
        premiumSubscribers,
        platinumSubscribers,
        totalPaidSubscribers: premiumSubscribers + platinumSubscribers,
        estimatedMonthlyRevenue: Math.round(estimatedMonthlyRevenue * 100) / 100,
        newUsersThisMonth
      });
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
