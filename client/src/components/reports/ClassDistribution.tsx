import { Student } from "@shared/schema";
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
import { Layers } from "lucide-react";
import { COLORS } from "./ActivityIcon";

interface ClassDistributionProps {
  students: Student[] | undefined;
}

export function ClassDistribution({ students }: ClassDistributionProps) {
  // Sınıflara göre öğrenci dağılımı için veri hazırla
  const prepareClassDistributionData = () => {
    if (!students) return [];
    
    const classCounts: Record<string, number> = {};
    
    students.forEach(student => {
      classCounts[student.class] = (classCounts[student.class] || 0) + 1;
    });
    
    return Object.entries(classCounts)
      .sort((a, b) => b[1] - a[1]) // En yüksek sayıdan başla
      .map(([className, count]) => ({
        name: className,
        value: count
      }));
  };

  const classDistributionData = prepareClassDistributionData();

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
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xl">Sınıf Dağılımı</CardTitle>
              <CardDescription>
                Sınıflara göre öğrenci sayıları
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
                  data={classDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: %${(percent * 100).toFixed(0)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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