import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Veri klasörünün varlığını kontrol edelim
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// SQLite veritabanı dosya yolu
const DATABASE_PATH = join(dataDir, 'rehberlik.db');

// SQLite bağlantısı
const sqlite = new Database(DATABASE_PATH);

// Kullanıcılar tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'rehber'
  );
`);

// Öğrenciler tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    student_number TEXT NOT NULL UNIQUE,
    class TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    gender TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Randevular tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    counselor_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'beklemede',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Aktiviteler tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Çalışma Planı tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS study_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Konu İlerleme tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS subject_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    total_time INTEGER NOT NULL,
    completed_time INTEGER NOT NULL DEFAULT 0,
    remaining_time INTEGER NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    last_study_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Çalışma Planı Konuları tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS study_plan_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_plan_id INTEGER NOT NULL,
    subject_progress_id INTEGER NOT NULL,
    allocated_time INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Okul Bilgileri tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS school_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_name TEXT NOT NULL,
    province TEXT NOT NULL,
    district TEXT NOT NULL,
    logo_url TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ders saatleri tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS class_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    day_of_week INTEGER,
    description TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  );
`);

// Rehberlik Görüşme Kayıtları tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS counseling_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    counselor_id INTEGER NOT NULL,
    session_date TEXT NOT NULL,
    entry_time TEXT NOT NULL,
    entry_class_hour_id INTEGER,
    exit_time TEXT,
    exit_class_hour_id INTEGER,
    topic TEXT NOT NULL,
    other_participants TEXT,
    participant_type TEXT NOT NULL DEFAULT 'öğrenci',
    institutional_cooperation TEXT,
    session_details TEXT,
    relationship_type TEXT,
    session_location TEXT NOT NULL DEFAULT 'Rehberlik Servisi',
    discipline_status TEXT,
    session_type TEXT NOT NULL DEFAULT 'yüz_yüze',
    detailed_notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Görüşme Konuları tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS counseling_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Dersler tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Ders konuları tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS course_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id)
  );
`);

// Bildirimler tablosunu oluştur (eğer yoksa)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'error')),
    is_read INTEGER NOT NULL DEFAULT 0,
    related_id INTEGER,
    related_type TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Bildirimler tablosu için index'ler oluştur (performans için)
sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, is_read, created_at DESC);
`);

sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON notifications(created_at DESC);
`);

export const db = drizzle(sqlite, { schema });
