/**
 * Veritabanı Yapılandırması
 * Bu dosya, veritabanı bağlantı ve ayarlarını yönetir
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@shared/schema';
import { DATABASE } from './constants';

/**
 * Veritabanı yapılandırma arayüzü
 */
interface DatabaseConfig {
  dataDir: string;
  dbPath: string;
  journalMode: string;
  foreignKeys: string;
}

/**
 * Veritabanı yapılandırmasını oluşturur
 */
function createDatabaseConfig(): DatabaseConfig {
  const dataDir = join(process.cwd(), DATABASE.DATA_DIR);
  
  return {
    dataDir,
    dbPath: join(dataDir, DATABASE.DB_NAME),
    journalMode: DATABASE.JOURNAL_MODE,
    foreignKeys: DATABASE.FOREIGN_KEYS,
  };
}

/**
 * Veri dizinini oluşturur (yoksa)
 */
function ensureDataDirectory(dataDir: string): void {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * SQLite bağlantısını yapılandırır
 */
function configureSqlite(sqlite: Database.Database, config: DatabaseConfig): void {
  sqlite.pragma(`journal_mode = ${config.journalMode}`);
  sqlite.pragma(`foreign_keys = ${config.foreignKeys}`);
}

/**
 * Veritabanı bağlantısını başlatır
 */
export function initializeDatabase() {
  const config = createDatabaseConfig();
  
  // Veri dizinini oluştur
  ensureDataDirectory(config.dataDir);
  
  // SQLite bağlantısı
  const sqlite = new Database(config.dbPath);
  
  // SQLite optimizasyonları
  configureSqlite(sqlite, config);
  
  // Drizzle ORM ile veritabanı
  return drizzle(sqlite, { schema });
}

/**
 * Veritabanı yapılandırmasını dışa aktar
 */
export const dbConfig = createDatabaseConfig();

/**
 * Veritabanı bağlantısı
 */
export const db = initializeDatabase();
