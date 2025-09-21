import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(time: string): string {
  return time;
}

export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.split(' ');
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'onaylandı':
      return 'status-onaylandı';
    case 'tamamlandı':
      return 'status-tamamlandı';
    case 'beklemede':
      return 'status-beklemede';
    case 'iptal':
      return 'status-iptal';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function getStatusText(status: string): string {
  switch (status.toLowerCase()) {
    case 'onaylandı':
      return 'Onaylandı';
    case 'beklemede':
      return 'Beklemede';
    case 'tamamlandı':
      return 'Tamamlandı';
    case 'iptal':
      return 'İptal Edildi';
    default:
      return status;
  }
}

export function getClassOptions() {
  return [
    { value: '9A', label: '9-A' },
    { value: '9B', label: '9-B' },
    { value: '9C', label: '9-C' },
    { value: '9D', label: '9-D' },
    { value: '10A', label: '10-A' },
    { value: '10B', label: '10-B' },
    { value: '10C', label: '10-C' },
    { value: '10D', label: '10-D' },
    { value: '11A', label: '11-A' },
    { value: '11B', label: '11-B' },
    { value: '11C', label: '11-C' },
    { value: '11D', label: '11-D' },
    { value: '12A', label: '12-A' },
    { value: '12B', label: '12-B' },
    { value: '12C', label: '12-C' },
    { value: '12D', label: '12-D' },
  ];
}

export function getStatusOptions() {
  return [
    { value: 'beklemede', label: 'Beklemede' },
    { value: 'onaylandı', label: 'Onaylandı' },
    { value: 'tamamlandı', label: 'Tamamlandı' },
    { value: 'iptal', label: 'İptal Edildi' },
  ];
}

export function getTimeSlots() {
  return [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];
}

// Ay isimlerini Türkçe almak için yardımcı fonksiyon
export function getTurkishMonth(monthIndex: number): string {
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  return months[monthIndex];
}

// Gün isimlerini Türkçe almak için yardımcı fonksiyon
export function getTurkishDay(dayIndex: number): string {
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return days[dayIndex];
}

// Tam tarih ve saat formatı
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return `${d.getDate()} ${getTurkishMonth(d.getMonth())} ${d.getFullYear()}, ${getTurkishDay(d.getDay())} ${formatTimeFromDate(d)}`;
}

// Bir Date nesnesinden saat formatı
export function formatTimeFromDate(date: Date): string {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// İki tarih arasında gün farkını hesapla
export function dayDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Yaş hesaplama
export function calculateAge(birthDate: Date | string): number {
  const today = new Date();
  const birthDateObj = new Date(birthDate);
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const m = today.getMonth() - birthDateObj.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  return age;
}
