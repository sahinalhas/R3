import { Link, useLocation } from "wouter";
import {
  Calendar,
  FileBarChart2,
  Settings,
  Search,
  School,
  LogOut,
  Plus,
  LayoutDashboard,
  BellRing,
  GraduationCap,
  BookOpenCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  {
    label: "Kontrol Paneli",
    icon: LayoutDashboard,
    href: "/",
    description: "Genel istatistikler ve özet",
  },
  {
    label: "Öğrenci Yönetimi",
    icon: GraduationCap,
    href: "/students",
    description: "Öğrenci kayıtları ve bilgileri",
  },
  {
    label: "Randevular",
    icon: Calendar,
    href: "/appointments",
    description: "Danışmanlık randevuları",
  },
  {
    label: "Görüşme Kayıtları",
    icon: BookOpenCheck,
    href: "/counseling-sessions-final",
    description: "Rehberlik görüşme kayıtları",
  },
  {
    label: "Raporlar",
    icon: FileBarChart2,
    href: "/reports",
    description: "Analiz ve raporlama",
  },
  {
    label: "Ayarlar",
    icon: Settings,
    href: "/settings",
    description: "Sistem ve kullanıcı ayarları",
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Çıkış yapıldı",
          description: "Başarıyla çıkış yaptınız.",
        });
      },
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part?.[0] || "")
      .join("")
      .toUpperCase();
  };

  return (
    <aside
      className={cn(
        "h-screen w-[260px] bg-sidebar text-sidebar-foreground flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out z-30 border-r border-sidebar-border/10"
      )}
    >
      <div className="h-full flex flex-col">
        {/* Logo & Başlık */}
        <div className="py-5 px-4 flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
            <School className="h-5 w-5" />
          </div>

          <div className="flex flex-col">
            <h1 className="font-medium tracking-tight text-sm">Rehberlik Servisi</h1>
            <p className="text-[10px] text-sidebar-foreground/50">Öğrenci Takip Sistemi</p>
          </div>
        </div>

        {/* Arama Bölümü */}
        <div className="px-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
            <Input
              type="text"
              placeholder="Ara..."
              className="pl-8 h-8 text-xs rounded-md bg-transparent border-sidebar-border/15 text-sidebar-foreground/90 placeholder:text-sidebar-foreground/40 focus-visible:ring-0 focus-visible:border-sidebar-border/30 transition-all duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Ana Navigasyon */}
        <nav className="mt-1 flex-1 custom-scrollbar">
          <TooltipProvider delayDuration={600}>
            <ul className="space-y-0 px-2 pb-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center px-2 py-2 transition-all duration-200 text-sm rounded-md",
                          location === item.href
                            ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-border/10 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "flex-shrink-0 h-4 w-4 transition-colors duration-200",
                            location === item.href
                              ? "text-sidebar-primary"
                              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                          )}
                        />

                        <span className="ml-2 whitespace-nowrap">{item.label}</span>

                        {location === item.href && (
                          <span className="ml-auto text-[8px] font-medium text-sidebar-primary/80">●</span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col">
                      <span className="font-medium text-xs">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground">{item.description}</span>
                    </TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </TooltipProvider>
        </nav>

        {/* Hızlı Erişim Butonları */}
        <div className="px-3 pb-1">
          <div className="px-2 py-4">
            <p className="text-[10px] font-medium text-sidebar-foreground/50 tracking-wider uppercase mb-2 ml-1">Hızlı Erişim</p>
            <div className="flex justify-between gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 bg-transparent hover:bg-sidebar-border/10 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all duration-200 rounded-md"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Öğrenci</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Yeni Öğrenci Ekle</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 bg-transparent hover:bg-sidebar-border/10 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all duration-200 rounded-md"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Randevu</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Yeni Randevu Oluştur</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Kullanıcı Profili */}
        <div className="mt-auto py-3 px-3 border-t border-sidebar-border/10">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border border-sidebar-border/20 transition-all duration-200 hover:border-sidebar-primary/40">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-sidebar-border/10 text-sidebar-foreground text-xs">
                      {user?.fullName ? getInitials(user.fullName) : "KL"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="flex flex-col">
                    <span className="font-medium text-xs">{user?.fullName}</span>
                    <span className="text-[10px] text-muted-foreground">{user?.role || "Sistem Yöneticisi"}</span>
                  </div>
                </TooltipContent>
              </Tooltip>

              <div className="flex flex-col">
                <span className="font-medium text-xs truncate">{user?.fullName}</span>
                <span className="text-[10px] text-sidebar-foreground/60 truncate">{user?.role || "Sistem Yöneticisi"}</span>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-border/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Çıkış Yap</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
}
