import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Kullanıcılar tablosu
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").default("rehber").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
});

// Öğrenciler tablosu
export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  studentNumber: text("student_number").notNull().unique(),
  class: text("class").notNull(),
  birthDate: text("birth_date").notNull(), // SQLite'da date tipi olmadığı için text olarak saklıyoruz
  gender: text("gender").notNull(),
  parentName: text("parent_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

// Randevular tablosu
export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  counselorId: integer("counselor_id").notNull(),
  date: text("date").notNull(), // SQLite'da date tipi olmadığı için text olarak saklıyoruz
  time: text("time").notNull(),
  durationMinutes: integer("duration_minutes").default(30).notNull(),
  subject: text("subject").notNull(),
  status: text("status").default("bekliyor").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

// Aktiviteler tablosu
export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

// Rehberlik Görüşme Kayıtları tablosu
export const counselingSessions = sqliteTable("counseling_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  counselorId: integer("counselor_id").notNull(),
  sessionDate: text("session_date").notNull(), // SQLite'da date tipi olmadığı için text olarak saklıyoruz
  entryTime: text("entry_time").notNull(), // Giriş saati (HH:MM formatında)
  entryClassHourId: integer("entry_class_hour_id"), // Hangi ders saatine denk geldiği (class_hours tablosundaki id)
  exitTime: text("exit_time"), // Çıkış saati (HH:MM formatında)
  exitClassHourId: integer("exit_class_hour_id"), // Hangi ders saatine denk geldiği (class_hours tablosundaki id)
  topic: text("topic").notNull(), // Görüşme konusu
  otherParticipants: text("other_participants"), // Diğer katılımcılar - serbest metin
  participantType: text("participant_type").default("öğrenci").notNull(), // Görüşülen kişi türü: öğrenci, veli, öğretmen
  institutionalCooperation: text("institutional_cooperation"), // Kurum işbirliği
  sessionDetails: text("session_details"), // Görüşme açıklaması 
  relationshipType: text("relationship_type"), // Yakınlık derecesi
  sessionLocation: text("session_location").default("Rehberlik Servisi").notNull(), // Görüşme yeri
  disciplineStatus: text("discipline_status"), // Disiplin durumu
  sessionType: text("session_type").default("yüz_yüze").notNull(), // Görüşme şekli: yüz_yüze, uzaktan
  detailedNotes: text("detailed_notes"), // Ayrıntılı notlar - görüşme sonrası eklenir
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertCounselingSessionSchema = createInsertSchema(counselingSessions).omit({
  id: true,
  createdAt: true,
  exitTime: true,
  exitClassHourId: true,
});

// Ders Saatleri tablosu
export const classHours = sqliteTable("class_hours", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // Ders saatinin adı (1. Ders, 2. Ders vb.)
  startTime: text("start_time").notNull(), // Başlangıç saati (08:30 formatında)
  endTime: text("end_time").notNull(), // Bitiş saati (09:10 formatında)
  dayOfWeek: integer("day_of_week"), // 1-7 arasında (Pazartesi-Pazar)
  description: text("description"), // Opsiyonel açıklama
  isActive: integer("is_active").default(1).notNull(), // Aktif mi? (0=pasif, 1=aktif)
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertClassHourSchema = createInsertSchema(classHours).omit({
  id: true,
  createdAt: true,
});

// Görüşme Konuları tablosu
export const counselingTopics = sqliteTable("counseling_topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertCounselingTopicSchema = createInsertSchema(counselingTopics).omit({
  id: true,
  createdAt: true,
});

// Tip tanımlamaları
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type ClassHour = typeof classHours.$inferSelect;
export type InsertClassHour = z.infer<typeof insertClassHourSchema>;

export type CounselingSession = typeof counselingSessions.$inferSelect;
export type InsertCounselingSession = z.infer<typeof insertCounselingSessionSchema>;

export type CounselingTopic = typeof counselingTopics.$inferSelect;
export type InsertCounselingTopic = z.infer<typeof insertCounselingTopicSchema>;

// Dersler tablosu
export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // Ders adı (Matematik, Fizik, vb.)
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

// Ders konuları tablosu
export const courseSubjects = sqliteTable("course_subjects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(), // Hangi derse ait olduğu
  name: text("name").notNull(), // Konu adı
  duration: integer("duration").notNull(), // Konunun süresi (ders saati cinsinden)
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertCourseSubjectSchema = createInsertSchema(courseSubjects).omit({
  id: true,
  createdAt: true,
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type CourseSubject = typeof courseSubjects.$inferSelect;
export type InsertCourseSubject = z.infer<typeof insertCourseSubjectSchema>;

// Çalışma Planı tablosu
export const studyPlans = sqliteTable("study_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(), // Hangi öğrenciye ait olduğu
  courseId: integer("course_id").notNull(), // Hangi derse ait olduğu
  date: text("date").notNull(), // Tarih (YYYY-MM-DD formatında)
  startTime: text("start_time").notNull(), // Başlangıç saati (HH:MM formatında)
  endTime: text("end_time").notNull(), // Bitiş saati (HH:MM formatında)
  notes: text("notes"), // Opsiyonel notlar
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans).omit({
  id: true,
  createdAt: true,
});

// Konu İlerleme tablosu
export const subjectProgress = sqliteTable("subject_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(), // Hangi öğrenciye ait olduğu
  subjectId: integer("subject_id").notNull(), // Hangi konuya ait olduğu
  totalTime: integer("total_time").notNull(), // Konunun toplam süresi (dakika)
  completedTime: integer("completed_time").default(0).notNull(), // Tamamlanan süre (dakika)
  remainingTime: integer("remaining_time").notNull(), // Kalan süre (dakika)
  isCompleted: integer("is_completed").default(0).notNull(), // Tamamlandı mı? (0=hayır, 1=evet)
  lastStudyDate: text("last_study_date"), // Son çalışma tarihi
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertSubjectProgressSchema = createInsertSchema(subjectProgress).omit({
  id: true,
  createdAt: true,
});

// Konu Çalışma Planı tablosu (çalışma planı ve konu ilerlemesi arasındaki bağlantı)
export const studyPlanSubjects = sqliteTable("study_plan_subjects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studyPlanId: integer("study_plan_id").notNull(), // Hangi çalışma planına ait olduğu
  subjectProgressId: integer("subject_progress_id").notNull(), // Hangi konu ilerlemesine ait olduğu
  allocatedTime: integer("allocated_time").notNull(), // Bu plan için ayrılan süre (dakika)
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertStudyPlanSubjectSchema = createInsertSchema(studyPlanSubjects).omit({
  id: true,
  createdAt: true,
});

export type StudyPlan = typeof studyPlans.$inferSelect;
export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;

export type SubjectProgress = typeof subjectProgress.$inferSelect;
export type InsertSubjectProgress = z.infer<typeof insertSubjectProgressSchema>;

export type StudyPlanSubject = typeof studyPlanSubjects.$inferSelect;
export type InsertStudyPlanSubject = z.infer<typeof insertStudyPlanSubjectSchema>;

// Okul Bilgileri tablosu
export const schoolInfo = sqliteTable("school_info", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolName: text("school_name").notNull(),
  province: text("province").notNull(),
  district: text("district").notNull(),
  logoUrl: text("logo_url"), // Logonun yolu/URL'si
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertSchoolInfoSchema = createInsertSchema(schoolInfo).omit({
  id: true,
  updatedAt: true,
});

export type SchoolInfo = typeof schoolInfo.$inferSelect;
export type InsertSchoolInfo = z.infer<typeof insertSchoolInfoSchema>;

// Bildirimler tablosu
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"), // Hangi kullanıcıya ait (null=tüm kullanıcılar)
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(), // info, success, warning, error
  isRead: integer("is_read").default(0).notNull(), // 0=okunmamış, 1=okunmuş
  relatedId: integer("related_id"), // İlgili kayıt ID'si (öğrenci, randevu vs.)
  relatedType: text("related_type"), // İlgili kayıt tipi (student, appointment vs.)
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
