import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type StatsCardProps = {
  icon: ReactNode;
  title: string;
  value: string | number;
  borderColor: string;
  iconBgColor: string;
};

export default function StatsCard({
  icon,
  title,
  value,
  borderColor,
  iconBgColor,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={cn(
        "p-6 overflow-hidden relative glass-card border-t-4 border-r-0 border-l-0 border-b-0 shadow-lg", 
        borderColor,
      )}>
        {/* Dekoratif arka plan şekilleri */}
        <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br from-primary to-secondary" />
        <div className="absolute -left-6 -bottom-6 w-16 h-16 rounded-full opacity-5 bg-gradient-to-br from-secondary to-primary" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className={cn(
              "p-3.5 rounded-xl glass-effect flex items-center justify-center", 
              iconBgColor
            )}>
              {icon}
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-4">
              <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
              <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/70 to-primary">{value}</p>
            </div>
          </div>
          <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm"></div>
          </div>
        </div>
        
        {/* Pulse animation at the bottom */}
        <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse"></div>
        </div>
      </Card>
    </motion.div>
  );
}
