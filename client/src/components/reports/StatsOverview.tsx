import {
  UserCircle,
  Calendar,
  BadgeCheck,
  Clock,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

interface StatsOverviewProps {
  stats: {
    studentCount?: number;
    todayAppointments?: number;
    weeklyAppointments?: number;
    pendingRequests?: number;
  } | undefined;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
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
    </motion.div>
  );
}