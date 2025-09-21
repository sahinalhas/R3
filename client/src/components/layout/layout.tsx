import { useState, ReactNode, useEffect } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

type LayoutProps = {
  children: ReactNode;
  title: string;
  description?: string;
};

export default function Layout({ children, title, description }: LayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  useEffect(() => {
    // Sayfa yüklendiğinde animasyonu başlatmak için
    setIsPageLoaded(true);
    
    // Başlığı parçalara ayırarak breadcrumb oluştur
    if (title) {
      const parts = title.split(' / ');
      setBreadcrumbs(parts);
    }
  }, [title]);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 max-w-full border-r-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar toggleMobileSidebar={toggleMobileSidebar} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto py-6 px-4 md:px-8 custom-scrollbar bg-background/50 backdrop-blur-sm">
          <AnimatePresence>
            {isPageLoaded && (
              <motion.div 
                className="max-w-7xl mx-auto space-y-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {/* Üst bilgi alanı */}
                <div className="flex flex-col space-y-1.5 mb-6">
                  {/* Breadcrumbs */}
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
                  
                  {/* Başlık ve Açıklama */}
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

                {/* İçerik */}
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
      </div>
    </div>
  );
}
