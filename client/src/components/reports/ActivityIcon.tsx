import {
  UserPlus,
  Calendar,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";

/**
 * Aktivite tipine göre uygun ikon komponenti döndürür
 */
export function getActivityIcon(type: string) {
  switch (type) {
    case "öğrenci_ekleme":
      return (
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white">
          <UserPlus className="h-4 w-4" />
        </div>
      );
    case "randevu_oluşturma":
      return (
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center text-white">
          <Calendar className="h-4 w-4" />
        </div>
      );
    case "randevu_güncelleme":
    case "öğrenci_güncelleme":
      if (type.includes("tamamlandı")) {
        return (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center text-white">
            <CheckCircle className="h-4 w-4" />
          </div>
        );
      }
      return (
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center text-white">
          <Clock className="h-4 w-4" />
        </div>
      );
    case "randevu_silme":
    case "öğrenci_silme":
      return (
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-red-400 flex items-center justify-center text-white">
          <XCircle className="h-4 w-4" />
        </div>
      );
    default:
      return (
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-400 flex items-center justify-center text-white">
          <Clock className="h-4 w-4" />
        </div>
      );
  }
}

/**
 * Tarih formatını düzenleyen yardımcı fonksiyon
 */
export function formatActivityTime(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Renk paletleri
export const COLORS = ['#845ef7', '#ff4081', '#22c55e', '#ff9800', '#f43f5e'];
export const STATUS_COLORS = {
  beklemede: '#ff9800',
  onaylandı: '#845ef7',
  tamamlandı: '#22c55e',
  iptal: '#f43f5e',
};

// Türkçe ay isimleri
export const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];