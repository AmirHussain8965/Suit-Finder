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

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      console.log("[Auth Debug] /api/auth/user - Session ID:", req.sessionID);
      console.log("[Auth Debug] /api/auth/user - Is authenticated:", req.isAuthenticated());
      console.log("[Auth Debug] /api/auth/user - Session user:", req.user ? JSON.stringify(req.user) : "none");
      console.log("[Auth Debug] /api/auth/user - Cookies:", req.headers.cookie || "none");
      
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
        
        console.log("[Auth Debug] Login successful - Session ID:", req.sessionID);
        console.log("[Auth Debug] Login successful - Session user set:", JSON.stringify(sessionUser));
        
        const { password, ...safeUser } = user;
        
        // Owner always gets platinum tier
        const ownerEmail = process.env.OWNER_EMAIL;
        if (ownerEmail && user.email === ownerEmail) {
          safeUser.subscriptionTier = 'platinum';
          safeUser.subscriptionStatus = 'active';
        }
        
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
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destroy error:", sessionErr);
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Debug session state (temporary)
  app.get("/api/auth/debug", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session,
      sessionID: req.sessionID,
      cookies: req.headers.cookie || 'none',
      user: req.user ? 'present' : 'missing',
    });
  });

  // Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const input = forgotPasswordSchema.parse(req.body);
      
      const user = await authStorage.getUserByEmail(input.email);
      
      // Always return success to prevent email enumeration attacks
      if (!user) {
        return res.json({ 
          message: "If an account exists with this email, you will receive a password reset link." 
        });
      }
      
      // Create reset token
      const token = await authStorage.createPasswordResetToken(user.id);
      
      // Build reset URL
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://formalfindings.com' 
        : `http://localhost:5000`;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      
      // In development, log the reset link for testing
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Password reset requested for ${input.email}`);
        console.log(`Reset URL: ${resetUrl}`);
      }
      
      res.json({ 
        message: "If an account exists with this email, you will receive a password reset link.",
        // In development, include the token for testing
        ...(process.env.NODE_ENV !== 'production' && { resetUrl })
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Validate reset token
  app.get("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }
      
      const resetToken = await authStorage.getValidPasswordResetToken(token);
      if (!resetToken) {
        return res.json({ valid: false, message: "Invalid or expired reset link" });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const input = resetPasswordSchema.parse(req.body);
      
      const user = await authStorage.resetPasswordWithToken(input.token, input.password);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      
      res.json({ message: "Password reset successfully. You can now login with your new password." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Change password (for logged-in users)
  app.post("/api/auth/change-password", async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims?.sub || req.user.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const input = changePasswordSchema.parse(req.body);
      
      const result = await authStorage.changePassword(userId, input.currentPassword, input.newPassword);
      if (!result.user) {
        return res.status(400).json({ message: result.error || "Failed to change password" });
      }
      
      // Regenerate session for security after password change
      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          // Still return success since password was changed
          return res.json({ message: "Password changed successfully. Please log in again." });
        }
        
        // Re-establish the user in the new session
        const sessionUser = {
          userId: result.user!.id,
          email: result.user!.email,
          claims: { sub: result.user!.id },
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
        };
        
        req.login(sessionUser, (loginErr: any) => {
          if (loginErr) {
            console.error("Re-login error:", loginErr);
            return res.json({ message: "Password changed successfully. Please log in again." });
          }
          res.json({ message: "Password changed successfully" });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}
