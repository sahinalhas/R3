// Create and run database migrations
import Database from 'better-sqlite3';
const db = new Database('./data/rehberlik.db');

// Create courses table
db.exec(`
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Create course_subjects table
db.exec(`
CREATE TABLE IF NOT EXISTS course_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses (id)
);
`);

console.log('Database tables created successfully');
db.close();