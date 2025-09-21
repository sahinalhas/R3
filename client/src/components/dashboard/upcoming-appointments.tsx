import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MoreVertical, 
  ArrowRight, 
  Calendar, 
  Clock, 
  CheckCircle, 
  User, 
  AlertCircle,
  CalendarDays,
  Edit,
  XCircle
} from "lucide-react";
import { cn, formatDate, getInitials, getStatusClass } from "@/lib/utils";
import { Link } from "wouter";
import { Appointment, Student } from "@shared/schema";
import { motion } from "framer-motion";

export default function UpcomingAppointments() {
  const { data: appointments, isLoading } = useQuery<
    (Appointment & { student: Student })[]
  >({
    queryKey: ["/api/appointments?limit=5"],
  });

  const statusIcons = {
    "onaylandı": <CheckCircle className="h-3 w-3 mr-1" />,
    "beklemede": <Clock className="h-3 w-3 mr-1" />,
    "iptal": <AlertCircle className="h-3 w-3 mr-1" />,
    "tamamlandı": <CheckCircle className="h-3 w-3 mr-1" />,
  };

  const statusColors = {
    "onaylandı": "from-blue-500 to-blue-600",
    "beklemede": "from-amber-500 to-amber-600",
    "iptal": "from-red-500 to-red-600",
    "tamamlandı": "from-green-500 to-green-600",
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="col-span-1 lg:col-span-2"
    >
      <Card className="glass-card border-0 shadow-lg overflow-hidden relative">
        {/* Background decorations */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br from-primary/10 to-primary/5"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-gradient-to-br from-secondary/10 to-secondary/5"></div>
        
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-sm mr-3">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gradient">
                Yaklaşan Randevular
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading ? 'Yükleniyor...' : `${appointments?.length || 0} randevu listeleniyor`}
              </p>
            </div>
          </div>
          <Link href="/appointments">
            <Button variant="ghost" size="sm" className="text-primary/80 hover:text-primary text-sm hover:bg-primary/10 rounded-xl">
              <span>Tümünü Gör</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            // Loading state
            <div className="p-4 space-y-4">
              {Array(3).fill(null).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : appointments && appointments.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="p-1"
            >
              <div className="space-y-2">
                {appointments.map((appointment) => (
                  <motion.div
                    key={appointment.id} 
                    className="p-3 hover:bg-muted/30 rounded-xl transition-colors duration-200"
                    variants={item}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-0 rounded-xl shadow-sm">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white rounded-xl">
                            {getInitials(`${appointment.student.firstName} ${appointment.student.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">
                            {appointment.student.firstName} {appointment.student.lastName}
                          </div>
                          <div className="flex items-center gap-4 mt-0.5">
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-primary" />
                              {formatDate(appointment.date)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1 text-secondary" />
                              {appointment.time}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center shadow-sm border-0 text-xs bg-gradient-to-r text-white",
                            statusColors[appointment.status as keyof typeof statusColors] || "from-gray-500 to-gray-600"
                          )}
                        >
                          {statusIcons[appointment.status as keyof typeof statusIcons] || 
                          <Clock className="h-3 w-3 mr-1" />}
                          {appointment.status === "onaylandı" ? "Onaylandı" : 
                          appointment.status === "beklemede" ? "Beklemede" : 
                          appointment.status === "iptal" ? "İptal" : 
                          appointment.status === "tamamlandı" ? "Tamamlandı" : 
                          appointment.status}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-primary/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border border-primary/10 shadow-lg">
                            <Link href={`/students/${appointment.studentId}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <User className="h-4 w-4 mr-2" />
                                Öğrenciyi Görüntüle
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/appointments`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Edit className="h-4 w-4 mr-2" />
                                Randevuyu Düzenle
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive cursor-pointer">
                              <XCircle className="h-4 w-4 mr-2" />
                              İptal Et
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Calendar className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-medium mb-2">Yaklaşan randevu bulunmuyor</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Yeni bir randevu oluşturmak için "Randevu Oluştur" butonunu kullanabilirsiniz
              </p>
              <Button onClick={() => {}} className="btn-gradient">
                <Calendar className="h-4 w-4 mr-2" />
                Yeni Randevu Oluştur
              </Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="glass-effect-strong py-3 flex justify-center">
          <Button variant="ghost" className="text-primary text-sm hover:bg-primary/10 w-full justify-center">
            <Calendar className="h-4 w-4 mr-2" />
            Daha Fazla Randevu Görüntüle
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
