import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Student, 
  ClassHour, 
  CounselingTopic,
  CounselingSession
} from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import { Search, Plus, Clock, ClipboardList, Loader2, CheckCircle2, Printer, Calendar, User, Users, FileText, X, Check, ChevronDown } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

// Form validation şemaları
const counselingSessionSchema = z.object({
  studentId: z.number(),
  counselorId: z.number(),
  sessionDate: z.string(),
  entryTime: z.string(),
  entryClassHourId: z.number().optional(),
  topic: z.string(),
  participantType: z.string(),
  relationshipType: z.string().optional(),
  otherParticipants: z.string().optional(),
  sessionType: z.string(),
  sessionLocation: z.string(),
  disciplineStatus: z.string().optional(),
  institutionalCooperation: z.string().optional(),
  sessionDetails: z.string().optional()
});

const completeSessionSchema = z.object({
  exitTime: z.string(),
  exitClassHourId: z.number().optional(),
  detailedNotes: z.string().optional()
});

// Veri tipleri
interface CounselingSessionWithStudent extends CounselingSession { 
  student: Student;
}

type CounselingSessionFormValues = z.infer<typeof counselingSessionSchema>;
type CompleteSessionFormValues = z.infer<typeof completeSessionSchema>;

export default function CounselingSessionsPage() {
  // State
  const [activeTab, setActiveTab] = useState<string>("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CounselingSessionWithStudent | null>(null);
  const [formTab, setFormTab] = useState<string>("bireysel");
  const [formSection, setFormSection] = useState<string>("student-info");
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");
  const [topicSearchTerm, setTopicSearchTerm] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  // Görüşme defteri için sütun görünürlüğü state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "studentNumber", "studentName", "studentClass", "date", "startTime", 
    "endTime", "personMet", "topic", "summary"
  ]);
  
  // User
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Data fetching
  const { data = [], isLoading } = useQuery<CounselingSessionWithStudent[]>({
    queryKey: ['/api/counseling-sessions'],
    refetchOnWindowFocus: false
  });
  
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    refetchOnWindowFocus: false
  });

  const { data: classHours = [] } = useQuery<ClassHour[]>({
    queryKey: ['/api/class-hours'],
    refetchOnWindowFocus: false
  });
  
  // Görüşme konularını getir
  const { data: counselingTopics = [] } = useQuery<CounselingTopic[]>({
    queryKey: ['/api/counseling-topics'],
    refetchOnWindowFocus: false
  });
  
  // Aktiveleri ve tamamlananları ayır
  const activeSessions = data.filter((session: CounselingSessionWithStudent) => !session.exitTime);
  const completedSessions = data.filter((session: CounselingSessionWithStudent) => session.exitTime);
  
  // Mevcut saate göre ders saatini bulma
  const getCurrentClassHour = () => {
    if (!classHours || !Array.isArray(classHours) || classHours.length === 0) {
      return undefined;
    }
    
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    const currentDay = now.getDay(); // 0: Pazar, 1: Pazartesi, ..., 6: Cumartesi
    
    // Önce gün filtresi yapmayalım, sadece zaman bazlı seçelim
    const currentClassHour = classHours.find((hour: ClassHour) => {
      return currentTime >= hour.startTime && currentTime <= hour.endTime;
    });
    
    return currentClassHour?.id;
  };
  
  // Belirli bir saate göre ders saatini bulma
  const getClassHourByTime = (timeString: string) => {
    if (!classHours || !Array.isArray(classHours) || classHours.length === 0 || !timeString) {
      return undefined;
    }
    
    // Zaman bazlı ders saati bulma
    const matchingClassHour = classHours.find((hour: ClassHour) => {
      return timeString >= hour.startTime && timeString <= hour.endTime;
    });
    
    return matchingClassHour?.id;
  };
  
  // Form
  const form = useForm<CounselingSessionFormValues>({
    resolver: zodResolver(counselingSessionSchema),
    defaultValues: {
      studentId: 0, // Default değeri 0 olarak ayarlayalım, undefined yerine
      counselorId: user?.id || 0,
      sessionDate: new Date().toISOString().split('T')[0],
      entryTime: new Date().toTimeString().slice(0, 5),
      entryClassHourId: getCurrentClassHour() || 0, // Default bir değer verelim
      topic: "",
      participantType: "öğrenci",
      relationshipType: "",
      otherParticipants: "",
      sessionType: "yüz_yüze",
      sessionLocation: "Rehberlik Servisi",
      disciplineStatus: "",
      institutionalCooperation: "",
      sessionDetails: ""
    }
  });
  
  // Mevcut saate göre ders saatini bulma (çıkış saati için)
  const getCurrentClassHourForExit = () => {
    if (!classHours || !Array.isArray(classHours) || classHours.length === 0) {
      return undefined;
    }
    
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    
    // Zaman bazlı ders saati bulma
    const currentClassHour = classHours.find((hour: ClassHour) => {
      return currentTime >= hour.startTime && currentTime <= hour.endTime;
    });
    
    return currentClassHour?.id;
  };
  
  const completeForm = useForm<CompleteSessionFormValues>({
    resolver: zodResolver(completeSessionSchema),
    defaultValues: {
      exitTime: new Date().toTimeString().slice(0, 5),
      exitClassHourId: getCurrentClassHourForExit() || 0, // Default değer olarak 0 verelim
      detailedNotes: ""
    }
  });
  
  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async (session: CounselingSessionFormValues) => {
      const response = await fetch('/api/counseling-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Görüşme oluşturulurken bir hata oluştu');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/counseling-sessions'] });
      toast({
        title: "Görüşme kaydedildi",
        description: "Rehberlik görüşmesi başarıyla başlatıldı."
      });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Görüşme kaydedilirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  });
  
  const completeSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: CompleteSessionFormValues }) => {
      const response = await fetch(`/api/counseling-sessions/${id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Görüşme tamamlanırken bir hata oluştu');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/counseling-sessions'] });
      toast({
        title: "Görüşme tamamlandı",
        description: "Rehberlik görüşmesi başarıyla tamamlandı."
      });
      setSelectedSession(null);
      setCompleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Görüşme tamamlanırken bir hata oluştu.",
        variant: "destructive"
      });
    }
  });
  
  // Form submit handlers
  const onSubmit = (data: CounselingSessionFormValues) => {
    createSessionMutation.mutate(data);
  };
  
  const onCompleteSubmit = (data: CompleteSessionFormValues) => {
    if (!selectedSession) return;
    completeSessionMutation.mutate({ id: selectedSession.id, data });
  };
  
  // Yazdırma fonksiyonları
  const printCounselingForm = () => {
    // Görüşme detaylarını alın
    const sessionData = selectedSession;
    if (!sessionData) return;
    
    const studentName = sessionData.student?.firstName + ' ' + sessionData.student?.lastName;
    const studentClass = sessionData.student?.class;
    const date = formatDate(sessionData.sessionDate);
    const entryTime = formatTime(sessionData.entryTime);
    const exitTime = sessionData.exitTime ? formatTime(sessionData.exitTime) : '-';
    const topic = sessionData.topic;
    const participantType = sessionData.participantType;
    const location = sessionData.sessionLocation;
    const details = sessionData.sessionDetails || '';
    
    // Yazdırma için HTML içeriği oluştur
    const printContent = `
      <html>
        <head>
          <title>Rehberlik Görüşme Formu</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .form-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .counseling-form { border: 1px solid #000; padding: 15px; }
            .form-row { display: flex; margin-bottom: 10px; }
            .form-label { font-weight: bold; width: 150px; }
            .form-value { flex: 1; }
            .details { margin-top: 20px; }
            .details-title { font-weight: bold; margin-bottom: 10px; }
            .details-content { border: 1px solid #000; padding: 10px; min-height: 100px; }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>REHBERLİK GÖRÜŞME FORMU</h2>
          </div>
          <div class="counseling-form">
            <div class="form-row">
              <div class="form-label">Öğrenci:</div>
              <div class="form-value">${studentName}</div>
            </div>
            <div class="form-row">
              <div class="form-label">Sınıf:</div>
              <div class="form-value">${studentClass}</div>
            </div>
            <div class="form-row">
              <div class="form-label">Tarih:</div>
              <div class="form-value">${date}</div>
            </div>
            <div class="form-row">
              <div class="form-label">Giriş Saati:</div>
              <div class="form-value">${entryTime}</div>
            </div>
            <div class="form-row">
              <div class="form-label">Çıkış Saati:</div>
              <div class="form-value">${exitTime}</div>
            </div>
            <div class="form-row">
              <div class="form-label">Görüşme Konusu:</div>
              <div class="form-value">${topic}</div>
            </div>
            <div class="form-row">
              <div class="form-label">Görüşülen Kişi:</div>
              <div class="form-value">${participantType}</div>
            </div>
            <div class="form-row">
              <div class="form-label">Görüşme Yeri:</div>
              <div class="form-value">${location}</div>
            </div>
            
            <div class="details">
              <div class="details-title">Görüşme Detayları:</div>
              <div class="details-content">${details.replace(/\n/g, '<br>')}</div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()">Yazdır</button>
            <button onclick="window.close()">Kapat</button>
          </div>
        </body>
      </html>
    `;
    
    // Yeni bir pencere aç ve içeriği yazdır
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      // Pencere yüklendikten sonra otomatik yazdırma başlat
      printWindow.onload = function() {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      toast({
        title: "Uyarı",
        description: "Lütfen tarayıcınızın popup engelleyicisini kapatın.",
        variant: "destructive"
      });
    }
  };
  
  const printCallForm = () => {
    // Form için öğrenci bilgilerini alın
    const studentId = form.getValues("studentId");
    if (!studentId) {
      toast({
        title: "Hata",
        description: "Önce öğrenci seçmelisiniz.",
        variant: "destructive"
      });
      return;
    }
    
    const student = students.find((s: Student) => s.id === studentId);
    if (!student) return;
    
    const studentName = student.firstName + ' ' + student.lastName;
    const studentClass = student.class;
    const date = form.getValues("sessionDate");
    const formattedDate = date ? new Date(date).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');
    const time = form.getValues("entryTime") || new Date().toTimeString().slice(0, 5);
    
    // Yazdırma için HTML içeriği oluştur
    const printContent = `
      <html>
        <head>
          <title>Rehberlik Çağrı Fişi</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .call-slip { 
              border: 1px solid #000; 
              padding: 15px; 
              width: 300px; 
              margin: 0 auto;
              text-align: center;
            }
            .slip-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; }
            .slip-row { margin-bottom: 10px; }
            .slip-label { font-weight: bold; }
            .signature { margin-top: 20px; text-align: right; }
            .note { font-size: 11px; margin-top: 15px; font-style: italic; }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="call-slip">
            <div class="slip-title">REHBERLİK ÇAĞRI FİŞİ</div>
            
            <div class="slip-row">
              <span class="slip-label">Öğrenci:</span> ${studentName}
            </div>
            <div class="slip-row">
              <span class="slip-label">Sınıf:</span> ${studentClass}
            </div>
            <div class="slip-row">
              <span class="slip-label">Tarih:</span> ${formattedDate}
            </div>
            <div class="slip-row">
              <span class="slip-label">Saat:</span> ${time}
            </div>
            
            <div class="note">
              Lütfen belirtilen saatte rehberlik servisine geliniz.
            </div>
            
            <div class="signature">
              <p>Rehber Öğretmen</p>
              <p>${user?.fullName || "Rehber Öğretmen"}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()">Yazdır</button>
            <button onclick="window.close()">Kapat</button>
          </div>
        </body>
      </html>
    `;
    
    // Yeni bir pencere aç ve içeriği yazdır
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      // Pencere yüklendikten sonra otomatik yazdırma başlat
      printWindow.onload = function() {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      toast({
        title: "Uyarı",
        description: "Lütfen tarayıcınızın popup engelleyicisini kapatın.",
        variant: "destructive"
      });
    }
  };
  
  // Öğrenci arama fonksiyonu
  const handleStudentSearch = (query: string) => {
    setStudentSearchTerm(query);
    
    // Eğer query boşsa ve öğrenci ID'si seçiliyse, öğrenci ismini göstermeye devam et
    if (!query.trim() && form.getValues("studentId")) {
      const selectedStudent = students.find((s: Student) => s.id === form.getValues("studentId"));
      if (selectedStudent) {
        setStudentSearchTerm(`${selectedStudent.firstName} ${selectedStudent.lastName} (${selectedStudent.class})`);
      }
      return;
    }
    
    // Boş sorgu ise filtrelemeyi temizle
    if (!query.trim()) {
      form.setValue("studentId", 0); // undefined yerine 0 kullanıyoruz
      return;
    }
  };
  
  // Filtre işlevi bir fonksiyon olarak tanımlanıyor
  const getFilteredStudents = () => studentSearchTerm 
    ? students.filter((s: Student) => 
        s.studentNumber.toLowerCase().includes(studentSearchTerm.toLowerCase()) || 
        s.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase()) || 
        s.lastName.toLowerCase().includes(studentSearchTerm.toLowerCase()) || 
        s.class.toLowerCase().includes(studentSearchTerm.toLowerCase())
      )
    : students.slice(0, 10); // Arama yoksa, ilk 10 öğrenciyi göster (limitlemek için)
  
  // Selectbox options
  const participantTypes = [
    { value: "öğrenci", label: "Öğrenci" },
    { value: "veli", label: "Veli" },
    { value: "öğretmen", label: "Öğretmen" }, 
    { value: "diğer", label: "Diğer" }
  ];
  
  const relationshipTypes = [
    { value: "anne", label: "Anne" },
    { value: "baba", label: "Baba" },
    { value: "kardeş", label: "Kardeş" },
    { value: "akraba", label: "Akraba" },
    { value: "vasi", label: "Vasi" }
  ];
  
  const sessionLocations = [
    { value: "Rehberlik Servisi", label: "Rehberlik Servisi" },
    { value: "Sınıf", label: "Sınıf" },
    { value: "Öğretmenler Odası", label: "Öğretmenler Odası" },
    { value: "İdare", label: "İdare" }
  ];
  
  const sessionTypes = [
    { value: "yüz_yüze", label: "Yüz yüze" },
    { value: "telefon", label: "Telefon" },
    { value: "video", label: "Video görüşmesi" }
  ];
  
  const disciplineStatuses = [
    { value: "temiz", label: "Temiz" },
    { value: "uyarı", label: "Uyarı Almış" },
    { value: "kınama", label: "Kınama Almış" },
    { value: "uzaklaştırma", label: "Uzaklaştırma Almış" }
  ];
  
  // Konu arama fonksiyonu
  const handleTopicSearch = (query: string) => {
    setTopicSearchTerm(query);
  };
  
  // Filtreli konu listesi - veritabanındaki konuları kullan
  const filteredTopics = topicSearchTerm
    ? counselingTopics.filter((topic: CounselingTopic) => 
        topic.topic.toLowerCase().includes(topicSearchTerm.toLowerCase())
      )
    : counselingTopics;
    
  // Öğrenci arama için kapsamlı filtreleme işlemi önceki tanımda yapılıyor
  
  // Grup görüşmesi öğrenci ekleme/kaldırma
  const addStudentToGroup = (student: Student) => {
    if (!selectedStudents.some(s => s.id === student.id)) {
      setSelectedStudents([...selectedStudents, student]);
      
      // Öğrenci listesini otherParticipants alanında metin olarak tut
      const currentParticipants = selectedStudents.map(s => 
        `${s.firstName} ${s.lastName} (${s.class})`
      ).join('\n');
      
      const newParticipant = `${student.firstName} ${student.lastName} (${student.class})`;
      const newParticipants = currentParticipants ? `${currentParticipants}\n${newParticipant}` : newParticipant;
      
      form.setValue("otherParticipants", newParticipants);
    }
  };
  
  const removeStudentFromGroup = (studentId: number) => {
    const updatedStudents = selectedStudents.filter(s => s.id !== studentId);
    setSelectedStudents(updatedStudents);
    
    // Güncellenen öğrenci listesini otherParticipants alanında metin olarak tut
    const newParticipants = updatedStudents.map(s => 
      `${s.firstName} ${s.lastName} (${s.class})`
    ).join('\n');
    
    form.setValue("otherParticipants", newParticipants);
  };

  return (
    <Layout title="Rehberlik Görüşmeleri">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Rehberlik Görüşme Kayıtları</h1>
            <p className="text-muted-foreground">
              Öğrenci görüşme kayıtlarını yönetin
            </p>
          </div>
          <div>
            <Button 
              onClick={() => {
                setDialogOpen(true);
                setFormSection("student-info");
                form.reset({
                  ...form.getValues(),
                  entryClassHourId: getCurrentClassHour()
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Görüşme
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="flex">
              <Clock className="h-4 w-4 mr-2" />
              Aktif Görüşmeler
              {activeSessions.length > 0 && (
                <span className="ml-2 bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs">
                  {activeSessions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex">
              <ClipboardList className="h-4 w-4 mr-2" />
              Tamamlanan Görüşmeler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : activeSessions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <CardTitle className="text-lg mb-2">Aktif görüşme bulunmuyor</CardTitle>
                  <CardDescription>
                    Yeni bir görüşme başlatmak için "Yeni Görüşme" butonuna tıklayın.
                  </CardDescription>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setDialogOpen(true);
                      form.reset({
                        ...form.getValues(),
                        entryClassHourId: getCurrentClassHour()
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Görüşme
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {activeSessions.map((session: CounselingSessionWithStudent) => (
                  <Card key={session.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{session.student?.firstName} {session.student?.lastName}</h3>
                          <p className="text-sm text-muted-foreground">{session.student?.class} - {session.student?.studentNumber}</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-100">Devam Ediyor</Badge>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        <p className="text-sm text-muted-foreground">Giriş: {formatTime(session.entryTime)}</p>
                        <p className="text-sm text-muted-foreground">Tarih: {formatDate(session.sessionDate)}</p>
                        <p className="text-sm font-medium mt-2">{session.topic}</p>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={printCallForm}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                          Fiş Yazdır
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setSelectedSession(session);
                            setCompleteDialogOpen(true);
                            completeForm.reset({
                              exitTime: new Date().toTimeString().slice(0, 5),
                              exitClassHourId: getCurrentClassHourForExit(),
                              detailedNotes: ""
                            });
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                          Tamamla
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : completedSessions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <CardTitle className="text-lg mb-2">Tamamlanan görüşme bulunmuyor</CardTitle>
                  <CardDescription>
                    Tamamlanmış görüşmeler burada listelenecektir.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>Görüşme Defteri</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue={(new Date().getMonth() + 1).toString()}>
                        <SelectTrigger className="w-40 text-sm">
                          <SelectValue placeholder="Ay Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Ocak</SelectItem>
                          <SelectItem value="2">Şubat</SelectItem>
                          <SelectItem value="3">Mart</SelectItem>
                          <SelectItem value="4">Nisan</SelectItem>
                          <SelectItem value="5">Mayıs</SelectItem>
                          <SelectItem value="6">Haziran</SelectItem>
                          <SelectItem value="7">Temmuz</SelectItem>
                          <SelectItem value="8">Ağustos</SelectItem>
                          <SelectItem value="9">Eylül</SelectItem>
                          <SelectItem value="10">Ekim</SelectItem>
                          <SelectItem value="11">Kasım</SelectItem>
                          <SelectItem value="12">Aralık</SelectItem>
                        </SelectContent>
                      </Select>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs gap-1">
                            <ChevronDown className="h-4 w-4" />
                            Sütunları Düzenle
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 p-2">
                          <div className="space-y-2">
                            <div className="font-medium text-sm">Görünen Sütunlar</div>
                            {[
                              { id: "mebbisStatus", label: "MEBBİS" },
                              { id: "studentNumber", label: "Numara" },
                              { id: "studentClass", label: "Sınıf" },
                              { id: "studentGender", label: "Cinsiyet" },
                              { id: "studentName", label: "Ad-Soyad" },
                              { id: "startTime", label: "Başlangıç Saati" },
                              { id: "endTime", label: "Bitiş Saati" },
                              { id: "date", label: "Tarih" },
                              { id: "sessionCount", label: "Görüşme Sayısı" },
                              { id: "personMet", label: "Görüşülen Kişi" },
                              { id: "personRole", label: "Kişi Rolü" },
                              { id: "relationship", label: "Yakınlık Derecesi" },
                              { id: "topic", label: "Görüşme Konusu" },
                              { id: "workArea", label: "Çalışma Alanı" },
                              { id: "workCategory", label: "Çalışma Kategorisi" },
                              { id: "serviceType", label: "Hizmet Türü" },
                              { id: "institutionalCooperation", label: "Kurum İşbirliği" },
                              { id: "meetingPlace", label: "Görüşme Yeri" },
                              { id: "isDisciplinary", label: "Disiplin Görüşmesi" },
                              { id: "isLegalReferral", label: "Adli/Sevk" },
                              { id: "workMethod", label: "Çalışma Yöntemi" },
                              { id: "summary", label: "Özet" }
                            ].map(column => (
                              <div key={column.id} className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  id={column.id} 
                                  className="rounded text-primary border-muted focus:ring-primary"
                                  checked={visibleColumns.includes(column.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setVisibleColumns(prev => [...prev, column.id]);
                                    } else {
                                      setVisibleColumns(prev => prev.filter(id => id !== column.id));
                                    }
                                  }}
                                />
                                <label htmlFor={column.id} className="text-sm">{column.label}</label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs gap-1" 
                        onClick={() => {
                          if (completedSessions.length > 0) {
                            setSelectedSession(completedSessions[0]);
                            printCounselingForm();
                          }
                        }}
                      >
                        <Printer className="h-4 w-4" />
                        Yazdır
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="border rounded-md">
                    <div className="overflow-auto max-h-[650px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            {/* Dinamik sütun başlıkları */}
                            {[
                              { id: "studentNumber", label: "Numara" },
                              { id: "studentName", label: "Ad-Soyad" },
                              { id: "studentClass", label: "Sınıf" },
                              { id: "studentGender", label: "Cinsiyet", value: (session: CounselingSessionWithStudent) => session.student?.gender || "-" },
                              { id: "date", label: "Tarih" },
                              { id: "startTime", label: "Başlangıç Saati" },
                              { id: "endTime", label: "Bitiş Saati" },
                              { id: "sessionCount", label: "Görüşme Sayısı", value: () => "1" }, // Şimdilik sabit değer
                              { id: "personMet", label: "Görüşülen Kişi" },
                              { id: "personRole", label: "Kişi Rolü", value: () => "-" },
                              { id: "relationship", label: "Yakınlık Derecesi", value: (session: CounselingSessionWithStudent) => session.relationshipType || "-" },
                              { id: "topic", label: "Görüşme Konusu" },
                              { id: "workArea", label: "Çalışma Alanı", value: () => "-" },
                              { id: "workCategory", label: "Çalışma Kategorisi", value: () => "-" },
                              { id: "serviceType", label: "Hizmet Türü", value: () => "-" },
                              { id: "institutionalCooperation", label: "Kurum İşbirliği", value: (session: CounselingSessionWithStudent) => session.institutionalCooperation || "-" },
                              { id: "meetingPlace", label: "Görüşme Yeri", value: (session: CounselingSessionWithStudent) => session.sessionLocation || "-" },
                              { id: "isDisciplinary", label: "Disiplin Görüşmesi", value: (session: CounselingSessionWithStudent) => session.disciplineStatus ? "Evet" : "Hayır" },
                              { id: "isLegalReferral", label: "Adli/Sevk", value: () => "Hayır" }, // Şimdilik sabit değer
                              { id: "workMethod", label: "Çalışma Yöntemi", value: (session: CounselingSessionWithStudent) => session.sessionType || "-" },
                              { id: "summary", label: "Özet" }
                            ]
                              .filter(column => visibleColumns.includes(column.id))
                              .map(column => (
                                <th key={column.id} className="px-4 py-2 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">
                                  {column.label}
                                </th>
                              ))}
                            {/* İşlemler sütunu her zaman görünecek */}
                            <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground whitespace-nowrap">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedSessions.map((session: CounselingSessionWithStudent) => (
                            <tr key={session.id} className="border-b hover:bg-muted/40 transition-colors">
                              {/* Dinamik sütun değerleri */}
                              {[
                                { id: "studentNumber", value: session.student?.studentNumber || "-" },
                                { id: "studentName", value: (session.student?.firstName + " " + session.student?.lastName) || "-", className: "font-medium" },
                                { id: "studentClass", value: session.student?.class || "-" },
                                { id: "studentGender", value: session.student?.gender || "-" },
                                { id: "date", value: formatDate(session.sessionDate) },
                                { id: "startTime", value: formatTime(session.entryTime) },
                                { id: "endTime", value: formatTime(session.exitTime || "") },
                                { id: "sessionCount", value: "1" }, // Görüşme sayısı, şimdilik 1
                                { id: "personMet", value: session.participantType || "-" },
                                { id: "personRole", value: "-" }, // Şimdilik boş
                                { id: "relationship", value: session.relationshipType || "-" },
                                { id: "topic", value: session.topic || "-" },
                                { id: "workArea", value: "-" }, // Şimdilik boş
                                { id: "workCategory", value: "-" }, // Şimdilik boş
                                { id: "serviceType", value: "-" }, // Şimdilik boş
                                { id: "institutionalCooperation", value: session.institutionalCooperation || "-" },
                                { id: "meetingPlace", value: session.sessionLocation || "-" },
                                { id: "isDisciplinary", value: session.disciplineStatus ? "Evet" : "Hayır" },
                                { id: "isLegalReferral", value: "Hayır" }, // Şimdilik sabit değer
                                { id: "workMethod", value: session.sessionType || "-" },
                                { id: "summary", value: session.sessionDetails || "-", className: "max-w-xs truncate" }
                              ]
                                .filter(column => visibleColumns.includes(column.id))
                                .map(column => (
                                  <td key={column.id} className={`px-4 py-2 text-xs ${column.className || ""}`}>
                                    {column.value}
                                  </td>
                                ))}
                              {/* İşlemler sütunu */}
                              <td className="px-4 py-2 text-xs">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-blue-500 hover:text-blue-700"
                                  onClick={() => {
                                    setSelectedSession(session);
                                    printCounselingForm();
                                  }}
                                >
                                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                                  Görüntüle
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Yeni Görüşme Formu - Modern, Minimal Tasarım */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <div className="flex flex-col w-full h-full">
            {/* Üst Bilgi Çubuğu */}
            <div className="bg-primary/5 p-5 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-medium">Yeni Görüşme</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Öğrenci ile yapılacak rehberlik görüşmesi
                  </p>
                </div>
                <div>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Bireysel / Grup görüşme seçim sekmeleri */}
            <div className="border-b">
              <Tabs value={formTab} onValueChange={setFormTab} className="w-full">
                <TabsList className="w-full rounded-none border-b bg-transparent h-12 pt-2">
                  <TabsTrigger 
                    value="bireysel" 
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none flex-1"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Bireysel Görüşme
                  </TabsTrigger>
                  <TabsTrigger 
                    value="grup" 
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none flex-1"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Grup Görüşmesi
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-5">
                {/* İlerleme Göstergesi */}
                <div className="w-full flex items-center gap-2 mb-4">
                  <div 
                    className={`h-2 flex-1 rounded-full ${formSection === "student-info" ? "bg-primary" : "bg-primary/30"}`}
                    onClick={() => setFormSection("student-info")}
                  ></div>
                  <div 
                    className={`h-2 flex-1 rounded-full ${formSection === "session-details" ? "bg-primary" : "bg-primary/30"}`}
                    onClick={() => setFormSection("session-details")}
                  ></div>
                  <div 
                    className={`h-2 flex-1 rounded-full ${formSection === "notes" ? "bg-primary" : "bg-primary/30"}`}
                    onClick={() => setFormSection("notes")}
                  ></div>
                </div>

                {/* Öğrenci Bilgileri */}
                {formSection === "student-info" && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-medium">
                      {formTab === "bireysel" ? "Öğrenci Bilgileri" : "Grup Görüşmesi"}
                    </h3>
                    
                    {/* Bireysel görüşme öğrenci seçimi */}
                    {formTab === "bireysel" && (
                      <FormField
                        control={form.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem className="mb-5">
                            <FormLabel>Öğrenci <span className="text-red-500">*</span></FormLabel>
                            <div className="relative">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={`w-full justify-between ${!field.value ? "text-muted-foreground" : ""}`}
                                    >
                                      {field.value ? (
                                        students.find(s => s.id === field.value)?.firstName + " " + 
                                        students.find(s => s.id === field.value)?.lastName + " - " +
                                        students.find(s => s.id === field.value)?.class
                                      ) : (
                                        "Öğrenci seçin..."
                                      )}
                                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <div className="flex items-center p-3 border-b">
                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                    <Input
                                      placeholder="Öğrenci ara..."
                                      className="border-0 focus-visible:ring-0"
                                      value={studentSearchTerm}
                                      onChange={(e) => handleStudentSearch(e.target.value)}
                                    />
                                  </div>
                                  <Command>
                                    <CommandList>
                                      <CommandEmpty>Öğrenci bulunamadı</CommandEmpty>
                                      <CommandGroup className="max-h-[200px] overflow-auto">
                                        {getFilteredStudents().map((student: Student) => (
                                          <CommandItem
                                            key={student.id}
                                            value={student.firstName + " " + student.lastName}
                                            onSelect={() => {
                                              field.onChange(student.id);
                                              handleStudentSearch("");
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === student.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div className="flex flex-col">
                                              <span>{student.firstName} {student.lastName}</span>
                                              <span className="text-xs text-muted-foreground">{student.class} • No: {student.studentNumber}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Grup görüşmesi için öğrenci seçimi */}
                    {formTab === "grup" && (
                      <div className="mb-5">
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel>Grup Üyeleri <span className="text-red-500">*</span></FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Öğrenci Ekle
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <div className="flex items-center p-3 border-b">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                <Input
                                  placeholder="Öğrenci ara..."
                                  className="border-0 focus-visible:ring-0"
                                  value={studentSearchTerm}
                                  onChange={(e) => handleStudentSearch(e.target.value)}
                                />
                              </div>
                              <Command>
                                <CommandList>
                                  <CommandEmpty>Öğrenci bulunamadı</CommandEmpty>
                                  <CommandGroup className="max-h-[200px] overflow-auto">
                                    {getFilteredStudents().map((student: Student) => (
                                      <CommandItem
                                        key={student.id}
                                        value={student.firstName + " " + student.lastName}
                                        onSelect={() => {
                                          addStudentToGroup(student);
                                          handleStudentSearch("");
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedStudents.some(s => s.id === student.id) ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span>{student.firstName} {student.lastName}</span>
                                          <span className="text-xs text-muted-foreground">{student.class} • No: {student.studentNumber}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {selectedStudents.length > 0 ? (
                          <div className="border rounded-md p-3 space-y-2">
                            {selectedStudents.map((student) => (
                              <div 
                                key={student.id} 
                                className="flex justify-between items-center p-2 rounded bg-muted/50"
                              >
                                <div>
                                  <p className="font-medium text-sm">{student.firstName} {student.lastName}</p>
                                  <p className="text-xs text-muted-foreground">{student.class} • No: {student.studentNumber}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => removeStudentFromGroup(student.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border rounded-md p-6 flex flex-col items-center justify-center text-center">
                            <Users className="h-8 w-8 mb-2 text-muted-foreground" />
                            <h4 className="text-sm font-medium mb-1">Henüz öğrenci eklenmedi</h4>
                            <p className="text-xs text-muted-foreground mb-3">
                              Grup görüşmesine katılacak öğrencileri eklemek için "Öğrenci Ekle" butonunu kullanın.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tarih & Saat Bilgisi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sessionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Görüşme Tarihi <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="entryTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Görüşme Saati <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Saat değiştiğinde ders saatini otomatik güncelle
                                  const matchingClassHourId = getClassHourByTime(e.target.value);
                                  if (matchingClassHourId) {
                                    form.setValue("entryClassHourId", matchingClassHourId);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="entryClassHourId"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Ders Saati</FormLabel>
                            <Select
                              value={field.value?.toString() || getCurrentClassHour()?.toString() || ""}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Ders saati seçin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {classHours.map((hour: any) => (
                                  <SelectItem key={hour.id} value={hour.id.toString()}>
                                    {hour.name} ({hour.startTime} - {hour.endTime})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end mt-6">
                      <Button 
                        type="button" 
                        onClick={() => setFormSection("session-details")}
                        className="gap-2"
                      >
                        Devam Et
                        <ChevronDown className="h-4 w-4 rotate-270" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Görüşme Detayları */}
                {formSection === "session-details" && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-medium">Görüşme Detayları</h3>
                    
                    {/* Görüşme Konusu */}
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem className="mb-5">
                          <FormLabel>Görüşme Konusu <span className="text-red-500">*</span></FormLabel>
                          <div className="relative">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={`w-full justify-between ${!field.value ? "text-muted-foreground" : ""}`}
                                  >
                                    {field.value || "Görüşme konusu seçin..."}
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0">
                                <div className="flex items-center p-3 border-b">
                                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                  <Input
                                    placeholder="Konu ara..."
                                    className="border-0 focus-visible:ring-0"
                                    value={topicSearchTerm}
                                    onChange={(e) => setTopicSearchTerm(e.target.value)}
                                  />
                                </div>
                                <Command>
                                  <CommandList>
                                    <CommandEmpty>Sonuç bulunamadı</CommandEmpty>
                                    <CommandGroup className="max-h-[200px] overflow-auto">
                                      {filteredTopics.map((topic: any) => (
                                        <CommandItem
                                          key={topic.id}
                                          value={topic.topic}
                                          onSelect={() => {
                                            field.onChange(topic.topic);
                                            setTopicSearchTerm("");
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === topic.topic ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {topic.topic}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Katılımcı Bilgileri */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="participantType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Görüşülen Kişi <span className="text-red-500">*</span></FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {participantTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("participantType") === "veli" && (
                        <FormField
                          control={form.control}
                          name="relationshipType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Yakınlık Derecesi</FormLabel>
                              <Select
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Yakınlık derecesi seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {relationshipTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
                    {/* Görüşme Yeri ve Türü */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sessionLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Görüşme Yeri <span className="text-red-500">*</span></FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sessionLocations.map((location) => (
                                  <SelectItem key={location.value} value={location.value}>
                                    {location.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sessionType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Görüşme Şekli <span className="text-red-500">*</span></FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sessionTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Diğer Katılımcılar */}
                    <FormField
                      control={form.control}
                      name="otherParticipants"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diğer Katılımcılar</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Görüşmede bulunan diğer kişileri yazın (isteğe bağlı)" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between mt-6">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setFormSection("student-info")}
                      >
                        Geri
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => setFormSection("notes")}
                        className="gap-2"
                      >
                        Devam Et
                        <ChevronDown className="h-4 w-4 rotate-270" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notlar */}
                {formSection === "notes" && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-medium">Görüşme Notları</h3>
                    
                    <FormField
                      control={form.control}
                      name="sessionDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Görüşme Detayları</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Görüşmede konuşulan konular, alınan kararlar ve yapılacaklar hakkında notlar..." 
                              rows={8}
                              className="resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between mt-6">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setFormSection("session-details")}
                      >
                        Geri
                      </Button>
                      <div className="space-x-2">
                        <Button 
                          type="button"
                          variant="ghost"
                          onClick={() => setDialogOpen(false)}
                        >
                          İptal
                        </Button>
                        <Button 
                          type="submit"
                          className="gap-2"
                          disabled={createSessionMutation.isPending}
                        >
                          {createSessionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                          Görüşmeyi Başlat
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Görüşme Tamamlama Formu */}
      {/* Görüşme Tamamlama Formu - Modern, Minimal Tasarım */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="flex flex-col w-full h-full">
            {/* Üst Bilgi Çubuğu */}
            <div className="bg-green-50 p-5 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-medium text-green-700">Görüşmeyi Tamamla</h2>
                  {selectedSession && (
                    <p className="text-sm text-green-600 mt-1">
                      <span className="font-medium">{selectedSession.student?.firstName} {selectedSession.student?.lastName}</span> 
                      ile görüşmeyi sonlandır
                    </p>
                  )}
                </div>
                <div>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                    {formatTime(new Date().toTimeString().slice(0, 5))}
                  </Badge>
                </div>
              </div>
            </div>

            <Form {...completeForm}>
              <form onSubmit={completeForm.handleSubmit(onCompleteSubmit)} className="p-5 space-y-5">
                <div className="p-4 rounded-md bg-green-50/50 border border-green-100 text-sm flex items-start">
                  <Check className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-green-700 font-medium">Görüşme Bilgileri</p>
                    <p className="text-green-600 mt-1">
                      Giriş: {selectedSession?.entryTime} • Konu: {selectedSession?.topic}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Çıkış Bilgileri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={completeForm.control}
                      name="exitTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Çıkış Saati <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field} 
                              className="focus-visible:ring-green-500"
                              onChange={(e) => {
                                field.onChange(e);
                                // Saat değiştiğinde ders saatini otomatik güncelle
                                const matchingClassHourId = getClassHourByTime(e.target.value);
                                if (matchingClassHourId) {
                                  completeForm.setValue("exitClassHourId", matchingClassHourId);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={completeForm.control}
                      name="exitClassHourId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ders Saati</FormLabel>
                          <Select
                            value={field.value?.toString() || getCurrentClassHourForExit()?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger className="focus:ring-green-500">
                                <SelectValue placeholder="Ders saati seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {classHours.map((hour: any) => (
                                <SelectItem key={hour.id} value={hour.id.toString()}>
                                  {hour.name} ({hour.startTime} - {hour.endTime})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Detaylı Notlar */}
                  <FormField
                    control={completeForm.control}
                    name="detailedNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Görüşme Notları</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Görüşmede konuşulanlar, alınan kararlar ve yapılacak işlemler hakkında notlar..."
                            rows={6}
                            className="resize-none focus-visible:ring-green-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between mt-6 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={printCounselingForm}
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Formu Yazdır
                  </Button>
                  <div className="space-x-3">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setCompleteDialogOpen(false)}
                    >
                      İptal
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 gap-2"
                      disabled={completeSessionMutation.isPending}
                    >
                      {completeSessionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Görüşmeyi Tamamla
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}