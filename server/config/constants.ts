/**
 * Uygulama Sabitleri
 * Bu dosya, uygulamanın tüm sabit değerlerini içerir
 */

// Sunucu Ayarları
export const SERVER = {
  PORT: 5000,
  HOST: '0.0.0.0',
  REUSE_PORT: true,
} as const;

// Session Ayarları
export const SESSION = {
  MAX_AGE: 1000 * 60 * 60 * 24, // 1 gün
  TRUST_PROXY: 1,
  RESAVE: false,
  SAVE_UNINITIALIZED: false,
} as const;

// Şifre Ayarları
export const PASSWORD = {
  SALT_LENGTH: 16,
  HASH_LENGTH: 64,
  MIN_LENGTH: 6,
} as const;

// Veritabanı Ayarları
export const DATABASE = {
  DATA_DIR: 'data',
  DB_NAME: 'rehberlik.db',
  JOURNAL_MODE: 'WAL',
  FOREIGN_KEYS: 'ON',
} as const;

// API Yolları
export const API_ROUTES = {
  AUTH: {
    REGISTER: ['/api/register', '/api/auth/register'] as string[],
    LOGIN: ['/api/login', '/api/auth/login'] as string[],
    LOGOUT: ['/api/logout', '/api/auth/logout'] as string[],
    USER: '/api/user',
    CHANGE_PASSWORD: '/api/user/change-password',
    DEV_LOGIN: '/api/dev-login',
  },
};

// Kullanıcı Rolleri
export const USER_ROLES = {
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'okul_yönetimi',
  PDR_ADMIN: 'pdr_yönetim',
  COUNSELOR: 'rehber',
  PDR: 'pdr',
  TEACHER: 'sınıf_öğretmeni',
} as const;

// Gizlilik Seviyeleri
export const CONFIDENTIALITY_LEVELS = {
  LOW: 'düşük',
  NORMAL: 'normal',
  HIGH: 'yüksek',
  TOP_SECRET: 'çok_gizli',
} as const;

// Görünürlük Rolleri
export const VISIBILITY_ROLES = {
  PDR: 'pdr',
  PDR_ADMIN: 'pdr_yönetim',
  SCHOOL_ADMIN: 'okul_yönetimi',
  TEACHER: 'sınıf_öğretmeni',
} as const;

// Varsayılan Geliştirici Kullanıcısı
export const DEV_USER = {
  USERNAME: 'dev',
  PASSWORD: 'dev',
  FULL_NAME: 'Geliştirici Kullanıcı',
  ROLE: USER_ROLES.ADMIN,
} as const;

// Yönetici Rolleri Listesi
export const ADMIN_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SCHOOL_ADMIN,
] as const;

// HTTP Durum Kodları
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Hata Mesajları
export const ERROR_MESSAGES = {
  AUTH: {
    REQUIRED: 'Bu işlem için giriş yapmalısınız',
    INVALID_CREDENTIALS: 'Kullanıcı adı veya şifre hatalı',
    USERNAME_TAKEN: 'Bu kullanıcı adı zaten alınmış',
    INSUFFICIENT_PERMISSIONS: 'Bu işlem için yeterli yetkiniz bulunmamaktadır',
    ADMIN_ONLY: 'Bu işlem sadece yöneticiler tarafından yapılabilir',
    INVALID_CURRENT_PASSWORD: 'Mevcut şifre hatalı',
    PASSWORD_TOO_SHORT: 'Yeni şifre en az 6 karakter olmalıdır',
  },
  USER: {
    NOT_FOUND: 'Kullanıcı bulunamadı',
    UPDATE_FAILED: 'Kullanıcı bilgileri güncellenirken hata oluştu',
    ROLE_CHANGE_FORBIDDEN: 'Role değiştirme yetkisi sadece yöneticilere aittir',
  },
  DEV: {
    DEV_LOGIN_FORBIDDEN: 'Dev login sadece geliştirme ortamında kullanılabilir',
  },
} as const;

// Başarı Mesajları
export const SUCCESS_MESSAGES = {
  PASSWORD_CHANGED: 'Şifreniz başarıyla değiştirildi',
} as const;

// Log Ayarları
export const LOG = {
  MAX_LINE_LENGTH: 80,
  TRUNCATE_SUFFIX: '…',
} as const;
