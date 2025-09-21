import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import StatsCard from "@/components/dashboard/stats-card";
import QuickActionButton from "@/components/dashboard/quick-action-button";
import UpcomingAppointments from "@/components/dashboard/upcoming-appointments";
import RecentActivities from "@/components/dashboard/recent-activities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Calendar, FileText, Zap, BarChart3, BookOpen, GraduationCap, ArrowRight } from "lucide-react";
import StudentForm from "@/components/students/student-form";
import AppointmentForm from "@/components/appointments/appointment-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InsertStudent, InsertAppointment } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeDialog, setActiveDialog] = useState<"student" | "appointment" | "report" | null>(null);

  // İstatistik verileri çek
  const { data: stats, isLoading: statsLoading } = useQuery<{
    studentCount: number;
    todayAppointments: number;
    weeklyAppointments: number;
    pendingRequests: number;
  }>({
    queryKey: ["/api/stats"],
  });

  // Öğrenci ekleme mutation
  const addStudentMutation = useMutation({
    mutationFn: async (student: InsertStudent) => {
      const res = await apiRequest("POST", "/api/students", student);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Öğrenci başarıyla eklendi",
      });
      setActiveDialog(null);
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
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
      setActiveDialog(null);
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddStudent = (data: InsertStudent) => {
    addStudentMutation.mutate(data);
  };

  const handleAddAppointment = (data: any) => {
    if (user) {
      // Date nesnesini string formatına dönüştürüyoruz
      const formattedData = {
        ...data,
        counselorId: user.id,
        date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date,
      };
      
      addAppointmentMutation.mutate(formattedData);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout
      title="Kontrol Paneli"
      description="Rehberlik servisi yönetim sistemine hoş geldiniz."
    >
      {/* Hero Banner */}
      <motion.div 
        className="glass-panel mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
              Hoş Geldiniz, <span className="text-gradient">{user?.fullName || "Rehber"}</span>
            </h1>
            <p className="text-muted-foreground mb-6">
              Rehberlik servis yönetim sisteminizden bugün neler yapmak istersiniz?
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                className="btn-gradient"
                onClick={() => setActiveDialog("appointment")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Hızlı Randevu Oluştur
              </Button>
              <Link href="/reports">
                <Button variant="outline" className="border-primary/20 text-primary">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Raporları Görüntüle
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-end">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-xl"></div>
              <div className="relative bg-gradient-to-br from-primary/80 to-secondary/80 rounded-2xl p-5 text-white">
                <div className="text-lg font-medium mb-2">Hızlı İstatistikler</div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Bugünkü Randevular</span>
                    <span className="font-bold text-xl">{statsLoading ? "-" : stats?.todayAppointments || 0}</span>
                  </div>
                  <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                    <div className="bg-white h-full" style={{ width: `${statsLoading ? 0 : ((stats?.pendingRequests || 0) / (stats?.todayAppointments || 1)) * 100}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Toplam Öğrenci</span>
                    <span className="font-bold text-xl">{statsLoading ? "-" : stats?.studentCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <StatsCard
            icon={<GraduationCap className="h-5 w-5 text-primary" />}
            title="Toplam Öğrenci"
            value={statsLoading ? "-" : stats?.studentCount || 0}
            borderColor="border-primary"
            iconBgColor="bg-primary/10"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            icon={<Calendar className="h-5 w-5 text-secondary" />}
            title="Bugünkü Randevular"
            value={statsLoading ? "-" : stats?.todayAppointments || 0}
            borderColor="border-secondary"
            iconBgColor="bg-secondary/10"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            icon={<BookOpen className="h-5 w-5 text-success" />}
            title="Haftalık Görüşmeler"
            value={statsLoading ? "-" : stats?.weeklyAppointments || 0}
            borderColor="border-success"
            iconBgColor="bg-success/10"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            icon={<Users className="h-5 w-5 text-warning" />}
            title="Bekleyen İstekler"
            value={statsLoading ? "-" : stats?.pendingRequests || 0}
            borderColor="border-warning"
            iconBgColor="bg-warning/10"
          />
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <UpcomingAppointments />
        <RecentActivities />
      </div>

      {/* Quick Actions */}
      <motion.div 
        className="mb-6 glass-panel relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-5 bg-gradient-to-br from-primary to-secondary"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full opacity-5 bg-gradient-to-br from-secondary to-primary"></div>
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md mr-3">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Hızlı İşlemler
            </h2>
          </div>
          <Button variant="outline" size="sm" className="text-primary border-primary/20">
            <span>Tüm İşlemler</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <QuickActionButton
            icon={<Users className="h-6 w-6 text-primary" />}
            label="Öğrenci Ekle"
            onClick={() => setActiveDialog("student")}
          />
          <QuickActionButton
            icon={<Calendar className="h-6 w-6 text-secondary" />}
            label="Randevu Oluştur"
            onClick={() => setActiveDialog("appointment")}
          />
          <QuickActionButton
            icon={<FileText className="h-6 w-6 text-accent" />}
            label="Rapor Oluştur"
            onClick={() => setActiveDialog("report")}
          />
        </div>
      </motion.div>

      {/* Dialogs */}
      <Dialog open={activeDialog === "student"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto glass-panel border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Yeni Öğrenci Ekle</DialogTitle>
          </DialogHeader>
          <StudentForm
            onSubmit={handleAddStudent}
            isLoading={addStudentMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "appointment"} onOpenChange={(open) => !open && setActiveDialog(null)}>
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

      <Dialog open={activeDialog === "report"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-md glass-panel border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Rapor Oluştur</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center justify-center text-center">
            <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Rapor Oluşturma</h3>
            <p className="text-muted-foreground mb-4">Rapor oluşturma modülü yakında eklenecektir.</p>
            <Button variant="outline" className="w-full" onClick={() => setActiveDialog(null)}>
              Tamam
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
