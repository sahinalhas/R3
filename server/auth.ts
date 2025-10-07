/**
 * Auth Setup & Middleware
 * Kimlik doğrulama yapılandırması ve middleware'ler
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { authService } from "./services/auth.service";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { SESSION, API_ROUTES, USER_ROLES, CONFIDENTIALITY_LEVELS, HTTP_STATUS, ERROR_MESSAGES } from "./config/constants";
import { env } from "./config/env";

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

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: env.sessionSecret,
    resave: SESSION.RESAVE,
    saveUninitialized: SESSION.SAVE_UNINITIALIZED,
    store: storage.sessionStore,
    cookie: {
      maxAge: SESSION.MAX_AGE
    }
  };

  app.set("trust proxy", SESSION.TRUST_PROXY);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await authService.login(username, password);
        return done(null, { ...user, password: '' } as User);
      } catch (err) {
        return done(null, false);
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

  // Register
  app.post(API_ROUTES.AUTH.REGISTER, async (req, res, next) => {
    try {
      const user = await authService.register(req.body);
      req.login({ ...user, password: '' } as User, (err) => {
        if (err) return next(err);
        res.status(HTTP_STATUS.CREATED).json(user);
      });
    } catch (err: any) {
      if (err.statusCode === HTTP_STATUS.BAD_REQUEST) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: err.message });
      }
      next(err);
    }
  });

  // Login
  app.post(API_ROUTES.AUTH.LOGIN, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        message: ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS 
      });
      
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(HTTP_STATUS.OK).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout
  app.post(API_ROUTES.AUTH.LOGOUT, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(HTTP_STATUS.OK);
    });
  });

  // Get current user
  app.get(API_ROUTES.AUTH.USER, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(HTTP_STATUS.UNAUTHORIZED);
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
  
  // Update user
  app.put(API_ROUTES.AUTH.USER, async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(HTTP_STATUS.UNAUTHORIZED);
      
      const currentUser = req.user as User;
      const updatedUser = await authService.updateUser(
        currentUser.id,
        currentUser.role,
        req.body
      );
      
      req.login({ ...updatedUser, password: '' } as User, (err) => {
        if (err) return next(err);
        res.json(updatedUser);
      });
    } catch (err: any) {
      if (err.statusCode === HTTP_STATUS.BAD_REQUEST || err.statusCode === HTTP_STATUS.FORBIDDEN) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  });
  
  // Change password
  app.post(API_ROUTES.AUTH.CHANGE_PASSWORD, async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(HTTP_STATUS.UNAUTHORIZED);

      const userId = (req.user as User).id;
      const { currentPassword, newPassword } = req.body;

      const result = await authService.changePassword(userId, currentPassword, newPassword);
      res.json(result);
    } catch (err: any) {
      if (err.statusCode === HTTP_STATUS.UNAUTHORIZED) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: err.message });
      }
      next(err);
    }
  });

  // Dev login
  app.post(API_ROUTES.AUTH.DEV_LOGIN, async (req, res, next) => {
    try {
      const user = await authService.devLogin(req.app.get("env"));
      req.login({ ...user, password: '' } as User, (err) => {
        if (err) return next(err);
        res.status(HTTP_STATUS.OK).json(user);
      });
    } catch (err: any) {
      if (err.statusCode === HTTP_STATUS.FORBIDDEN) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ message: err.message });
      }
      next(err);
    }
  });
}

// Auth middleware
export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      message: ERROR_MESSAGES.AUTH.REQUIRED 
    });
  }
  next();
}

// Role-based authorization
export function requireRole(allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        message: ERROR_MESSAGES.AUTH.REQUIRED 
      });
    }

    const userRole = (req.user as User).role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ 
        message: ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS,
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
}

// Admin-only authorization
export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      message: ERROR_MESSAGES.AUTH.REQUIRED 
    });
  }

  const userRole = (req.user as User).role;
  if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SCHOOL_ADMIN) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ 
      message: ERROR_MESSAGES.AUTH.ADMIN_ONLY 
    });
  }

  next();
}

// Counseling session access control
export function canAccessCounselingSession(
  userRole: string, 
  confidentialityLevel: string, 
  visibilityRole: string
): boolean {
  if (userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SCHOOL_ADMIN) {
    return true;
  }

  if (userRole === USER_ROLES.PDR_ADMIN) {
    return confidentialityLevel !== CONFIDENTIALITY_LEVELS.TOP_SECRET;
  }

  if (userRole === USER_ROLES.COUNSELOR || userRole === USER_ROLES.PDR) {
    if (confidentialityLevel === CONFIDENTIALITY_LEVELS.TOP_SECRET) {
      return false;
    }
    
    switch (visibilityRole) {
      case USER_ROLES.PDR:
        return true;
      case USER_ROLES.PDR_ADMIN:
        return confidentialityLevel === CONFIDENTIALITY_LEVELS.LOW || 
               confidentialityLevel === CONFIDENTIALITY_LEVELS.NORMAL;
      case USER_ROLES.SCHOOL_ADMIN:
        return confidentialityLevel === CONFIDENTIALITY_LEVELS.LOW;
      case USER_ROLES.TEACHER:
        return confidentialityLevel === CONFIDENTIALITY_LEVELS.LOW;
      default:
        return false;
    }
  }

  if (userRole === USER_ROLES.TEACHER) {
    return confidentialityLevel === CONFIDENTIALITY_LEVELS.LOW && 
           visibilityRole === USER_ROLES.TEACHER;
  }

  return false;
}
