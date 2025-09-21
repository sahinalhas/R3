import betterSqlite3 from 'better-sqlite3';
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
const db = betterSqlite3(DATABASE_PATH);

console.log('Veritabanı tabloları oluşturuluyor...');

// Kullanıcılar tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'rehber'
  )
`);

// Öğrenciler tablosu
db.exec(`
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
  )
`);

// Randevular tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    counselor_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'bekliyor',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Aktiviteler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Dersler tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ders konuları tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS course_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ders Saatleri tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS class_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    day_of_week INTEGER,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Görüşme Konuları tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS counseling_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Rehberlik Görüşme Kayıtları tablosu
db.exec(`
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
  )
`);

// Çalışma Planı tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS study_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Konu İlerleme tablosu
db.exec(`
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
  )
`);

// Konu Çalışma Planı tablosu
db.exec(`
  CREATE TABLE IF NOT EXISTS study_plan_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_plan_id INTEGER NOT NULL,
    subject_progress_id INTEGER NOT NULL,
    allocated_time INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('Veritabanı tabloları başarıyla oluşturuldu!');