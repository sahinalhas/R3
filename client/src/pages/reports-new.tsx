import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Student, Appointment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { StatsOverview } from "@/components/reports/StatsOverview";
import { ClassDistribution } from "@/components/reports/ClassDistribution";
import { AppointmentStatusChart } from "@/components/reports/AppointmentStatusChart";
import { MonthlyAppointmentsChart } from "@/components/reports/MonthlyAppointmentsChart";
import { StudentStats } from "@/components/reports/StudentStats";
import { AppointmentStats } from "@/components/reports/AppointmentStats";
import { getActivityIcon, formatActivityTime } from "@/components/reports/ActivityIcon";
import { FileBarChart, CalendarDays, Users } from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { toast } = useToast();

  // Öğrenci verileri
  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Randevu verileri
  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Aktivite verileri
  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // İstatistik verileri
  const { data: stats } = useQuery<{
    studentCount: number;
    todayAppointments: number;
    weeklyAppointments: number;
    pendingRequests: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const filteredActivities = activities?.filter(activity => {
    if (periodFilter === "all") return true;
    const activityDate = new Date(activity.createdAt);
    const now = new Date();
    
    if (periodFilter === "today") {
      return activityDate.toDateString() === now.toDateString();
    }
    
    if (periodFilter === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return activityDate >= weekStart;
    }
    
    if (periodFilter === "month") {
      return activityDate.getMonth() === now.getMonth() && 
             activityDate.getFullYear() === now.getFullYear();
    }
    
    return true;
  });

  return (
    <Layout title="Raporlar ve İstatistikler" description="Sistem analitikleri ve raporları">
      <div className="space-y-4">
        <Tabs
          defaultValue="dashboard"
          className="w-full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-3 glass-panel">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary/20">
                <FileBarChart className="h-4 w-4 mr-2" />
                <span>Genel Bakış</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="data-[state=active]:bg-primary/20">
                <Users className="h-4 w-4 mr-2" />
                <span>Öğrenci Analitiği</span>
              </TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-primary/20">
                <CalendarDays className="h-4 w-4 mr-2" />
                <span>Randevu Analitiği</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Select defaultValue="all" value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[180px] glass-input">
                  <SelectValue placeholder="Dönem Seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Zamanlar</SelectItem>
                  <SelectItem value="today">Bugün</SelectItem>
                  <SelectItem value="week">Bu Hafta</SelectItem>
                  <SelectItem value="month">Bu Ay</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                className="glass-panel" 
                onClick={async () => {
                  try {
                    setIsGeneratingReport(true);
                    const response = await apiRequest('POST', '/api/reports/generate', {
                      type: activeTab,
                      period: periodFilter
                    });
                    
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rehberlik-rapor-${activeTab}-${new Date().toISOString().split('T')[0]}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    toast({
                      title: 'Rapor oluşturuldu',
                      description: 'Rapor başarıyla oluşturuldu ve indirildi.',
                    });
                  } catch (error) {
                    console.error('Rapor oluşturma hatası:', error);
                    toast({
                      title: 'Rapor oluşturma hatası',
                      description: error instanceof Error ? error.message : 'Rapor oluşturulurken bir hata oluştu.',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsGeneratingReport(false);
                  }
                }}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? 'Rapor oluşturuluyor...' : 'Rapor Oluştur'}
              </Button>
            </div>
          </div>

          <TabsContent value="dashboard" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsOverview stats={stats} />
              <AppointmentStatusChart appointments={appointments} />
              <ClassDistribution students={students} />
            </div>
            
            <div className="mt-4">
              <MonthlyAppointmentsChart appointments={appointments} />
            </div>

            <div className="mt-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg">
                  <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                        <FileBarChart className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Aktivite Günlüğü</h3>
                        <p className="text-sm text-muted-foreground">
                          Sistem aktivitelerinin zaman çizelgesi
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activities?.length} aktivite
                    </div>
                  </div>
                  <div className="p-0">
                    <div className="relative">
                      {/* Timeline */}
                      <div className="absolute top-0 left-10 w-0.5 h-full bg-border"></div>
                      
                      {/* Activities */}
                      <div className="space-y-0 px-4">
                        {filteredActivities?.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start py-4 hover:bg-muted/20 px-2 rounded-lg transition-colors relative"
                          >
                            <div className="mr-4 relative z-10">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                <p className="font-medium">{activity.message}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatActivityTime(activity.createdAt.toString())}
                                </p>
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                İşlem ID: {activity.id}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StudentStats students={students} appointments={appointments} />
              <div className="col-span-1 md:col-span-2">
                <ClassDistribution students={students} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Öğrenci Dağılımı ve Detayları</h3>
                <Separator className="my-4" />
                
                <div className="text-sm text-muted-foreground mb-4">
                  Bu bölümde daha detaylı öğrenci analitikleri gösterilecektir.
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <AppointmentStats appointments={appointments} students={students} />
            </div>

            <div className="mt-4">
              <MonthlyAppointmentsChart appointments={appointments} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}