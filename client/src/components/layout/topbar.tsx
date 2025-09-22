import { useState, useEffect } from "react";
import {
  Bell,
  ChevronDown,
  Search,
  Sun,
  Moon,
  Laptop,
  CalendarClock,
  Users,
  User,
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Link } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Topbar() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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

  // Güncel saati göster (saat:dakika formatında)
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  );

  // Her saniye saati güncelle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Bugünün tarihini göster (gün ay yıl formatında)
  const today = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <header className="bg-background border-b border-border/40 backdrop-blur-sm z-20 relative">
      <div className="container flex h-16 items-center justify-between md:px-4 lg:px-6">
        {/* Sol Taraf */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Menü Aç/Kapa */}
          <SidebarTrigger className="mr-1" />
          {/* Arama Butonu */}
          <div className="flex relative">
            <Button
              variant="ghost"
              onClick={() => setShowSearch(!showSearch)}
              className="text-muted-foreground hover:text-foreground"
              size="sm"
            >
              <Search className="h-4 w-4 mr-2" />
              <span className="text-sm">Hızlı Ara...</span>
              <kbd className="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
        </div>

        {/* Orta - Tarih ve Saat */}
        <div className="hidden lg:flex flex-col items-center justify-center">
          <div className="text-sm font-medium text-foreground">{currentTime}</div>
          <div className="text-xs text-muted-foreground">{today}</div>
        </div>

        {/* Sağ Taraf - Kullanıcı Aksiyonları */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Tema Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Tema Değiştir</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light">
                  <Sun className="h-4 w-4 mr-2" />
                  <span>Açık</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="h-4 w-4 mr-2" />
                  <span>Koyu</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Laptop className="h-4 w-4 mr-2" />
                  <span>Sistem</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bildirimler */}
          <DropdownMenu
            open={isNotificationsOpen}
            onOpenChange={setIsNotificationsOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full w-8 h-8 text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                <span className="sr-only">Bildirimler</span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  2
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px]">
              <div className="flex items-center justify-between p-2">
                <DropdownMenuLabel className="font-medium text-base">Bildirimler</DropdownMenuLabel>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Tümünü okundu işaretle
                </Button>
              </div>
              <DropdownMenuSeparator />
              <div className="flex flex-col gap-2 p-2">
                <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <CalendarClock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">Yeni randevu talebi</p>
                      <Badge variant="outline" className="ml-auto">Yeni</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Ahmet Yılmaz, yarın 14:30 için randevu talep etti.</p>
                    <p className="text-xs text-muted-foreground">2 saat önce</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">Yeni öğrenci kaydedildi</p>
                      <Badge variant="outline" className="ml-auto">Yeni</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Sistemde yeni bir öğrenci kaydı oluşturuldu: Ayşe Demir.</p>
                    <p className="text-xs text-muted-foreground">1 gün önce</p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <Button variant="ghost" className="w-full justify-center rounded-t-none rounded-b-lg py-3 font-normal">
                Tüm Bildirimleri Görüntüle
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hızlı Ayarlar Düğmesi */}
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Ayarlar</span>
            </Button>
          </Link>
          
          {/* Kullanıcı Menüsü - En Sağda */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center hover:bg-accent/10 px-2"
              >
                <Avatar className="h-8 w-8 mr-2 border border-primary/20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.fullName ? getInitials(user.fullName) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start ml-1 mr-2">
                  <span className="text-sm font-medium leading-none">{user?.fullName || "Kullanıcı"}</span>
                  <span className="text-xs text-muted-foreground leading-none mt-1">{user?.role || "Kullanıcı"}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.username}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Ayarlar</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
