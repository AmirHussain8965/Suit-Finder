import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Support both Replit Auth (claims.sub) and email/password auth (userId)
      const userId = req.user.claims?.sub || req.user.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password hash
      const { password, ...safeUser } = user;
      
      // Owner always gets platinum tier
      const ownerEmail = process.env.OWNER_EMAIL;
      if (ownerEmail && user.email === ownerEmail) {
        safeUser.subscriptionTier = 'platinum';
        safeUser.subscriptionStatus = 'active';
      }
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email/password registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await authStorage.getUserByEmail(input.email);
      if (existingUser) {
        // If user exists but has no password (from Replit Auth), allow setting password
        if (!existingUser.password) {
          const user = await authStorage.setPassword(existingUser.id, input.password);
          if (!user) {
            return res.status(500).json({ message: "Failed to set password" });
          }
          
          // Log them in
          const sessionUser = {
            userId: user.id,
            email: user.email,
            claims: { sub: user.id },
            expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
          };
          
          return req.login(sessionUser, (err: any) => {
            if (err) {
              console.error("Session error:", err);
              return res.status(500).json({ message: "Failed to create session" });
            }
            const { password, ...safeUser } = user;
            res.json(safeUser);
          });
        }
        return res.status(400).json({ message: "Email already registered" });
      }
      
      const user = await authStorage.registerUser(input.email, input.password);
      
      // Log the user in by creating a session
      const sessionUser = {
        userId: user.id,
        email: user.email,
        claims: { sub: user.id },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };
      
      req.login(sessionUser, (err: any) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        const { password, ...safeUser } = user;
        res.json(safeUser);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email/password login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);
      
      const user = await authStorage.validatePassword(input.email, input.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Create session
      const sessionUser = {
        userId: user.id,
        email: user.email,
        claims: { sub: user.id },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };
      
      req.login(sessionUser, (err: any) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        const { password, ...safeUser } = user;
        res.json(safeUser);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout (works for both auth methods)
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });
}
