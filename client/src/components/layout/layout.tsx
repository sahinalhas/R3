import { useState, ReactNode, useEffect } from "react";
import AppSidebar from "./sidebar";
import Topbar from "./topbar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type LayoutProps = {
  children: ReactNode;
  title: string;
  description?: string;
};

export default function Layout({ children, title, description }: LayoutProps) {
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  useEffect(() => {
    setIsPageLoaded(true);
    if (title) {
      const parts = title.split(' / ');
      setBreadcrumbs(parts);
    }
  }, [title]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />

        <main className="relative flex-1 py-6 px-4 md:px-8 bg-background/50 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] bg-grid-pattern" />
          <div className="pointer-events-none absolute -top-40 -right-40 w-[60vw] h-[60vw] -z-10 rounded-full bg-gradient-radial from-primary/20 via-secondary/10 to-transparent blur-3xl" />
          <AnimatePresence>
            {isPageLoaded && (
              <motion.div
                className="max-w-7xl mx-auto space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className="flex flex-col space-y-1.5 mb-6">
                  {breadcrumbs.length > 1 && (
                    <motion.div
                      className="flex items-center text-sm text-muted-foreground mb-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="flex items-center">
                          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                          <span className={cn(
                            index === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""
                          )}>{crumb}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
                    {description && (
                      <p className="text-muted-foreground mt-1 max-w-3xl">{description}</p>
                    )}
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  {children}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
