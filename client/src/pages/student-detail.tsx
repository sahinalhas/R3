import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  Edit, 
  Calendar, 
  MoreVertical, 
  AlertCircle, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Clock, 
  MessageSquare,
  GraduationCap,
  Cake,
  User2,
  BookOpen,
  Clock8,
  ListChecks,
  BarChart
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import StudentForm from "@/components/students/student-form";
import AppointmentForm from "@/components/appointments/appointment-form";
import StudyPlanForm from "@/components/study-plans/study-plan-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getInitials, getStatusClass, calculateAge } from "@/lib/utils";
import { 
  Student, 
  Appointment, 
  InsertStudent, 
  InsertAppointment, 
  CounselingSession, 
  StudyPlan, 
  SubjectProgress,
  InsertStudyPlan,
  Course,
  CourseSubject,
  InsertSubjectProgress
} from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function StudentDetailPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddAppointmentDialogOpen, setIsAddAppointmentDialogOpen] = useState(false);
  const [isAddStudyPlanDialogOpen, setIsAddStudyPlanDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Öğrenci bilgilerini çek
  const { data: student, isLoading, error } = useQuery<Student>({
    queryKey: [`/api/students/${id}`],
  });

  // Hata yönetimi
  if (error) {
    toast({
      title: "Hata",
      description: "Öğrenci bilgileri yüklenemedi",
      variant: "destructive",
    });
    navigate("/students");
    return null;
  }

  // Öğrenci randevularını çek
  const { data: appointments, isLoading: isAppointmentsLoading } = useQuery<Appointment[]>({
    queryKey: [`/api/students/${id}/appointments`],
    enabled: !!student,
  });
  
  // Öğrencinin rehberlik görüşmelerini çek
  const { data: counselingSessions, isLoading: isCounselingSessionsLoading } = useQuery<CounselingSession[]>({
    queryKey: [`/api/students/${id}/counseling-sessions`],
    enabled: !!student,
  });
  
  // Öğrencinin çalışma planlarını çek
  const { data: studyPlans, isLoading: isStudyPlansLoading } = useQuery<StudyPlan[]>({
    queryKey: [`/api/students/${id}/study-plans`],
    enabled: !!student,
  });
  
  // Tüm dersleri çek
  const { data: courses, isLoading: isCoursesLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
    enabled: !!student,
  });
  
  // Öğrencinin konu ilerlemelerini çek
  const { data: subjectProgress, isLoading: isSubjectProgressLoading } = useQuery<SubjectProgress[]>({
    queryKey: [`/api/students/${id}/subject-progress`],
    enabled: !!student,
  });

  // Öğrenci güncelleme mutation
  const updateStudentMutation = useMutation({
    mutationFn: async (data: Partial<InsertStudent>) => {
      const res = await apiRequest("PUT", `/api/students/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Öğrenci bilgileri başarıyla güncellendi",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/students/${id}`] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Randevu ekleme mutation
  const addAppointmentMutation = useMutation({
    mutationFn: async (appointment: InsertAppointment) => {
      const res = await apiRequest("POST", "/api/appointments", appointment);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Randevu başarıyla oluşturuldu",
      });
      setIsAddAppointmentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/students/${id}/appointments`] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditStudent = (data: InsertStudent) => {
    updateStudentMutation.mutate(data);
  };

  const handleAddAppointment = (data: InsertAppointment) => {
    if (student && user) {
      addAppointmentMutation.mutate({
        ...data,
        studentId: student.id,
        counselorId: user.id,
      });
    }
  };
  
  // Çalışma planı ekleme mutation
  const addStudyPlanMutation = useMutation({
    mutationFn: async (studyPlan: InsertStudyPlan) => {
      const res = await apiRequest("POST", "/api/study-plans", studyPlan);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Çalışma planı başarıyla oluşturuldu",
      });
      setIsAddStudyPlanDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/students/${id}/study-plans`] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddStudyPlan = (data: Partial<InsertStudyPlan>) => {
    if (student) {
      addStudyPlanMutation.mutate({
        ...data,
        studentId: student.id,
      } as InsertStudyPlan);
    }
  };

  // Tablo sütunları - Randevular için
  const appointmentColumns = [
    {
      header: "Tarih",
      accessorKey: "date",
      cell: (appointment: Appointment) => formatDate(appointment.date),
    },
    {
      header: "Saat",
      accessorKey: "time",
    },
    {
      header: "Durum",
      accessorKey: "status",
      cell: (appointment: Appointment) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${getStatusClass(
            appointment.status
          )}`}
        >
          {appointment.status === "onaylandı"
            ? "Onaylandı"
            : appointment.status === "beklemede"
            ? "Beklemede"
            : appointment.status === "iptal"
            ? "İptal"
            : appointment.status === "tamamlandı"
            ? "Tamamlandı"
            : appointment.status}
        </span>
      ),
    },
    {
      header: "Notlar",
      accessorKey: "notes",
      cell: (appointment: Appointment) => (
        <div className="max-w-xs truncate">{appointment.notes}</div>
      ),
    },
    {
      header: "İşlemler",
      accessorKey: "actions",
      cell: () => (
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      ),
    },
  ];
  
  // Tablo sütunları - Rehberlik Oturumları için
  const counselingSessionColumns = [
    {
      header: "Tarih",
      accessorKey: "sessionDate",
      cell: (session: CounselingSession) => formatDate(session.sessionDate),
    },
    {
      header: "Giriş Saati",
      accessorKey: "entryTime",
    },
    {
      header: "Çıkış Saati",
      accessorKey: "exitTime",
      cell: (session: CounselingSession) => session.exitTime || "-",
    },
    {
      header: "Konu",
      accessorKey: "topic",
      cell: (session: CounselingSession) => (
        <div className="max-w-xs truncate">{session.topic}</div>
      ),
    },
    {
      header: "Türü",
      accessorKey: "sessionType",
      cell: (session: CounselingSession) => (
        <Badge variant="outline" className="capitalize">
          {session.sessionType || "Bireysel"}
        </Badge>
      ),
    },
    {
      header: "Detay",
      accessorKey: "actions",
      cell: (session: CounselingSession) => (
        <Button variant="ghost" size="icon">
          <FileText className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Layout title="Öğrenci Detayı" description="Öğrenci bilgileri yükleniyor...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout title="Hata" description="Öğrenci bulunamadı">
        <Card>
          <CardContent className="pt-6">
            <div className="flex mb-4 items-center gap-2">
              <AlertCircle className="h-8 w-8 text-error" />
              <h1 className="text-xl font-bold">Öğrenci Bulunamadı</h1>
            </div>
            <p className="mb-4">
              Aradığınız öğrenci bulunamadı veya erişim izniniz yok.
            </p>
            <Button onClick={() => navigate("/students")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Öğrenci Listesine Dön
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout
      title="Öğrenci Detayı"
      description={`${student.firstName} ${student.lastName} bilgileri`}
    >
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/students")}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Geri Dön</span>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAddAppointmentDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Randevu Oluştur</span>
          </Button>
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            <span>Düzenle</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Ana öğrenci bilgileri kartı - Daha modern ve görsel */}
        <Card className="col-span-1 lg:col-span-1 overflow-hidden border-0 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="bg-gradient-to-br from-primary to-secondary h-32 flex justify-center items-end">
            <Avatar className="h-24 w-24 border-4 border-background translate-y-12 shadow-soft">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                {getInitials(`${student.firstName} ${student.lastName}`)}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardContent className="pt-16 pb-4">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-semibold mt-2">{`${student.firstName} ${student.lastName}`}</h2>
              <Badge variant="outline" className="mt-1 mb-2">
                {student.class}
              </Badge>
              <p className="text-muted-foreground mb-4">{student.studentNumber}</p>
              
              <Separator className="my-4" />
              
              <div className="w-full space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <div className="truncate">{student.class}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Cake className="h-5 w-5 text-primary" />
                  <div>{formatDate(student.birthDate)} ({calculateAge(student.birthDate)} yaş)</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User2 className="h-5 w-5 text-primary" />
                  <div>{student.gender === "erkek" ? "Erkek" : "Kadın"}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-5 w-5 text-primary" />
                  <div className="truncate">{student.parentName}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>{student.phone}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div className="truncate">{student.address}</div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* Eğitim kartı özet bilgileri */}
              <div className="w-full grid grid-cols-2 gap-2 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-semibold">{counselingSessions?.length || 0}</span>
                  <span className="text-xs text-muted-foreground">Rehberlik Görüşmesi</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-semibold">{appointments?.length || 0}</span>
                  <span className="text-xs text-muted-foreground">Randevu</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-4">
            <Button onClick={() => setIsEditDialogOpen(true)} variant="outline" className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              Öğrenci Bilgilerini Düzenle
            </Button>
          </CardFooter>
        </Card>

        {/* Detay kartları - Daha fazla sekme ve modern görünüm */}
        <Card className="col-span-1 lg:col-span-3 border-0 shadow-card hover:shadow-card-hover transition-shadow">
          <CardContent className="pt-6">
            <Tabs defaultValue="identity">
              <TabsList className="mb-6 w-full justify-start">
                <TabsTrigger value="identity" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Kimlik ve Veli Bilgileri</span>
                </TabsTrigger>
                <TabsTrigger value="academic" className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Akademik Gelişim</span>
                </TabsTrigger>
                <TabsTrigger value="psychosocial" className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Psiko-Sosyal Gelişim</span>
                </TabsTrigger>
                <TabsTrigger value="career" className="flex items-center">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span>Kariyer Planlama</span>
                </TabsTrigger>
                <TabsTrigger value="pdr-journal" className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>PDR Günlüğü</span>
                </TabsTrigger>
              </TabsList>
              
              {/* BRYS Tab 1: Kimlik ve Veli Bilgileri */}
              <TabsContent value="identity" className="border rounded-lg p-4 bg-background/50">
                <div className="space-y-6">
                  {/* Temel Kimlik Bilgileri */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <User className="mr-2 h-5 w-5 text-primary" />
                      Kimlik Bilgileri
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Ad Soyad:</span>
                              <span className="font-medium">{student.firstName} {student.lastName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">TC Kimlik No:</span>
                              <span className="font-medium">{student.tcKimlikNo || "Belirtilmemiş"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Öğrenci No:</span>
                              <span className="font-medium">{student.studentNumber}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Sınıf:</span>
                              <span className="font-medium">{student.class}</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Doğum Tarihi:</span>
                              <span className="font-medium">{formatDate(student.birthDate)} ({calculateAge(student.birthDate)} yaş)</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Cinsiyet:</span>
                              <span className="font-medium">{student.gender === "erkek" ? "Erkek" : "Kadın"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Kardeş Sayısı:</span>
                              <span className="font-medium">{student.siblingCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Aile Yapısı:</span>
                              <span className="font-medium">{student.familyStructure || "Belirtilmemiş"}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Ana Bilgileri */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <User className="mr-2 h-5 w-5 text-primary" />
                      Anne Bilgileri
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Ad Soyad:</span>
                              <span className="font-medium">{student.motherName || "Belirtilmemiş"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Meslek:</span>
                              <span className="font-medium">{student.motherProfession || "Belirtilmemiş"}</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Eğitim Durumu:</span>
                              <span className="font-medium">{student.motherEducation || "Belirtilmemiş"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Telefon:</span>
                              <span className="font-medium">{student.motherPhone || "Belirtilmemiş"}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Baba Bilgileri */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <User className="mr-2 h-5 w-5 text-primary" />
                      Baba Bilgileri
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Ad Soyad:</span>
                              <span className="font-medium">{student.fatherName || "Belirtilmemiş"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Meslek:</span>
                              <span className="font-medium">{student.fatherProfession || "Belirtilmemiş"}</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Eğitim Durumu:</span>
                              <span className="font-medium">{student.fatherEducation || "Belirtilmemiş"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Telefon:</span>
                              <span className="font-medium">{student.fatherPhone || "Belirtilmemiş"}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* İletişim ve Acil Durum */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <Phone className="mr-2 h-5 w-5 text-primary" />
                      İletişim Bilgileri
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Birincil Veli:</span>
                            <span className="font-medium">{student.parentName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Telefon:</span>
                            <span className="font-medium">{student.phone}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">E-posta:</span>
                            <span className="font-medium">{student.email || "Belirtilmemiş"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Adres:</span>
                            <span className="font-medium truncate max-w-md">{student.address}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Acil Durum İletişim:</span>
                            <span className="font-medium">{student.emergencyContact || "Belirtilmemiş"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Acil Durum Telefon:</span>
                            <span className="font-medium">{student.emergencyPhone || "Belirtilmemiş"}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Notlar */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <FileText className="mr-2 h-5 w-5 text-primary" />
                      Notlar
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <p className="text-sm">{student.notes || "Öğrenci için not bulunmuyor."}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              {/* BRYS Tab 2: Akademik Gelişim */}
              <TabsContent value="academic" className="border rounded-lg p-4 bg-background/50">
                <div className="space-y-6">
                  {/* Akademik Performans Özeti */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <BarChart className="mr-2 h-5 w-5 text-primary" />
                      Akademik Performans Özeti
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">85</div>
                            <div className="text-sm text-muted-foreground">Genel Ortalama</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">12</div>
                            <div className="text-sm text-muted-foreground">Başarılı Ders</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">3</div>
                            <div className="text-sm text-muted-foreground">Geliştirilmesi Gereken</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Çalışma Planları */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="flex items-center text-lg font-medium">
                        <Clock8 className="mr-2 h-5 w-5 text-primary" />
                        Çalışma Planları
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsAddStudyPlanDialogOpen(true)}
                      >
                        <Clock8 className="mr-2 h-4 w-4" />
                        Plan Oluştur
                      </Button>
                    </div>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        {isStudyPlansLoading ? (
                          <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                          </div>
                        ) : studyPlans && studyPlans.length > 0 ? (
                          <div className="space-y-4">
                            {studyPlans.map((plan) => {
                              const course = courses?.find(c => c.id === plan.courseId);
                              return (
                                <div key={plan.id} className="flex flex-col p-3 border rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <h4 className="font-medium">{course?.name || 'Tanımlanmamış Ders'}</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {formatDate(plan.date)} · {plan.startTime} - {plan.endTime}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant="outline">
                                      {plan.status === 'completed' ? 'Tamamlandı' : 'Planlanan'}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            Henüz çalışma planı oluşturulmamış
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Konu İlerlemeleri */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <ListChecks className="mr-2 h-5 w-5 text-primary" />
                      Konu İlerlemeleri
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        {isSubjectProgressLoading ? (
                          <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                          </div>
                        ) : subjectProgress && subjectProgress.length > 0 ? (
                          <div className="space-y-4">
                            {subjectProgress.map((progress) => (
                              <div key={progress.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <h4 className="font-medium">{progress.subjectName}</h4>
                                  <p className="text-sm text-muted-foreground">Son güncelleme: {formatDate(progress.lastUpdated)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Progress value={progress.completionPercentage} className="w-20" />
                                  <span className="text-sm font-medium">{progress.completionPercentage}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            Henüz konu ilerlemesi kaydı bulunmuyor
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Akademik Hedefler */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <GraduationCap className="mr-2 h-5 w-5 text-primary" />
                      Akademik Hedefler
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Matematik Not Ortalaması</h4>
                              <p className="text-sm text-muted-foreground">Hedef: 85+ ortalama</p>
                            </div>
                            <Badge variant="secondary">Devam Ediyor</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Fen Bilimleri Başarısı</h4>
                              <p className="text-sm text-muted-foreground">Hedef: Sınıf birinciliği</p>
                            </div>
                            <Badge variant="secondary">Planlanan</Badge>
                          </div>
                          <div className="text-center py-4">
                            <Button variant="outline" size="sm">
                              <GraduationCap className="mr-2 h-4 w-4" />
                              Yeni Hedef Ekle
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* BRYS Tab 3: Psiko-Sosyal Gelişim */}
              <TabsContent value="psychosocial" className="border rounded-lg p-4 bg-background/50">
                <div className="space-y-6">
                  {/* Gelişim Alanları Özeti */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                      Psiko-Sosyal Gelişim Alanları
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <h4 className="font-medium mb-3">Sosyal Beceriler</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>İletişim</span>
                              <Badge variant="outline" className="bg-green-50 text-green-700">Güçlü</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Takım Çalışması</span>
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Geliştirilmeli</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Liderlik</span>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">Orta</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <h4 className="font-medium mb-3">Duygusal Gelişim</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Öz Güven</span>
                              <Badge variant="outline" className="bg-green-50 text-green-700">Yüksek</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Stres Yönetimi</span>
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Geliştirilmeli</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Empati</span>
                              <Badge variant="outline" className="bg-green-50 text-green-700">Güçlü</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* İlgi ve Yetenek Alanları */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <User className="mr-2 h-5 w-5 text-primary" />
                      İlgi ve Yetenek Alanları
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Güçlü Yönleri</h4>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">Analitik Düşünme</Badge>
                              <Badge variant="secondary">Yaratıcılık</Badge>
                              <Badge variant="secondary">Problem Çözme</Badge>
                              <Badge variant="secondary">Sanat Yeteneği</Badge>
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <h4 className="font-medium mb-2">İlgi Alanları</h4>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">Bilim</Badge>
                              <Badge variant="outline">Teknoloji</Badge>
                              <Badge variant="outline">Müzik</Badge>
                              <Badge variant="outline">Spor</Badge>
                              <Badge variant="outline">Resim</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Yaşam Olayları */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <AlertCircle className="mr-2 h-5 w-5 text-primary" />
                      Önemli Yaşam Olayları
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground">
                          Henüz önemli yaşam olayı kaydı bulunmuyor
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* BRYS Tab 4: Kariyer Planlama */}
              <TabsContent value="career" className="border rounded-lg p-4 bg-background/50">
                <div className="space-y-6">
                  {/* Kariyer Hedefleri */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <GraduationCap className="mr-2 h-5 w-5 text-primary" />
                      Kariyer Hedefleri
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Kısa Vadeli Hedef</h4>
                              <p className="text-sm text-muted-foreground">Lise sınavlarında başarılı olmak</p>
                            </div>
                            <Badge variant="secondary">Aktif</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">Uzun Vadeli Hedef</h4>
                              <p className="text-sm text-muted-foreground">Mühendislik fakültesinde okumak</p>
                            </div>
                            <Badge variant="outline">Planlanan</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Meslek Keşfi */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <User className="mr-2 h-5 w-5 text-primary" />
                      Meslek Keşfi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <h4 className="font-medium mb-3">İlgilenilen Meslekler</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Bilgisayar Mühendisi</span>
                              <Badge variant="outline">%85 Uyum</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Grafik Tasarımcı</span>
                              <Badge variant="outline">%70 Uyum</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Öğretmen</span>
                              <Badge variant="outline">%60 Uyum</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <h4 className="font-medium mb-3">Yetenek Testleri</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Mantıksal Zeka</span>
                              <Badge variant="secondary">Yüksek</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Görsel Zeka</span>
                              <Badge variant="secondary">Orta-Yüksek</Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Sosyal Zeka</span>
                              <Badge variant="secondary">Orta</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Üniversite Planlaması */}
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-3">
                      <BookOpen className="mr-2 h-5 w-5 text-primary" />
                      Üniversite Planlaması
                    </h3>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Hedef Üniversiteler</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                                <span>İstanbul Teknik Üniversitesi - Bilgisayar Müh.</span>
                                <Badge variant="outline">1. Tercih</Badge>
                              </div>
                              <div className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                                <span>Orta Doğu Teknik Üniversitesi - Bilgisayar Müh.</span>
                                <Badge variant="outline">2. Tercih</Badge>
                              </div>
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <h4 className="font-medium mb-2">Hazırlık Durumu</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Matematik TYT Hazırlığı</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={75} className="w-20" />
                                  <span className="text-sm">75%</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Fen Bilimleri AYT Hazırlığı</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={60} className="w-20" />
                                  <span className="text-sm">60%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* BRYS Tab 5: PDR Günlüğü - Enhanced Counseling Sessions */}
              <TabsContent value="pdr-journal" className="border rounded-lg p-4 bg-background/50">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="flex items-center text-lg font-medium">
                      <FileText className="mr-2 h-5 w-5 text-primary" />
                      PDR Günlüğü - Rehberlik Görüşme Kayıtları
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        navigate("/counseling-sessions");
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Yeni Görüşme Ekle
                    </Button>
                  </div>

                  <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                    <CardContent className="pt-4">
                      <DataTable
                        data={counselingSessions || []}
                        columns={counselingSessionColumns}
                        loading={isCounselingSessionsLoading}
                        emptyState="Henüz rehberlik görüşme kaydı bulunmuyor"
                      />
                    </CardContent>
                  </Card>

                  {/* Görüşme İstatistikleri */}
                  <div>
                    <h4 className="flex items-center text-md font-medium mb-3">
                      <BarChart className="mr-2 h-4 w-4 text-primary" />
                      Görüşme İstatistikleri
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{counselingSessions?.length || 0}</div>
                            <div className="text-sm text-muted-foreground">Toplam Görüşme</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {counselingSessions?.filter(s => s.sessionType === 'bireysel').length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Bireysel Görüşme</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {counselingSessions?.filter(s => s.sessionType === 'grup').length || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">Grup Görüşmesi</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Old content to remove */}
              <TabsContent value="counseling">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center text-lg font-medium">
                    <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                    Rehberlik Görüşme Kayıtları
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Burada href yerine programatik yönlendirme kullanıyoruz
                      navigate("/counseling-sessions");
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Yeni Görüşme Ekle
                  </Button>
                </div>

                <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="pt-4">
                    <DataTable
                      data={counselingSessions || []}
                      columns={counselingSessionColumns}
                      loading={isCounselingSessionsLoading}
                      emptyState="Henüz rehberlik görüşme kaydı bulunmuyor"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Randevular Sekmesi */}
              <TabsContent value="appointments">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center text-lg font-medium">
                    <Calendar className="mr-2 h-5 w-5 text-primary" />
                    Randevu Geçmişi
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setIsAddAppointmentDialogOpen(true)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Yeni Randevu
                  </Button>
                </div>

                <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="pt-4">
                    <DataTable
                      data={appointments || []}
                      columns={appointmentColumns}
                      loading={isAppointmentsLoading}
                      emptyState="Henüz randevu kaydı bulunmuyor"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Çalışma Planı Sekmesi */}
              <TabsContent value="study-plans">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center text-lg font-medium">
                    <Clock8 className="mr-2 h-5 w-5 text-primary" />
                    Çalışma Planı
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsAddStudyPlanDialogOpen(true)}
                  >
                    <Clock8 className="mr-2 h-4 w-4" />
                    Plan Oluştur
                  </Button>
                </div>

                {isStudyPlansLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : studyPlans && studyPlans.length > 0 ? (
                  <div className="space-y-4">
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">Haftalık Çalışma Takvimi</CardTitle>
                        <CardDescription>
                          Planlanan çalışma saatleri
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {studyPlans.map((plan) => {
                            const course = courses?.find(c => c.id === plan.courseId);
                            return (
                              <div key={plan.id} className="flex flex-col p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                      <BookOpen className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium">{course?.name || 'Tanımlanmamış Ders'}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {formatDate(plan.date)} · {plan.startTime} - {plan.endTime}
                                      </p>
                                    </div>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        // Plana ait konuları yükleme
                                        const response = await fetch(`/api/study-plans/${plan.id}/subjects`);
                                        const subjects = await response.json();
                                        
                                        if (subjects && subjects.length > 0) {
                                          toast({
                                            title: "Plan Konuları",
                                            description: `${subjects.length} konu planlanmış`,
                                          });
                                        } else {
                                          // Konuları oluştur
                                          const generateResponse = await fetch(`/api/study-plans/${plan.id}/generate-subjects`, {
                                            method: 'POST'
                                          });
                                          const generatedSubjects = await generateResponse.json();
                                          toast({
                                            title: "Konu Planlaması",
                                            description: `${generatedSubjects.length} konu planlandı`,
                                          });
                                        }
                                      } catch (error) {
                                        console.error("Konu planları yüklenirken hata:", error);
                                        toast({
                                          title: "Hata",
                                          description: "Konu planları yüklenirken bir hata oluştu",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <ListChecks className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                {/* Plan Detay Kısmı - Açılabilir/Kapanabilir veya Her zaman gösterilen modal olabilir */}
                                <div className="mt-2 text-sm text-muted-foreground">
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="p-0 h-auto"
                                    onClick={async () => {
                                      try {
                                        // Plana ait konuları yükle
                                        const response = await fetch(`/api/study-plans/${plan.id}/subjects`);
                                        const subjects = await response.json();
                                        
                                        if (subjects && subjects.length > 0) {
                                          toast({
                                            title: "Plan Konuları",
                                            description: `Bu planda ${subjects.length} konu çalışması planlanmış. Konu İlerlemesi sekmesinden takip edebilirsiniz.`,
                                          });
                                        } else {
                                          toast({
                                            title: "Bilgi",
                                            description: "Bu plan için henüz konu planlaması yapılmamış. Konuları görmek için yenileyin.",
                                          });
                                        }
                                      } catch (error) {
                                        console.error("Konu planları yüklenirken hata:", error);
                                      }
                                    }}
                                  >
                                    Konuları Göster
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">Bu Haftanın İstatistikleri</CardTitle>
                        <CardDescription>
                          Toplam çalışma süreleri ve tamamlanan konular
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">Toplam Çalışma Süresi</h4>
                              <p className="text-2xl font-bold">
                                {studyPlans.reduce((acc, plan) => {
                                  const startTime = plan.startTime.split(':').map(Number);
                                  const endTime = plan.endTime.split(':').map(Number);
                                  const startMinutes = startTime[0] * 60 + startTime[1];
                                  const endMinutes = endTime[0] * 60 + endTime[1];
                                  return acc + (endMinutes - startMinutes);
                                }, 0) / 60} saat
                              </p>
                            </div>
                            <div>
                              <h4 className="font-medium">Planlanan Ders Sayısı</h4>
                              <p className="text-2xl font-bold">{studyPlans.length}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Clock8 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Henüz çalışma planı bulunmuyor</h3>
                      <p className="text-muted-foreground text-center mb-6">
                        Öğrencinin haftalık çalışma planı oluşturmak için "Plan Oluştur" düğmesine tıklayın.
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => setIsAddStudyPlanDialogOpen(true)}
                      >
                        <Clock8 className="mr-2 h-4 w-4" />
                        Plan Oluştur
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Konu Takibi Sekmesi */}
              <TabsContent value="subject-progress">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center text-lg font-medium">
                    <ListChecks className="mr-2 h-5 w-5 text-primary" />
                    Konu Takibi
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Bilgi",
                        description: "Konu takibi kaydetmek için işlevsellik yakında eklenecek.",
                      });
                    }}
                  >
                    <BarChart className="mr-2 h-4 w-4" />
                    İlerleme Kaydet
                  </Button>
                </div>

                {isSubjectProgressLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : subjectProgress && subjectProgress.length > 0 ? (
                  <div className="space-y-4">
                    {subjectProgress.map((progress) => {
                      const subject = courses?.flatMap(c => {
                        // Her dersin konularını getirmenin bir yolu olmadığı için şimdilik sadece ders adını gösteriyoruz
                        return { 
                          id: progress.subjectId, 
                          name: `Konu #${progress.subjectId}` 
                        };
                      }).find(s => s.id === progress.subjectId);
                      
                      const completionPercentage = (progress.completedTime / progress.totalTime) * 100;
                      
                      return (
                        <Card key={progress.id} className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">{subject?.name || `Konu #${progress.subjectId}`}</h4>
                              <Badge variant={progress.isCompleted ? "success" : "outline"}>
                                {progress.isCompleted ? "Tamamlandı" : "Devam Ediyor"}
                              </Badge>
                            </div>
                            <div className="mb-2">
                              <Progress value={completionPercentage} className="h-2" />
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Tamamlanan: {progress.completedTime} dk</span>
                              <span>Toplam: {progress.totalTime} dk</span>
                            </div>
                            {progress.lastStudyDate && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Son çalışma: {formatDate(progress.lastStudyDate)}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Henüz konu ilerlemesi bulunmuyor</h3>
                      <p className="text-muted-foreground text-center mb-6">
                        Öğrencinin konu takibini başlatmak için "İlerleme Kaydet" düğmesine tıklayın.
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Bilgi",
                            description: "Konu takibi kaydetmek için işlevsellik yakında eklenecek.",
                          });
                        }}
                      >
                        <BarChart className="mr-2 h-4 w-4" />
                        İlerleme Kaydet
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Student Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Öğrenci Düzenle</DialogTitle>
          </DialogHeader>
          <StudentForm
            defaultValues={{
              ...student,
              birthDate: student.birthDate.toString(),
            }}
            onSubmit={handleEditStudent}
            isLoading={updateStudentMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Add Appointment Dialog */}
      <Dialog
        open={isAddAppointmentDialogOpen}
        onOpenChange={setIsAddAppointmentDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Randevu Oluştur</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            defaultValues={{
              studentId: student.id,
              counselorId: user?.id || 0
            }}
            onSubmit={handleAddAppointment}
            isLoading={addAppointmentMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Add Study Plan Dialog */}
      {courses && (
        <Dialog
          open={isAddStudyPlanDialogOpen}
          onOpenChange={setIsAddStudyPlanDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Çalışma Planı Oluştur</DialogTitle>
            </DialogHeader>
            <StudyPlanForm
              courses={courses}
              defaultValues={{
                studentId: student.id,
                date: selectedDate,
              }}
              onSubmit={handleAddStudyPlan}
              isLoading={addStudyPlanMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
