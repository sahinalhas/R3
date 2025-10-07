/**
 * API Helper Functions
 * API çağrıları için yardımcı fonksiyonlar
 */

import { API_ENDPOINTS } from '@/config/constants';

/**
 * API endpoint'lerini döndürür
 */
export const api = {
  // Auth
  auth: {
    register: () => API_ENDPOINTS.REGISTER,
    login: () => API_ENDPOINTS.LOGIN,
    logout: () => API_ENDPOINTS.LOGOUT,
    user: () => API_ENDPOINTS.USER,
    changePassword: () => API_ENDPOINTS.CHANGE_PASSWORD,
    devLogin: () => API_ENDPOINTS.DEV_LOGIN,
  },
  
  // Students
  students: {
    list: () => API_ENDPOINTS.STUDENTS,
    detail: (id: number | string) => API_ENDPOINTS.STUDENT_DETAIL(id),
    import: () => API_ENDPOINTS.STUDENT_IMPORT,
  },
  
  // Appointments
  appointments: {
    list: () => API_ENDPOINTS.APPOINTMENTS,
    detail: (id: number | string) => API_ENDPOINTS.APPOINTMENT_DETAIL(id),
  },
  
  // Class Hours
  classHours: {
    list: () => API_ENDPOINTS.CLASS_HOURS,
    detail: (id: number | string) => API_ENDPOINTS.CLASS_HOUR_DETAIL(id),
  },
  
  // Study Plans
  studyPlans: {
    list: () => API_ENDPOINTS.STUDY_PLANS,
    detail: (id: number | string) => API_ENDPOINTS.STUDY_PLAN_DETAIL(id),
  },
  
  // Reports
  reports: {
    list: () => API_ENDPOINTS.REPORTS,
    stats: () => API_ENDPOINTS.REPORT_STATS,
  },
  
  // Settings
  settings: {
    schoolInfo: () => API_ENDPOINTS.SCHOOL_INFO,
    courseSubjects: () => API_ENDPOINTS.COURSE_SUBJECTS,
  },
} as const;

/**
 * Query key oluşturucuları
 */
export const queryKeys = {
  // Auth
  user: ['user'] as const,
  
  // Students
  students: {
    all: ['students'] as const,
    list: (query?: string) => ['students', { query }] as const,
    detail: (id: number | string) => ['students', id] as const,
  },
  
  // Appointments
  appointments: {
    all: ['appointments'] as const,
    list: (filters?: any) => ['appointments', filters] as const,
    detail: (id: number | string) => ['appointments', id] as const,
    byStudent: (studentId: number | string) => ['appointments', 'student', studentId] as const,
  },
  
  // Class Hours
  classHours: {
    all: ['class-hours'] as const,
    detail: (id: number | string) => ['class-hours', id] as const,
  },
  
  // Study Plans
  studyPlans: {
    all: ['study-plans'] as const,
    detail: (id: number | string) => ['study-plans', id] as const,
    byStudent: (studentId: number | string) => ['study-plans', 'student', studentId] as const,
  },
  
  // Activities
  activities: {
    recent: (limit?: number) => ['activities', { limit }] as const,
  },
  
  // Stats
  stats: ['stats'] as const,
  
  // School Info
  schoolInfo: ['school-info'] as const,
} as const;
