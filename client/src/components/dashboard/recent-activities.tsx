import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  UserPlus,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  ArrowRight,
  HistoryIcon,
  Bell,
  Activity as ActivityIcon,
  BarChart3,
  Edit,
  Trash,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function getActivityIcon(type: string) {
  switch (type) {
    case "öğrenci_ekleme":
      return (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md">
          <UserPlus className="h-5 w-5" />
        </div>
      );
    case "randevu_oluşturma":
      return (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white shadow-md">
          <Calendar className="h-5 w-5" />
        </div>
      );
    case "randevu_güncelleme":
    case "öğrenci_güncelleme":
      if (type.includes("tamamlandı")) {
        return (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-success to-green-500 flex items-center justify-center text-white shadow-md">
            <CheckCircle className="h-5 w-5" />
          </div>
        );
      }
      return (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
          <Edit className="h-5 w-5" />
        </div>
      );
    case "randevu_silme":
    case "öğrenci_silme":
      return (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center text-white shadow-md">
          <Trash className="h-5 w-5" />
        </div>
      );
    default:
      return (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white shadow-md">
          <ActivityIcon className="h-5 w-5" />
        </div>
      );
  }
}

function getActivityColors(type: string) {
  if (type.includes("öğrenci_ekleme")) return "from-primary/10 to-primary/5 border-primary/20";
  if (type.includes("randevu_oluşturma")) return "from-secondary/10 to-secondary/5 border-secondary/20";
  if (type.includes("tamamlandı")) return "from-success/10 to-success/5 border-success/20";
  if (type.includes("silme")) return "from-destructive/10 to-destructive/5 border-destructive/20";
  if (type.includes("güncelleme")) return "from-amber-500/10 to-amber-500/5 border-amber-500/20";
  return "from-slate-500/10 to-slate-500/5 border-slate-500/20";
}

function formatActivityTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} dakika önce`;
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`;
  } else if (diffDays === 1) {
    return "Dün";
  } else {
    return `${diffDays} gün önce`;
  }
}

export default function RecentActivities() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities?limit=5"],
  });
  
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
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card className="glass-card border-0 shadow-lg overflow-hidden relative h-full flex flex-col">
        {/* Background decorations */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-primary/5 to-primary/10"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-gradient-to-br from-secondary/5 to-secondary/10"></div>
        
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white shadow-sm mr-3">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gradient">
                Son Aktiviteler
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading ? 'Yükleniyor...' : `${activities?.length || 0} aktivite listeleniyor`}
              </p>
            </div>
          </div>
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="text-secondary/80 hover:text-secondary text-sm hover:bg-secondary/10 rounded-xl">
              <span>Rapor Görüntüle</span>
              <BarChart3 className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        
        <CardContent className="flex-1 relative z-10">
          <motion.div 
            className="space-y-3"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {isLoading ? (
              // Loading state
              Array(4)
                .fill(null)
                .map((_, index) => (
                  <div key={index} className="flex p-3 bg-muted/30 rounded-xl animate-pulse">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="ml-4 space-y-2 flex-1">
                      <Skeleton className="h-4 w-full max-w-xs" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))
            ) : activities && activities.length > 0 ? (
              activities.map((activity) => (
                <motion.div 
                  key={activity.id} 
                  className={cn(
                    "flex p-3 rounded-xl backdrop-blur-sm border transition-colors", 
                    `bg-gradient-to-br ${getActivityColors(activity.type)} hover:bg-muted/30`
                  )}
                  variants={item}
                >
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="ml-4 flex-1">
                    <p
                      className="text-foreground font-medium leading-tight"
                      dangerouslySetInnerHTML={{ __html: activity.message }}
                    />
                    <div className="flex items-center mt-2 text-muted-foreground">
                      <HistoryIcon className="h-3 w-3 mr-1.5" />
                      <p className="text-xs">
                        {formatActivityTime(activity.createdAt.toString())}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-10 text-center h-full">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <ActivityIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-medium mb-2">Henüz aktivite bulunmuyor</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Öğrenci ve randevu işlemleri gerçekleştikçe sistem aktiviteleri burada görüntülenecektir
                </p>
              </div>
            )}
          </motion.div>
        </CardContent>
        
        <CardFooter className="glass-effect-strong py-3 flex justify-center mt-auto">
          <Link href="/reports">
            <Button variant="ghost" className="text-secondary text-sm hover:bg-secondary/10 w-full justify-center">
              <ActivityIcon className="h-4 w-4 mr-2" />
              Tüm Aktivite Geçmişini Görüntüle
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
