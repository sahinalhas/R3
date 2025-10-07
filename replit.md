# BRYS - Bütünleşik Rehberlik Yönetim Sistemi

## Genel Bakış
BRYS (Bütünleşik Rehberlik Yönetim Sistemi), okul rehberlik hizmetleri için geliştirilmiş kapsamlı bir yönetim uygulamasıdır.

## Son Değişiklikler (07 Ekim 2025)

### Modülerleştirme ve Yapısal İyileştirmeler

#### Backend Modülerleştirme

1. **Config Klasörü Oluşturuldu** (`server/config/`)
   - `constants.ts`: Tüm uygulama sabitleri merkezi hale getirildi
   - `env.ts`: Ortam değişkenleri yönetimi
   - `database.ts`: Veritabanı yapılandırması ve bağlantısı

2. **Services Katmanı Geliştirildi** (`server/services/`)
   - `auth.service.ts`: Kimlik doğrulama iş mantığı
   - `students.service.ts`: Öğrenci yönetimi iş mantığı
   - `appointments.service.ts`: Randevu yönetimi iş mantığı
   - `index.ts`: Tüm servisleri dışa aktaran indeks dosyası

3. **Modüler Route Yapısı** (`server/routes/`)
   - `appointments.routes.ts`: Randevu endpoint'leri
   - `activities.routes.ts`: Aktivite ve istatistik endpoint'leri
   - `school-info.routes.ts`: Okul bilgileri endpoint'leri
   - `students.routes.ts`: Öğrenci endpoint'leri (mevcut)
   - `index.ts`: Tüm route'ları kayıt eden merkezi dosya

4. **Auth Modülü Güncellendi** (`server/auth.ts`)
   - Config dosyalarından sabitler kullanılıyor
   - Auth service ile entegre edildi
   - Middleware'ler iyileştirildi

#### Frontend Modülerleştirme

1. **Config Klasörü Oluşturuldu** (`client/src/config/`)
   - `constants.ts`: Frontend sabitleri (API endpoints, roller, ayarlar vb.)
   - `index.ts`: Config modüllerini dışa aktaran indeks dosyası

2. **Lib/Utilities Geliştirildi** (`client/src/lib/`)
   - `api.ts`: API endpoint'leri ve query key'leri
   - `formatters.ts`: Veri formatlama fonksiyonları (tarih, telefon, TC kimlik vb.)
   - `validators.ts`: Doğrulama fonksiyonları (TC kimlik, email, telefon, dosya vb.)
   - `index.ts`: Tüm utility'leri dışa aktaran indeks dosyası

3. **Mevcut Dosyalar Güncellendi**
   - `use-mobile.tsx`: Config'den breakpoint sabiti kullanıyor
   - `sidebar.tsx`: Config'den sidebar sabitleri kullanıyor

### Mimari İyileştirmeler

#### Katmanlı Mimari
- **Controller (Routes)**: İnce route handler'lar, sadece request/response işlemleri
- **Service**: İş mantığı ve orchestration
- **Repository**: Veritabanı erişimi (mevcut)
- **Config**: Merkezi yapılandırma ve sabitler

#### Avantajlar
- **Bakım Kolaylığı**: Kod düzenli ve modüler
- **Tekrar Kullanılabilirlik**: Servisler ve utility'ler yeniden kullanılabilir
- **Test Edilebilirlik**: Katmanlar bağımsız test edilebilir
- **Okunabilirlik**: Kod daha anlaşılır ve organize
- **Ölçeklenebilirlik**: Yeni özellikler kolayca eklenebilir

## Proje Yapısı

### Backend (`server/`)
```
server/
├── config/           # Yapılandırma dosyaları
│   ├── constants.ts  # Uygulama sabitleri
│   ├── env.ts       # Ortam değişkenleri
│   └── database.ts  # Veritabanı config
├── services/        # İş mantığı katmanı
│   ├── auth.service.ts
│   ├── students.service.ts
│   ├── appointments.service.ts
│   └── index.ts
├── routes/          # API endpoint'leri
│   ├── appointments.routes.ts
│   ├── activities.routes.ts
│   ├── school-info.routes.ts
│   ├── students.routes.ts
│   ├── legacy.routes.ts
│   └── index.ts
├── repos/           # Veritabanı erişimi
├── middleware/      # Middleware'ler
├── auth.ts         # Auth setup & middleware
├── db.ts           # DB export
└── index.ts        # Ana giriş noktası
```

### Frontend (`client/src/`)
```
client/src/
├── config/          # Frontend yapılandırma
│   ├── constants.ts # Sabitler ve endpoint'ler
│   └── index.ts
├── lib/            # Utility fonksiyonlar
│   ├── api.ts      # API helpers & query keys
│   ├── formatters.ts # Veri formatlayanlar
│   ├── validators.ts # Doğrulama fonksiyonları
│   ├── utils.ts    # Genel utility'ler
│   └── index.ts
├── components/     # React bileşenleri
├── pages/         # Sayfa bileşenleri
└── hooks/         # Custom hook'lar
```

## Teknoloji Stack

### Backend
- **Framework**: Express.js + TypeScript
- **Database**: SQLite + Drizzle ORM
- **Auth**: Passport.js (Local Strategy)
- **Validation**: Zod

### Frontend
- **Framework**: React + TypeScript + Vite
- **UI Library**: Radix UI + Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Forms**: React Hook Form + Zod

## Özellikler

### Kullanıcı Yönetimi
- Rol tabanlı yetkilendirme (Admin, Okul Yönetimi, PDR Yönetimi, Rehber, PDR, Öğretmen)
- Session tabanlı kimlik doğrulama
- Şifre değiştirme

### Öğrenci Yönetimi
- Öğrenci kayıt ve düzenleme
- Detaylı veli bilgileri
- Toplu öğrenci import (Excel)
- Öğrenci arama ve filtreleme

### Randevu Sistemi
- Randevu oluşturma ve takip
- Durum yönetimi (Planlandı, Tamamlandı, İptal)
- Öğrenci bazlı randevu geçmişi

### Psikolojik Danışma
- Görüşme kayıtları
- Gizlilik seviyeleri
- Konu bazlı takip
- Erişim kontrolü

### Ders Saatleri ve Çalışma Planları
- Haftalık çalışma programı
- Konu bazlı ilerleme takibi
- Otomatik çalışma planı oluşturma

### Raporlama
- Dashboard istatistikleri
- Öğrenci dağılım raporları
- Randevu analizi
- Yıllık özet raporlar

## API Endpoint'leri

### Auth
- `POST /api/auth/register` - Kayıt
- `POST /api/auth/login` - Giriş
- `POST /api/auth/logout` - Çıkış
- `GET /api/user` - Kullanıcı bilgisi
- `POST /api/user/change-password` - Şifre değiştir

### Students
- `GET /api/students` - Öğrenci listesi
- `GET /api/students/:id` - Öğrenci detay
- `POST /api/students` - Öğrenci ekle
- `PUT /api/students/:id` - Öğrenci güncelle
- `DELETE /api/students/:id` - Öğrenci sil

### Appointments
- `GET /api/appointments` - Randevu listesi
- `GET /api/appointments/:id` - Randevu detay
- `POST /api/appointments` - Randevu oluştur
- `PUT /api/appointments/:id` - Randevu güncelle
- `DELETE /api/appointments/:id` - Randevu sil

### Activities & Stats
- `GET /api/activities` - Aktivite geçmişi
- `GET /api/activities/stats` - Dashboard istatistikleri

### School Info
- `GET /api/school-info` - Okul bilgileri
- `POST /api/school-info` - Okul bilgisi oluştur/güncelle

## Geliştirme

### Başlatma
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Veritabanı Migrasyonu
```bash
npm run db:push
```

## Kullanıcı Rolleri ve Yetkileri

### Admin
- Tüm yetkilere sahip
- Sistem yapılandırması
- Kullanıcı yönetimi

### Okul Yönetimi
- Öğrenci ve randevu yönetimi
- Raporlara erişim
- Çoğu görüşme kaydına erişim

### PDR Yönetimi
- Öğrenci ve randevu yönetimi
- PDR aktiviteleri koordinasyonu
- Çok gizli hariç görüşmelere erişim

### Rehber/PDR
- Öğrenci takibi
- Randevu ve görüşme yönetimi
- Kendi görüşme kayıtlarına erişim

### Sınıf Öğretmeni
- Sınıf öğrencileri takibi
- Düşük gizlilik seviyesindeki bilgilere erişim

## Güvenlik

- Session tabanlı kimlik doğrulama
- Şifre hashleme (scrypt)
- Rol tabanlı yetkilendirme
- Görüşme kayıtları için gizlilik seviyeleri
- CSRF koruması
- Validation (Zod)

## Notlar

- Geliştirme ortamında dev login kullanılabilir (`POST /api/dev-login`)
- Veritabanı dosyası: `data/rehberlik.db`
- Port: 5000 (değiştirilemez)
