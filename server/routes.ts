import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth first
  await setupAuth(app);
  registerAuthRoutes(app);

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
      const profile = await storage.updateLocation(userId, input.latitude, input.longitude);
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
      };
    }));

    res.json(enrichedProfiles);
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

  return httpServer;
}
