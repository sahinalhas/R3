import { Link, useLocation } from "wouter";
import {
  Calendar,
  FileBarChart2,
  Settings,
  School,
  LayoutDashboard,
  GraduationCap,
  BookOpenCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Kontrol Paneli",
    icon: LayoutDashboard,
    href: "/",
    description: "Genel istatistikler ve özet",
    group: "Genel",
  },
  {
    label: "Öğrenci Yönetimi",
    icon: GraduationCap,
    href: "/students",
    description: "Öğrenci kayıtları ve bilgileri",
    group: "Kayıtlar",
  },
  {
    label: "Randevular",
    icon: Calendar,
    href: "/appointments",
    description: "Danışmanlık randevuları",
    group: "Kayıtlar",
  },
  {
    label: "Görüşme Kayıtları",
    icon: BookOpenCheck,
    href: "/counseling-sessions-final",
    description: "Rehberlik görüşme kayıtları",
    group: "Kayıtlar",
  },
  {
    label: "Raporlar",
    icon: FileBarChart2,
    href: "/reports",
    description: "Analiz ve raporlama",
    group: "Analiz",
  },
  {
    label: "Ayarlar",
    icon: Settings,
    href: "/settings",
    description: "Sistem ve kullanıcı ayarları",
    group: "Sistem",
  },
];

const groupsOrder = ["Genel", "Kayıtlar", "Analiz", "Sistem"] as const;

export default function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const { setOpenMobile } = useSidebar();

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

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((p) => p?.[0] || "")
      .join("")
      .toUpperCase();

  return (
    <UISidebar side="left" variant="sidebar" collapsible="offcanvas" className="bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
            <School className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-medium tracking-tight text-sm truncate">Rehberlik Servisi</h1>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">Öğrenci Takip Sistemi</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="pb-2">
        {groupsOrder.map((group) => {
          const items = navItems.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel className="px-2 text-[11px] tracking-wider uppercase text-sidebar-foreground/60">
                {group}
              </SidebarGroupLabel>
              <SidebarMenu>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = location === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.description}>
                          <a className={cn("flex items-center", active && "font-medium")}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon className={cn("h-4 w-4",
                              active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60"
                            )} />
                            <span className="ml-2">{item.label}</span>
                          </a>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/10">
        <div className="flex items-center justify-between p-2 px-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8 border border-sidebar-border/20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-sidebar-border/10 text-sidebar-foreground text-xs">
                {user?.fullName ? getInitials(user.fullName) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{user?.fullName}</span>
              <span className="text-[10px] text-sidebar-foreground/60 truncate">{user?.role || "Sistem Yöneticisi"}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-border/10"
            onClick={handleLogout}
            aria-label="Çıkış Yap"
            title="Çıkış Yap"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </UISidebar>
  );
}
