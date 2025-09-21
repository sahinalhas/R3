import { Appointment } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
import { BarChart as BarChartIcon } from "lucide-react";
import { MONTHS } from "./ActivityIcon";

interface MonthlyAppointmentsChartProps {
  appointments: Appointment[] | undefined;
}

export function MonthlyAppointmentsChart({ appointments }: MonthlyAppointmentsChartProps) {
  // Aylara göre randevu dağılımı için veri hazırla
  const prepareMonthlyAppointmentsData = () => {
    if (!appointments) return [];
    
    const monthCounts: number[] = Array(12).fill(0);
    
    appointments.forEach(appointment => {
      const date = new Date(appointment.date);
      const month = date.getMonth();
      monthCounts[month]++;
    });
    
    return monthCounts.map((count, index) => ({
      name: MONTHS[index],
      randevular: count
    }));
  };

  const monthlyAppointmentsData = prepareMonthlyAppointmentsData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="col-span-1 md:col-span-2"
    >
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
              <BarChartIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xl">Aylık Randevu Dağılımı</CardTitle>
              <CardDescription>
                Aylara göre randevu sayıları
              </CardDescription>
            </div>
          </div>
          <Separator className="mt-4" />
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyAppointmentsData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(142, 142, 142, 0.1)" />
                <XAxis dataKey="name" tick={{ fill: '#888' }} />
                <YAxis tick={{ fill: '#888' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none' }} />
                <Legend />
                <Bar dataKey="randevular" name="Randevu Sayısı" fill="#845ef7" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}