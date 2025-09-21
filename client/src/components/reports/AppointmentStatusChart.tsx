import { Appointment } from "@shared/schema";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PieChart as PieChartIcon } from "lucide-react";
import { STATUS_COLORS } from "./ActivityIcon";

interface AppointmentStatusChartProps {
  appointments: Appointment[] | undefined;
}

export function AppointmentStatusChart({ appointments }: AppointmentStatusChartProps) {
  // Randevu durumlarına göre dağılım için veri hazırla
  const prepareAppointmentStatusData = () => {
    if (!appointments) return [];
    
    const statusCounts: Record<string, number> = {
      beklemede: 0,
      onaylandı: 0,
      tamamlandı: 0,
      iptal: 0
    };
    
    appointments.forEach(appointment => {
      statusCounts[appointment.status] = (statusCounts[appointment.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status === 'beklemede' ? 'Beklemede' :
            status === 'onaylandı' ? 'Onaylandı' :
            status === 'tamamlandı' ? 'Tamamlandı' :
            status === 'iptal' ? 'İptal' : status,
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#ccc'
    }));
  };

  const appointmentStatusData = prepareAppointmentStatusData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xl">Randevu Durumları</CardTitle>
              <CardDescription>
                Mevcut randevuların durumları
              </CardDescription>
            </div>
          </div>
          <Separator className="mt-4" />
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}