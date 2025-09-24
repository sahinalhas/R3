import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin, requireRole, canAccessCounselingSession } from "../auth";
import { 
  insertAppointmentSchema, 
  insertActivitySchema, 
  insertClassHourSchema,
  insertCounselingSessionSchema,
  insertCounselingTopicSchema,
  insertCourseSchema,
  insertCourseSubjectSchema,
  insertStudyPlanSchema,
  insertWeeklyStudySlotSchema,
  insertSubjectProgressSchema,
  insertStudyPlanSubjectSchema,
  insertSchoolInfoSchema,
  insertNotificationSchema
} from "@shared/schema";
import { z } from "zod";
import * as XLSX from "xlsx";
import path from "path";

// This file contains legacy routes that haven't been modularized yet
// They will be gradually extracted into domain-specific modules

export async function registerLegacyRoutes(app: Express): Promise<void> {
  
  // Test sayfası
  app.get('/test-login', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, '..', 'test_login.html'));
  });

  // ===== Dashboard ve Stats API Routes =====
  
  // Dashboard istatistikleri
  app.get("/api/stats", requireAuth, async (req, res, next) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // ===== Randevu Yönetimi API Routes =====
  
  // Tüm randevuları getir
  app.get("/api/appointments", requireAuth, async (req, res, next) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const appointments = await storage.getAppointments(status);
      res.json(appointments);
    } catch (err) {
      next(err);
    }
  });

  // ===== Aktivite API Routes =====
  
  // Son aktiviteleri getir
  app.get("/api/activities", requireAuth, async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (err) {
      next(err);
    }
  });

  // ===== Dersler API Routes =====
  
  // Tüm dersleri getir
  app.get("/api/courses", requireAuth, async (req, res, next) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (err) {
      next(err);
    }
  });

  // ===== Öğrenci Alt Kaynakları API Routes =====
  
  // Öğrencinin randevularını getir
  app.get("/api/students/:id/appointments", requireAuth, async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const appointments = await storage.getAppointmentsByStudent(studentId);
      res.json(appointments);
    } catch (err) {
      next(err);
    }
  });

  // Öğrencinin çalışma planlarını getir
  app.get("/api/students/:id/study-plans", requireAuth, async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const studyPlans = await storage.getStudyPlansByStudent(studentId);
      res.json(studyPlans);
    } catch (err) {
      next(err);
    }
  });

  // Öğrencinin konu ilerlemelerini getir
  app.get("/api/students/:id/subject-progress", requireAuth, async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const subjectProgress = await storage.getSubjectProgressByStudent(studentId);
      res.json(subjectProgress);
    } catch (err) {
      next(err);
    }
  });

  // Öğrencinin haftalık slotlarını getir
  app.get("/api/students/:id/weekly-slots", requireAuth, async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const weeklySlots = await storage.getWeeklySlotsByStudent(studentId);
      res.json(weeklySlots);
    } catch (err) {
      next(err);
    }
  });

  // Öğrencinin görüşme kayıtlarını getir
  app.get("/api/students/:id/counseling-sessions", requireAuth, async (req, res, next) => {
    try {
      const userRole = (req.user as any).role;
      const studentId = parseInt(req.params.id);
      const sessions = await storage.getCounselingSessionsByStudent(studentId);
      
      // Role-based confidentiality filtering
      const filteredSessions = sessions.filter(session => 
        canAccessCounselingSession(userRole, session.confidentialityLevel, session.visibilityRole)
      );
      
      res.json(filteredSessions);
    } catch (err) {
      next(err);
    }
  });

  // Note: All other legacy routes will be added here as needed
  // This is a temporary solution until domain extraction is complete
}