import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { 
  insertStudentSchema, 
  insertAppointmentSchema, 
  insertActivitySchema, 
  insertClassHourSchema,
  insertCounselingSessionSchema,
  insertCounselingTopicSchema,
  insertCourseSchema,
  insertCourseSubjectSchema,
  insertStudyPlanSchema,
  insertSubjectProgressSchema,
  insertStudyPlanSubjectSchema,
  insertSchoolInfoSchema,
  insertNotificationSchema
} from "@shared/schema";
import { z } from "zod";
import * as XLSX from "xlsx";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  setupAuth(app);
  
  // Test sayfası
  app.get('/test-login', (req, res) => {
    res.sendFile(path.join(import.meta.dirname, 'test_login.html'));
  });

  // ===== Öğrenci Yönetimi API Routes =====
  
  // Tüm öğrencileri getir
  app.get("/api/students", async (req, res, next) => {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;
      const students = await storage.getStudents(query);
      res.json(students);
    } catch (err) {
      next(err);
    }
  });

  // Tekil öğrenci getir
  app.get("/api/students/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const student = await storage.getStudent(id);
      
      if (!student) {
        return res.status(404).json({ message: "Öğrenci bulunamadı" });
      }
      
      res.json(student);
    } catch (err) {
      next(err);
    }
  });

  // Yeni öğrenci ekle
  app.post("/api/students", async (req, res, next) => {
    try {
      const validatedData = insertStudentSchema.parse(req.body);
      
      // Öğrenci numarası benzersiz olmalı
      const existingStudent = await storage.getStudentByNumber(validatedData.studentNumber);
      if (existingStudent) {
        return res.status(400).json({ message: "Bu öğrenci numarası zaten kullanılıyor" });
      }
      
      const student = await storage.createStudent(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "öğrenci_ekleme",
        message: `Yeni öğrenci ${student.firstName} ${student.lastName} kaydedildi.`,
        relatedId: student.id
      });
      
      res.status(201).json(student);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Öğrenci güncelle
  app.put("/api/students/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertStudentSchema.partial().parse(req.body);
      
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Öğrenci bulunamadı" });
      }
      
      // Eğer öğrenci numarası değiştiriliyorsa, benzersizlik kontrolü yap
      if (validatedData.studentNumber && validatedData.studentNumber !== student.studentNumber) {
        const existingStudent = await storage.getStudentByNumber(validatedData.studentNumber);
        if (existingStudent) {
          return res.status(400).json({ message: "Bu öğrenci numarası zaten kullanılıyor" });
        }
      }
      
      const updatedStudent = await storage.updateStudent(id, validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "öğrenci_güncelleme",
        message: `Öğrenci ${updatedStudent!.firstName} ${updatedStudent!.lastName} bilgileri güncellendi.`,
        relatedId: id
      });
      
      res.json(updatedStudent);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Öğrenci sil
  app.delete("/api/students/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const student = await storage.getStudent(id);
      if (!student) {
        return res.status(404).json({ message: "Öğrenci bulunamadı" });
      }
      
      await storage.deleteStudent(id);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "öğrenci_silme",
        message: `Öğrenci ${student.firstName} ${student.lastName} kaydı silindi.`,
        relatedId: null
      });
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
  
  // Toplu öğrenci içe aktarma
  app.post("/api/students/bulk-import", async (req, res, next) => {
    try {
      // Veri doğrulama için şema oluştur
      const bulkImportSchema = z.object({
        students: z.array(insertStudentSchema).min(1, "En az bir öğrenci gerekli")
      });
      
      // Gelen veriyi doğrula
      const validatedData = bulkImportSchema.parse(req.body);
      
      const successfulImports = [];
      const failedImports = [];
      
      // Her öğrenciyi içe aktar
      for (const studentData of validatedData.students) {
        try {
          // Öğrenci numarasına göre kontrol et (öğrenci numarası benzersiz olmalı)
          const existingStudent = await storage.getStudentByNumber(studentData.studentNumber);
          
          if (existingStudent) {
            // Öğrenci zaten var, hata ekle
            failedImports.push({
              studentNumber: studentData.studentNumber,
              name: `${studentData.firstName} ${studentData.lastName}`,
              error: "Bu öğrenci numarası zaten kullanılıyor"
            });
            continue;
          }
          
          // Yeni öğrenci oluştur
          const newStudent = await storage.createStudent(studentData);
          
          // Başarılı içe aktarmayı ekle
          successfulImports.push(newStudent);
          
          // Aktivite kaydı oluştur
          await storage.createActivity({
            type: "öğrenci_ekleme",
            message: `Yeni öğrenci eklendi: ${newStudent.firstName} ${newStudent.lastName}`,
            relatedId: newStudent.id
          });
        } catch (error) {
          console.error("Öğrenci içe aktarma hatası:", error);
          failedImports.push({
            studentNumber: studentData.studentNumber,
            name: `${studentData.firstName} ${studentData.lastName}`,
            error: error instanceof Error ? error.message : "Bilinmeyen hata"
          });
        }
      }
      
      // Sonuçları döndür
      res.status(200).json({
        message: `${successfulImports.length} öğrenci başarıyla içe aktarıldı${failedImports.length > 0 ? `, ${failedImports.length} öğrenci aktarılamadı` : ''}`,
        successCount: successfulImports.length,
        failCount: failedImports.length,
        failedImports: failedImports.length > 0 ? failedImports : undefined
      });
    } catch (err) {
      next(err);
    }
  });

  // ===== Randevu Yönetimi API Routes =====
  
  // Tüm randevuları getir
  app.get("/api/appointments", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      let appointments = await storage.getUpcomingAppointments(limit);
      
      // Her randevu için öğrenci bilgisini ekle
      const appointmentsWithStudents = await Promise.all(
        appointments.map(async (appointment) => {
          const student = await storage.getStudent(appointment.studentId);
          return {
            ...appointment,
            student: student || { 
              firstName: "Bilinmiyor", 
              lastName: "", 
              id: appointment.studentId 
            }
          };
        })
      );
      
      res.json(appointmentsWithStudents);
    } catch (err) {
      next(err);
    }
  });

  // Öğrencinin randevularını getir
  app.get("/api/students/:id/appointments", async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const appointments = await storage.getAppointmentsByStudent(studentId);
      res.json(appointments);
    } catch (err) {
      next(err);
    }
  });

  // Tekil randevu getir
  app.get("/api/appointments/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const appointment = await storage.getAppointment(id);
      
      if (!appointment) {
        return res.status(404).json({ message: "Randevu bulunamadı" });
      }
      
      res.json(appointment);
    } catch (err) {
      next(err);
    }
  });

  // Yeni randevu ekle
  app.post("/api/appointments", async (req, res, next) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      
      // Öğrenci var mı kontrol et
      const student = await storage.getStudent(validatedData.studentId);
      if (!student) {
        return res.status(400).json({ message: "Geçersiz öğrenci" });
      }
      
      const appointment = await storage.createAppointment(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "randevu_oluşturma",
        message: `${student.firstName} ${student.lastName} ile randevu oluşturuldu.`,
        relatedId: appointment.id
      });
      
      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Randevu güncelle
  app.put("/api/appointments/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAppointmentSchema.partial().parse(req.body);
      
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Randevu bulunamadı" });
      }
      
      const updatedAppointment = await storage.updateAppointment(id, validatedData);
      
      // Student bilgisi al
      const student = await storage.getStudent(appointment.studentId);
      
      // Aktivite kaydı ekle
      let activityMessage = `${student?.firstName} ${student?.lastName} randevusu güncellendi.`;
      if (validatedData.status === "tamamlandı") {
        activityMessage = `${student?.firstName} ${student?.lastName} görüşmesi tamamlandı.`;
      } else if (validatedData.status === "iptal") {
        activityMessage = `${student?.firstName} ${student?.lastName} randevusu iptal edildi.`;
      }
      
      await storage.createActivity({
        type: "randevu_güncelleme",
        message: activityMessage,
        relatedId: id
      });
      
      res.json(updatedAppointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Randevu sil
  app.delete("/api/appointments/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Randevu bulunamadı" });
      }
      
      // Student bilgisi al
      const student = await storage.getStudent(appointment.studentId);
      
      await storage.deleteAppointment(id);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "randevu_silme",
        message: `${student?.firstName} ${student?.lastName} randevusu silindi.`,
        relatedId: null
      });
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ===== İstatistik ve Aktivite API Routes =====
  
  // İstatistikleri getir
  app.get("/api/stats", async (req, res, next) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // Son aktiviteleri getir
  app.get("/api/activities", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (err) {
      next(err);
    }
  });

  // ===== Detaylı Raporlama API Routes =====

  // Öğrenci dağılımı ve detaylı öğrenci istatistikleri
  app.get("/api/reports/student-distribution", async (req, res, next) => {
    try {
      // Tüm öğrencileri çek
      const students = await storage.getStudents();
      
      // Sınıflara göre dağılım
      const classCounts: Record<string, number> = {};
      students.forEach(student => {
        const studentClass = student.class || 'Tanımlanmamış';
        classCounts[studentClass] = (classCounts[studentClass] || 0) + 1;
      });
      
      // Cinsiyete göre dağılım
      const genderCounts: Record<string, number> = {
        'erkek': 0,
        'kız': 0,
        'diğer': 0
      };
      students.forEach(student => {
        if (student.gender?.toLowerCase() === 'erkek') {
          genderCounts['erkek']++;
        } else if (student.gender?.toLowerCase() === 'kız') {
          genderCounts['kız']++;
        } else {
          genderCounts['diğer']++;
        }
      });
      
      // Her öğrenci için görüşme sayısını hesapla
      const studentSessions = await Promise.all(
        students.map(async (student) => {
          const sessions = await storage.getCounselingSessionsByStudent(student.id);
          return {
            studentId: student.id,
            name: `${student.firstName} ${student.lastName}`,
            class: student.class || 'Tanımlanmamış',
            sessionCount: sessions.length
          };
        })
      );
      
      // Her sınıf için ortalama görüşme sayısı
      const classSessions: Record<string, {total: number, count: number}> = {};
      studentSessions.forEach(item => {
        if (!classSessions[item.class]) {
          classSessions[item.class] = {total: 0, count: 0};
        }
        classSessions[item.class].total += item.sessionCount;
        classSessions[item.class].count++;
      });
      
      // En çok görüşme yapılan sınıflar
      const classSessionAverages = Object.entries(classSessions).map(([className, data]) => ({
        name: className,
        average: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0
      }));
      
      // En çok görüşme yapılan öğrenciler (Top 5)
      const topStudentsBySession = [...studentSessions]
        .sort((a, b) => b.sessionCount - a.sessionCount)
        .slice(0, 5);
      
      res.json({
        totalStudents: students.length,
        byClass: Object.entries(classCounts).map(([className, count]) => ({
          name: className,
          value: count
        })),
        byGender: Object.entries(genderCounts).map(([gender, count]) => ({
          name: gender === 'erkek' ? 'Erkek' : (gender === 'kız' ? 'Kız' : 'Diğer'),
          value: count
        })),
        averageSessionsByClass: classSessionAverages,
        topStudentsBySession: topStudentsBySession.map(s => ({ 
          name: s.name, 
          class: s.class,
          count: s.sessionCount 
        }))
      });
    } catch (err) {
      next(err);
    }
  });

  // Randevu istatistikleri ve raporları
  app.get("/api/reports/appointments", async (req, res, next) => {
    try {
      // Tüm randevuları çek
      const appointments = await storage.getAppointments(undefined);
      
      // Duruma göre randevu sayıları
      const statusCounts: Record<string, number> = {
        'beklemede': 0,
        'onaylandı': 0,
        'tamamlandı': 0,
        'iptal': 0
      };
      
      // Ay bazında randevu sayıları
      const monthlyCounts: number[] = Array(12).fill(0);
      
      // Konuya göre randevu sayıları
      const subjectCounts: Record<string, number> = {};
      
      appointments.forEach(appointment => {
        // Durum bazında
        statusCounts[appointment.status] = (statusCounts[appointment.status] || 0) + 1;
        
        // Ay bazında
        const date = new Date(appointment.date);
        const month = date.getMonth();
        monthlyCounts[month]++;
        
        // Konu bazında
        subjectCounts[appointment.subject] = (subjectCounts[appointment.subject] || 0) + 1;
      });
      
      // Haftalık randevular
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Pazar gününe ayarla
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      const weeklyAppointments = appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
      });
      
      // Haftalık randevu dağılımı (günlere göre)
      const dailyCounts: number[] = Array(7).fill(0); // [pazar, pazartesi, ..., cumartesi]
      
      weeklyAppointments.forEach(appointment => {
        const date = new Date(appointment.date);
        const dayOfWeek = date.getDay(); // 0: Pazar, 1: Pazartesi, ...
        dailyCounts[dayOfWeek]++;
      });
      
      // Türkçe ay isimleri
      const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
      ];
      
      // Türkçe gün isimleri
      const dayNames = [
        "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"
      ];
      
      res.json({
        byStatus: Object.entries(statusCounts).map(([status, count]) => ({
          name: status === 'beklemede' ? 'Beklemede' :
                status === 'onaylandı' ? 'Onaylandı' :
                status === 'tamamlandı' ? 'Tamamlandı' :
                status === 'iptal' ? 'İptal' : status,
          value: count
        })),
        monthly: monthNames.map((name, index) => ({
          name: name,
          randevular: monthlyCounts[index]
        })),
        bySubject: Object.entries(subjectCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([subject, count]) => ({
            name: subject.length > 20 ? subject.substring(0, 20) + '...' : subject,
            value: count
          })),
        weeklyByDay: dayNames.map((name, index) => ({
          name: name,
          randevular: dailyCounts[index]
        })),
        weeklyTotal: weeklyAppointments.length,
        totalAppointments: appointments.length,
        completedAppointments: statusCounts['tamamlandı'] || 0,
        pendingAppointments: statusCounts['beklemede'] || 0
      });
    } catch (err) {
      next(err);
    }
  });

  // Rehberlik görüşmeleri istatistikleri 
  app.get("/api/reports/counseling-sessions", async (req, res, next) => {
    try {
      // Tüm görüşmeleri çek
      const sessions = await storage.getCounselingSessions();
      
      // Konu bazında görüşme sayıları
      const topicCounts: Record<string, number> = {};
      const averageDurations: Record<string, {total: number, count: number}> = {};
      
      // Ay bazında görüşme sayıları
      const monthlyCounts: number[] = Array(12).fill(0);
      
      sessions.forEach(session => {
        // Görüşme türüne göre
        if (session.topic) {
          const topicKey = session.topic;
          topicCounts[topicKey] = (topicCounts[topicKey] || 0) + 1;
          
          if (session.entryTime && session.exitTime) {
            const entryTime = new Date(session.entryTime);
            const exitTime = new Date(session.exitTime);
            const durationMinutes = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60);
            
            if (!averageDurations[topicKey]) {
              averageDurations[topicKey] = {total: 0, count: 0};
            }
            averageDurations[topicKey].total += durationMinutes;
            averageDurations[topicKey].count += 1;
          }
        }
        
        // Ay bazında
        const entryDate = session.entryTime ? new Date(session.entryTime) : null;
        if (entryDate) {
          const month = entryDate.getMonth();
          monthlyCounts[month]++;
        }
      });
      
      // Türkçe ay isimleri
      const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
      ];
      
      // Ortalama görüşme süresi hesapla
      const topicAverages = Object.entries(averageDurations).map(([topicKey, data]) => ({
        name: topicKey, // Doğrudan konu metnini kullanıyoruz
        value: Math.round(data.total / data.count)
      }));
      
      res.json({
        byTopic: Object.entries(topicCounts)
          .map(([topicKey, count]) => ({
            name: topicKey, // Doğrudan konu metnini kullanıyoruz
            value: count
          })),
        monthly: monthNames.map((name, index) => ({
          name: name,
          görüşmeler: monthlyCounts[index]
        })),
        topicAverages: topicAverages,
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.exitTime !== null).length,
        averageSessionMinutes: topicAverages.length > 0 ? 
          topicAverages.reduce((acc, curr) => acc + curr.value, 0) / topicAverages.length : 0
      });
    } catch (err) {
      next(err);
    }
  });
  
  // ===== Görüşme Konuları API Routes =====
  
  // Yıllık özet rapor - Veri yedekleme için ön hazırlık
  app.get("/api/reports/yearly-summary", async (req, res, next) => {
    try {
      // Geçerli yılı veya belirtilen yılı al
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      // Yılın başlangıcı ve sonu
      const startDate = new Date(year, 0, 1).toISOString().split('T')[0]; // YYYY-01-01
      const endDate = new Date(year, 11, 31).toISOString().split('T')[0]; // YYYY-12-31
      
      // Öğrenci sayısı
      const students = await storage.getStudents();
      
      // Randevu sayısı
      const allAppointments = await storage.getAppointments();
      const yearlyAppointments = allAppointments.filter(app => {
        const appDate = new Date(app.date);
        return appDate.getFullYear() === year;
      });
      
      // Görüşme sayısı
      const allSessions = await storage.getCounselingSessions();
      const yearlySessions = allSessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate.getFullYear() === year;
      });
      
      // Tamamlanan görüşmeler
      const completedSessions = yearlySessions.filter(s => s.exitTime !== null);
      
      // Ortalama görüşme süresi
      let totalDuration = 0;
      let sessionCount = 0;
      
      completedSessions.forEach(session => {
        if (session.entryTime && session.exitTime) {
          const entryTime = new Date(session.entryTime);
          const exitTime = new Date(session.exitTime);
          const durationMinutes = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60);
          
          if (durationMinutes > 0) {
            totalDuration += durationMinutes;
            sessionCount++;
          }
        }
      });
      
      const averageDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;
      
      // Görüşme konuları dağılımı
      const topicCounts: Record<string, number> = {};
      yearlySessions.forEach(session => {
        if (session.topic) {
          topicCounts[session.topic] = (topicCounts[session.topic] || 0) + 1;
        }
      });
      
      // En çok kullanılan 5 konu
      const topTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({name: topic, count: count}));
      
      res.json({
        year,
        studentCount: students.length,
        appointmentCount: yearlyAppointments.length,
        sessionCount: yearlySessions.length,
        completedSessionCount: completedSessions.length,
        averageSessionDuration: averageDuration,
        topTopics,
        startDate,
        endDate
      });
    } catch (err) {
      next(err);
    }
  });
  
  // Tüm görüşme konularını getir
  app.get("/api/counseling-topics", async (req, res, next) => {
    try {
      const topics = await storage.getCounselingTopics();
      res.json(topics);
    } catch (err) {
      next(err);
    }
  });

  // Yeni görüşme konusu ekle
  app.post("/api/counseling-topics", async (req, res, next) => {
    try {
      const validatedData = insertCounselingTopicSchema.parse(req.body);
      
      const topic = await storage.createCounselingTopic(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "görüşme_konusu_ekleme",
        message: `Yeni görüşme konusu eklendi: ${topic.topic}`,
        relatedId: topic.id
      });
      
      res.status(201).json(topic);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Toplu görüşme konusu ekle
  app.post("/api/counseling-topics/bulk", async (req, res, next) => {
    try {
      const validatedData = z.object({
        topics: z.string().min(1, "Konular boş olamaz")
      }).parse(req.body);
      
      // Her satırı ayrı bir konu olarak ele al
      const topicsList = validatedData.topics
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (topicsList.length === 0) {
        return res.status(400).json({ message: "Geçerli konu bulunamadı" });
      }
      
      const topics = await storage.createMultipleCounselingTopics(topicsList);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "toplu_görüşme_konusu_ekleme",
        message: `${topics.length} adet görüşme konusu toplu olarak eklendi`,
        relatedId: null
      });
      
      res.status(201).json(topics);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Görüşme konusu sil
  app.delete("/api/counseling-topics/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const result = await storage.deleteCounselingTopic(id);
      
      if (result) {
        // Aktivite kaydı ekle
        await storage.createActivity({
          type: "görüşme_konusu_silme",
          message: `Görüşme konusu silindi: ID ${id}`,
          relatedId: null
        });
        
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Görüşme konusu bulunamadı" });
      }
    } catch (err) {
      next(err);
    }
  });
  
  // ===== Ders Saatleri API Routes =====
  
  // Tüm ders saatlerini getir
  app.get("/api/class-hours", async (req, res, next) => {
    try {
      const dayOfWeek = req.query.day ? parseInt(req.query.day as string) : undefined;
      const classHours = await storage.getClassHours(dayOfWeek);
      res.json(classHours);
    } catch (err) {
      next(err);
    }
  });
  
  // Tekil ders saati getir
  app.get("/api/class-hours/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const classHour = await storage.getClassHour(id);
      
      if (!classHour) {
        return res.status(404).json({ message: "Ders saati bulunamadı" });
      }
      
      res.json(classHour);
    } catch (err) {
      next(err);
    }
  });
  
  // Yeni ders saati ekle
  app.post("/api/class-hours", async (req, res, next) => {
    try {
      const validatedData = insertClassHourSchema.parse(req.body);
      
      const classHour = await storage.createClassHour(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_saati_ekleme",
        message: `Yeni ders saati (${classHour.name}) eklendi: ${classHour.startTime} - ${classHour.endTime}`,
        relatedId: classHour.id
      });
      
      res.status(201).json(classHour);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Ders saati güncelle
  app.put("/api/class-hours/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClassHourSchema.partial().parse(req.body);
      
      const classHour = await storage.getClassHour(id);
      if (!classHour) {
        return res.status(404).json({ message: "Ders saati bulunamadı" });
      }
      
      const updatedClassHour = await storage.updateClassHour(id, validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_saati_güncelleme",
        message: `Ders saati (${updatedClassHour!.name}) güncellendi: ${updatedClassHour!.startTime} - ${updatedClassHour!.endTime}`,
        relatedId: id
      });
      
      res.json(updatedClassHour);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Ders saati sil
  app.delete("/api/class-hours/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const classHour = await storage.getClassHour(id);
      if (!classHour) {
        return res.status(404).json({ message: "Ders saati bulunamadı" });
      }
      
      await storage.deleteClassHour(id);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_saati_silme",
        message: `Ders saati (${classHour.name}: ${classHour.startTime} - ${classHour.endTime}) silindi.`,
        relatedId: null
      });
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // Veri Yedekleme ve Geri Yükleme API Routes 
  // Veri yedekleme
  app.get("/api/backup", async (req, res, next) => {
    try {
      // Tüm veri tablolarını al
      const allData: Record<string, any> = {
        students: await storage.getStudents(),
        appointments: await storage.getAppointments(),
        counselingSessions: await storage.getCounselingSessions(),
        counselingTopics: await storage.getCounselingTopics(),
        classHours: await storage.getClassHours(),
        courses: await storage.getCourses(),
        activities: await storage.getRecentActivities(1000) // Önemli aktiviteleri yedekle
      };
      
      // Her ders için ders konularını al
      if (allData.courses.length > 0) {
        const courseSubjectData = await Promise.all(
          allData.courses.map(async (course: any) => {
            const subjects = await storage.getCourseSubjectsByCourse(course.id);
            return {
              courseId: course.id,
              courseName: course.name,
              subjects
            };
          })
        );
        
        allData.courseSubjects = courseSubjectData;
      }
      
      // Veriler için timestamp ve ad bilgisi ekle
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const backupData = {
        metadata: {
          version: "1.0",
          createdAt: now.toISOString(),
          description: "Rehberlik Sistemi Veritabanı Yedeği",
          totalRecords: {
            students: allData.students.length,
            appointments: allData.appointments.length,
            counselingSessions: allData.counselingSessions.length,
            counselingTopics: allData.counselingTopics.length,
            classHours: allData.classHours.length,
            courses: allData.courses.length,
            activities: allData.activities.length
          }
        },
        data: allData
      };
      
      // İndirilebilir dosya olarak gönder
      res.setHeader('Content-Disposition', `attachment; filename=rehberlik-yedek-${timestamp}.json`);
      res.setHeader('Content-Type', 'application/json');
      res.json(backupData);
    } catch (err) {
      next(err);
    }
  });
  
  // Veri geri yükleme (restore)
  app.post("/api/restore", async (req, res, next) => {
    try {
      const backupData = req.body;
      
      // Basit doğrulama
      if (!backupData || !backupData.metadata || !backupData.data) {
        return res.status(400).json({ message: "Geçersiz yedek dosyası" });
      }
      
      // Yedek dosyasının versiyonunu kontrol et
      if (backupData.metadata.version !== "1.0") {
        return res.status(400).json({ message: "Desteklenmeyen yedek dosyası versiyonu" });
      }
      
      // İşlem raporunu hazırla
      const report = {
        totalRecords: backupData.metadata.totalRecords,
        processed: {
          students: 0,
          counselingTopics: 0,
          classHours: 0,
          courses: 0,
          courseSubjects: 0
        },
        failed: {
          students: [],
          counselingTopics: [],
          classHours: [],
          courses: [],
          courseSubjects: []
        },
        errors: []
      };
      
      // Adresler tablosuna boş kayıtlar yüklenmesini engelle
      const validStudents = backupData.data.students?.filter(student => 
        student && student.firstName && student.lastName
      ) || [];
      
      // Öğrencileri işle
      try {
        for (const student of validStudents) {
          try {
            const existingStudent = await storage.getStudentByNumber(student.studentNumber);
            
            // Eğer öğrenci zaten varsa, güncelle
            if (existingStudent) {
              const studentData = {
                firstName: student.firstName,
                lastName: student.lastName,
                class: student.class,
                birthDate: student.birthDate,
                gender: student.gender,
                parentName: student.parentName,
                phone: student.phone,
                address: student.address,
                notes: student.notes
              };
              
              await storage.updateStudent(existingStudent.id, studentData);
            } else {
              // Yeni öğrenci oluştur
              await storage.createStudent({
                studentNumber: student.studentNumber,
                firstName: student.firstName,
                lastName: student.lastName,
                class: student.class,
                birthDate: student.birthDate,
                gender: student.gender,
                parentName: student.parentName,
                phone: student.phone,
                address: student.address,
                notes: student.notes
              });
            }
            
            report.processed.students++;
          } catch (err) {
            report.failed.students.push(student.studentNumber);
            report.errors.push(`Öğrenci yükleme hatası: ${student.firstName} ${student.lastName} - ${err.message}`);
          }
        }
      } catch (err) {
        report.errors.push(`Öğrenci verileri işlenirken hata: ${err.message}`);
      }
      
      // Görüşme konularını işle
      try {
        const validTopics = backupData.data.counselingTopics?.filter(topic => 
          topic && topic.topic
        ) || [];
        
        for (const topic of validTopics) {
          try {
            // Tüm konuları getir
            const existingTopics = await storage.getCounselingTopics();
            const existingTopic = existingTopics.find(t => t.topic === topic.topic);
            
            // Konu yoksa ekle
            if (!existingTopic) {
              await storage.createCounselingTopic({
                topic: topic.topic
              });
            }
            
            report.processed.counselingTopics++;
          } catch (err) {
            report.failed.counselingTopics.push(topic.topic);
            report.errors.push(`Görüşme konusu yükleme hatası: ${topic.topic} - ${err.message}`);
          }
        }
      } catch (err) {
        report.errors.push(`Görüşme konuları işlenirken hata: ${err.message}`);
      }
      
      // Ders saatlerini işle
      try {
        const validClassHours = backupData.data.classHours?.filter(classHour => 
          classHour && classHour.name && classHour.startTime && classHour.endTime
        ) || [];
        
        for (const classHour of validClassHours) {
          try {
            // Tüm ders saatlerini getir
            const existingClassHours = await storage.getClassHours();
            const existingClassHour = existingClassHours.find(ch => 
              ch.name === classHour.name && 
              ch.startTime === classHour.startTime && 
              ch.endTime === classHour.endTime
            );
            
            // Ders saati yoksa ekle
            if (!existingClassHour) {
              await storage.createClassHour({
                name: classHour.name,
                startTime: classHour.startTime,
                endTime: classHour.endTime,
                dayOfWeek: classHour.dayOfWeek
              });
            }
            
            report.processed.classHours++;
          } catch (err) {
            report.failed.classHours.push(classHour.name);
            report.errors.push(`Ders saati yükleme hatası: ${classHour.name} - ${err.message}`);
          }
        }
      } catch (err) {
        report.errors.push(`Ders saatleri işlenirken hata: ${err.message}`);
      }
      
      // Dersleri işle
      try {
        const validCourses = backupData.data.courses?.filter(course => 
          course && course.name
        ) || [];
        
        for (const course of validCourses) {
          try {
            // Dersin var olup olmadığını kontrol et
            const existingCourse = await storage.getCourseByName(course.name);
            
            // Ders yoksa ekle
            let courseId;
            if (!existingCourse) {
              const newCourse = await storage.createCourse({
                name: course.name,
                description: course.description || ''
              });
              courseId = newCourse.id;
            } else {
              courseId = existingCourse.id;
            }
            
            report.processed.courses++;
            
            // Bu dersin konularını işle
            if (backupData.data.courseSubjects) {
              const courseSubjectData = backupData.data.courseSubjects.find((cs: any) => 
                cs.courseName === course.name || cs.courseId === course.id
              );
              
              if (courseSubjectData && courseSubjectData.subjects) {
                for (const subject of courseSubjectData.subjects) {
                  try {
                    // Konu var mı diye kontrol et
                    const existingSubjects = await storage.getCourseSubjectsByCourse(courseId);
                    const existingSubject = existingSubjects.find(s => s.name === subject.name);
                    
                    // Konu yoksa ekle
                    if (!existingSubject) {
                      await storage.createCourseSubject({
                        courseId: courseId,
                        name: subject.name,
                        duration: subject.duration || 0
                      });
                    }
                    
                    report.processed.courseSubjects++;
                  } catch (err) {
                    report.failed.courseSubjects.push(subject.name);
                    report.errors.push(`Ders konusu yükleme hatası: ${subject.name} - ${err.message}`);
                  }
                }
              }
            }
          } catch (err) {
            report.failed.courses.push(course.name);
            report.errors.push(`Ders yükleme hatası: ${course.name} - ${err.message}`);
          }
        }
      } catch (err) {
        report.errors.push(`Dersler işlenirken hata: ${err.message}`);
      }
      
      // Yedekleme işlemi aktivitesi ekle
      await storage.createActivity({
        type: "veri_geri_yukleme",
        message: `Veri geri yükleme işlemi tamamlandı. (Öğrenci: ${report.processed.students}, Konu: ${report.processed.counselingTopics}, Ders saati: ${report.processed.classHours}, Ders: ${report.processed.courses}, Ders konusu: ${report.processed.courseSubjects})`,
        relatedId: null
      });
      
      res.json({
        success: true,
        message: "Veri geri yükleme işlemi tamamlandı",
        report
      });
    } catch (err) {
      next(err);
    }
  });
  
  // ===== Rehberlik Görüşme Kayıtları API Routes =====
  
  // Tüm görüşme kayıtlarını getir
  app.get("/api/counseling-sessions", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const all = req.query.all === 'true';
      
      // Tüm kayıtları veya son kayıtları getir
      let sessions = [];
      if (all) {
        sessions = await storage.getCounselingSessions();
      } else {
        sessions = await storage.getRecentCounselingSessions(limit);
      }
      
      // Her kayıt için öğrenci bilgisini ekle
      const sessionsWithStudents = await Promise.all(
        sessions.map(async (session) => {
          const student = await storage.getStudent(session.studentId);
          return {
            ...session,
            student: student || { 
              firstName: "Bilinmiyor", 
              lastName: "", 
              id: session.studentId 
            }
          };
        })
      );
      
      res.json(sessionsWithStudents);
    } catch (err) {
      next(err);
    }
  });

  // Belirli bir güne ait görüşme kayıtlarını getir
  app.get("/api/counseling-sessions/by-date/:date", async (req, res, next) => {
    try {
      const date = req.params.date;
      const sessions = await storage.getCounselingSessionsByDate(date);
      
      // Her kayıt için öğrenci bilgisini ekle
      const sessionsWithStudents = await Promise.all(
        sessions.map(async (session) => {
          const student = await storage.getStudent(session.studentId);
          return {
            ...session,
            student: student || { 
              firstName: "Bilinmiyor", 
              lastName: "", 
              id: session.studentId 
            }
          };
        })
      );
      
      res.json(sessionsWithStudents);
    } catch (err) {
      next(err);
    }
  });

  // Öğrencinin görüşme kayıtlarını getir
  app.get("/api/students/:id/counseling-sessions", async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const sessions = await storage.getCounselingSessionsByStudent(studentId);
      res.json(sessions);
    } catch (err) {
      next(err);
    }
  });

  // Tekil görüşme kaydı getir
  app.get("/api/counseling-sessions/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getCounselingSession(id);
      
      if (!session) {
        return res.status(404).json({ message: "Görüşme kaydı bulunamadı" });
      }
      
      // Öğrenci bilgisini ekle
      const student = await storage.getStudent(session.studentId);
      const sessionWithStudent = {
        ...session,
        student: student || {
          firstName: "Bilinmiyor",
          lastName: "",
          id: session.studentId
        }
      };
      
      res.json(sessionWithStudent);
    } catch (err) {
      next(err);
    }
  });

  // Yeni görüşme kaydı ekle
  app.post("/api/counseling-sessions", async (req, res, next) => {
    try {
      const validatedData = insertCounselingSessionSchema.parse(req.body);
      
      // Öğrenci var mı kontrol et
      const student = await storage.getStudent(validatedData.studentId);
      if (!student) {
        return res.status(400).json({ message: "Geçersiz öğrenci" });
      }
      
      const session = await storage.createCounselingSession(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "görüşme_başlatma",
        message: `${student.firstName} ${student.lastName} ile görüşme başlatıldı.`,
        relatedId: session.id
      });
      
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Görüşme kaydını güncelle
  app.put("/api/counseling-sessions/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = z.object({
        exitTime: z.string().optional(),
        exitClassHourId: z.number().optional(),
        topic: z.string().optional(),
        otherParticipants: z.string().optional(),
        participantType: z.string().optional(),
        institutionalCooperation: z.string().optional(),
        sessionDetails: z.string().optional(),
        relationshipType: z.string().optional(),
        sessionLocation: z.string().optional(),
        disciplineStatus: z.string().optional(),
        sessionType: z.string().optional(),
        detailedNotes: z.string().optional(),
      }).parse(req.body);
      
      const session = await storage.getCounselingSession(id);
      if (!session) {
        return res.status(404).json({ message: "Görüşme kaydı bulunamadı" });
      }
      
      const updatedSession = await storage.updateCounselingSession(id, validatedData);
      
      // Student bilgisi al
      const student = await storage.getStudent(session.studentId);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "görüşme_güncelleme",
        message: `${student?.firstName} ${student?.lastName} görüşme bilgileri güncellendi.`,
        relatedId: id
      });
      
      res.json(updatedSession);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Görüşmeyi tamamla (çıkış saati ve dersi ekle)
  app.put("/api/counseling-sessions/:id/complete", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = z.object({
        exitTime: z.string(),
        exitClassHourId: z.number().optional(),
        detailedNotes: z.string().optional()
      }).parse(req.body);
      
      const session = await storage.getCounselingSession(id);
      if (!session) {
        return res.status(404).json({ message: "Görüşme kaydı bulunamadı" });
      }
      
      // exitTime ve exitClassHourId güncellemek için completeCounselingSession metodunu kullan
      let updatedSession = await storage.completeCounselingSession(
        id, 
        validatedData.exitTime, 
        validatedData.exitClassHourId
      );
      
      // Eğer detailedNotes var ise, ayrıca güncelle
      if (validatedData.detailedNotes) {
        updatedSession = await storage.updateCounselingSession(id, {
          detailedNotes: validatedData.detailedNotes
        });
      }
      
      // Student bilgisi al
      const student = await storage.getStudent(session.studentId);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "görüşme_tamamlama",
        message: `${student?.firstName} ${student?.lastName} görüşmesi tamamlandı.`,
        relatedId: id
      });
      
      res.json(updatedSession);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Görüşme kaydını sil
  app.delete("/api/counseling-sessions/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const session = await storage.getCounselingSession(id);
      if (!session) {
        return res.status(404).json({ message: "Görüşme kaydı bulunamadı" });
      }
      
      // Student bilgisi al
      const student = await storage.getStudent(session.studentId);
      
      await storage.deleteCounselingSession(id);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "görüşme_silme",
        message: `${student?.firstName} ${student?.lastName} görüşme kaydı silindi.`,
        relatedId: null
      });
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ===== Dersler ve Ders Konuları API Routes =====
  
  // Tüm dersleri getir
  app.get("/api/courses", async (req, res, next) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (err) {
      next(err);
    }
  });
  
  // Tekil ders getir
  app.get("/api/courses/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourse(id);
      
      if (!course) {
        return res.status(404).json({ message: "Ders bulunamadı" });
      }
      
      res.json(course);
    } catch (err) {
      next(err);
    }
  });
  
  // Yeni ders ekle
  app.post("/api/courses", async (req, res, next) => {
    try {
      const validatedData = insertCourseSchema.parse(req.body);
      
      const course = await storage.createCourse(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_ekleme",
        message: `Yeni ders eklendi: ${course.name}`,
        relatedId: course.id
      });
      
      res.status(201).json(course);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Ders güncelle
  app.put("/api/courses/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCourseSchema.partial().parse(req.body);
      
      const course = await storage.getCourse(id);
      if (!course) {
        return res.status(404).json({ message: "Ders bulunamadı" });
      }
      
      const updatedCourse = await storage.updateCourse(id, validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_güncelleme",
        message: `Ders güncellendi: ${updatedCourse!.name}`,
        relatedId: id
      });
      
      res.json(updatedCourse);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Ders sil
  app.delete("/api/courses/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const course = await storage.getCourse(id);
      if (!course) {
        return res.status(404).json({ message: "Ders bulunamadı" });
      }
      
      await storage.deleteCourse(id);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_silme",
        message: `Ders silindi: ${course.name}`,
        relatedId: null
      });
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
  
  // Bir derse ait tüm konuları getir
  app.get("/api/courses/:id/subjects", async (req, res, next) => {
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
  
  // Tekil ders konusu getir
  app.get("/api/course-subjects/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const subject = await storage.getCourseSubject(id);
      
      if (!subject) {
        return res.status(404).json({ message: "Ders konusu bulunamadı" });
      }
      
      res.json(subject);
    } catch (err) {
      next(err);
    }
  });
  
  // Yeni ders konusu ekle
  app.post("/api/course-subjects", async (req, res, next) => {
    try {
      const validatedData = insertCourseSubjectSchema.parse(req.body);
      
      // Kurs var mı kontrol et
      const course = await storage.getCourse(validatedData.courseId);
      if (!course) {
        return res.status(400).json({ message: "Geçersiz ders" });
      }
      
      const subject = await storage.createCourseSubject(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_konusu_ekleme",
        message: `Yeni ders konusu eklendi: ${subject.name} (${course.name})`,
        relatedId: subject.id
      });
      
      res.status(201).json(subject);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Toplu ders konusu ekle
  app.post("/api/courses/:id/subjects/bulk", async (req, res, next) => {
    try {
      const courseId = parseInt(req.params.id);
      
      // Kurs var mı kontrol et
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(400).json({ message: "Geçersiz ders" });
      }
      
      const validatedData = z.object({
        subjects: z.array(
          z.object({
            name: z.string().min(1, "Konu adı zorunludur"),
            duration: z.number().int().positive("Süre pozitif bir sayı olmalıdır")
          })
        ).min(1, "En az bir konu olmalıdır")
      }).parse(req.body);
      
      const subjects = await storage.createMultipleCourseSubjects(courseId, validatedData.subjects);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "toplu_ders_konusu_ekleme",
        message: `${subjects.length} adet ders konusu ${course.name} dersine eklendi`,
        relatedId: course.id
      });
      
      res.status(201).json(subjects);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Excel'den ders konusu içe aktar
  app.post("/api/courses/:id/subjects/import", async (req, res, next) => {
    try {
      const courseId = parseInt(req.params.id);
      
      // Kurs var mı kontrol et
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(400).json({ message: "Geçersiz ders" });
      }
      
      const validatedData = z.object({
        subjects: z.array(
          z.object({
            name: z.string().min(1, "Konu adı zorunludur"),
            duration: z.number().int().positive("Süre pozitif bir sayı olmalıdır")
          })
        ).min(1, "En az bir konu olmalıdır")
      }).parse(req.body);
      
      const subjects = await storage.importCourseSubjectsFromExcel(courseId, validatedData.subjects);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "excel_ders_konusu_içe_aktarma",
        message: `${subjects.length} adet ders konusu Excel'den ${course.name} dersine aktarıldı`,
        relatedId: course.id
      });
      
      res.status(201).json(subjects);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Excel'den toplu ders ve konuları içe aktarma
  app.post("/api/courses/bulk-import", async (req, res, next) => {
    try {
      const validatedData = z.object({
        courses: z.array(
          z.object({
            name: z.string().min(1, "Ders adı zorunludur"),
            subjects: z.array(
              z.object({
                name: z.string().min(1, "Konu adı zorunludur"),
                duration: z.number().int().positive("Süre pozitif bir sayı olmalıdır")
              })
            ).optional().default([])
          })
        ).min(1, "En az bir ders olmalıdır")
      }).parse(req.body);

      const results = [];

      // Process each course and its subjects
      for (const courseData of validatedData.courses) {
        // Check if course exists by name
        let course = await storage.getCourseByName(courseData.name);
        
        // If course doesn't exist, create it
        if (!course) {
          course = await storage.createCourse({ name: courseData.name });
          
          // Log activity
          await storage.createActivity({
            type: "ders_ekleme",
            message: `Yeni ders eklendi: ${course.name}`,
            relatedId: course.id
          });
        }
        
        // Import subjects for this course
        if (courseData.subjects && courseData.subjects.length > 0) {
          const subjects = await storage.importCourseSubjectsFromExcel(course.id, courseData.subjects);
          
          // Log activity
          await storage.createActivity({
            type: "excel_ders_konusu_içe_aktarma",
            message: `${subjects.length} adet ders konusu Excel'den ${course.name} dersine aktarıldı`,
            relatedId: course.id
          });
          
          results.push({
            course,
            subjectsAdded: subjects.length
          });
        } else {
          results.push({
            course,
            subjectsAdded: 0
          });
        }
      }

      res.status(201).json({
        message: `${results.length} adet ders ve konuları başarıyla içe aktarıldı`,
        results
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // Ders konusu güncelle
  app.put("/api/course-subjects/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCourseSubjectSchema.partial().parse(req.body);
      
      const subject = await storage.getCourseSubject(id);
      if (!subject) {
        return res.status(404).json({ message: "Ders konusu bulunamadı" });
      }
      
      // Eğer kurs değişiyorsa, yeni kursun var olduğunu kontrol et
      if (validatedData.courseId && validatedData.courseId !== subject.courseId) {
        const course = await storage.getCourse(validatedData.courseId);
        if (!course) {
          return res.status(400).json({ message: "Geçersiz ders" });
        }
      }
      
      const updatedSubject = await storage.updateCourseSubject(id, validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_konusu_güncelleme",
        message: `Ders konusu güncellendi: ${updatedSubject!.name}`,
        relatedId: id
      });
      
      res.json(updatedSubject);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Ders konusu sil
  app.delete("/api/course-subjects/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const subject = await storage.getCourseSubject(id);
      if (!subject) {
        return res.status(404).json({ message: "Ders konusu bulunamadı" });
      }
      
      await storage.deleteCourseSubject(id);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "ders_konusu_silme",
        message: `Ders konusu silindi: ${subject.name}`,
        relatedId: null
      });
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ===== Çalışma Planı API Routes =====
  
  // Öğrencinin çalışma planlarını getir
  app.get("/api/students/:id/study-plans", async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const studyPlans = await storage.getStudyPlansByStudent(studentId);
      res.json(studyPlans);
    } catch (err) {
      next(err);
    }
  });
  
  // Tekil çalışma planı getir
  app.get("/api/study-plans/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const studyPlan = await storage.getStudyPlan(id);
      
      if (!studyPlan) {
        return res.status(404).json({ message: "Çalışma planı bulunamadı" });
      }
      
      res.json(studyPlan);
    } catch (err) {
      next(err);
    }
  });
  
  // Yeni çalışma planı ekle
  app.post("/api/study-plans", async (req, res, next) => {
    try {
      const validatedData = insertStudyPlanSchema.parse(req.body);
      
      // Öğrenci var mı kontrol et
      const student = await storage.getStudent(validatedData.studentId);
      if (!student) {
        return res.status(400).json({ message: "Geçersiz öğrenci" });
      }
      
      // Ders var mı kontrol et
      const course = await storage.getCourse(validatedData.courseId);
      if (!course) {
        return res.status(400).json({ message: "Geçersiz ders" });
      }
      
      console.log(`"${course.name}" dersi için yeni çalışma planı oluşturuluyor (${validatedData.date}, ${validatedData.startTime}-${validatedData.endTime})`);
      
      const studyPlan = await storage.createStudyPlan(validatedData);
      
      // Öğrencinin bu ders için konu ilerlemesi yoksa oluştur
      console.log(`${student.firstName} ${student.lastName} için ${course.name} dersindeki konu ilerlemeleri kontrol ediliyor...`);
      await storage.initializeSubjectProgressForStudent(validatedData.studentId, validatedData.courseId);
      
      // Çalışma planı için konu planlaması yap
      console.log(`Çalışma planı için konular otomatik olarak planlanıyor...`);
      const planSubjects = await storage.generateSubjectPlanForStudyPlan(studyPlan.id);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "çalışma_planı_oluşturma",
        message: `${student.firstName} ${student.lastName} için ${course.name} dersinde çalışma planı oluşturuldu.`,
        relatedId: studyPlan.id
      });
      
      const response = {
        ...studyPlan,
        planSubjects,
        message: `${course.name} dersi için çalışma planı oluşturuldu. Toplamda ${planSubjects.length} konu için planlama yapıldı.`
      };
      
      res.status(201).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      console.error(`Çalışma planı oluşturulurken hata: ${err}`);
      next(err);
    }
  });
  
  // Çalışma planı güncelle
  app.put("/api/study-plans/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertStudyPlanSchema.partial().parse(req.body);
      
      const studyPlan = await storage.getStudyPlan(id);
      if (!studyPlan) {
        return res.status(404).json({ message: "Çalışma planı bulunamadı" });
      }
      
      const updatedStudyPlan = await storage.updateStudyPlan(id, validatedData);
      
      res.json(updatedStudyPlan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Çalışma planı sil
  app.delete("/api/study-plans/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const studyPlan = await storage.getStudyPlan(id);
      if (!studyPlan) {
        return res.status(404).json({ message: "Çalışma planı bulunamadı" });
      }
      
      await storage.deleteStudyPlan(id);
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
  
  // ===== Konu İlerleme API Routes =====
  
  // Öğrencinin konu ilerlemelerini getir
  app.get("/api/students/:id/subject-progress", async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const subjectProgress = await storage.getSubjectProgressByStudent(studentId);
      res.json(subjectProgress);
    } catch (err) {
      next(err);
    }
  });
  
  // Yeni konu ilerlemesi ekle
  app.post("/api/subject-progress", async (req, res, next) => {
    try {
      const validatedData = insertSubjectProgressSchema.parse(req.body);
      
      // Öğrenci var mı kontrol et
      const student = await storage.getStudent(validatedData.studentId);
      if (!student) {
        return res.status(400).json({ message: "Geçersiz öğrenci" });
      }
      
      const progress = await storage.createSubjectProgress(validatedData);
      
      res.status(201).json(progress);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Konu ilerlemesini güncelle
  app.put("/api/subject-progress/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSubjectProgressSchema.partial().parse(req.body);
      
      const progress = await storage.getSubjectProgress(id);
      if (!progress) {
        return res.status(404).json({ message: "Konu ilerlemesi bulunamadı" });
      }
      
      const updatedProgress = await storage.updateSubjectProgress(id, validatedData);
      
      res.json(updatedProgress);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Konu ilerlemesini tamamla
  app.post("/api/subject-progress/:id/complete", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = z.object({
        completedMinutes: z.number().int().min(1, "Tamamlanan süre en az 1 dakika olmalıdır"),
      }).parse(req.body);
      
      const progress = await storage.getSubjectProgress(id);
      if (!progress) {
        return res.status(404).json({ message: "Konu ilerlemesi bulunamadı" });
      }
      
      const updatedProgress = await storage.completeSubjectProgress(id, validatedData.completedMinutes);
      
      res.json(updatedProgress);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // Konu ilerlemesi sil
  app.delete("/api/subject-progress/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const progress = await storage.getSubjectProgress(id);
      if (!progress) {
        return res.status(404).json({ message: "Konu ilerlemesi bulunamadı" });
      }
      
      await storage.deleteSubjectProgress(id);
      
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
  
  // Öğrenci için konu ilerlemelerini başlat
  app.post("/api/students/:id/initialize-progress", async (req, res, next) => {
    try {
      const studentId = parseInt(req.params.id);
      const validatedData = z.object({
        courseId: z.number().int().min(1, "Ders ID geçerli olmalıdır"),
      }).parse(req.body);
      
      // Öğrenci var mı kontrol et
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(400).json({ message: "Geçersiz öğrenci" });
      }
      
      // Ders var mı kontrol et
      const course = await storage.getCourse(validatedData.courseId);
      if (!course) {
        return res.status(400).json({ message: "Geçersiz ders" });
      }
      
      const progress = await storage.initializeSubjectProgressForStudent(studentId, validatedData.courseId);
      
      res.status(201).json(progress);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });
  
  // ===== Çalışma Planı Konuları API Routes =====
  
  // Çalışma planının konularını getir
  app.get("/api/study-plans/:id/subjects", async (req, res, next) => {
    try {
      const studyPlanId = parseInt(req.params.id);
      const subjects = await storage.getStudyPlanSubjects(studyPlanId);
      res.json(subjects);
    } catch (err) {
      next(err);
    }
  });
  
  // Çalışma planı için konular oluştur
  app.post("/api/study-plans/:id/generate-subjects", async (req, res, next) => {
    try {
      const studyPlanId = parseInt(req.params.id);
      
      const studyPlan = await storage.getStudyPlan(studyPlanId);
      if (!studyPlan) {
        return res.status(404).json({ message: "Çalışma planı bulunamadı" });
      }
      
      const subjects = await storage.generateSubjectPlanForStudyPlan(studyPlanId);
      
      res.status(201).json(subjects);
    } catch (err) {
      next(err);
    }
  });

  // Rapor Oluşturma API Endpoint - Excel dosyası olarak indirilebilir
  app.post("/api/reports/generate", async (req: Request, res: Response, next) => {
    try {
      const { type, period } = req.body;
      
      // Default tüm veriler
      const students = await storage.getStudents();
      const appointments = await storage.getAppointments();
      const sessions = await storage.getCounselingSessions();
      
      // Dönem filtresi uygula
      const now = new Date();
      let filteredSessions = sessions;
      let filteredAppointments = appointments;
      
      if (period !== 'all') {
        // Dönem filtrelerini ayarla
        let startDate = new Date(now);
        
        if (period === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (period === 'week') {
          startDate.setDate(now.getDate() - now.getDay()); // Haftanın başlangıcı (Pazar)
          startDate.setHours(0, 0, 0, 0);
        } else if (period === 'month') {
          startDate.setDate(1); // Ayın başlangıcı
          startDate.setHours(0, 0, 0, 0);
        }
        
        // Filtreleri uygula
        filteredSessions = sessions.filter(session => {
          const sessionDate = new Date(session.entryTime || 0);
          return sessionDate >= startDate && sessionDate <= now;
        });
        
        filteredAppointments = appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.date);
          return appointmentDate >= startDate && appointmentDate <= now;
        });
      }
      
      // Excel workbook oluştur
      const wb = XLSX.utils.book_new();
      
      // Rapor türüne göre uygun veriyi hazırla ve sheet ekle
      if (type === 'dashboard' || type === 'all') {
        // Özet bilgileri içeren bir sheet
        const summaryData = [
          ['Rehberlik Raporu', '', ''],
          ['Oluşturulma Tarihi', now.toLocaleString('tr-TR'), ''],
          ['Dönem', period === 'all' ? 'Tüm Zamanlar' : period === 'today' ? 'Bugün' : period === 'week' ? 'Bu Hafta' : 'Bu Ay', ''],
          ['', '', ''],
          ['Toplam Öğrenci Sayısı', students.length, ''],
          ['Toplam Randevu Sayısı', filteredAppointments.length, ''],
          ['Toplam Görüşme Sayısı', filteredSessions.length, '']
        ];
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Özet');
        
        // Aktivite verilerini ekle
        const activities = await storage.getRecentActivities(100); // Son 100 aktivite
        const activityData = [
          ['ID', 'Tür', 'Mesaj', 'Tarih']
        ];
        
        activities.forEach(activity => {
          activityData.push([
            activity.id,
            activity.type,
            activity.message,
            new Date(activity.createdAt).toLocaleString('tr-TR')
          ]);
        });
        
        const activitySheet = XLSX.utils.aoa_to_sheet(activityData);
        XLSX.utils.book_append_sheet(wb, activitySheet, 'Aktiviteler');
      }
      
      if (type === 'students' || type === 'all') {
        // Öğrenci dağılımını hesapla
        const classCounts: Record<string, number> = {};
        students.forEach(student => {
          const studentClass = student.class || 'Tanımlanmamış';
          classCounts[studentClass] = (classCounts[studentClass] || 0) + 1;
        });
        
        const classData = [
          ['Sınıf', 'Öğrenci Sayısı']
        ];
        
        Object.entries(classCounts).forEach(([className, count]) => {
          classData.push([className, count]);
        });
        
        const classSheet = XLSX.utils.aoa_to_sheet(classData);
        XLSX.utils.book_append_sheet(wb, classSheet, 'Sınıf Dağılımı');
        
        // Öğrenci listesi
        const studentData = [
          ['ID', 'Öğrenci No', 'Adı', 'Soyadı', 'Sınıf', 'TC Kimlik', 'Cinsiyet', 'Telefon']
        ];
        
        students.forEach(student => {
          studentData.push([
            student.id,
            student.studentNumber,
            student.firstName,
            student.lastName,
            student.class || '',
            student.identityNumber || '',
            student.gender || '',
            student.phone || ''
          ]);
        });
        
        const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
        XLSX.utils.book_append_sheet(wb, studentSheet, 'Öğrenci Listesi');
      }
      
      if (type === 'appointments' || type === 'all') {
        // Randevu durumlarına göre analiz
        const statusCounts: Record<string, number> = {
          'beklemede': 0,
          'onaylandı': 0,
          'tamamlandı': 0,
          'iptal': 0
        };
        
        filteredAppointments.forEach(appointment => {
          statusCounts[appointment.status] = (statusCounts[appointment.status] || 0) + 1;
        });
        
        const statusData = [
          ['Durum', 'Randevu Sayısı']
        ];
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          statusData.push([status, count]);
        });
        
        const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
        XLSX.utils.book_append_sheet(wb, statusSheet, 'Randevu Durumları');
        
        // Randevu listesi
        const appointmentData = [
          ['ID', 'Öğrenci ID', 'Tarih', 'Saat', 'Konu', 'Durum', 'Notlar']
        ];
        
        filteredAppointments.forEach(appointment => {
          appointmentData.push([
            appointment.id,
            appointment.studentId,
            new Date(appointment.date).toLocaleDateString('tr-TR'),
            appointment.time,
            appointment.subject,
            appointment.status,
            appointment.notes || ''
          ]);
        });
        
        const appointmentSheet = XLSX.utils.aoa_to_sheet(appointmentData);
        XLSX.utils.book_append_sheet(wb, appointmentSheet, 'Randevu Listesi');
      }
      
      // Excel dosyasını oluştur ve yanıt olarak gönder
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      
      res.setHeader('Content-Disposition', `attachment; filename=rehberlik-raporu-${type}-${new Date().toISOString().split('T')[0]}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(excelBuffer);
      
    } catch (err) {
      console.error('Rapor oluşturma hatası:', err);
      next(err);
    }
  });

  // Okul Bilgileri API
  app.get("/api/school-info", async (req, res, next) => {
    try {
      const info = await storage.getSchoolInfo();
      
      if (!info) {
        return res.json({
          schoolName: "",
          province: "",
          district: "",
          logoUrl: ""
        });
      }
      
      res.json(info);
    } catch (err) {
      next(err);
    }
  });
  
  app.post("/api/school-info", async (req, res, next) => {
    try {
      const validatedData = insertSchoolInfoSchema.parse(req.body);
      
      const updatedInfo = await storage.updateSchoolInfo(validatedData);
      
      // Aktivite kaydı ekle
      await storage.createActivity({
        type: "okul_bilgileri_guncelleme",
        message: `Okul bilgileri güncellendi: ${updatedInfo.schoolName}`,
        relatedId: updatedInfo.id
      });
      
      res.json(updatedInfo);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  // ===== Bildirimler API Routes =====

  // Kullanıcının bildirimlerini getir
  app.get("/api/notifications", requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).user?.id; // Auth middleware'den gelen user ID
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string) || 20, 100) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const onlyUnread = req.query.unread === 'true';
      
      const notifications = await storage.getNotifications(userId, limit, onlyUnread, offset);
      res.json(notifications);
    } catch (err) {
      next(err);
    }
  });

  // Bildirimi okundu olarak işaretle
  app.put("/api/notifications/:id/read", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user?.id;
      
      const success = await storage.markNotificationAsRead(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Bildirim bulunamadı veya erişim izni yok" });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Tüm bildirimleri okundu olarak işaretle
  app.put("/api/notifications/mark-all-read", requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      
      const count = await storage.markAllNotificationsAsRead(userId);
      res.json({ success: count > 0, count });
    } catch (err) {
      next(err);
    }
  });

  // Bildirim oluştur (sadece admin kullanıcılar için)
  app.post("/api/notifications", requireAuth, async (req, res, next) => {
    try {
      const user = (req as any).user;
      
      // Admin olmayan kullanıcılar global bildirim oluşturamaz
      if (req.body.userId === null && user.role !== "admin") {
        return res.status(403).json({ message: "Global bildirim oluşturma izniniz yok" });
      }
      
      const validatedData = insertNotificationSchema.parse(req.body);
      
      // userId'yi güvenlik için req.user.id'den al (global bildirimler için admin kontrolü)
      const notificationData = {
        ...validatedData,
        userId: validatedData.userId === null && user.role === "admin" ? null : user.id
      };
      
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Eksik ya da hatalı bilgi", errors: err.errors });
      }
      next(err);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
