/**
 * Validation Helper Functions
 * Doğrulama yardımcı fonksiyonları
 */

import { FORM, FILE_UPLOAD } from '@/config/constants';

/**
 * TC Kimlik No doğrulama
 */
export function validateTCKimlikNo(tcNo: string): boolean {
  if (!tcNo || tcNo.length !== 11) return false;
  
  const digits = tcNo.split('').map(Number);
  
  // İlk hane 0 olamaz
  if (digits[0] === 0) return false;
  
  // 10. hane kontrolü
  const sum1 = (digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7;
  const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = (sum1 - sum2) % 10;
  
  if (digits[9] !== digit10) return false;
  
  // 11. hane kontrolü
  const sum3 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const digit11 = sum3 % 10;
  
  return digits[10] === digit11;
}

/**
 * Email doğrulama
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Telefon numarası doğrulama (Türk format)
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  
  // 11 haneli olmalı ve 0 ile başlamalı
  if (cleaned.length !== 11 || !cleaned.startsWith('0')) return false;
  
  // İkinci hane 5 olmalı (cep telefonu)
  return cleaned[1] === '5';
}

/**
 * Şifre doğrulama
 */
export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (password.length < FORM.PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      message: `Şifre en az ${FORM.PASSWORD_MIN_LENGTH} karakter olmalıdır`,
    };
  }
  
  return { isValid: true };
}

/**
 * Dosya tipi doğrulama
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Dosya boyutu doğrulama
 */
export function validateFileSize(file: File, maxSize: number = FILE_UPLOAD.MAX_SIZE): boolean {
  return file.size <= maxSize;
}

/**
 * Görsel dosya doğrulama
 */
export function validateImageFile(file: File): {
  isValid: boolean;
  message?: string;
} {
  if (!validateFileType(file, [...FILE_UPLOAD.ALLOWED_IMAGE_TYPES])) {
    return {
      isValid: false,
      message: 'Geçersiz dosya tipi. Sadece JPEG, PNG, GIF veya WebP formatları desteklenir.',
    };
  }
  
  if (!validateFileSize(file)) {
    return {
      isValid: false,
      message: `Dosya boyutu maksimum ${FILE_UPLOAD.MAX_SIZE / (1024 * 1024)} MB olmalıdır.`,
    };
  }
  
  return { isValid: true };
}

/**
 * Excel dosya doğrulama
 */
export function validateExcelFile(file: File): {
  isValid: boolean;
  message?: string;
} {
  if (!validateFileType(file, [...FILE_UPLOAD.ALLOWED_EXCEL_TYPES])) {
    return {
      isValid: false,
      message: 'Geçersiz dosya tipi. Sadece Excel (.xls, .xlsx) formatları desteklenir.',
    };
  }
  
  if (!validateFileSize(file)) {
    return {
      isValid: false,
      message: `Dosya boyutu maksimum ${FILE_UPLOAD.MAX_SIZE / (1024 * 1024)} MB olmalıdır.`,
    };
  }
  
  return { isValid: true };
}
