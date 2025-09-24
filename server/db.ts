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

// SQLite optimizasyonları
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// BRYS - Bütünleşik Rehberlik Yönetim Sistemi
// Artık tüm tablo yapısı Drizzle schema tarafından yönetiliyor
// Manuel CREATE TABLE ifadeleri kaldırıldı - Drizzle ORM kullanılıyor

export const db = drizzle(sqlite, { schema });
