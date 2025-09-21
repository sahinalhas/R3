import { 
  users, type User, type InsertUser, 
  students, type Student, type InsertStudent,
  appointments, type Appointment, type InsertAppointment,
  activities, type Activity, type InsertActivity,
  classHours, type ClassHour, type InsertClassHour,
  counselingSessions, type CounselingSession, type InsertCounselingSession,
  counselingTopics, type CounselingTopic, type InsertCounselingTopic,
  courses, type Course, type InsertCourse,
  courseSubjects, type CourseSubject, type InsertCourseSubject,
  studyPlans, type StudyPlan, type InsertStudyPlan,
  subjectProgress, type SubjectProgress, type InsertSubjectProgress,
  studyPlanSubjects, type StudyPlanSubject, type InsertStudyPlanSubject,
  schoolInfo, type SchoolInfo, type InsertSchoolInfo,
  notifications, type Notification, type InsertNotification
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc } from "drizzle-orm";
import session from "express-session";
import SQLiteStore from "better-sqlite3-session-store";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import Database from "better-sqlite3";

const SqliteSessionStore = SQLiteStore(session);

export interface IStorage {
  // Kullanıcı işlemleri
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined>;
  
  // Öğrenci işlemleri
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByNumber(studentNumber: string): Promise<Student | undefined>;
  getStudents(query?: string): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  
  // Randevu işlemleri
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointments(status?: string): Promise<Appointment[]>;
  getAppointmentsByStudent(studentId: number): Promise<Appointment[]>;
  getAppointmentsByDate(date: Date): Promise<Appointment[]>;
  getUpcomingAppointments(limit?: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  
  // Aktivite işlemleri
  getRecentActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Ders Saatleri işlemleri
  getClassHour(id: number): Promise<ClassHour | undefined>;
  getClassHours(dayOfWeek?: number): Promise<ClassHour[]>;
  createClassHour(classHour: InsertClassHour): Promise<ClassHour>;
  updateClassHour(id: number, data: Partial<InsertClassHour>): Promise<ClassHour | undefined>;
  deleteClassHour(id: number): Promise<boolean>;

  // Görüşme Konuları işlemleri
  getCounselingTopics(): Promise<CounselingTopic[]>;
  createCounselingTopic(topic: InsertCounselingTopic): Promise<CounselingTopic>;
  createMultipleCounselingTopics(topics: string[]): Promise<CounselingTopic[]>;
  deleteCounselingTopic(id: number): Promise<boolean>;

  // Rehberlik Görüşme Kayıtları işlemleri
  getCounselingSession(id: number): Promise<CounselingSession | undefined>;
  getCounselingSessions(): Promise<CounselingSession[]>;
  getCounselingSessionsByStudent(studentId: number): Promise<CounselingSession[]>;
  getCounselingSessionsByDate(date: string): Promise<CounselingSession[]>;
  getRecentCounselingSessions(limit?: number): Promise<CounselingSession[]>;
  createCounselingSession(session: InsertCounselingSession): Promise<CounselingSession>;
  updateCounselingSession(id: number, data: Partial<CounselingSession>): Promise<CounselingSession | undefined>;
  completeCounselingSession(id: number, exitTime: string, exitClassHourId?: number): Promise<CounselingSession | undefined>;
  deleteCounselingSession(id: number): Promise<boolean>;
  
  // Dersler işlemleri
  getCourse(id: number): Promise<Course | undefined>;
  getCourseByName(name: string): Promise<Course | undefined>;
  getCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, data: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: number): Promise<boolean>;
  
  // Ders Konuları işlemleri
  getCourseSubject(id: number): Promise<CourseSubject | undefined>;
  getCourseSubjectsByCourse(courseId: number): Promise<CourseSubject[]>;
  createCourseSubject(subject: InsertCourseSubject): Promise<CourseSubject>;
  createMultipleCourseSubjects(courseId: number, subjects: { name: string, duration: number }[]): Promise<CourseSubject[]>;
  updateCourseSubject(id: number, data: Partial<InsertCourseSubject>): Promise<CourseSubject | undefined>;
  deleteCourseSubject(id: number): Promise<boolean>;
  importCourseSubjectsFromExcel(courseId: number, subjects: { name: string, duration: number }[]): Promise<CourseSubject[]>;
  
  // İstatistik işlemleri
  getStats(): Promise<{ 
    studentCount: number; 
    todayAppointments: number; 
    weeklyAppointments: number; 
    pendingRequests: number; 
  }>;

  // Çalışma Planı işlemleri
  getStudyPlan(id: number): Promise<StudyPlan | undefined>;
  getStudyPlansByStudent(studentId: number): Promise<StudyPlan[]>;
  getStudyPlansByDate(date: string): Promise<StudyPlan[]>;
  getStudyPlansByCourse(studentId: number, courseId: number): Promise<StudyPlan[]>;
  createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan>;
  updateStudyPlan(id: number, data: Partial<InsertStudyPlan>): Promise<StudyPlan | undefined>;
  deleteStudyPlan(id: number): Promise<boolean>;

  // Konu İlerleme işlemleri
  getSubjectProgress(id: number): Promise<SubjectProgress | undefined>;
  getSubjectProgressByStudent(studentId: number): Promise<SubjectProgress[]>;
  getSubjectProgressBySubject(studentId: number, subjectId: number): Promise<SubjectProgress | undefined>;
  createSubjectProgress(progress: InsertSubjectProgress): Promise<SubjectProgress>;
  updateSubjectProgress(id: number, data: Partial<InsertSubjectProgress>): Promise<SubjectProgress | undefined>;
  completeSubjectProgress(id: number, completedMinutes: number): Promise<SubjectProgress | undefined>;
  deleteSubjectProgress(id: number): Promise<boolean>;
  initializeSubjectProgressForStudent(studentId: number, courseId: number): Promise<SubjectProgress[]>;

  // Konu Çalışma Planı işlemleri
  getStudyPlanSubjects(studyPlanId: number): Promise<StudyPlanSubject[]>;
  createStudyPlanSubject(planSubject: InsertStudyPlanSubject): Promise<StudyPlanSubject>;
  updateStudyPlanSubject(id: number, data: Partial<InsertStudyPlanSubject>): Promise<StudyPlanSubject | undefined>;
  deleteStudyPlanSubject(id: number): Promise<boolean>;
  generateSubjectPlanForStudyPlan(studyPlanId: number): Promise<StudyPlanSubject[]>;
  
  // Okul Bilgileri işlemleri
  getSchoolInfo(): Promise<SchoolInfo | undefined>;
  updateSchoolInfo(data: InsertSchoolInfo): Promise<SchoolInfo>;
  
  // Bildirimler işlemleri
  getNotifications(userId?: number, limit?: number, onlyUnread?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number, userId?: number): Promise<boolean>;
  markAllNotificationsAsRead(userId?: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    // Veri klasörünün varlığını kontrol edelim
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    // Ana SQLite veritabanı dosyasını kullan (rehberlik.db)
    // Aynı veritabanını hem uygulamanın ana verisi hem de session verisi için kullanacağız
    const mainDbPath = join(dataDir, 'rehberlik.db');
    const dbInstance = new Database(mainDbPath);
    
    // Sessions tablosunu oluşturalım (SQLiteStore kendi oluşturacaktır)
    this.sessionStore = new SqliteSessionStore({
      client: dbInstance,
      expired: { clear: true, intervalMs: 24 * 60 * 60 * 1000 } // 1 gün
    });
  }

  // Kullanıcı işlemleri
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<Omit<InsertUser, 'password'>>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Öğrenci işlemleri
  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByNumber(studentNumber: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.studentNumber, studentNumber));
    return student;
  }

  async getStudents(query?: string): Promise<Student[]> {
    if (query) {
      return db.select()
        .from(students)
        .where(
          like(students.firstName, `%${query}%`)
        )
        .orderBy(students.firstName);
    }
    return db.select().from(students).orderBy(students.firstName);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db
      .insert(students)
      .values(student)
      .returning();
    return newStudent;
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updatedStudent] = await db
      .update(students)
      .set(data)
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const result = await db
      .delete(students)
      .where(eq(students.id, id))
      .returning();
    return result.length > 0;
  }

  // Randevu işlemleri
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAppointments(status?: string): Promise<Appointment[]> {
    if (status) {
      return db.select()
        .from(appointments)
        .where(eq(appointments.status, status))
        .orderBy(appointments.date);
    }
    return db.select().from(appointments).orderBy(appointments.date);
  }
  
  async getAppointmentsByStudent(studentId: number): Promise<Appointment[]> {
    return db.select()
      .from(appointments)
      .where(eq(appointments.studentId, studentId))
      .orderBy(appointments.date);
  }

  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    // SQLite için date formatını YYYY-MM-DD olarak ayarlamamız gerekiyor
    const dateStr = date.toISOString().split('T')[0];
    return db.select()
      .from(appointments)
      .where(eq(appointments.date, dateStr))
      .orderBy(appointments.time);
  }

  async getUpcomingAppointments(limit: number = 5): Promise<Appointment[]> {
    return db.select()
      .from(appointments)
      .orderBy(appointments.date)
      .limit(limit);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(data)
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const result = await db
      .delete(appointments)
      .where(eq(appointments.id, id))
      .returning();
    return result.length > 0;
  }

  // Aktivite işlemleri
  async getRecentActivities(limit: number = 5): Promise<Activity[]> {
    return db.select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }
  
  // Ders Saatleri işlemleri
  async getClassHour(id: number): Promise<ClassHour | undefined> {
    const [classHour] = await db.select().from(classHours).where(eq(classHours.id, id));
    return classHour;
  }

  async getClassHours(dayOfWeek?: number): Promise<ClassHour[]> {
    if (dayOfWeek !== undefined) {
      return db.select()
        .from(classHours)
        .where(eq(classHours.dayOfWeek, dayOfWeek))
        .orderBy(classHours.startTime);
    }
    return db.select().from(classHours).orderBy(classHours.startTime);
  }

  async createClassHour(classHour: InsertClassHour): Promise<ClassHour> {
    const [newClassHour] = await db
      .insert(classHours)
      .values(classHour)
      .returning();
    return newClassHour;
  }

  async updateClassHour(id: number, data: Partial<InsertClassHour>): Promise<ClassHour | undefined> {
    const [updatedClassHour] = await db
      .update(classHours)
      .set(data)
      .where(eq(classHours.id, id))
      .returning();
    return updatedClassHour;
  }

  async deleteClassHour(id: number): Promise<boolean> {
    const result = await db
      .delete(classHours)
      .where(eq(classHours.id, id))
      .returning();
    return result.length > 0;
  }

  // Görüşme Konuları işlemleri
  async getCounselingTopics(): Promise<CounselingTopic[]> {
    return db.select()
      .from(counselingTopics)
      .orderBy(counselingTopics.topic);
  }

  async createCounselingTopic(topic: InsertCounselingTopic): Promise<CounselingTopic> {
    const [newTopic] = await db
      .insert(counselingTopics)
      .values(topic)
      .returning();
    return newTopic;
  }

  async createMultipleCounselingTopics(topics: string[]): Promise<CounselingTopic[]> {
    // Benzersiz konuları filtrele (tekrarları yok et)
    const uniqueTopics = Array.from(new Set(topics));
    
    // İşlenecek konular için dizi hazırla
    const topicsToInsert = uniqueTopics.map(topic => ({ 
      topic: topic.trim() 
    })).filter(t => t.topic.length > 0);
    
    // Boş dizi kontrolü
    if (topicsToInsert.length === 0) {
      return [];
    }
    
    // Toplu ekleme
    const newTopics = await db
      .insert(counselingTopics)
      .values(topicsToInsert)
      .returning();
    
    return newTopics;
  }

  async deleteCounselingTopic(id: number): Promise<boolean> {
    const result = await db
      .delete(counselingTopics)
      .where(eq(counselingTopics.id, id))
      .returning();
    return result.length > 0;
  }

  // Rehberlik Görüşme Kayıtları işlemleri
  async getCounselingSession(id: number): Promise<CounselingSession | undefined> {
    const [session] = await db.select().from(counselingSessions).where(eq(counselingSessions.id, id));
    return session;
  }
  
  async getCounselingSessions(): Promise<CounselingSession[]> {
    return db.select()
      .from(counselingSessions)
      .orderBy(desc(counselingSessions.sessionDate));
  }

  async getCounselingSessionsByStudent(studentId: number): Promise<CounselingSession[]> {
    return db.select()
      .from(counselingSessions)
      .where(eq(counselingSessions.studentId, studentId))
      .orderBy(desc(counselingSessions.sessionDate));
  }

  async getCounselingSessionsByDate(date: string): Promise<CounselingSession[]> {
    return db.select()
      .from(counselingSessions)
      .where(eq(counselingSessions.sessionDate, date))
      .orderBy(counselingSessions.entryTime);
  }

  async getRecentCounselingSessions(limit: number = 5): Promise<CounselingSession[]> {
    return db.select()
      .from(counselingSessions)
      .orderBy(desc(counselingSessions.sessionDate), desc(counselingSessions.entryTime))
      .limit(limit);
  }

  async createCounselingSession(session: InsertCounselingSession): Promise<CounselingSession> {
    const [newSession] = await db
      .insert(counselingSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateCounselingSession(id: number, data: Partial<CounselingSession>): Promise<CounselingSession | undefined> {
    const [updatedSession] = await db
      .update(counselingSessions)
      .set(data)
      .where(eq(counselingSessions.id, id))
      .returning();
    return updatedSession;
  }

  async completeCounselingSession(id: number, exitTime: string, exitClassHourId?: number): Promise<CounselingSession | undefined> {
    const updateData: Partial<CounselingSession> = {
      exitTime
    };

    if (exitClassHourId) {
      updateData.exitClassHourId = exitClassHourId;
    }

    const [updatedSession] = await db
      .update(counselingSessions)
      .set(updateData)
      .where(eq(counselingSessions.id, id))
      .returning();

    return updatedSession;
  }

  async deleteCounselingSession(id: number): Promise<boolean> {
    const result = await db
      .delete(counselingSessions)
      .where(eq(counselingSessions.id, id))
      .returning();
    return result.length > 0;
  }

  // İstatistik işlemleri
  async getStats(): Promise<{ 
    studentCount: number; 
    todayAppointments: number; 
    weeklyAppointments: number; 
    pendingRequests: number; 
  }> {
    try {
      // Öğrenci sayısı
      const studentsCount = await db.select().from(students).then(result => result.length);

      // Bugünkü randevular
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayStr = today.toISOString().split('T')[0];
      const todayAppointments = await db.select()
        .from(appointments)
        .where(eq(appointments.date, todayStr))
        .then(result => result.length);
      
      // Haftalık randevular
      const oneWeekLater = new Date(today);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      const oneWeekLaterStr = oneWeekLater.toISOString().split('T')[0];
      
      const weeklyAppointments = await db.select()
        .from(appointments)
        .where(
          and(
            eq(appointments.status, 'beklemede')
          )
        )
        .then(result => result.length);
      
      // Bekleyen randevu istekleri
      const pendingRequests = await db.select()
        .from(appointments)
        .where(
          eq(appointments.status, 'beklemede')
        )
        .then(result => result.length);
      
      return {
        studentCount: studentsCount,
        todayAppointments,
        weeklyAppointments,
        pendingRequests
      };
      
    } catch (error) {
      console.error(`İstatistikler alınırken hata: ${error}`);
      return {
        studentCount: 0,
        todayAppointments: 0,
        weeklyAppointments: 0,
        pendingRequests: 0
      };
    }
  }

  // Dersler işlemleri
  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCourses(): Promise<Course[]> {
    return db.select().from(courses).orderBy(courses.name);
  }

  async getCourseByName(name: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.name, name));
    return course;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db
      .insert(courses)
      .values(course)
      .returning();
    return newCourse;
  }

  async updateCourse(id: number, data: Partial<InsertCourse>): Promise<Course | undefined> {
    const [updatedCourse] = await db
      .update(courses)
      .set(data)
      .where(eq(courses.id, id))
      .returning();
    return updatedCourse;
  }

  async deleteCourse(id: number): Promise<boolean> {
    try {
      await db.delete(courses).where(eq(courses.id, id));
      return true;
    } catch (error) {
      console.error(`Ders silinirken hata: ${error}`);
      return false;
    }
  }

  // Ders Konuları işlemleri
  async getCourseSubject(id: number): Promise<CourseSubject | undefined> {
    const [subject] = await db.select().from(courseSubjects).where(eq(courseSubjects.id, id));
    return subject;
  }

  async getCourseSubjectsByCourse(courseId: number): Promise<CourseSubject[]> {
    return db.select()
      .from(courseSubjects)
      .where(eq(courseSubjects.courseId, courseId))
      .orderBy(courseSubjects.name);
  }

  async createCourseSubject(subject: InsertCourseSubject): Promise<CourseSubject> {
    const [newSubject] = await db
      .insert(courseSubjects)
      .values(subject)
      .returning();
    return newSubject;
  }

  async createMultipleCourseSubjects(courseId: number, subjects: { name: string, duration: number }[]): Promise<CourseSubject[]> {
    // İşlenecek konular için dizi hazırla
    const subjectsToInsert = subjects.map(subject => ({ 
      courseId,
      name: subject.name.trim(),
      duration: subject.duration
    })).filter(s => s.name.length > 0);
    
    // Boş dizi kontrolü
    if (subjectsToInsert.length === 0) {
      return [];
    }
    
    // Toplu ekleme
    const newSubjects = await db
      .insert(courseSubjects)
      .values(subjectsToInsert)
      .returning();
    
    return newSubjects;
  }

  async updateCourseSubject(id: number, data: Partial<InsertCourseSubject>): Promise<CourseSubject | undefined> {
    const [updatedSubject] = await db
      .update(courseSubjects)
      .set(data)
      .where(eq(courseSubjects.id, id))
      .returning();
    return updatedSubject;
  }

  async deleteCourseSubject(id: number): Promise<boolean> {
    try {
      await db.delete(courseSubjects).where(eq(courseSubjects.id, id));
      return true;
    } catch (error) {
      console.error(`Konu silinirken hata: ${error}`);
      return false;
    }
  }

  async importCourseSubjectsFromExcel(courseId: number, subjects: { name: string, duration: number }[]): Promise<CourseSubject[]> {
    return this.createMultipleCourseSubjects(courseId, subjects);
  }

  // Çalışma Planı işlemleri
  async getStudyPlan(id: number): Promise<StudyPlan | undefined> {
    try {
      const [plan] = await db.select().from(studyPlans).where(eq(studyPlans.id, id));
      return plan;
    } catch (error) {
      console.error(`Çalışma planı alınırken hata: ${error}`);
      return undefined;
    }
  }

  async getStudyPlansByStudent(studentId: number): Promise<StudyPlan[]> {
    try {
      return await db.select()
        .from(studyPlans)
        .where(eq(studyPlans.studentId, studentId))
        .orderBy(desc(studyPlans.date));
    } catch (error) {
      console.error(`Öğrencinin çalışma planları alınırken hata: ${error}`);
      return [];
    }
  }

  async getStudyPlansByDate(date: string): Promise<StudyPlan[]> {
    try {
      return await db.select()
        .from(studyPlans)
        .where(eq(studyPlans.date, date));
    } catch (error) {
      console.error(`Tarih için çalışma planları alınırken hata: ${error}`);
      return [];
    }
  }

  async getStudyPlansByCourse(studentId: number, courseId: number): Promise<StudyPlan[]> {
    try {
      return await db.select()
        .from(studyPlans)
        .where(
          and(
            eq(studyPlans.studentId, studentId),
            eq(studyPlans.courseId, courseId)
          )
        )
        .orderBy(desc(studyPlans.date));
    } catch (error) {
      console.error(`Öğrencinin belirli ders için çalışma planları alınırken hata: ${error}`);
      return [];
    }
  }

  async createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan> {
    try {
      const [newPlan] = await db
        .insert(studyPlans)
        .values(plan)
        .returning();
      
      return newPlan;
    } catch (error) {
      console.error(`Çalışma planı oluşturulurken hata: ${error}`);
      throw error;
    }
  }

  async updateStudyPlan(id: number, data: Partial<InsertStudyPlan>): Promise<StudyPlan | undefined> {
    try {
      const [updatedPlan] = await db
        .update(studyPlans)
        .set(data)
        .where(eq(studyPlans.id, id))
        .returning();
      
      return updatedPlan;
    } catch (error) {
      console.error(`Çalışma planı güncellenirken hata: ${error}`);
      return undefined;
    }
  }

  async deleteStudyPlan(id: number): Promise<boolean> {
    try {
      // Önce bu plana bağlı konu planlarını sil
      await db.delete(studyPlanSubjects)
        .where(eq(studyPlanSubjects.studyPlanId, id));
      
      // Sonra planın kendisini sil
      const result = await db.delete(studyPlans)
        .where(eq(studyPlans.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Çalışma planı silinirken hata: ${error}`);
      return false;
    }
  }

  // Konu İlerleme işlemleri
  async getSubjectProgress(id: number): Promise<SubjectProgress | undefined> {
    try {
      const [progress] = await db.select()
        .from(subjectProgress)
        .where(eq(subjectProgress.id, id));
      
      return progress;
    } catch (error) {
      console.error(`Konu ilerlemesi alınırken hata: ${error}`);
      return undefined;
    }
  }

  async getSubjectProgressByStudent(studentId: number): Promise<SubjectProgress[]> {
    try {
      return await db.select()
        .from(subjectProgress)
        .where(eq(subjectProgress.studentId, studentId));
    } catch (error) {
      console.error(`Öğrencinin konu ilerlemeleri alınırken hata: ${error}`);
      return [];
    }
  }

  async getSubjectProgressBySubject(studentId: number, subjectId: number): Promise<SubjectProgress | undefined> {
    try {
      const [progress] = await db.select()
        .from(subjectProgress)
        .where(
          and(
            eq(subjectProgress.studentId, studentId),
            eq(subjectProgress.subjectId, subjectId)
          )
        );
      
      return progress;
    } catch (error) {
      console.error(`Öğrencinin belirli konudaki ilerlemesi alınırken hata: ${error}`);
      return undefined;
    }
  }

  async createSubjectProgress(progress: InsertSubjectProgress): Promise<SubjectProgress> {
    try {
      const [newProgress] = await db
        .insert(subjectProgress)
        .values(progress)
        .returning();
      
      return newProgress;
    } catch (error) {
      console.error(`Konu ilerlemesi oluşturulurken hata: ${error}`);
      throw error;
    }
  }

  async updateSubjectProgress(id: number, data: Partial<InsertSubjectProgress>): Promise<SubjectProgress | undefined> {
    try {
      const [updatedProgress] = await db
        .update(subjectProgress)
        .set(data)
        .where(eq(subjectProgress.id, id))
        .returning();
      
      return updatedProgress;
    } catch (error) {
      console.error(`Konu ilerlemesi güncellenirken hata: ${error}`);
      return undefined;
    }
  }

  async completeSubjectProgress(id: number, completedMinutes: number): Promise<SubjectProgress | undefined> {
    try {
      // Önce mevcut ilerlemeyi al
      const [currentProgress] = await db.select()
        .from(subjectProgress)
        .where(eq(subjectProgress.id, id));
      
      if (!currentProgress) {
        throw new Error(`İlerleme kaydı bulunamadı (ID: ${id})`);
      }
      
      // Tamamlanan süreyi güncelle
      const newCompletedTime = currentProgress.completedTime + completedMinutes;
      const newRemainingTime = Math.max(0, currentProgress.totalTime - newCompletedTime);
      const isNowCompleted = newRemainingTime === 0 ? 1 : 0;
      
      // Güncelleme
      const [updatedProgress] = await db
        .update(subjectProgress)
        .set({
          completedTime: newCompletedTime,
          remainingTime: newRemainingTime,
          isCompleted: isNowCompleted,
          lastStudyDate: new Date().toISOString().split('T')[0]
        })
        .where(eq(subjectProgress.id, id))
        .returning();
      
      return updatedProgress;
    } catch (error) {
      console.error(`Konu ilerlemesi tamamlanırken hata: ${error}`);
      return undefined;
    }
  }

  async deleteSubjectProgress(id: number): Promise<boolean> {
    try {
      await db.delete(subjectProgress)
        .where(eq(subjectProgress.id, id));
      
      return true;
    } catch (error) {
      console.error(`Konu ilerlemesi silinirken hata: ${error}`);
      return false;
    }
  }

  async initializeSubjectProgressForStudent(studentId: number, courseId: number): Promise<SubjectProgress[]> {
    try {
      // Önce dersin konularını al
      const subjects = await this.getCourseSubjectsByCourse(courseId);
      
      if (subjects.length === 0) {
        console.log(`Kurs (${courseId}) için konu bulunamadı, ilerleme kaydı oluşturulamıyor.`);
        return [];
      }
      
      console.log(`${subjects.length} adet konu için ilerleme kaydı oluşturuluyor (kursID: ${courseId}, öğrenciID: ${studentId})`);
      
      // Önce mevcut kayıtları kontrol et
      const existingRecords = await db.select()
        .from(subjectProgress)
        .where(eq(subjectProgress.studentId, studentId));
      
      const existingSubjectIds = new Set(existingRecords.map(record => record.subjectId));
      
      // Sadece henüz kaydı olmayan konular için yeni kayıt ekle
      const newSubjects = subjects.filter(subject => !existingSubjectIds.has(subject.id));
      
      if (newSubjects.length === 0) {
        console.log(`Tüm konular için ilerleme kaydı zaten mevcut (kursID: ${courseId}, öğrenciID: ${studentId})`);
        return existingRecords;
      }
      
      const progressRecords: InsertSubjectProgress[] = newSubjects.map(subject => ({
        studentId: studentId,
        subjectId: subject.id,
        totalTime: subject.duration,
        completedTime: 0,
        remainingTime: subject.duration,
        isCompleted: 0,
        lastStudyDate: null
      }));
      
      const result = await db.insert(subjectProgress)
        .values(progressRecords)
        .returning();
      
      return [...existingRecords, ...result];
    } catch (error) {
      console.error(`Öğrenci için konu ilerlemeleri oluşturulurken hata: ${error}`);
      return [];
    }
  }

  // Konu Çalışma Planı işlemleri
  async getStudyPlanSubjects(studyPlanId: number): Promise<StudyPlanSubject[]> {
    try {
      return await db.select()
        .from(studyPlanSubjects)
        .where(eq(studyPlanSubjects.studyPlanId, studyPlanId));
    } catch (error) {
      console.error(`Çalışma planı konuları alınırken hata: ${error}`);
      return [];
    }
  }

  async createStudyPlanSubject(planSubject: InsertStudyPlanSubject): Promise<StudyPlanSubject> {
    try {
      const [newPlanSubject] = await db
        .insert(studyPlanSubjects)
        .values(planSubject)
        .returning();
      
      return newPlanSubject;
    } catch (error) {
      console.error(`Çalışma planı konusu oluşturulurken hata: ${error}`);
      throw error;
    }
  }

  async updateStudyPlanSubject(id: number, data: Partial<InsertStudyPlanSubject>): Promise<StudyPlanSubject | undefined> {
    try {
      const [updatedPlanSubject] = await db
        .update(studyPlanSubjects)
        .set(data)
        .where(eq(studyPlanSubjects.id, id))
        .returning();
      
      return updatedPlanSubject;
    } catch (error) {
      console.error(`Çalışma planı konusu güncellenirken hata: ${error}`);
      return undefined;
    }
  }

  async deleteStudyPlanSubject(id: number): Promise<boolean> {
    try {
      await db.delete(studyPlanSubjects)
        .where(eq(studyPlanSubjects.id, id));
      
      return true;
    } catch (error) {
      console.error(`Çalışma planı konusu silinirken hata: ${error}`);
      return false;
    }
  }

  async generateSubjectPlanForStudyPlan(studyPlanId: number): Promise<StudyPlanSubject[]> {
    try {
      // Önce çalışma planını al
      const studyPlan = await this.getStudyPlan(studyPlanId);
      if (!studyPlan) {
        throw new Error(`Çalışma planı bulunamadı (ID: ${studyPlanId})`);
      }
      
      // Öğrencinin konu ilerlemelerini al
      const studentProgress = await this.getSubjectProgressByStudent(studyPlan.studentId);
      if (studentProgress.length === 0) {
        throw new Error(`Öğrenci için konu ilerlemesi bulunamadı (öğrenciID: ${studyPlan.studentId})`);
      }
      
      // Dersin konularına ait ilerlemeleri filtrele
      const courseSubjects = await this.getCourseSubjectsByCourse(studyPlan.courseId);
      const courseSubjectIds = new Set(courseSubjects.map(s => s.id));
      
      const filteredProgress = studentProgress.filter(p => courseSubjectIds.has(p.subjectId));
      if (filteredProgress.length === 0) {
        throw new Error(`Seçilen ders için konular bulunamadı (dersID: ${studyPlan.courseId})`);
      }
      
      // Tamamlanmamış ve çalışılması gereken konuları bul
      // İlk öncelik: hiç çalışılmamış (isCompleted=0 ve completedTime=0) konular
      // İkinci öncelik: kısmen çalışılmış (isCompleted=0 ve completedTime>0) konular
      const notStartedSubjects = filteredProgress.filter(p => p.isCompleted === 0 && p.completedTime === 0);
      const partiallyCompletedSubjects = filteredProgress.filter(p => p.isCompleted === 0 && p.completedTime > 0);
      
      // Tamamlanmamış konular arasından bu çalışma planı için en uygun olanları belirle
      const subjectsToStudy = [...notStartedSubjects, ...partiallyCompletedSubjects]
        .sort((a, b) => {
          // Önce hiç çalışılmamışları getir
          if (a.completedTime === 0 && b.completedTime > 0) return -1;
          if (a.completedTime > 0 && b.completedTime === 0) return 1;
          
          // İkinci olarak kalan süreye göre sırala (azalan)
          return b.remainingTime - a.remainingTime;
        });
      
      if (subjectsToStudy.length === 0) {
        throw new Error(`Çalışılacak tamamlanmamış konu bulunamadı`);
      }
      
      // Çalışma planında belirtilen çalışma süresi miktarını konulara dağıt
      const totalStudyTime = studyPlan.durationMinutes;
      let remainingStudyTime = totalStudyTime;
      
      const subjectPlans: InsertStudyPlanSubject[] = [];

      for (const subject of subjectsToStudy) {
        if (remainingStudyTime <= 0) break;
        
        // Bu konu için ne kadar süre ayrılacak?
        // Kalan çalışma süresini ve konunun kalan süresinden küçük olanını al
        const timeForThisSubject = Math.min(remainingStudyTime, subject.remainingTime);
        
        if (timeForThisSubject > 0) {
          subjectPlans.push({
            studyPlanId: studyPlanId,
            subjectProgressId: subject.id,
            allocatedTime: timeForThisSubject
          });
          
          remainingStudyTime -= timeForThisSubject;
        }
      }
      
      // Eğer hala kullanılabilir süre kaldıysa ve konuların hepsi tamamlandıysa, 
      // önceden çalışılmış konular arasından tekrar çalışılacak konular seç
      if (remainingStudyTime > 0 && subjectPlans.length === 0) {
        // Tamamlanmış konuları al ve son çalışma tarihine göre sırala (en eski önce)
        const completedSubjects = filteredProgress
          .filter(p => p.isCompleted === 1)
          .sort((a, b) => {
            // Son çalışma tarihi olmayan konuları en başa al
            if (!a.lastStudyDate) return -1;
            if (!b.lastStudyDate) return 1;
            
            // Tarihleri karşılaştır, eskiden yeniye doğru sırala
            return new Date(a.lastStudyDate).getTime() - new Date(b.lastStudyDate).getTime();
          });
        
        for (const subject of completedSubjects) {
          if (remainingStudyTime <= 0) break;
          
          // Tekrar çalışma için her tamamlanmış konuya maksimum 30 dakika ayır
          const reviewTime = Math.min(remainingStudyTime, 30);
          
          subjectPlans.push({
            studyPlanId: studyPlanId,
            subjectProgressId: subject.id,
            allocatedTime: reviewTime
          });
          
          remainingStudyTime -= reviewTime;
        }
      }
      
      // Belirlenen konuları veritabanına kaydet
      if (subjectPlans.length === 0) {
        throw new Error(`Çalışma planı için konu oluşturulamadı`);
      }
      
      const result = await db.insert(studyPlanSubjects)
        .values(subjectPlans)
        .returning();
      
      return result;
    } catch (error) {
      console.error(`Çalışma planı için konular oluşturulurken hata: ${error}`);
      return [];
    }
  }

  // Okul Bilgileri işlemleri
  async getSchoolInfo(): Promise<SchoolInfo | undefined> {
    try {
      const [info] = await db.select()
        .from(schoolInfo)
        .limit(1);
      
      return info;
    } catch (error) {
      console.error(`Okul bilgileri getirilirken hata: ${error}`);
      return undefined;
    }
  }
  
  async updateSchoolInfo(data: InsertSchoolInfo): Promise<SchoolInfo> {
    try {
      // Önce mevcut kaydı kontrol et
      const existingInfo = await this.getSchoolInfo();
      
      if (existingInfo) {
        // Kayıt varsa güncelle
        const [updatedInfo] = await db.update(schoolInfo)
          .set({
            ...data,
            updatedAt: new Date().toISOString()
          })
          .where(eq(schoolInfo.id, existingInfo.id))
          .returning();
        
        return updatedInfo;
      } else {
        // Kayıt yoksa oluştur
        const [newInfo] = await db.insert(schoolInfo)
          .values({
            ...data,
            updatedAt: new Date().toISOString()
          })
          .returning();
        
        return newInfo;
      }
    } catch (error) {
      console.error(`Okul bilgileri güncellenirken hata: ${error}`);
      throw error;
    }
  }
  
  // ===== Bildirimler işlemleri =====
  
  async getNotifications(userId?: number, limit: number = 50, onlyUnread: boolean = false): Promise<Notification[]> {
    try {
      let query = db.select().from(notifications);
      
      // Kullanıcı ID filtresi (null=tüm kullanıcılar için)
      if (userId !== undefined) {
        query = query.where(eq(notifications.userId, userId)) as any;
      }
      
      // Sadece okunmamış bildirimler filtresi
      if (onlyUnread) {
        const conditions = userId !== undefined 
          ? and(eq(notifications.userId, userId), eq(notifications.isRead, 0))
          : eq(notifications.isRead, 0);
        query = query.where(conditions) as any;
      }
      
      // Sıralama ve limit
      const results = await query.orderBy(desc(notifications.createdAt)).limit(limit);
      
      return results;
    } catch (error) {
      console.error(`Bildirimler getirilirken hata: ${error}`);
      return [];
    }
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db.insert(notifications)
        .values({
          ...notification,
          createdAt: new Date().toISOString()
        })
        .returning();
      
      return newNotification;
    } catch (error) {
      console.error(`Bildirim oluşturulurken hata: ${error}`);
      throw error;
    }
  }
  
  async markNotificationAsRead(id: number, userId?: number): Promise<boolean> {
    try {
      let whereCondition = eq(notifications.id, id);
      
      // Kullanıcı ID kontrolü ekle
      if (userId !== undefined) {
        whereCondition = and(eq(notifications.id, id), eq(notifications.userId, userId)) as any;
      }
      
      const result = await db.update(notifications)
        .set({ isRead: 1 })
        .where(whereCondition);
      
      return result.changes > 0;
    } catch (error) {
      console.error(`Bildirim okundu olarak işaretlenirken hata: ${error}`);
      return false;
    }
  }
  
  async markAllNotificationsAsRead(userId?: number): Promise<boolean> {
    try {
      let whereCondition;
      
      if (userId !== undefined) {
        whereCondition = eq(notifications.userId, userId);
      } else {
        // Tüm bildirimleri okundu olarak işaretle
        whereCondition = eq(notifications.isRead, 0);
      }
      
      const result = await db.update(notifications)
        .set({ isRead: 1 })
        .where(whereCondition);
      
      return result.changes > 0;
    } catch (error) {
      console.error(`Tüm bildirimler okundu olarak işaretlenirken hata: ${error}`);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();