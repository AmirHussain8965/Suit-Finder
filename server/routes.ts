import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { insertAuctionSchema, insertBidSchema } from "@shared/schema";

async function checkPlatinumTier(userId: string): Promise<boolean> {
  const user = await authStorage.getUser(userId);
  if (!user) return false;
  const hasActiveSubscription = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
  return hasActiveSubscription && user.subscriptionTier === 'platinum';
}

async function checkPremiumTier(userId: string): Promise<boolean> {
  const user = await authStorage.getUser(userId);
  if (!user) return false;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    
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
    const userId = (req.user as any).claims.sub;

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
    const userId = (req.user as any).claims.sub;

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
    const viewerId = (req.user as any).claims.sub;
    const viewer = await authStorage.getUser(viewerId);
    const viewerIsPremium = viewer?.subscriptionStatus === 'active' || viewer?.subscriptionStatus === 'trialing';

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
    });
  });

  // === Favorites ===

  app.get(api.favorites.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const targetUserId = req.params.targetUserId;
    
    await storage.addFavorite(userId, targetUserId);
    res.json({ message: "Added to favorites" });
  });

  app.delete(api.favorites.remove.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    
    try {
      const input = api.photos.add.input.parse(req.body);
      const photo = await storage.addPhoto(userId, input);
      res.json(photo);
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

  // Update a photo
  app.patch(api.photos.update.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    const photoId = parseInt(req.params.photoId);
    
    try {
      const input = api.photos.update.input.parse(req.body);
      const photo = await storage.updatePhoto(userId, photoId, input);
      res.json(photo);
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

  // Delete a photo
  app.delete(api.photos.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    const photoId = parseInt(req.params.photoId);
    
    await storage.deletePhoto(userId, photoId);
    res.json({ message: "Photo deleted" });
  });

  // Set a photo as profile photo
  app.post(api.photos.setProfilePhoto.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    const photoId = parseInt(req.params.photoId);
    
    const photo = await storage.setProfilePhoto(userId, photoId);
    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }
    res.json(photo);
  });

  // === Conversations ===

  // List all conversations
  app.get(api.conversations.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    const conversations = await storage.getConversations(userId);
    res.json(conversations);
  });

  // Get a single conversation
  app.get(api.conversations.get.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    
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
    const userId = (req.user as any).claims.sub;
    const otherUserId = req.params.userId;
    
    const conversation = await storage.getOrCreateDirectConversation(userId, otherUserId);
    res.json(conversation);
  });

  // Add participants to a group conversation
  app.post(api.conversations.addParticipants.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const conversationId = parseInt(req.params.conversationId);
    
    // Verify user is a member of this conversation
    const conversation = await storage.getConversation(conversationId, userId);
    if (!conversation) {
      return res.status(403).json({ message: "You are not a member of this conversation" });
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const events = await storage.getEvents(userId);
    res.json(events);
  });

  // Get a single event
  app.get(api.events.get.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
    const hostId = req.params.userId;
    
    const events = await storage.getHostEvents(hostId, userId);
    res.json(events);
  });

  // Create an event
  app.post(api.events.create.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    
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
    const userId = (req.user as any).claims.sub;
    const eventId = parseInt(req.params.eventId);
    
    const attendee = await storage.joinEvent(eventId, userId);
    res.json(attendee);
  });

  // Leave an event
  app.delete(api.events.leave.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    const eventId = parseInt(req.params.eventId);
    
    await storage.leaveEvent(eventId, userId);
    res.json({ message: "Left event" });
  });

  // Update attendee status (host only)
  app.patch(api.events.updateAttendee.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const hostId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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

  // === Subscription/Payment Routes ===

  // Get Stripe publishable key
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err) {
      console.error("Error getting Stripe config:", err);
      res.status(500).json({ error: "Payment system unavailable" });
    }
  });

  // Get subscription status
  app.get("/api/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    
    const user = await authStorage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hasActiveSubscription = user.subscriptionStatus === 'active' || 
                                  user.subscriptionStatus === 'trialing';
    const tier = hasActiveSubscription ? (user.subscriptionTier || 'premium') : 'free';
    const isPremium = hasActiveSubscription;
    const isPlatinum = hasActiveSubscription && user.subscriptionTier === 'platinum';

    res.json({
      isPremium,
      isPlatinum,
      tier,
      status: user.subscriptionStatus,
      plan: user.subscriptionPlan,
      endDate: user.subscriptionEndDate,
    });
  });

  // Get available prices
  app.get("/api/prices", async (req, res) => {
    try {
      const prices = await stripeService.listPrices();
      res.json({ prices });
    } catch (err) {
      console.error("Error fetching prices:", err);
      res.status(500).json({ error: "Could not fetch prices" });
    }
  });

  // Create checkout session
  app.post("/api/checkout", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: "Price ID required" });
    }

    try {
      const user = await authStorage.getUser(userId);
      if (!user || !user.email) {
        return res.status(400).json({ error: "User email required for payment" });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, userId);
        await authStorage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/subscription/success`,
        `${baseUrl}/subscription/cancel`
      );

      res.json({ url: session.url });
    } catch (err) {
      console.error("Error creating checkout:", err);
      res.status(500).json({ error: "Could not create checkout session" });
    }
  });

  // Create customer portal session (for managing subscription)
  app.post("/api/customer-portal", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;

    try {
      const user = await authStorage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/profile`
      );

      res.json({ url: session.url });
    } catch (err) {
      console.error("Error creating portal session:", err);
      res.status(500).json({ error: "Could not access subscription management" });
    }
  });

  // === Wardrobe (Platinum-only) ===

  // List wardrobe items
  app.get(api.wardrobe.list.path, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
    const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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
      const userId = (req.user as any).claims.sub;
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

  return httpServer;
}
