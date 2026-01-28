import { users, passwordResetTokens, type User, type UpsertUser, type PasswordResetToken } from "@shared/models/auth";
import { db } from "../../db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  registerUser(email: string, password: string): Promise<User>;
  setPassword(userId: string, password: string): Promise<User | undefined>;
  validatePassword(email: string, password: string): Promise<User | null>;
  updateUserSubscription(userId: string, subscriptionInfo: {
    ccbillSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    subscriptionTier?: string;
    subscriptionEndDate?: string;
  }): Promise<User | undefined>;
  // Legacy Stripe method - kept for backwards compatibility
  updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    subscriptionTier?: string;
    subscriptionEndDate?: Date | null;
  }): Promise<User | undefined>;
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined>;
  // Password reset methods
  createPasswordResetToken(userId: string): Promise<string>;
  getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  resetPasswordWithToken(token: string, newPassword: string): Promise<User | undefined>;
  // Account deletion
  deleteUser(userId: string): Promise<void>;
  // Change password (requires current password)
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ user: User | null; error?: string }>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async registerUser(email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async setPassword(userId: string, password: string): Promise<User | undefined> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) {
      return null;
    }
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    subscriptionTier?: string;
    subscriptionEndDate?: Date | null;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...stripeInfo,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserSubscription(userId: string, subscriptionInfo: {
    ccbillSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    subscriptionTier?: string;
    subscriptionEndDate?: string;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...subscriptionInfo,
        subscriptionEndDate: subscriptionInfo.subscriptionEndDate 
          ? new Date(subscriptionInfo.subscriptionEndDate) 
          : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    
    // Create a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    // Hash the token for storage (security best practice)
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    
    await db.insert(passwordResetTokens).values({
      userId,
      token: hashedToken,
      expiresAt,
    });
    
    // Return unhashed token to send to user
    return token;
  }

  async getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, hashedToken),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );
    return resetToken;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    // Hash the token to match stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, hashedToken));
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<User | undefined> {
    const resetToken = await this.getValidPasswordResetToken(token);
    if (!resetToken) {
      return undefined;
    }
    
    // Update the user's password
    const user = await this.setPassword(resetToken.userId, newPassword);
    
    // Delete the used token
    await this.deletePasswordResetToken(token);
    
    return user;
  }
  
  async deleteUser(userId: string): Promise<void> {
    // Delete password reset tokens first
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    // Delete the user record
    await db.delete(users).where(eq(users.id, userId));
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ user: User | null; error?: string }> {
    // Get user
    const user = await this.getUser(userId);
    if (!user) {
      return { user: null, error: "User not found" };
    }
    
    // If user has no password set (e.g., Replit Auth account), they can't use this flow
    if (!user.password) {
      return { user: null, error: "No password set for this account. Please use the 'Set Password' option." };
    }
    
    // Validate current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { user: null, error: "Current password is incorrect" };
    }
    
    // Set new password
    const updatedUser = await this.setPassword(userId, newPassword);
    return { user: updatedUser || null };
  }
}

export const authStorage = new AuthStorage();
