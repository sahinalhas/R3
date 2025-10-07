/**
 * Formatter Functions
 * Veri formatlama yardımcı fonksiyonları
 */

import { format } from 'date-fns';
import { DATE_FORMATS } from '@/config/constants';

/**
 * ISO tarih formatı
 */
export function formatISODate(date: Date): string {
  return format(date, DATE_FORMATS.ISO);
}

/**
 * Tam isim formatı
 */
export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

/**
 * Telefon numarası formatı
 */
export function formatPhoneNumber(phone: string): string {
  // Türk telefon numarası formatı: 0(5XX) XXX XX XX
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 1)}(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }
  
  return phone;
}

/**
 * TC Kimlik No formatı
 */
export function formatTCKimlikNo(tcNo: string): string {
  const cleaned = tcNo.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  return tcNo;
}

/**
 * Sayıyı formatlar
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Yüzde formatı
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  const percent = (value / total) * 100;
  return `${formatNumber(percent, 1)}%`;
}

/**
 * Rol adını Türkçe formatlar
 */
export function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    'admin': 'Sistem Yöneticisi',
    'okul_yönetimi': 'Okul Yönetimi',
    'pdr_yönetim': 'PDR Yönetimi',
    'rehber': 'Rehber Öğretmen',
    'pdr': 'PDR Uzmanı',
    'sınıf_öğretmeni': 'Sınıf Öğretmeni',
  };
  
  return roleMap[role] || role;
}

/**
 * Gizlilik seviyesini formatlar
 */
export function formatConfidentiality(level: string): string {
  const levelMap: Record<string, string> = {
    'düşük': 'Düşük',
    'normal': 'Normal',
    'yüksek': 'Yüksek',
    'çok_gizli': 'Çok Gizli',
  };
  
  return levelMap[level] || level;
}

/**
 * Dosya boyutunu formatlar
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
