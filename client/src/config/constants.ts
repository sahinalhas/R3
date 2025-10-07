/**
 * Frontend Uygulama Sabitleri
 * Bu dosya, frontend uygulamasının tüm sabit değerlerini içerir
 */

// Sidebar Ayarları
export const SIDEBAR = {
  COOKIE_NAME: 'sidebar_state',
  COOKIE_MAX_AGE: 60 * 60 * 24 * 7, // 7 gün
  WIDTH: '16rem',
  WIDTH_MOBILE: '18rem',
  WIDTH_ICON: '3rem',
  KEYBOARD_SHORTCUT: 'b',
  DEFAULT_OPEN: true,
} as const;

// Responsive Breakpoints
export const BREAKPOINTS = {
  XS: 400,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
  MOBILE: 768,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  USER: '/api/user',
  CHANGE_PASSWORD: '/api/user/change-password',
  DEV_LOGIN: '/api/dev-login',
  
  // Students
  STUDENTS: '/api/students',
  STUDENT_DETAIL: (id: number | string) => `/api/students/${id}`,
  STUDENT_IMPORT: '/api/students/import',
  
  // Appointments
  APPOINTMENTS: '/api/appointments',
  APPOINTMENT_DETAIL: (id: number | string) => `/api/appointments/${id}`,
  
  // Class Hours
  CLASS_HOURS: '/api/class-hours',
  CLASS_HOUR_DETAIL: (id: number | string) => `/api/class-hours/${id}`,
  
  // Study Plans
  STUDY_PLANS: '/api/study-plans',
  STUDY_PLAN_DETAIL: (id: number | string) => `/api/study-plans/${id}`,
  
  // Reports
  REPORTS: '/api/reports',
  REPORT_STATS: '/api/reports/stats',
  
  // Settings
  SCHOOL_INFO: '/api/school-info',
  COURSE_SUBJECTS: '/api/course-subjects',
} as const;

// Kullanıcı Rolleri (Backend ile senkron)
export const USER_ROLES = {
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'okul_yönetimi',
  PDR_ADMIN: 'pdr_yönetim',
  COUNSELOR: 'rehber',
  PDR: 'pdr',
  TEACHER: 'sınıf_öğretmeni',
} as const;

// Rol Görüntüleme İsimleri
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  [USER_ROLES.ADMIN]: 'Sistem Yöneticisi',
  [USER_ROLES.SCHOOL_ADMIN]: 'Okul Yönetimi',
  [USER_ROLES.PDR_ADMIN]: 'PDR Yönetimi',
  [USER_ROLES.COUNSELOR]: 'Rehber Öğretmen',
  [USER_ROLES.PDR]: 'PDR Uzmanı',
  [USER_ROLES.TEACHER]: 'Sınıf Öğretmeni',
} as const;

// Gizlilik Seviyeleri
export const CONFIDENTIALITY_LEVELS = {
  LOW: 'düşük',
  NORMAL: 'normal',
  HIGH: 'yüksek',
  TOP_SECRET: 'çok_gizli',
} as const;

// Gizlilik Seviyesi Görüntüleme İsimleri
export const CONFIDENTIALITY_DISPLAY_NAMES: Record<string, string> = {
  [CONFIDENTIALITY_LEVELS.LOW]: 'Düşük',
  [CONFIDENTIALITY_LEVELS.NORMAL]: 'Normal',
  [CONFIDENTIALITY_LEVELS.HIGH]: 'Yüksek',
  [CONFIDENTIALITY_LEVELS.TOP_SECRET]: 'Çok Gizli',
} as const;

// Görünürlük Rolleri
export const VISIBILITY_ROLES = {
  PDR: 'pdr',
  PDR_ADMIN: 'pdr_yönetim',
  SCHOOL_ADMIN: 'okul_yönetimi',
  TEACHER: 'sınıf_öğretmeni',
} as const;

// Tema Ayarları
export const THEME = {
  DEFAULT: 'light',
  STORAGE_KEY: 'theme',
} as const;

// Form Ayarları
export const FORM = {
  PASSWORD_MIN_LENGTH: 6,
  DEBOUNCE_DELAY: 300,
} as const;

// Tablo Ayarları
export const TABLE = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Tarih Formatları
export const DATE_FORMATS = {
  DISPLAY: 'dd.MM.yyyy',
  DISPLAY_WITH_TIME: 'dd.MM.yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  TIME: 'HH:mm',
} as const;

// Toast Ayarları
export const TOAST = {
  DURATION: 3000,
  SUCCESS_DURATION: 2000,
  ERROR_DURATION: 5000,
} as const;

// Animasyon Süreleri
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Dosya Yükleme Ayarları
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_EXCEL_TYPES: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// Chart Renkleri
export const CHART_COLORS = {
  PRIMARY: 'hsl(var(--chart-1))',
  SECONDARY: 'hsl(var(--chart-2))',
  TERTIARY: 'hsl(var(--chart-3))',
  QUATERNARY: 'hsl(var(--chart-4))',
  QUINARY: 'hsl(var(--chart-5))',
} as const;
