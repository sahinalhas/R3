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
import { Users, UserCircle, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StudentStatsProps {
  students: Student[] | undefined;
  appointments: Appointment[] | undefined;
}

export function StudentStats({ students, appointments }: StudentStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
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
    </motion.div>
  );
}