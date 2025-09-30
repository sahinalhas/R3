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

  // ===== Haftalık Çalışma Slotları API Routes =====
  
  // Öğrenci için yeni haftalık slot oluştur
  app.post("/api/students/:id/weekly-slots", requireAuth, async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const validatedData = insertWeeklyStudySlotSchema.parse({
        ...req.body,
        studentId
      });
      
      const weeklySlot = await storage.createWeeklySlot(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "haftalik_slot_ekleme",
        message: `Haftalık çalışma slotu eklendi`,
        relatedId: weeklySlot.id
      });
      
      res.status(201).json(weeklySlot);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Haftalık slot güncelle
  app.patch("/api/weekly-slots/:slotId", requireAuth, async (req, res, next) => {
    try {
      const slotId = parseInt(req.params.slotId);
      const validatedData = insertWeeklyStudySlotSchema.partial().parse(req.body);
      
      // IDOR koruması: studentId'nin değiştirilmesini engelle
      if (validatedData.studentId) {
        return res.status(403).json({ message: "Öğrenci ID'si değiştirilemez" });
      }
      
      const updatedSlot = await storage.updateWeeklySlot(slotId, validatedData);
      
      if (!updatedSlot) {
        return res.status(404).json({ message: "Haftalık slot bulunamadı" });
      }
      
      res.json(updatedSlot);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Haftalık slot sil
  app.delete("/api/weekly-slots/:slotId", requireAuth, async (req, res, next) => {
    try {
      const slotId = parseInt(req.params.slotId);
      
      const success = await storage.deleteWeeklySlot(slotId);
      
      if (!success) {
        return res.status(404).json({ message: "Haftalık slot bulunamadı" });
      }
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // Öğrencinin haftalık toplam çalışma süresini getir
  app.get("/api/students/:id/weekly-total-minutes", requireAuth, async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const totalMinutes = await storage.getWeeklyTotalMinutes(studentId);
      res.json({ totalMinutes });
    } catch (err) {
      next(err);
    }
  });

  // Otomatik konu yerleştirme (preview + confirm)
  app.post("/api/students/:id/auto-fill", requireAuth, async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      
      const schema = z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih formatı: YYYY-MM-DD"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih formatı: YYYY-MM-DD"),
        dryRun: z.boolean().optional().default(true)
      });
      
      const { startDate, endDate, dryRun } = schema.parse(req.body);
      
      // Tarih doğrulama
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return res.status(400).json({ 
          message: "Başlangıç tarihi bitiş tarihinden sonra olamaz" 
        });
      }
      
      // Otomatik konu yerleştirme algoritmasını çalıştır
      const result = await storage.autoFillTopics(studentId, startDate, endDate, { dryRun });
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Başarılı durumda aktivite kaydı ekle (sadece confirm işleminde)
      if (!dryRun) {
        await storage.createActivity({
          type: "otomatik_konu_yerlestirme",
          message: `${startDate} - ${endDate} tarihleri için otomatik konu yerleştirme yapıldı`,
          relatedId: studentId
        });
      }
      
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // ===== Ders Konuları API Routes =====
  
  // Bir derse ait tüm konuları getir
  app.get("/api/courses/:id/subjects", requireAuth, async (req, res, next) => {
    try {
      const courseId = parseInt(req.params.id);
      
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Ders bulunamadı" });
      }
      
      const subjects = await storage.getCourseSubjectsByCourse(courseId);
      res.json(subjects);
    } catch (err) {
      next(err);
    }
  });

  // Note: All other legacy routes will be added here as needed
  // This is a temporary solution until domain extraction is complete
}