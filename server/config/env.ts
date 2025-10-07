/**
 * Ortam Değişkenleri Yönetimi
 * Bu dosya, tüm ortam değişkenlerini merkezi bir noktadan yönetir
 */

interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test';
  sessionSecret: string;
  allowDevLogin: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Ortam değişkenlerini yükler ve doğrular
 */
function loadEnvConfig(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as EnvConfig['nodeEnv'];
  
  return {
    nodeEnv,
    sessionSecret: process.env.SESSION_SECRET || 'rehberlik-servisi-gizli-anahtar',
    allowDevLogin: process.env.ALLOW_DEV_LOGIN === 'true',
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
  };
}

/**
 * Uygulama genelinde kullanılacak ortam yapılandırması
 */
export const env = loadEnvConfig();

/**
 * Ortam değişkenini kontrol eder
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  
  if (!value && !defaultValue) {
    throw new Error(`Ortam değişkeni bulunamadı: ${key}`);
  }
  
  return value || defaultValue || '';
}

/**
 * Dev login izni var mı kontrol eder
 */
export function isDevLoginAllowed(appEnv?: string): boolean {
  return appEnv === 'development' || env.allowDevLogin;
}
