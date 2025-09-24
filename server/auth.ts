import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      fullName: string;
      role: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "rehberlik-servisi-gizli-anahtar",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 gün
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post(["/api/register", "/api/auth/register"], async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Bu kullanıcı adı zaten alınmış" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Kullanıcı şifresini client'a göndermeyelim
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post(["/api/login", "/api/auth/login"], (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Kullanıcı adı veya şifre hatalı" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Kullanıcı şifresini client'a göndermeyelim
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post(["/api/logout", "/api/auth/logout"], (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Kullanıcı şifresini client'a göndermeyelim
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
  
  // Kullanıcı bilgilerini güncelleme
  app.put("/api/user", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const userId = (req.user as User).id;
      const { username, fullName, role } = req.body;
      
      // Username benzersizlik kontrolü
      if (username && username !== (req.user as User).username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: "Bu kullanıcı adı zaten alınmış" });
        }
      }
      
      const updateData = { username, fullName, role };
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      // Passport.js session bilgisini güncelle
      req.login(updatedUser, (err) => {
        if (err) return next(err);
        
        // Kullanıcı şifresini client'a göndermeyelim
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });
  
  // Şifre değiştirme
  app.post("/api/user/change-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const userId = (req.user as User).id;
      const { currentPassword, newPassword } = req.body;

      // Mevcut şifreyi kontrol et
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Mevcut şifre doğru mu kontrol et
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Mevcut şifre hatalı" });
      }

      // Yeni şifre en az 6 karakter olmalı
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Yeni şifre en az 6 karakter olmalıdır" });
      }

      // Şifreyi güncelle
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });

      if (!updatedUser) {
        return res.status(404).json({ message: "Kullanıcı bilgileri güncellenirken hata oluştu" });
      }

      // Kullanıcıyı yeniden giriş yaptır
      req.login(updatedUser, (err) => {
        if (err) return next(err);

        res.json({ success: true, message: "Şifreniz başarıyla değiştirildi" });
      });
    } catch (err) {
      next(err);
    }
  });

  // Geliştirici hızlı giriş (sadece geliştirme ortamında)
  app.post("/api/dev-login", async (req, res, next) => {
    try {
      const isDev = req.app.get("env") === "development" || process.env.ALLOW_DEV_LOGIN === "true";
      if (!isDev) {
        return res.status(403).json({ message: "Dev login sadece geliştirme ortamında kullanılabilir" });
      }

      const defaultUsername = "dev";
      let user = await storage.getUserByUsername(defaultUsername);
      if (!user) {
        const hashed = await hashPassword("dev");
        user = await storage.createUser({
          username: defaultUsername,
          password: hashed,
          fullName: "Geliştirici Kullanıcı",
          role: "admin",
        });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user!;
        res.status(200).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });
}

// Auth middleware function
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmalısınız" });
  }
  next();
}
