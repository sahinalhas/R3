import { Student, Appointment } from "@shared/schema";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  CalendarDays, 
  Filter, 
  Calendar, 
  BadgeCheck, 
  Clock, 
  XCircle,
  Users,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppointmentStatsProps {
  appointments: Appointment[] | undefined;
  students: Student[] | undefined;
}

export function AppointmentStats({ appointments, students }: AppointmentStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
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
    </motion.div>
  );
}