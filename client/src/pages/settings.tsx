import { useState, useRef, useEffect } from "react";
import SchoolInfoComponent from "@/components/school-info-component";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClassHour, InsertClassHour, CounselingTopic } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import ClassHourForm from "@/components/class-hours/class-hour-form";
import BulkClassHourForm from "@/components/class-hours/bulk-class-hour-form";
import Layout from "@/components/layout/layout";
import { CourseSubjectsManager } from "@/components/CourseSubjectsManager";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  AlertCircle, 
  User, 
  Lock, 
  BellRing, 
  Save, 
  Check, 
  UserCog, 
  KeyRound, 
  Bell, 
  Mail, 
  HelpCircle, 
  Eye, 
  EyeOff,
  ShieldCheck,
  Clock,
  Plus,
  Pencil,
  Trash,
  MessageSquare,
  List,
  FileText,
  Download,
  Upload,
  Database,
  School
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Profil formu şeması
const profileFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Ad soyad en az 2 karakter olmalıdır",
  }),
  username: z.string().min(3, {
    message: "Kullanıcı adı en az 3 karakter olmalıdır",
  }),
  role: z.string(),
});

// Şifre değiştirme formu şeması
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, {
    message: "Mevcut şifre gereklidir",
  }),
  newPassword: z.string().min(6, {
    message: "Yeni şifre en az 6 karakter olmalıdır",
  }),
  confirmPassword: z.string().min(6, {
    message: "Şifre onayı en az 6 karakter olmalıdır",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// Görüşme konuları formu şeması
const topicsFormSchema = z.object({
  topics: z.string().min(1, {
    message: "En az bir konu girmelisiniz",
  }),
});

type TopicsFormValues = z.infer<typeof topicsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, updateProfileMutation } = useAuth();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Ders saatleri için state'ler
  const [isAddClassHourDialogOpen, setIsAddClassHourDialogOpen] = useState(false);
  const [isBulkAddClassHourDialogOpen, setIsBulkAddClassHourDialogOpen] = useState(false);
  const [editingClassHour, setEditingClassHour] = useState<ClassHour | null>(null);
  const [deletingClassHourId, setDeletingClassHourId] = useState<number | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  
  // Görüşme konuları için state'ler
  const [isSubmittingTopics, setIsSubmittingTopics] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  
  // Veri yedekleme/geri yükleme için state'ler
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreReport, setRestoreReport] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ders saatlerini getir
  const { data: classHours = [], isLoading: isLoadingClassHours } = useQuery<ClassHour[]>({
    queryKey: ["/api/class-hours"],
  });
  
  // Görüşme konularını getir
  const { data: counselingTopics = [], isLoading: isLoadingCounselingTopics } = useQuery<CounselingTopic[]>({
    queryKey: ["/api/counseling-topics"],
  });
  
  // Görüşme konuları toplu ekleme
  const createCounselingTopicsMutation = useMutation({
    mutationFn: async (data: { topics: string }) => {
      const response = await fetch("/api/counseling-topics/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/counseling-topics"] });
      toast({
        title: "Başarılı",
        description: "Görüşme konuları başarıyla eklendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Görüşme konuları eklenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Görüşme konusu silme
  const deleteCounselingTopicMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/counseling-topics/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/counseling-topics"] });
      toast({
        title: "Başarılı",
        description: "Görüşme konusu başarıyla silindi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Görüşme konusu silinirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Yeni ders saati ekle
  const createClassHourMutation = useMutation({
    mutationFn: async (classHour: InsertClassHour) => {
      const response = await fetch("/api/class-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classHour),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/class-hours"] });
      toast({
        title: "Başarılı",
        description: "Ders saati başarıyla eklendi.",
      });
      setIsBulkAddClassHourDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Ders saati eklenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ders saati güncelle
  const updateClassHourMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertClassHour> }) => {
      const response = await fetch(`/api/class-hours/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/class-hours"] });
      toast({
        title: "Başarılı",
        description: "Ders saati başarıyla güncellendi.",
      });
      setEditingClassHour(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Ders saati güncellenirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ders saati sil
  const deleteClassHourMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/class-hours/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/class-hours"] });
      toast({
        title: "Başarılı",
        description: "Ders saati başarıyla silindi.",
      });
      setDeletingClassHourId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Ders saati silinirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ders saati işlemleri
  const handleAddClassHour = (data: InsertClassHour) => {
    createClassHourMutation.mutate(data);
  };

  const handleEditClassHour = (data: InsertClassHour) => {
    if (editingClassHour) {
      updateClassHourMutation.mutate({ id: editingClassHour.id, data });
    }
  };

  const handleDeleteClassHour = (id: number) => {
    if (confirm("Bu ders saatini silmek istediğinize emin misiniz?")) {
      deleteClassHourMutation.mutate(id);
    }
  };
  
  // Birden fazla güne ders saati ekleme
  const handleBulkAddClassHours = async (data: { name: string; startTime: string; endTime: string; days: number[]; description?: string; isActive: number }) => {
    try {
      setIsBulkSaving(true);
      
      // Günleri virgülle birleştirip ders açıklamasına ekle
      const selectedDayNames = data.days.map(day => 
        ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"][day - 1]
      ).join(", ");
      
      const classHourData: InsertClassHour = {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        dayOfWeek: 0, // Artık tüm günleri kapsadığı için 0 kullanıyoruz 
        description: `${data.description || ""} (Günler: ${selectedDayNames})`,
        isActive: data.isActive
      };
      
      await createClassHourMutation.mutateAsync(classHourData);
      
      toast({
        title: "Başarılı",
        description: `Ders saati başarıyla eklendi. (${selectedDayNames})`,
      });
      
      setIsBulkAddClassHourDialogOpen(false);
    } catch (error) {
      toast({
        title: "Hata",
        description: `Ders saati eklenirken bir hata oluştu: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Görüşme konuları işlemleri
  const handleDeleteCounselingTopic = (id: number) => {
    if (confirm("Bu görüşme konusunu silmek istediğinize emin misiniz?")) {
      deleteCounselingTopicMutation.mutate(id);
    }
  };
  
  // Görüşme konuları toplu ekleme formu
  const topicsForm = useForm<TopicsFormValues>({
    resolver: zodResolver(topicsFormSchema),
    defaultValues: {
      topics: "",
    },
  });
  
  // Görüşme konuları toplu ekleme işlemi
  const onTopicsSubmit = (data: TopicsFormValues) => {
    setIsSubmittingTopics(true);
    createCounselingTopicsMutation.mutate(data, {
      onSuccess: () => {
        setIsSubmittingTopics(false);
        topicsForm.reset();
      },
      onError: () => {
        setIsSubmittingTopics(false);
      },
    });
  };
  
  // Profil formu
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      username: user?.username || "",
      role: user?.role || "rehber",
    },
  });

  // Şifre değiştirme formu
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Profil güncelleme işlemi
  const onProfileSubmit = (data: ProfileFormValues) => {
    setIsUpdatingProfile(true);
    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        setIsUpdatingProfile(false);
      },
      onError: (error: Error) => {
        toast({
          title: "Hata",
          description: error.message || "Profil güncellenirken bir hata oluştu.",
          variant: "destructive",
        });
        setIsUpdatingProfile(false);
      },
    });
  };

  // Şifre değiştirme işlemi
  const { changePasswordMutation } = useAuth();

  const onPasswordSubmit = (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    changePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      },
      {
        onSuccess: () => {
          setIsChangingPassword(false);
          passwordForm.reset();
        },
        onError: (error: Error) => {
          toast({
            title: "Hata",
            description: error.message || "Şifre değiştirilirken bir hata oluştu.",
            variant: "destructive",
          });
          setIsChangingPassword(false);
        },
      }
    );
  };
  
  // Veri yedekleme işlemi
  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      
      const response = await fetch("/api/backup", {
        method: "GET",
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Veri yedeklenirken bir hata oluştu");
      }
      
      const backupData = await response.json();
      
      // JSON verisini indirilebilir dosya olarak kaydet
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const fileName = `rehberlik_yedek_${dateStr}.json`;
      
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Temizlik
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "Başarılı",
        description: "Veri yedeği başarıyla oluşturuldu.",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: `Veri yedeklenirken bir hata oluştu: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };
  
  // Yedek dosyası seçme işlemi
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setRestoreFile(e.target.files[0]);
      setRestoreReport(null); // Yeni dosya seçildiğinde raporu sıfırla
    }
  };
  
  // Veri geri yükleme işlemi
  const handleRestore = async () => {
    if (!restoreFile) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir yedek dosyası seçin.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsRestoring(true);
      
      // Dosyayı oku
      const reader = new FileReader();
      
      const filePromise = new Promise<string>((resolve, reject) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          } else {
            reject(new Error("Dosya okunamadı"));
          }
        };
        reader.onerror = () => reject(new Error("Dosya okuma hatası"));
      });
      
      reader.readAsText(restoreFile);
      
      // Dosya içeriğini al
      const fileContent = await filePromise;
      
      // JSON parse et
      const backupData = JSON.parse(fileContent);
      
      // Sunucuya gönder
      const response = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      const result = await response.json();
      
      // Raporu göster
      setRestoreReport(result.report);
      
      // Tüm verileri güncelle
      queryClient.invalidateQueries();
      
      toast({
        title: "Başarılı",
        description: result.message || "Veriler başarıyla geri yüklendi.",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: `Veriler geri yüklenirken bir hata oluştu: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };
  
  // Dosya seçme diyaloğunu aç
  const openFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Tabs state synced with query param
  const allowedTabs = new Set([
    "profile",
    "password",
    "notifications",
    "class-hours",
    "counseling-topics",
    "course-subjects",
    "data-backup",
    "school-info",
  ]);
  const getTabFromLocation = (loc: string) => {
    const query = loc.split("?")[1] || "";
    const params = new URLSearchParams(query);
    const t = params.get("tab") || "profile";
    return allowedTabs.has(t) ? t : "profile";
  };
  const [activeTab, setActiveTab] = useState<string>(getTabFromLocation(location));
  useEffect(() => {
    const next = getTabFromLocation(location);
    if (next !== activeTab) setActiveTab(next);
  }, [location]);

  return (
    <Layout title="Ayarlar" description="Hesap ve uygulama ayarları">
      {/* Ana başlık ve açıklama */}
      <div className="mb-8 glass-panel">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="w-24 h-24 border-0">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-4xl">
                {user?.fullName?.substring(0, 1) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-primary text-white rounded-full p-1.5 shadow-md">
              <UserCog className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gradient">
              Hesap Ayarları
            </h1>
            <p className="text-muted-foreground max-w-lg">
              Profil bilgilerinizi güncelleyebilir, şifrenizi değiştirebilir ve bildirim tercihlerinizi ayarlayabilirsiniz.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setLocation(`/settings?tab=${v}`, { replace: true }); }} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger 
            value="profile" 
            className="rounded-lg gap-2 data-[state=active]:bg-background"
          >
            <User className="h-4 w-4" />
            <span>Profil</span>
          </TabsTrigger>
          <TabsTrigger 
            value="password" 
            className="rounded-lg gap-2 data-[state=active]:bg-background"
          >
            <Lock className="h-4 w-4" />
            <span>Şifre</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="rounded-lg gap-2 data-[state=active]:bg-background"
          >
            <BellRing className="h-4 w-4" />
            <span>Bildirimler</span>
          </TabsTrigger>
          <TabsTrigger 
            value="class-hours" 
            className="rounded-lg gap-2 data-[state=active]:bg-background"
          >
            <Clock className="h-4 w-4" />
            <span>Ders Saatleri</span>
          </TabsTrigger>
          <TabsTrigger 
            value="counseling-topics" 
            className="rounded-lg gap-2 data-[state=active]:bg-background"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Görüşme Konuları</span>
          </TabsTrigger>
          <TabsTrigger 
            value="course-subjects" 
            className="rounded-lg gap-2 data-[state=active]:bg-background"
          >
            <FileText className="h-4 w-4" />
            <span>Ders Konuları</span>
          </TabsTrigger>
          <TabsTrigger 
            value="data-backup" 
            className="rounded-lg gap-2 data-[state=active]:bg-background"
          >
            <Database className="h-4 w-4" />
            <span>Veri Yedekleme</span>
          </TabsTrigger>
          <TabsTrigger 
            value="school-info" 
            className="rounded-lg gap-2 data-[state=active]:bg-background"
          >
            <School className="h-4 w-4" />
            <span>Okul Bilgileri</span>
          </TabsTrigger>
        </TabsList>

        {/* Profil Ayarları */}
        <AnimatePresence mode="wait">
          <TabsContent value="profile" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                      <UserCog className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Profil Bilgileri</CardTitle>
                      <CardDescription>
                        Kişisel bilgilerinizi güncelleyin
                      </CardDescription>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={profileForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ad Soyad</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Adınız ve soyadınız" 
                                  className="glass-effect-strong focus:border-primary" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Rehberlik servisinde görünecek tam adınız
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kullanıcı Adı</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Kullanıcı adınız" 
                                  className="glass-effect-strong focus:border-primary" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Sisteme giriş yaparken kullanacağınız kullanıcı adı
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rol</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="glass-effect-strong">
                                  <SelectValue placeholder="Rol seçiniz" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="rehber">Rehber Öğretmen</SelectItem>
                                <SelectItem value="admin">Yönetici</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Sistemdeki yetki seviyeniz
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={isUpdatingProfile} 
                          className="btn-gradient gap-2"
                        >
                          {isUpdatingProfile ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                              <span>Kaydediliyor...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              <span>Değişiklikleri Kaydet</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>

        {/* Şifre Ayarları */}
        <AnimatePresence mode="wait">
          <TabsContent value="password" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Şifre Değiştir</CardTitle>
                      <CardDescription>
                        Hesabınızın şifresini güncelleyin
                      </CardDescription>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6 glass-effect">
                    <ShieldCheck className="h-4 w-4 text-secondary" />
                    <AlertTitle className="text-secondary font-medium">Güvenlik İpucu</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                      Güvenliğiniz için şifrenizi düzenli olarak değiştirmenizi ve kolay tahmin edilemeyecek bir şifre kullanmanızı öneririz.
                    </AlertDescription>
                  </Alert>

                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mevcut Şifre</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input 
                                  type={showCurrentPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  className="glass-effect-strong focus:border-primary pr-10" 
                                  {...field} 
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Yeni Şifre</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input 
                                    type={showNewPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    className="glass-effect-strong focus:border-primary pr-10" 
                                    {...field} 
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              <FormDescription>
                                En az 6 karakter uzunluğunda olmalıdır
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Şifre Tekrar</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    className="glass-effect-strong focus:border-primary pr-10" 
                                    {...field} 
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={isChangingPassword} 
                          className="btn-gradient gap-2"
                        >
                          {isChangingPassword ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                              <span>Değiştiriliyor...</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4" />
                              <span>Şifreyi Değiştir</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
        
        {/* Görüşme Konuları */}
        <AnimatePresence mode="wait">
          <TabsContent value="counseling-topics" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Konuları Giriş Formu */}
                <Card className="glass-card border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Görüşme Konuları Ekle</CardTitle>
                        <CardDescription>
                          Her satır ayrı bir görüşme konusu olarak kaydedilecektir
                        </CardDescription>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </CardHeader>
                  <CardContent>
                    <Form {...topicsForm}>
                      <form onSubmit={topicsForm.handleSubmit(onTopicsSubmit)} className="space-y-6">
                        <FormField
                          control={topicsForm.control}
                          name="topics"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Görüşme Konuları</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Her bir konuyu yeni bir satıra yazın. Örnek:
Okul başarısı
Arkadaş ilişkileri
Aile ilişkileri
Sınav kaygısı" 
                                  className="glass-effect-strong focus:border-primary min-h-[250px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Toplu konu girişi için her satıra bir konu yazın. Bu konular görüşme kayıtlarında seçilebilir olacaktır.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={isSubmittingTopics} 
                            className="btn-gradient gap-2"
                          >
                            {isSubmittingTopics ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                <span>Kaydediliyor...</span>
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                <span>Konuları Kaydet</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Mevcut Görüşme Konuları Listesi */}
                <Card className="glass-card border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                        <List className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Mevcut Konular</CardTitle>
                        <CardDescription>
                          Sistemde kayıtlı tüm görüşme konuları
                        </CardDescription>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </CardHeader>
                  <CardContent>
                    {isLoadingCounselingTopics ? (
                      <div className="flex justify-center items-center h-[250px]">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : counselingTopics.length === 0 ? (
                      <div className="text-center p-8 border border-dashed rounded-lg">
                        <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">Henüz konu eklenmemiş</h3>
                        <p className="text-muted-foreground">
                          Görüşme konularını eklemek için sol taraftaki formu kullanabilirsiniz.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                        {counselingTopics.map((topic) => (
                          <div 
                            key={topic.id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-card glass-effect-strong"
                          >
                            <span>{topic.topic}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteCounselingTopic(topic.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Konuyu sil</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
        </AnimatePresence>

        {/* Bildirim Ayarları */}
        <AnimatePresence mode="wait">
          <TabsContent value="notifications" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Bildirim Ayarları</CardTitle>
                      <CardDescription>
                        Bildirim tercihlerinizi yapılandırın
                      </CardDescription>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    <div className="bg-muted/30 rounded-xl p-4">
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-primary" />
                        <span>Uygulama Bildirimleri</span>
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between glass-effect p-3 rounded-lg">
                          <div className="space-y-0.5">
                            <div className="font-medium">Yeni randevu bildirimleri</div>
                            <div className="text-sm text-muted-foreground">
                              Yeni bir randevu oluşturulduğunda bildirim al
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-gradient-to-r from-primary to-primary-light data-[state=checked]:border-0" defaultChecked />
                        </div>

                        <div className="flex items-center justify-between glass-effect p-3 rounded-lg">
                          <div className="space-y-0.5">
                            <div className="font-medium">Randevu hatırlatmaları</div>
                            <div className="text-sm text-muted-foreground">
                              Yaklaşan randevular için hatırlatma al
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-gradient-to-r from-primary to-primary-light data-[state=checked]:border-0" defaultChecked />
                        </div>

                        <div className="flex items-center justify-between glass-effect p-3 rounded-lg">
                          <div className="space-y-0.5">
                            <div className="font-medium">Randevu iptalleri</div>
                            <div className="text-sm text-muted-foreground">
                              Bir randevu iptal edildiğinde bildirim al
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-gradient-to-r from-primary to-primary-light data-[state=checked]:border-0" defaultChecked />
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4">
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-secondary" />
                        <span>E-posta Bildirimleri</span>
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between glass-effect p-3 rounded-lg">
                          <div className="space-y-0.5">
                            <div className="font-medium">Öğrenci güncellemeleri</div>
                            <div className="text-sm text-muted-foreground">
                              Öğrenci bilgileri güncellendiğinde bildirim al
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-gradient-to-r from-secondary to-secondary-light data-[state=checked]:border-0" />
                        </div>

                        <div className="flex items-center justify-between glass-effect p-3 rounded-lg">
                          <div className="space-y-0.5">
                            <div className="font-medium">E-posta bildirimleri</div>
                            <div className="text-sm text-muted-foreground">
                              Bildirimler ayrıca e-posta olarak da gönderilsin
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-gradient-to-r from-secondary to-secondary-light data-[state=checked]:border-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button className="btn-gradient gap-2">
                    <Save className="h-4 w-4" />
                    <span>Ayarları Kaydet</span>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>

        {/* Ders Saatleri */}
        <AnimatePresence mode="wait">
          <TabsContent value="class-hours" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Ders Saatleri</CardTitle>
                      <CardDescription>
                        Okul ders saatlerini düzenleyin
                      </CardDescription>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6 glass-effect">
                    <AlertCircle className="h-4 w-4 text-secondary" />
                    <AlertTitle className="text-secondary font-medium">Ders Saatleri Yönetimi</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                      Okul ders saatlerini buradan düzenleyebilirsiniz. Ders saatleri, öğrenci ve öğretmenlerin programlarını planlamak için kullanılır.
                    </AlertDescription>
                  </Alert>

                  <div className="mt-6">
                    <div className="flex flex-wrap gap-2 mb-6">
                      <Button 
                        className="btn-gradient"
                        onClick={() => setIsBulkAddClassHourDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ders Saati Ekle
                      </Button>
                    </div>
                    
                    {isLoadingClassHours ? (
                      <div className="flex justify-center items-center h-40">
                        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : classHours && classHours.length > 0 ? (
                      <div className="grid gap-4">
                        {classHours.map((classHour: ClassHour) => (
                          <div key={classHour.id} className="rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-primary/10 rounded-md">
                                  <Clock className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{classHour.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {classHour.startTime} - {classHour.endTime}
                                    {classHour.dayOfWeek > 0 ? (
                                      <span className="ml-2 text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                                        {["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"][classHour.dayOfWeek - 1]}
                                      </span>
                                    ) : null}
                                  </p>
                                  {classHour.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {classHour.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setEditingClassHour(classHour)}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Düzenle
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteClassHour(classHour.id)}
                                >
                                  <Trash className="h-3.5 w-3.5 mr-1" />
                                  Sil
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-10 border border-dashed rounded-lg">
                        <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium mb-1">Henüz ders saati eklenmemiş</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Okul için ders saatleri ekleyerek programınızı düzenleyebilirsiniz.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsBulkAddClassHourDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          İlk Ders Saatini Ekle
                        </Button>
                      </div>
                    )}
                  </div>
                  

                  
                  {/* Düzenleme Dialog */}
                  {editingClassHour && (
                    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="bg-card border rounded-lg shadow-lg max-w-md w-full p-6 relative">
                        <button 
                          onClick={() => setEditingClassHour(null)}
                          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                        
                        <h2 className="text-lg font-semibold mb-1">Ders Saati Düzenle</h2>
                        <p className="text-sm text-muted-foreground mb-4">Ders saati bilgilerini güncelleyin.</p>
                        
                        <ClassHourForm
                          defaultValues={{
                            name: editingClassHour.name,
                            startTime: editingClassHour.startTime,
                            endTime: editingClassHour.endTime,
                            dayOfWeek: editingClassHour.dayOfWeek || undefined,
                            description: editingClassHour.description || undefined,
                            isActive: editingClassHour.isActive
                          }}
                          onSubmit={handleEditClassHour}
                          isLoading={updateClassHourMutation.isPending}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Toplu Ders Saati Ekleme Dialog */}
                  {isBulkAddClassHourDialogOpen && (
                    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="bg-card border rounded-lg shadow-lg max-w-md w-full p-6 relative">
                        <button 
                          onClick={() => setIsBulkAddClassHourDialogOpen(false)}
                          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                        
                        <h2 className="text-lg font-semibold mb-1">Ders Saati Ekleme</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Tekil veya çoklu günler için ders saati tanımlayın.
                        </p>
                        
                        <BulkClassHourForm
                          onSubmit={handleBulkAddClassHours}
                          isLoading={isBulkSaving}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
        
        {/* Ders Konuları Ayarları */}
        <AnimatePresence mode="wait">
          <TabsContent value="course-subjects" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card border-0 shadow-lg mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Ders Konuları Yönetimi</CardTitle>
                      <CardDescription>
                        Dersleri ve ders konularını ekleyebilir, Excel dosyasından içe aktarabilirsiniz
                      </CardDescription>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Dersler</h3>
                    <p className="text-muted-foreground mb-4">
                      Önce ders ekleyin, ardından derse ait konuları yönetebilirsiniz.
                    </p>
                    
                    <CourseSubjectsManager />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
        
        {/* Veri Yedekleme ve Geri Yükleme Ayarları */}
        <AnimatePresence mode="wait">
          <TabsContent value="data-backup" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card border-0 shadow-lg mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Veri Yedekleme ve Geri Yükleme</CardTitle>
                      <CardDescription>
                        Sistem verilerinizi yedekleyin ve gerektiğinde geri yükleyin
                      </CardDescription>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6 glass-effect">
                    <ShieldCheck className="h-4 w-4 text-secondary" />
                    <AlertTitle className="text-secondary font-medium">Veri Güvenliği</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                      Düzenli olarak verilerinizi yedeklemenizi öneririz. Yedek dosyalarını güvenli bir yerde saklayabilir, gerektiğinde sisteme geri yükleyebilirsiniz.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Veri Yedekleme Bölümü */}
                    <div className="rounded-lg p-5 glass-effect-strong border">
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                        <Download className="h-4 w-4 text-primary" />
                        <span>Veri Yedekleme</span>
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Tüm sistem verilerinizi JSON formatında bilgisayarınıza indirebilirsiniz. Bu yedek, öğrenci bilgilerini, görüşme kayıtlarını, ders programlarını ve diğer ayarları içerir.
                      </p>
                      
                      <div className="flex justify-end">
                        <Button
                          onClick={handleBackup}
                          disabled={isBackingUp}
                          className="btn-gradient w-full gap-2"
                        >
                          {isBackingUp ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                              <span>Yedekleniyor...</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              <span>Verileri Yedekle</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Veri Geri Yükleme Bölümü */}
                    <div className="rounded-lg p-5 glass-effect-strong border">
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                        <Upload className="h-4 w-4 text-primary" />
                        <span>Veri Geri Yükleme</span>
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Önceden aldığınız yedek dosyasını sisteme geri yükleyebilirsiniz. Dosya formatının doğru olduğundan emin olun.
                      </p>
                      
                      <div className="flex flex-col space-y-4">
                        <div className="relative rounded-md p-3 border border-dashed border-muted-foreground bg-background/50 min-h-[100px] flex items-center justify-center">
                          {restoreFile ? (
                            <div className="text-center">
                              <p className="text-sm font-medium mb-1">{restoreFile.name}</p>
                              <p className="text-xs text-muted-foreground">{(restoreFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Dosyayı sürükleyin veya seçin
                              </p>
                            </div>
                          )}
                          <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        
                        <Button
                          onClick={handleRestore}
                          disabled={isRestoring || !restoreFile}
                          className="btn-gradient w-full gap-2"
                        >
                          {isRestoring ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                              <span>Geri Yükleniyor...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              <span>Verileri Geri Yükle</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Geri yükleme raporu */}
                  {restoreReport && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Geri Yükleme Raporu</h3>
                      <div className="rounded-lg p-4 glass-effect border">
                        <div className="mb-2">
                          <span className="font-medium">Toplam Kayıt Sayısı:</span> {restoreReport.totalRecords}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Öğrenciler:</span> {restoreReport.processed.students} öğrenci
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Görüşme Konuları:</span> {restoreReport.processed.counselingTopics} konu
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Ders Saatleri:</span> {restoreReport.processed.classHours} ders saati
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Dersler:</span> {restoreReport.processed.courses} ders
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Ders Konuları:</span> {restoreReport.processed.courseSubjects} konu
                          </div>
                        </div>
                        
                        {/* Hatalar */}
                        {restoreReport.errors && restoreReport.errors.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-destructive mb-2">Hatalar:</h4>
                            <ul className="text-xs text-destructive space-y-1">
                              {restoreReport.errors.slice(0, 5).map((error, index) => (
                                <li key={index} className="pl-2 border-l-2 border-destructive">
                                  {error}
                                </li>
                              ))}
                              {restoreReport.errors.length > 5 && (
                                <li className="font-medium">
                                  ... ve {restoreReport.errors.length - 5} daha fazla hata
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>

        {/* Okul Bilgileri */}
        <AnimatePresence mode="wait">
          <TabsContent value="school-info" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                      <School className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Okul Bilgileri</CardTitle>
                      <CardDescription>
                        Kurumunuza ait temel bilgileri yönetin
                      </CardDescription>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </CardHeader>
                <CardContent>
                  <SchoolInfoComponent />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </Layout>
  );
}
