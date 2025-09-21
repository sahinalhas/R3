import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { motion } from "framer-motion";

type QuickActionButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export default function QuickActionButton({
  icon,
  label,
  onClick,
}: QuickActionButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
      
      <Button
        variant="outline"
        className="flex-1 h-auto py-8 px-6 justify-center text-primary border-0 glass-card hover:shadow-xl w-full overflow-hidden group relative backdrop-blur-md"
        onClick={onClick}
      >
        {/* Background decorations */}
        <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full opacity-10 bg-gradient-to-br from-primary to-secondary group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute -left-6 -top-6 w-16 h-16 rounded-full opacity-10 bg-gradient-to-br from-secondary to-primary group-hover:scale-150 transition-transform duration-700" />
        
        <div className="flex flex-col items-center relative z-10">
          <div className="rounded-xl glass-effect-strong p-4 mb-4 shadow-md group-hover:shadow-lg transform group-hover:-translate-y-1 transition-all duration-300">
            {icon}
          </div>
          <span className="font-medium text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary group-hover:from-secondary group-hover:to-primary transition-all duration-500">{label}</span>
        </div>
        
        {/* Bottom line animation */}
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-secondary/50 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1500"></div>
      </Button>
    </motion.div>
  );
}
