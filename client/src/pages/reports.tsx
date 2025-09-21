import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Student, Appointment } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  UserPlus,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Filter,
  FileText,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Users,
  Layers,
  CalendarDays,
  UserCircle,
  ScrollText,
  BadgeCheck,
  History,
  FileBarChart,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Renk paletleri
const COLORS = ['#845ef7', '#ff4081', '#22c55e', '#ff9800', '#f43f5e'];
const STATUS_COLORS = {
  beklemede: '#ff9800',
  onaylandı: '#845ef7',
  tamamlandı: '#22c55e',
  iptal: '#f43f5e',
};

// Türkçe ay isimleri
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function getActivityIcon(type: string) {
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

function formatActivityTime(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ReportsPage() {
  const [timeFrame, setTimeFrame] = useState<"week" | "month" | "year">("month");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // İstatistik verileri çek
  const { data: stats, refetch: refetchStats } = useQuery<{
    studentCount: number;
    todayAppointments: number;
    weeklyAppointments: number;
    pendingRequests: number;
  }>({
    queryKey: ["/api/stats"],
  });

  // Aktiviteleri çek
  const { data: activities, refetch: refetchActivities } = useQuery<Activity[]>({
    queryKey: ["/api/activities?limit=20"],
  });

  // Tüm öğrencileri çek
  const { data: students, refetch: refetchStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Tüm randevuları çek
  const { data: appointments, refetch: refetchAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Veriyi yenile
  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchStats(),
      refetchActivities(),
      refetchStudents(),
      refetchAppointments()
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // Raporu Excel olarak indirme fonksiyonu
  const downloadExcelReport = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    
    // Yeni çalışma kitabı oluştur
    const workbook = XLSX.utils.book_new();
    
    // 1. Genel İstatistikler Sayfası
    const statsData = [
      ["Rehberlik Servisi Genel İstatistikleri", "", "", ""],
      ["Rapor Tarihi:", new Date().toLocaleString("tr-TR"), "", ""],
      ["", "", "", ""],
      ["İstatistik", "Değer", "", ""],
      ["Toplam Öğrenci Sayısı", stats?.studentCount || 0, "", ""],
      ["Bugünkü Randevular", stats?.todayAppointments || 0, "", ""],
      ["Haftalık Randevular", stats?.weeklyAppointments || 0, "", ""],
      ["Bekleyen Talepler", stats?.pendingRequests || 0, "", ""],
      ["Toplam Randevu Sayısı", appointments?.length || 0, "", ""]
    ];
    const statsWorksheet = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, "Genel İstatistikler");
    
    // 2. Öğrenci Listesi Sayfası
    if (students && students.length > 0) {
      const studentData = [
        ["Öğrenci Listesi", "", "", "", "", "", "", ""],
        ["Adı", "Soyadı", "Öğrenci No", "Sınıf", "Doğum Tarihi", "Cinsiyet", "Veli Adı", "Telefon"],
        ...students.map(student => [
          student.firstName,
          student.lastName,
          student.studentNumber,
          student.class,
          student.birthDate,
          student.gender,
          student.parentName,
          student.phone
        ])
      ];
      const studentWorksheet = XLSX.utils.aoa_to_sheet(studentData);
      XLSX.utils.book_append_sheet(workbook, studentWorksheet, "Öğrenciler");
    }
    
    // 3. Randevu Listesi Sayfası
    if (appointments && appointments.length > 0) {
      const appointmentData = [
        ["Randevu Listesi", "", "", "", "", ""],
        ["Öğrenci ID", "Rehber ID", "Tarih", "Saat", "Durum", "Konu"],
        ...appointments.map(appointment => [
          appointment.studentId,
          appointment.counselorId,
          appointment.date,
          appointment.time,
          appointment.status,
          appointment.subject
        ])
      ];
      const appointmentWorksheet = XLSX.utils.aoa_to_sheet(appointmentData);
      XLSX.utils.book_append_sheet(workbook, appointmentWorksheet, "Randevular");
    }
    
    // 4. Sınıf Dağılımı Sayfası
    const classDistData = prepareClassDistributionData();
    if (classDistData.length > 0) {
      const classData = [
        ["Sınıf Dağılımı", ""],
        ["Sınıf", "Öğrenci Sayısı"],
        ...classDistData.map(item => [item.name, item.value])
      ];
      const classWorksheet = XLSX.utils.aoa_to_sheet(classData);
      XLSX.utils.book_append_sheet(workbook, classWorksheet, "Sınıf Dağılımı");
    }
    
    // 5. Son Aktiviteler Sayfası
    if (activities && activities.length > 0) {
      const activityData = [
        ["Son Aktiviteler", "", ""],
        ["Tür", "Mesaj", "Tarih"],
        ...activities.slice(0, 20).map(activity => [
          activity.type,
          activity.message.replace(/<[^>]*>/g, ''), // HTML etiketlerini temizle
          new Date(activity.createdAt).toLocaleString("tr-TR")
        ])
      ];
      const activityWorksheet = XLSX.utils.aoa_to_sheet(activityData);
      XLSX.utils.book_append_sheet(workbook, activityWorksheet, "Aktiviteler");
    }
    
    // Excel dosyasını indirme
    const filename = `rehberlik_raporu_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };
  
  // Raporu PDF olarak indirme fonksiyonu
  const downloadPDFReport = () => {
    try {
      const doc = new jsPDF();
      const date = new Date();
      const dateStr = date.toLocaleDateString("tr-TR");
      const timeStr = date.toLocaleTimeString("tr-TR");
      
      // Başlık
      doc.setFontSize(20);
      doc.text("Rehberlik Servisi Raporu", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Rapor Tarihi: ${dateStr} ${timeStr}`, 20, 30);
      
      let yPosition = 50;
      
      // Genel İstatistikler
      doc.setFontSize(16);
      doc.text("Genel İstatistikler", 20, yPosition);
      yPosition += 10;
      
      const statsData = [
        ["İstatistik", "Değer"],
        ["Toplam Öğrenci Sayısı", (stats?.studentCount || 0).toString()],
        ["Bugünkü Randevular", (stats?.todayAppointments || 0).toString()],
        ["Haftalık Randevular", (stats?.weeklyAppointments || 0).toString()],
        ["Bekleyen Talepler", (stats?.pendingRequests || 0).toString()],
        ["Toplam Randevu Sayısı", (appointments?.length || 0).toString()]
      ];
      
      autoTable(doc, {
        head: [statsData[0]],
        body: statsData.slice(1),
        startY: yPosition,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [133, 94, 247] }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
      
      // Sınıf Dağılımı
      const classData = prepareClassDistributionData();
      if (classData.length > 0 && yPosition < 250) {
        doc.setFontSize(16);
        doc.text("Sınıf Dağılımı", 20, yPosition);
        yPosition += 10;
        
        const classTableData = [
          ["Sınıf", "Öğrenci Sayısı"],
          ...classData.map(item => [item.name, item.value.toString()])
        ];
        
        autoTable(doc, {
          head: [classTableData[0]],
          body: classTableData.slice(1),
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [34, 197, 94] }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }
      
      // Öğrenci Listesi (İlk 10 öğrenci)
      if (students && students.length > 0 && yPosition < 200) {
        doc.setFontSize(16);
        doc.text("Öğrenci Listesi (İlk 10)", 20, yPosition);
        yPosition += 10;
        
        const studentTableData = [
          ["Ad Soyad", "Öğrenci No", "Sınıf", "Veli"],
          ...students.slice(0, 10).map(student => [
            `${student.firstName} ${student.lastName}`,
            student.studentNumber,
            student.class,
            student.parentName
          ])
        ];
        
        autoTable(doc, {
          head: [studentTableData[0]],
          body: studentTableData.slice(1),
          startY: yPosition,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [255, 64, 129] },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 30 },
            2: { cellWidth: 25 },
            3: { cellWidth: 50 }
          }
        });
      }
      
      // Yeni sayfa - Randevu listesi
      if (appointments && appointments.length > 0) {
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(16);
        doc.text("Randevu Listesi (İlk 15)", 20, yPosition);
        yPosition += 10;
        
        const appointmentTableData = [
          ["Tarih", "Saat", "Durum", "Konu"],
          ...appointments.slice(0, 15).map(appointment => [
            new Date(appointment.date).toLocaleDateString("tr-TR"),
            appointment.time,
            appointment.status,
            appointment.subject.length > 30 ? 
              appointment.subject.substring(0, 30) + "..." : 
              appointment.subject
          ])
        ];
        
        autoTable(doc, {
          head: [appointmentTableData[0]],
          body: appointmentTableData.slice(1),
          startY: yPosition,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [255, 152, 0] },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 30 },
            3: { cellWidth: 80 }
          }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
        
        // Son aktiviteler
        if (activities && activities.length > 0 && yPosition < 200) {
          doc.setFontSize(16);
          doc.text("Son Aktiviteler (İlk 10)", 20, yPosition);
          yPosition += 10;
          
          const activityTableData = [
            ["Tür", "Mesaj", "Tarih"],
            ...activities.slice(0, 10).map(activity => [
              activity.type,
              activity.message.replace(/<[^>]*>/g, '').length > 40 ? 
                activity.message.replace(/<[^>]*>/g, '').substring(0, 40) + "..." : 
                activity.message.replace(/<[^>]*>/g, ''),
              new Date(activity.createdAt).toLocaleDateString("tr-TR")
            ])
          ];
          
          autoTable(doc, {
            head: [activityTableData[0]],
            body: activityTableData.slice(1),
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [244, 63, 94] },
            columnStyles: {
              0: { cellWidth: 35 },
              1: { cellWidth: 100 },
              2: { cellWidth: 35 }
            }
          });
        }
      }
      
      // PDF'i kaydet
      const filename = `rehberlik_raporu_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error("PDF oluşturma hatası:", error);
      alert("PDF raporu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };
  
  // Raporu JSON olarak indirme fonksiyonu
  const downloadJSONReport = () => {
    // Raporda bulunacak verileri oluştur
    const reportData = {
      reportName: "Rehberlik Servisi Raporu",
      generatedAt: new Date().toLocaleString("tr-TR"),
      stats: {
        studentCount: stats?.studentCount || 0,
        todayAppointments: stats?.todayAppointments || 0,
        weeklyAppointments: stats?.weeklyAppointments || 0,
        pendingRequests: stats?.pendingRequests || 0,
      },
      classDistribution: prepareClassDistributionData(),
      appointmentStatus: prepareAppointmentStatusData(),
      monthlyAppointments: prepareMonthlyAppointmentsData(),
      recentActivities: activities?.slice(0, 10) || [],
      students: students || [],
      appointments: appointments || []
    };
    
    // JSON'a dönüştür
    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    
    // Dosyayı indirme işlemi
    const date = new Date();
    const filename = `rehberlik_raporu_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}.json`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Temizle
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Sınıflara göre öğrenci dağılımı için veri hazırla
  const prepareClassDistributionData = () => {
    if (!students) return [];
    
    const classCounts: Record<string, number> = {};
    
    students.forEach(student => {
      classCounts[student.class] = (classCounts[student.class] || 0) + 1;
    });
    
    return Object.entries(classCounts)
      .sort((a, b) => b[1] - a[1]) // En yüksek sayıdan başla
      .map(([className, count]) => ({
        name: className,
        value: count
      }));
  };

  // Randevu durumlarına göre dağılım için veri hazırla
  const prepareAppointmentStatusData = () => {
    if (!appointments) return [];
    
    const statusCounts: Record<string, number> = {
      beklemede: 0,
      onaylandı: 0,
      tamamlandı: 0,
      iptal: 0
    };
    
    appointments.forEach(appointment => {
      statusCounts[appointment.status] = (statusCounts[appointment.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status === 'beklemede' ? 'Beklemede' :
            status === 'onaylandı' ? 'Onaylandı' :
            status === 'tamamlandı' ? 'Tamamlandı' :
            status === 'iptal' ? 'İptal' : status,
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#ccc'
    }));
  };

  // Aylara göre randevu dağılımı için veri hazırla
  const prepareMonthlyAppointmentsData = () => {
    if (!appointments) return [];
    
    const monthCounts: number[] = Array(12).fill(0);
    
    appointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const month = date.getMonth();
      monthCounts[month]++;
    });
    
    return monthCounts.map((count, index) => ({
      name: MONTHS[index],
      randevular: count
    }));
  };

  const classDistributionData = prepareClassDistributionData();
  const appointmentStatusData = prepareAppointmentStatusData();
  const monthlyAppointmentsData = prepareMonthlyAppointmentsData();

  return (
    <Layout title="Raporlar" description="İstatistikler ve raporlama aracı">
      {/* Başlık Bölümü */}
      <div className="mb-8 glass-panel">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex flex-col h-full justify-center">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md mr-3">
                  <FileBarChart className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-gradient">Rehberlik Servisi Raporları</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Öğrenciler, randevular ve aktivitelerle ilgili tüm istatistikler ve detaylı raporlara buradan ulaşabilirsiniz.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button
                  className="btn-gradient gap-2"
                  onClick={refreshData}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Verileri Yenile
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-primary/20 text-primary gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Raporu İndir
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={downloadExcelReport} className="gap-2">
                      <FileBarChart className="h-4 w-4 text-green-600" />
                      <div className="flex flex-col">
                        <span>Excel Raporu (.xlsx)</span>
                        <span className="text-xs text-muted-foreground">Tablo formatında</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadJSONReport} className="gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div className="flex flex-col">
                        <span>JSON Raporu (.json)</span>
                        <span className="text-xs text-muted-foreground">Ham veri formatı</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={downloadPDFReport}
                      className="gap-2"
                    >
                      <ScrollText className="h-4 w-4 text-red-600" />
                      <div className="flex flex-col">
                        <span>PDF Raporu (.pdf)</span>
                        <span className="text-xs text-muted-foreground">Yazdırılabilir format</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="glass-effect-strong rounded-xl p-4 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Dönem İstatistikleri</h3>
            <div className="grid grid-cols-2 gap-4 mt-2 flex-grow">
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">{stats?.studentCount || 0}</span>
                <span className="text-xs text-muted-foreground">Öğrenci</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">{appointments?.length || 0}</span>
                <span className="text-xs text-muted-foreground">Randevu</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">{stats?.weeklyAppointments || 0}</span>
                <span className="text-xs text-muted-foreground">Haftalık</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">{stats?.todayAppointments || 0}</span>
                <span className="text-xs text-muted-foreground">Bugün</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="overview" 
                className="rounded-lg gap-2 data-[state=active]:bg-background"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Genel Bakış</span>
              </TabsTrigger>
              <TabsTrigger 
                value="students" 
                className="rounded-lg gap-2 data-[state=active]:bg-background"
              >
                <Users className="h-4 w-4" />
                <span>Öğrenciler</span>
              </TabsTrigger>
              <TabsTrigger 
                value="appointments" 
                className="rounded-lg gap-2 data-[state=active]:bg-background"
              >
                <CalendarDays className="h-4 w-4" />
                <span>Randevular</span>
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                className="rounded-lg gap-2 data-[state=active]:bg-background"
              >
                <History className="h-4 w-4" />
                <span>Aktiviteler</span>
              </TabsTrigger>
            </TabsList>
            
            <Select
              value={timeFrame}
              onValueChange={(value) => setTimeFrame(value as "week" | "month" | "year")}
            >
              <SelectTrigger className="w-36 glass-effect border-primary/20">
                <Layers className="h-4 w-4 mr-2 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Haftalık</SelectItem>
                <SelectItem value="month">Aylık</SelectItem>
                <SelectItem value="year">Yıllık</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Genel Bakış */}
          <AnimatePresence mode="wait">
            <TabsContent value="overview">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Özet Bilgiler */}
                  <Card className="glass-card border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Rehberlik Özeti</CardTitle>
                          <CardDescription>
                            Servis çalışmaları özeti
                          </CardDescription>
                        </div>
                      </div>
                      <Separator className="mt-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <UserCircle className="h-5 w-5 text-primary" />
                            <span className="font-medium">Toplam Öğrenci</span>
                          </div>
                          <Badge className="text-primary bg-primary/10 border-0 font-semibold text-sm">
                            {stats?.studentCount || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-secondary/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-secondary" />
                            <span className="font-medium">Bugünkü Randevular</span>
                          </div>
                          <Badge className="text-secondary bg-secondary/10 border-0 font-semibold text-sm">
                            {stats?.todayAppointments || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-500/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <BadgeCheck className="h-5 w-5 text-green-500" />
                            <span className="font-medium">Haftalık Görüşmeler</span>
                          </div>
                          <Badge className="text-green-500 bg-green-500/10 border-0 font-semibold text-sm">
                            {stats?.weeklyAppointments || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-amber-500/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-amber-500" />
                            <span className="font-medium">Bekleyen İstekler</span>
                          </div>
                          <Badge className="text-amber-500 bg-amber-500/10 border-0 font-semibold text-sm">
                            {stats?.pendingRequests || 0}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Randevu Durumları */}
                  <Card className="glass-card border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                          <PieChartIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Randevu Durumları</CardTitle>
                          <CardDescription>
                            Mevcut randevuların durumları
                          </CardDescription>
                        </div>
                      </div>
                      <Separator className="mt-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={appointmentStatusData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {appointmentStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Aylık Randevu Dağılımı */}
                  <Card className="col-span-1 md:col-span-2 glass-card border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                          <BarChartIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Aylık Randevu Dağılımı</CardTitle>
                          <CardDescription>
                            Aylara göre randevu sayıları
                          </CardDescription>
                        </div>
                      </div>
                      <Separator className="mt-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={monthlyAppointmentsData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(142, 142, 142, 0.1)" />
                            <XAxis dataKey="name" tick={{ fill: '#888' }} />
                            <YAxis tick={{ fill: '#888' }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none' }} />
                            <Legend />
                            <Bar dataKey="randevular" name="Randevu Sayısı" fill="#845ef7" radius={[4, 4, 0, 0]} barSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>
          </AnimatePresence>

          {/* Öğrenci Raporları */}
          <AnimatePresence mode="wait">
            <TabsContent value="students">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sınıf Dağılımı */}
                  <Card className="glass-card border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Sınıf Dağılımı</CardTitle>
                          <CardDescription>
                            Sınıflara göre öğrenci sayıları
                          </CardDescription>
                        </div>
                      </div>
                      <Separator className="mt-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={classDistributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {classDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Öğrenci İstatistikleri */}
                  <Card className="glass-card border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">Öğrenci İstatistikleri</CardTitle>
                          <CardDescription>
                            Genel öğrenci verileri
                          </CardDescription>
                        </div>
                      </div>
                      <Separator className="mt-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-primary" />
                            <span className="font-medium">Toplam Öğrenci</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="text-primary bg-primary/10 border-0 font-semibold text-sm">
                              {students?.length || 0}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-pink-500/5 rounded-lg hover:bg-pink-500/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <UserCircle className="h-5 w-5 text-pink-500" />
                            <span className="font-medium">Kız Öğrenci Sayısı</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="text-pink-500 bg-pink-500/10 border-0 font-semibold text-sm">
                              {students?.filter(s => s.gender === "kız").length || 0}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-500/5 rounded-lg hover:bg-blue-500/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <UserCircle className="h-5 w-5 text-blue-500" />
                            <span className="font-medium">Erkek Öğrenci Sayısı</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="text-blue-500 bg-blue-500/10 border-0 font-semibold text-sm">
                              {students?.filter(s => s.gender === "erkek").length || 0}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-500/5 rounded-lg hover:bg-purple-500/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-purple-500" />
                            <span className="font-medium">Randevusu Olan Öğrenciler</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="text-purple-500 bg-purple-500/10 border-0 font-semibold text-sm">
                              {appointments && students ? 
                                new Set(appointments.map(a => a.studentId)).size : 0}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>
          </AnimatePresence>

          {/* Randevu Raporları */}
          <AnimatePresence mode="wait">
            <TabsContent value="appointments">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 gap-6">
                  {/* Randevu İstatistikleri */}
                  <Card className="glass-card border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                            <CalendarDays className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">Randevu İstatistikleri</CardTitle>
                            <CardDescription>
                              Genel randevu verileri
                            </CardDescription>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-primary gap-2 bg-primary/5 hover:bg-primary/10">
                          <Filter className="h-4 w-4" />
                          <span>Filtrele</span>
                        </Button>
                      </div>
                      <Separator className="mt-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-primary" />
                              <span className="font-medium">Toplam Randevu</span>
                            </div>
                            <Badge className="text-primary bg-primary/10 border-0 font-semibold text-sm">
                              {appointments?.length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-500/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <BadgeCheck className="h-5 w-5 text-green-500" />
                              <span className="font-medium">Tamamlanan Randevular</span>
                            </div>
                            <Badge className="text-green-500 bg-green-500/10 border-0 font-semibold text-sm">
                              {appointments?.filter(a => a.status === "tamamlandı").length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-amber-500/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-amber-500" />
                              <span className="font-medium">Bekleyen Randevular</span>
                            </div>
                            <Badge className="text-amber-500 bg-amber-500/10 border-0 font-semibold text-sm">
                              {appointments?.filter(a => a.status === "beklemede").length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <XCircle className="h-5 w-5 text-red-500" />
                              <span className="font-medium">İptal Edilen Randevular</span>
                            </div>
                            <Badge className="text-red-500 bg-red-500/10 border-0 font-semibold text-sm">
                              {appointments?.filter(a => a.status === "iptal").length || 0}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-secondary/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-secondary" />
                              <span className="font-medium">Bu Haftaki Randevular</span>
                            </div>
                            <Badge className="text-secondary bg-secondary/10 border-0 font-semibold text-sm">
                              {appointments?.filter(a => {
                                const now = new Date();
                                const appointmentDate = new Date(a.date);
                                const dayOfWeek = now.getDay(); // 0 = Pazar, 6 = Cumartesi
                                const startOfWeek = new Date(now);
                                startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Pazartesi
                                startOfWeek.setHours(0, 0, 0, 0);
                                
                                const endOfWeek = new Date(startOfWeek);
                                endOfWeek.setDate(startOfWeek.getDate() + 6); // Pazar
                                endOfWeek.setHours(23, 59, 59, 999);
                                
                                return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
                              }).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-500/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-blue-500" />
                              <span className="font-medium">Bu Ayki Randevular</span>
                            </div>
                            <Badge className="text-blue-500 bg-blue-500/10 border-0 font-semibold text-sm">
                              {appointments?.filter(a => {
                                const now = new Date();
                                const appointmentDate = new Date(a.date);
                                return appointmentDate.getMonth() === now.getMonth() && 
                                      appointmentDate.getFullYear() === now.getFullYear();
                              }).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-purple-500/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Users className="h-5 w-5 text-purple-500" />
                              <span className="font-medium">Ortalama Randevu / Öğrenci</span>
                            </div>
                            <Badge className="text-purple-500 bg-purple-500/10 border-0 font-semibold text-sm">
                              {appointments && students && students.length > 0 ? 
                                (appointments.length / students.length).toFixed(1) : 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-violet-500/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <ArrowUpRight className="h-5 w-5 text-violet-500" />
                              <span className="font-medium">En Popüler Gün</span>
                            </div>
                            <Badge className="text-violet-500 bg-violet-500/10 border-0 font-semibold text-sm">
                              {appointments && appointments.length > 0 ? (() => {
                                const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
                                const dayCounts = [0, 0, 0, 0, 0, 0, 0];
                                
                                appointments.forEach(a => {
                                  const day = new Date(a.date).getDay();
                                  dayCounts[day]++;
                                });
                                
                                let maxIndex = 0;
                                for (let i = 1; i < 7; i++) {
                                  if (dayCounts[i] > dayCounts[maxIndex]) {
                                    maxIndex = i;
                                  }
                                }
                                
                                return days[maxIndex];
                              })() : "Belirsiz"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>
          </AnimatePresence>

          {/* Aktivite Günlüğü */}
          <AnimatePresence mode="wait">
            <TabsContent value="activities">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass-card border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                        <History className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Aktivite Günlüğü</CardTitle>
                        <CardDescription>
                          Son 20 aktivite kaydı
                        </CardDescription>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="space-y-5 pr-2 max-h-[500px] overflow-y-auto">
                      {activities && activities.length > 0 ? (
                        activities.map((activity) => (
                          <div key={activity.id} className="glass-effect p-3 rounded-xl">
                            <div className="flex">
                              <div className="flex-shrink-0 mt-1">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="ml-4">
                                <p
                                  className="text-foreground font-medium"
                                  dangerouslySetInnerHTML={{ __html: activity.message }}
                                />
                                <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatActivityTime(activity.createdAt.toString())}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 flex flex-col items-center justify-center">
                          <History className="h-14 w-14 text-muted-foreground/20 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Henüz aktivite bulunmuyor</h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Sistem aktivitelerinin geçmişi burada görüntülenecektir.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-center border-t pt-4">
                    <Button variant="outline" className="gap-2 border-primary/20 text-primary">
                      <HelpCircle className="h-4 w-4" />
                      <span>Tüm Aktiviteleri Görüntüle</span>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </Layout>
  );
}