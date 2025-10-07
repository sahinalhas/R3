/**
 * Auth Service
 * Kimlik doğrulama ve kullanıcı yönetimi iş mantığı
 */

import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "../storage";
import { type User, type InsertUser } from "@shared/schema";
import { PASSWORD, DEV_USER, ERROR_MESSAGES, SUCCESS_MESSAGES } from "../config/constants";
import { isDevLoginAllowed } from "../config/env";
import { conflict, notFound, unauthorized, forbidden } from "../middleware/errors";

const scryptAsync = promisify(scrypt);

export class AuthService {
  /**
   * Şifreyi hashler
   */
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(PASSWORD.SALT_LENGTH).toString("hex");
    const buf = (await scryptAsync(password, salt, PASSWORD.HASH_LENGTH)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  /**
   * Şifreleri karşılaştırır
   */
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, PASSWORD.HASH_LENGTH)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  /**
   * Yeni kullanıcı kaydı oluşturur
   */
  async register(userData: InsertUser): Promise<Omit<User, 'password'>> {
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      throw conflict(ERROR_MESSAGES.AUTH.USERNAME_TAKEN);
    }

    const hashedPassword = await this.hashPassword(userData.password);
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Kullanıcı girişi yapar
   */
  async login(username: string, password: string): Promise<Omit<User, 'password'>> {
    const user = await storage.getUserByUsername(username);
    if (!user || !(await this.comparePasswords(password, user.password))) {
      throw unauthorized(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Kullanıcı bilgilerini getirir
   */
  async getUser(userId: number): Promise<Omit<User, 'password'>> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw notFound(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Kullanıcı bilgilerini günceller
   */
  async updateUser(
    userId: number, 
    currentUserRole: string,
    updateData: { username?: string; fullName?: string; role?: string }
  ): Promise<Omit<User, 'password'>> {
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      throw notFound(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    // Username benzersizlik kontrolü
    if (updateData.username && updateData.username !== currentUser.username) {
      const existingUser = await storage.getUserByUsername(updateData.username);
      if (existingUser) {
        throw conflict(ERROR_MESSAGES.AUTH.USERNAME_TAKEN);
      }
    }

    // Role değişikliği yetki kontrolü
    if (updateData.role && updateData.role !== currentUser.role) {
      if (currentUserRole !== "admin" && currentUserRole !== "okul_yönetimi") {
        throw forbidden(ERROR_MESSAGES.USER.ROLE_CHANGE_FORBIDDEN);
      }
    }

    const updatedUser = await storage.updateUser(userId, updateData);
    if (!updatedUser) {
      throw notFound(ERROR_MESSAGES.USER.UPDATE_FAILED);
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Şifre değiştirir
   */
  async changePassword(
    userId: number, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw notFound(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    const isPasswordValid = await this.comparePasswords(currentPassword, user.password);
    if (!isPasswordValid) {
      throw unauthorized(ERROR_MESSAGES.AUTH.INVALID_CURRENT_PASSWORD);
    }

    if (newPassword.length < PASSWORD.MIN_LENGTH) {
      throw new Error(ERROR_MESSAGES.AUTH.PASSWORD_TOO_SHORT);
    }

    const hashedPassword = await this.hashPassword(newPassword);
    const updatedUser = await storage.updateUser(userId, { password: hashedPassword });

    if (!updatedUser) {
      throw notFound(ERROR_MESSAGES.USER.UPDATE_FAILED);
    }

    return { 
      success: true, 
      message: SUCCESS_MESSAGES.PASSWORD_CHANGED 
    };
  }

  /**
   * Geliştirici hızlı girişi (sadece development)
   */
  async devLogin(appEnv: string): Promise<Omit<User, 'password'>> {
    if (!isDevLoginAllowed(appEnv)) {
      throw forbidden(ERROR_MESSAGES.DEV.DEV_LOGIN_FORBIDDEN);
    }

    let user = await storage.getUserByUsername(DEV_USER.USERNAME);
    if (!user) {
      const hashedPassword = await this.hashPassword(DEV_USER.PASSWORD);
      user = await storage.createUser({
        username: DEV_USER.USERNAME,
        password: hashedPassword,
        fullName: DEV_USER.FULL_NAME,
        role: DEV_USER.ROLE,
      });
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const authService = new AuthService();
