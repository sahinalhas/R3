import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Plus,
  MoreVertical,
  Pencil,
  Check,
  X,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  List,
  Trash,
  Clock,
  Search,
  CalendarDays,
  BadgeCheck,
  XCircle,
  ClipboardList,
  AlarmClock,
  ScrollText,
  MessageCircle,
  UserCircle
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AppointmentForm from "@/components/appointments/appointment-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getInitials, getStatusClass, getStatusText } from "@/lib/utils";
import { Appointment, Student, InsertAppointment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Türkçe ay isimleri
const months = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

// Gün kısaltmaları
const weekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"];

type AppointmentWithStudent = Appointment & { student: Student };

export default function AppointmentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithStudent | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<AppointmentWithStudent | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Randevuları çek
  const {
    data: appointments,
    isLoading,
    refetch,
  } = useQuery<AppointmentWithStudent[]>({
    queryKey: ["/api/appointments"],
  });

  // Öğrencileri çek
  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Filtrelenmiş randevular
  const filteredAppointments = appointments?.filter(appointment => {
    if (!searchQuery) return true;
    
    const studentName = `${appointment.student.firstName} ${appointment.student.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const appointmentDate = formatDate(appointment.date).toLowerCase();
    
    return studentName.includes(query) || 
           appointmentDate.includes(query) || 
           appointment.time.toLowerCase().includes(query) ||
           appointment.status.toLowerCase().includes(query);
  }) || [];

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
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Randevu güncelleme mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertAppointment> }) => {
      const res = await apiRequest("PUT", `/api/appointments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Randevu başarıyla güncellendi",
      });
      setEditingAppointment(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Randevu silme mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Randevu başarıyla silindi",
      });
      setDeletingAppointment(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Randevu durumunu güncelleme
  const updateAppointmentStatus = (appointment: AppointmentWithStudent, status: string) => {
    updateAppointmentMutation.mutate({
      id: appointment.id,
      data: { status },
    });
  };

  const handleAddAppointment = (data: InsertAppointment) => {
    if (user) {
      addAppointmentMutation.mutate({
        ...data,
        counselorId: user.id,
      });
    }
  };

  const handleEditAppointment = (data: InsertAppointment) => {
    if (editingAppointment) {
      updateAppointmentMutation.mutate({
        id: editingAppointment.id,
        data,
      });
    }
  };

  const handleDeleteAppointment = () => {
    if (deletingAppointment) {
      deleteAppointmentMutation.mutate(deletingAppointment.id);
    }
  };

  // Randevu listesi için kolonlar
  const columns = [
    {
      header: "Öğrenci",
      accessorKey: "student",
      cell: (appointment: AppointmentWithStudent) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-0 rounded-xl">
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white rounded-xl">
              {getInitials(`${appointment.student.firstName} ${appointment.student.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-foreground">
              {appointment.student.firstName} {appointment.student.lastName}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCircle className="h-3 w-3" />
              {appointment.student.class}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Tarih & Saat",
      accessorKey: "date",
      cell: (appointment: AppointmentWithStudent) => (
        <div className="flex flex-col">
          <div className="flex items-center text-foreground font-medium">
            <CalendarDays className="h-3.5 w-3.5 mr-1 text-primary" />
            {formatDate(appointment.date)}
          </div>
          <div className="flex items-center text-muted-foreground text-xs mt-1">
            <Clock className="h-3 w-3 mr-1" />
            {appointment.time}
          </div>
        </div>
      ),
    },
    {
      header: "Durum",
      accessorKey: "status",
      cell: (appointment: AppointmentWithStudent) => {
        let icon;
        let statusColor;
        
        switch(appointment.status) {
          case "bekliyor":
            icon = <AlarmClock className="h-3.5 w-3.5 mr-1.5" />;
            statusColor = "bg-yellow-50 text-yellow-600 border-yellow-200";
            break;
          case "tamamlandı":
            icon = <BadgeCheck className="h-3.5 w-3.5 mr-1.5" />;
            statusColor = "bg-green-50 text-green-600 border-green-200";
            break;
          case "iptal":
            icon = <XCircle className="h-3.5 w-3.5 mr-1.5" />;
            statusColor = "bg-red-50 text-red-600 border-red-200";
            break;
          default:
            icon = <ClipboardList className="h-3.5 w-3.5 mr-1.5" />;
            statusColor = "bg-blue-50 text-blue-600 border-blue-200";
        }
        
        return (
          <Badge variant="outline" className={`${statusColor} border flex items-center`}>
            {icon}
            {getStatusText(appointment.status)}
          </Badge>
        );
      }
    },
    {
      header: "Notlar",
      accessorKey: "notes",
      cell: (appointment: AppointmentWithStudent) => (
        <div className="max-w-xs flex items-start">
          <ScrollText className="h-4 w-4 mr-2 text-muted-foreground shrink-0 mt-0.5" />
          <span className="line-clamp-2 text-sm">
            {appointment.notes || "Not eklenmemiş"}
          </span>
        </div>
      ),
    },
    {
      header: "İşlemler",
      accessorKey: "actions",
      cell: (appointment: AppointmentWithStudent) => (
        <div className="flex justify-end items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => setEditingAppointment(appointment)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setEditingAppointment(appointment)}>
                <Pencil className="mr-2 h-4 w-4 text-primary" />
                <span>Düzenle</span>
              </DropdownMenuItem>
              
              {appointment.status !== "tamamlandı" && (
                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment, "tamamlandı")}>
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                  <span>Tamamlandı Olarak İşaretle</span>
                </DropdownMenuItem>
              )}
              
              {appointment.status !== "iptal" && (
                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment, "iptal")}>
                  <X className="mr-2 h-4 w-4 text-red-600" />
                  <span>İptal Et</span>
                </DropdownMenuItem>
              )}
              
              {appointment.status !== "bekliyor" && (
                <DropdownMenuItem onClick={() => updateAppointmentStatus(appointment, "bekliyor")}>
                  <AlarmClock className="mr-2 h-4 w-4 text-yellow-600" />
                  <span>Bekliyor Olarak İşaretle</span>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeletingAppointment(appointment)}
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Sil</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Takvim görünümü için gün oluşturma
  const renderCalendar = () => {
    if (!appointments) return null;

    // Ayın ilk günü
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    // Ayın son günü
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    // Ayın başlangıcındaki boşluklar (pazartesi: 0, pazar: 6 olacak şekilde)
    const startOffset = (firstDay.getDay() + 6) % 7;
    
    // Takvim günlerini oluştur
    const days = [];
    
    // Önceki aydan gelen günler için boşluk
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 glass-effect opacity-50 rounded-lg border-0 m-0.5"></div>);
    }
    
    // Ayın günleri
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
      const dayAppointments = appointments.filter(app => {
        const appDate = new Date(app.date);
        return appDate.getDate() === i && 
               appDate.getMonth() === selectedDate.getMonth() && 
               appDate.getFullYear() === selectedDate.getFullYear();
      });
      
      const isToday = new Date().toDateString() === currentDate.toDateString();
      
      days.push(
        <div 
          key={i} 
          className={`h-28 glass-effect rounded-lg m-0.5 p-2 overflow-hidden transition-all hover:shadow-md
                     ${isToday ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className={`text-sm font-medium rounded-full w-6 h-6 flex items-center justify-center
                           ${isToday ? 'bg-primary text-white' : 'text-foreground'}`}>
              {i}
            </span>
            {dayAppointments.length > 0 && (
              <span className="text-xs bg-gradient-to-r from-primary to-primary-light text-white rounded-full px-1.5 py-0.5 flex items-center">
                <ClipboardList className="h-3 w-3 mr-0.5" />
                {dayAppointments.length}
              </span>
            )}
          </div>
          <div className="overflow-y-auto max-h-20 space-y-1 pr-1">
            {dayAppointments.slice(0, 3).map(app => (
              <div 
                key={app.id} 
                className={`text-xs p-1.5 rounded-md flex items-center cursor-pointer transition-colors
                ${app.status === 'tamamlandı' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 
                  app.status === 'iptal' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 
                  'bg-primary/10 text-primary hover:bg-primary/20'}`}
                onClick={() => setEditingAppointment(app)}
                title={`${app.student.firstName} ${app.student.lastName} - ${app.time}`}
              >
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{app.time} - {app.student.firstName}</span>
              </div>
            ))}
            {dayAppointments.length > 3 && (
              <div className="text-xs text-primary font-medium text-center mt-1">
                + {dayAppointments.length - 3} daha
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  // Önceki ay
  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  // Sonraki ay
  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  // Bugüne git
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <Layout title="Randevular" description="Randevu yönetimi ve takibi">
      {/* Başlık Bölümü */}
      <div className="mb-8 glass-panel">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex flex-col h-full justify-center">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md mr-3">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-gradient">Randevu Yönetimi</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Rehberlik servisindeki tüm randevuları buradan yönetebilirsiniz. Yeni randevu ekleyebilir, randevuları düzenleyebilir ve takip edebilirsiniz.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button 
                  className="btn-gradient gap-2" 
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Yeni Randevu Oluştur
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-primary/20 text-primary gap-2"
                  onClick={goToToday}
                >
                  <Calendar className="h-4 w-4" />
                  Bugüne Git
                </Button>
              </div>
            </div>
          </div>
          <div className="glass-effect-strong rounded-xl p-4 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Randevu İstatistikleri</h3>
            <div className="grid grid-cols-2 gap-4 mt-2 flex-grow">
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">{appointments?.length || 0}</span>
                <span className="text-xs text-muted-foreground">Toplam Randevu</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">
                  {appointments?.filter(a => a.status === 'bekliyor').length || 0}
                </span>
                <span className="text-xs text-muted-foreground">Bekleyen</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">
                  {appointments?.filter(a => a.status === 'tamamlandı').length || 0}
                </span>
                <span className="text-xs text-muted-foreground">Tamamlanan</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">
                  {appointments?.filter(a => a.status === 'iptal').length || 0}
                </span>
                <span className="text-xs text-muted-foreground">İptal Edilen</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Görünüm Seçenekleri ve Arama */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "list" | "calendar")}
          className="bg-muted/50 rounded-xl p-1"
        >
          <TabsList className="bg-transparent">
            <TabsTrigger 
              value="list" 
              className="rounded-lg gap-2 data-[state=active]:bg-background"
            >
              <List className="h-4 w-4" />
              <span>Liste</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="rounded-lg gap-2 data-[state=active]:bg-background"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Takvim</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {viewMode === "list" && (
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Randevu veya öğrenci ara..." 
              className="pl-10 bg-muted/50 border-muted focus:border-primary transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Görünümler */}
      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="glass-card border-0 overflow-hidden">
              <DataTable
                data={filteredAppointments}
                columns={columns}
                loading={isLoading}
                pagination
                emptyState={
                  <div className="flex flex-col items-center justify-center py-12">
                    <CalendarDays className="h-16 w-16 text-muted-foreground/20 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Henüz randevu bulunmuyor</h3>
                    <p className="text-sm text-muted-foreground max-w-md text-center mb-6">
                      Henüz hiç randevu oluşturulmamış veya arama kriterlerinize uygun randevu bulunamadı.
                    </p>
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      className="btn-gradient"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Yeni Randevu Oluştur</span>
                    </Button>
                  </div>
                }
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-card border-0">
              {/* Takvim Başlık ve Kontroller */}
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="text-xl font-bold text-gradient">
                    {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="border-primary/20 text-primary hover:bg-primary/5" onClick={prevMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" 
                      className="border-primary/20 text-primary hover:bg-primary/5" 
                      onClick={goToToday}
                    >
                      Bugün
                    </Button>
                    <Button variant="outline" size="icon" className="border-primary/20 text-primary hover:bg-primary/5" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Separator className="mt-4" />
              </CardHeader>
              
              <CardContent className="pb-6">
                {/* Haftanın Günleri */}
                <div className="grid grid-cols-7 mb-2">
                  {weekdays.map((day, index) => (
                    <div key={index} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Takvim Günleri */}
                <div className="grid grid-cols-7">
                  {renderCalendar()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Appointment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md glass-panel border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Yeni Randevu Oluştur</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            onSubmit={handleAddAppointment}
            isLoading={addAppointmentMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog
        open={!!editingAppointment}
        onOpenChange={(open) => !open && setEditingAppointment(null)}
      >
        <DialogContent className="max-w-md glass-panel border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Randevu Düzenle</DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <AppointmentForm
              defaultValues={{
                ...editingAppointment,
                date: new Date(editingAppointment.date),
              }}
              onSubmit={handleEditAppointment}
              isLoading={updateAppointmentMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingAppointment}
        onOpenChange={(open) => !open && setDeletingAppointment(null)}
      >
        <AlertDialogContent className="glass-panel border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Randevuyu silmek istediğinizden emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deletingAppointment && (
                <span>
                  <strong>{`${deletingAppointment.student.firstName} ${deletingAppointment.student.lastName}`}</strong> ile
                  olan <strong>{formatDate(deletingAppointment.date)}</strong> tarihli randevu silinecektir. 
                  Bu işlem geri alınamaz.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-muted">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppointment}
              className="bg-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              {deleteAppointmentMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}