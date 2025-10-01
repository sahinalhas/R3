import { sqliteTable, text, integer, blob, unique, index } from "drizzle-orm/sqlite-core";
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

// Öğrenciler tablosu (BRYS için genişletildi)
export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  studentNumber: text("student_number").notNull().unique(),
  tcKimlikNo: text("tc_kimlik_no").unique(), // TC Kimlik No
  class: text("class").notNull(),
  birthDate: text("birth_date").notNull(),
  gender: text("gender").notNull(),
  photoUrl: text("photo_url"), // Öğrenci fotoğrafı
  
  // Veli Bilgileri (Ana)
  motherName: text("mother_name"),
  motherProfession: text("mother_profession"),
  motherEducation: text("mother_education"),
  motherPhone: text("mother_phone"),
  
  // Veli Bilgileri (Baba)
  fatherName: text("father_name"),
  fatherProfession: text("father_profession"),
  fatherEducation: text("father_education"),
  fatherPhone: text("father_phone"),
  
  // Genel İletişim
  parentName: text("parent_name").notNull(), // Birincil veli
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address").notNull(),
  
  // Aile Yapısı
  familyStructure: text("family_structure"), // "birlikte", "ayrı", vs.
  siblingCount: integer("sibling_count").default(0),
  emergencyContact: text("emergency_contact"), // Acil durum iletişim
  emergencyPhone: text("emergency_phone"),
  
  // Diğer
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
  status: text("status").default("beklemede").notNull(),
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

// Rehberlik Görüşme Kayıtları tablosu (BRYS için genişletildi)
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
  
  // BRYS - Gizlilik ve Takip Alanları
  confidentialityLevel: text("confidentiality_level").default("normal").notNull(), // "düşük", "normal", "yüksek", "çok_gizli"
  visibilityRole: text("visibility_role").default("pdr").notNull(), // "pdr", "pdr_yönetim", "okul_yönetimi", "sınıf_öğretmeni"
  outcomeSummary: text("outcome_summary"), // Görüşme sonucu özeti
  followUpPlan: text("follow_up_plan"), // Takip planı
  nextReviewDate: text("next_review_date"), // Bir sonraki değerlendirme tarihi
  requiresAttention: integer("requires_attention").default(0), // Dikkat gerektiriyor mu? (0=hayır, 1=evet)
  
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
  duration: integer("duration").notNull(), // Konunun süresi (dakika cinsinden)
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

// Haftalık Çalışma Slotları tablosu (Takvim 1 - İskelet Plan)
export const weeklyStudySlots = sqliteTable("weekly_study_slots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(), // Hangi öğrenciye ait olduğu
  courseId: integer("course_id").notNull(), // Hangi derse ait olduğu
  dayOfWeek: integer("day_of_week").notNull(), // 1-7 arasında (Pazartesi-Pazar)
  startTime: text("start_time").notNull(), // Başlangıç saati (HH:MM formatında)
  endTime: text("end_time").notNull(), // Bitiş saati (HH:MM formatında)
  notes: text("notes"), // Opsiyonel notlar
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertWeeklyStudySlotSchema = createInsertSchema(weeklyStudySlots).omit({
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

// Konu Çalışma Planı tablosu (çalışma planı ve konu ilerlemesi arasındaki ba��lantı)
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

export type WeeklyStudySlot = typeof weeklyStudySlots.$inferSelect;
export type InsertWeeklyStudySlot = z.infer<typeof insertWeeklyStudySlotSchema>;

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
}).extend({
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// BRYS - Akademik Gelişim Takibi
// Ders Notları tablosu
export const studentGrades = sqliteTable("student_grades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  courseId: integer("course_id").notNull(),
  grade: integer("grade").notNull(), // Not değeri
  term: text("term").notNull(), // Dönem bilgisi
  academicYear: text("academic_year").notNull(), // Akademik yıl
  examType: text("exam_type"), // Sınav türü
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
}, (table) => ({
  // BRYS - Veri bütünlüğü kısıtlamaları
  uniqueGrade: unique().on(table.studentId, table.courseId, table.term, table.academicYear),
  studentIdIdx: index("grades_student_id_idx").on(table.studentId),
  courseIdIdx: index("grades_course_id_idx").on(table.courseId),
}));

export const insertStudentGradeSchema = createInsertSchema(studentGrades).omit({
  id: true,
  createdAt: true,
});

// Devamsızlık tablosu
export const attendanceRecords = sqliteTable("attendance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull(), // "özürlü", "özürsüz", "mevcut"
  reason: text("reason"), // Özür sebebi
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
}, (table) => ({
  // BRYS - Veri bütünlüğü kısıtlamaları
  uniqueStudentDate: unique().on(table.studentId, table.date),
  studentIdIdx: index("attendance_student_id_idx").on(table.studentId),
}));

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
});

// Sınav Sonuçları tablosu
export const examResults = sqliteTable("exam_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  examName: text("exam_name").notNull(), // LGS, YKS, deneme sınavı vs.
  examDate: text("exam_date").notNull(),
  totalScore: integer("total_score"),
  netScores: text("net_scores"), // JSON formatında ders bazında netler
  ranking: integer("ranking"), // Sıralama
  examType: text("exam_type").notNull(), // "lgs", "yks", "deneme"
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
}, (table) => ({
  // BRYS - Veri bütünlüğü kısıtlamaları
  uniqueExam: unique().on(table.studentId, table.examName, table.examDate),
  studentIdIdx: index("exams_student_id_idx").on(table.studentId),
}));

export const insertExamResultSchema = createInsertSchema(examResults).omit({
  id: true,
  createdAt: true,
});

// BRYS - Psiko-Sosyal Gelişim
// Envanter/Test Sonuçları tablosu
export const inventoryResults = sqliteTable("inventory_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  inventoryName: text("inventory_name").notNull(), // Test/envanter adı
  appliedDate: text("applied_date").notNull(),
  results: text("results").notNull(), // JSON formatında sonuçlar
  summary: text("summary"), // Özet değerlendirme
  appliedBy: integer("applied_by").notNull(), // Uygulayan PDR uzmanı
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertInventoryResultSchema = createInsertSchema(inventoryResults).omit({
  id: true,
  createdAt: true,
});

// Güçlü Yönler ve Gelişim Alanları tablosu
export const studentStrengthsWeaknesses = sqliteTable("student_strengths_weaknesses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  type: text("type").notNull(), // "güçlü_yön", "gelişim_alanı"
  description: text("description").notNull(),
  addedBy: integer("added_by").notNull(), // Kim ekledi (user id)
  addedByRole: text("added_by_role").notNull(), // "pdr", "öğretmen", "öğrenci"
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertStudentStrengthsWeaknessesSchema = createInsertSchema(studentStrengthsWeaknesses).omit({
  id: true,
  createdAt: true,
});

// İlgi ve Yetenek Alanları tablosu
export const studentInterests = sqliteTable("student_interests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  interestArea: text("interest_area").notNull(), // İlgi alanı
  proficiencyLevel: text("proficiency_level"), // Yeterlilik seviyesi
  addedBy: integer("added_by").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertStudentInterestSchema = createInsertSchema(studentInterests).omit({
  id: true,
  createdAt: true,
});

// Yaşam Olayları tablosu (Yüksek Gizlilik)
export const significantLifeEvents = sqliteTable("significant_life_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  eventDate: text("event_date").notNull(),
  eventType: text("event_type").notNull(), // "aile_sorunu", "travma", "kayıp" vs.
  description: text("description").notNull(),
  confidentialityLevel: text("confidentiality_level").default("yüksek").notNull(),
  addedBy: integer("added_by").notNull(), // Sadece PDR uzmanları ekleyebilir
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertSignificantLifeEventSchema = createInsertSchema(significantLifeEvents).omit({
  id: true,
  createdAt: true,
});

// BRYS - Kariyer Planlama
// Öğrenci Hedefleri tablosu
export const studentGoals = sqliteTable("student_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  goalType: text("goal_type").notNull(), // "kısa_vade", "orta_vade", "uzun_vade"
  goal: text("goal").notNull(),
  targetDate: text("target_date"),
  status: text("status").default("aktif").notNull(), // "aktif", "tamamlandı", "iptal"
  progress: integer("progress").default(0), // Yüzde ilerleme
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertStudentGoalSchema = createInsertSchema(studentGoals).omit({
  id: true,
  createdAt: true,
});

// Meslek İnceleme Kayıtları tablosu
export const careerExplorations = sqliteTable("career_explorations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  professionName: text("profession_name").notNull(),
  exploredDate: text("explored_date").notNull(),
  isFavorite: integer("is_favorite").default(0),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertCareerExplorationSchema = createInsertSchema(careerExplorations).omit({
  id: true,
  createdAt: true,
});

// BRYS - Anket ve Envanter Yönetimi
// Anket Şablonları tablosu
export const surveyTemplates = sqliteTable("survey_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  questions: text("questions").notNull(), // JSON formatında sorular
  isStandard: integer("is_standard").default(0), // MEB onaylı mı?
  createdBy: integer("created_by").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertSurveyTemplateSchema = createInsertSchema(surveyTemplates).omit({
  id: true,
  createdAt: true,
});

// Anket Uygulamaları tablosu
export const surveyApplications = sqliteTable("survey_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  surveyTemplateId: integer("survey_template_id").notNull(),
  appliedToClass: text("applied_to_class"), // Sınıf
  appliedToStudents: text("applied_to_students"), // JSON formatında öğrenci ID'leri
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isActive: integer("is_active").default(1),
  createdBy: integer("created_by").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertSurveyApplicationSchema = createInsertSchema(surveyApplications).omit({
  id: true,
  createdAt: true,
});

// Anket Cevapları tablosu
export const surveyResponses = sqliteTable("survey_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  surveyApplicationId: integer("survey_application_id").notNull(),
  studentId: integer("student_id").notNull(),
  responses: text("responses").notNull(), // JSON formatında cevaplar
  submittedAt: text("submitted_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  submittedAt: true,
});

// Tip tanımlamaları - Yeni tablolar için
export type StudentGrade = typeof studentGrades.$inferSelect;
export type InsertStudentGrade = z.infer<typeof insertStudentGradeSchema>;

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;

export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = z.infer<typeof insertExamResultSchema>;

export type InventoryResult = typeof inventoryResults.$inferSelect;
export type InsertInventoryResult = z.infer<typeof insertInventoryResultSchema>;

export type StudentStrengthsWeaknesses = typeof studentStrengthsWeaknesses.$inferSelect;
export type InsertStudentStrengthsWeaknesses = z.infer<typeof insertStudentStrengthsWeaknessesSchema>;

export type StudentInterest = typeof studentInterests.$inferSelect;
export type InsertStudentInterest = z.infer<typeof insertStudentInterestSchema>;

export type SignificantLifeEvent = typeof significantLifeEvents.$inferSelect;
export type InsertSignificantLifeEvent = z.infer<typeof insertSignificantLifeEventSchema>;

export type StudentGoal = typeof studentGoals.$inferSelect;
export type InsertStudentGoal = z.infer<typeof insertStudentGoalSchema>;

export type CareerExploration = typeof careerExplorations.$inferSelect;
export type InsertCareerExploration = z.infer<typeof insertCareerExplorationSchema>;

export type SurveyTemplate = typeof surveyTemplates.$inferSelect;
export type InsertSurveyTemplate = z.infer<typeof insertSurveyTemplateSchema>;

export type SurveyApplication = typeof surveyApplications.$inferSelect;
export type InsertSurveyApplication = z.infer<typeof insertSurveyApplicationSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
