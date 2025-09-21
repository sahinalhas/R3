import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, UserPlus, UserCheck, Lock, User, ChevronRight, MailCheck, Brain, Sparkles, BookOpenCheck, Lightbulb, Calendar } from "lucide-react";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gereklidir"),
  password: z.string().min(1, "Şifre gereklidir"),
});

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır"),
  fullName: z.string().min(1, "Ad ve soyad gereklidir"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  role: z.string().default("rehber"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation, isLoading } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
      role: "rehber",
    },
  });

  // Handle login submit
  const onLoginSubmit = (values: LoginValues) => {
    loginMutation.mutate(values);
  };

  // Handle register submit
  const onRegisterSubmit = (values: RegisterValues) => {
    registerMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <School className="h-10 w-10 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      } 
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Background Pattern/Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      
      {/* Left side - Forms */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 md:px-8 lg:flex-none lg:px-16 xl:px-20 relative z-10">
        <motion.div 
          className="mx-auto w-full max-w-md"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Logo and Title */}
          <motion.div variants={itemVariants} className="flex flex-col items-center md:items-start">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <School className="h-9 w-9 text-primary" />
            </div>
            <h2 className="text-gradient text-4xl font-bold tracking-tight mb-2">Rehberlik Servisi</h2>
            <p className="text-muted-foreground text-lg">
              Öğrenci yönetimi ve rehberlik platformu
            </p>
          </motion.div>

          {/* Authentication Tabs */}
          <motion.div variants={itemVariants} className="mt-10">
            <Tabs 
              defaultValue="login" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="flex flex-col space-y-4">
                <TabsList className="grid w-full grid-cols-2 h-14 rounded-lg bg-muted p-1">
                  <TabsTrigger 
                    value="login" 
                    className={`rounded-md transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${activeTab === 'login' ? 'font-medium' : ''}`}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Giriş Yap
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register"
                    className={`rounded-md transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${activeTab === 'register' ? 'font-medium' : ''}`}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Kayıt Ol
                  </TabsTrigger>
                </TabsList>
              </div>

              <motion.div 
                className="mt-6 relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value="login" className="mt-0">
                  <Card className="border-0 shadow-lg glass-card">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl">Hesabınıza giriş yapın</CardTitle>
                      <CardDescription>
                        Öğrenci rehberlik sistemini kullanmak için giriş yapın
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                          <FormField
                            control={loginForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="form-label">Kullanıcı Adı</FormLabel>
                                <div className="relative">
                                  <FormControl>
                                    <Input 
                                      placeholder="Kullanıcı adınızı giriniz" 
                                      className="pl-10 input-modern" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <FormMessage className="form-error" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="form-label">Şifre</FormLabel>
                                <div className="relative">
                                  <FormControl>
                                    <Input 
                                      type="password" 
                                      placeholder="Şifrenizi giriniz" 
                                      className="pl-10 input-modern" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <FormMessage className="form-error" />
                              </FormItem>
                            )}
                          />

                          <div className="pt-2">
                            <Button 
                              type="submit" 
                              className="w-full h-11 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_200%] bg-left hover:bg-right transition-all duration-500"
                              disabled={loginMutation.isPending}
                            >
                              {loginMutation.isPending ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Giriş Yapılıyor
                                </>
                              ) : (
                                <>
                                  Giriş Yap <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="register" className="mt-0">
                  <Card className="border-0 shadow-lg glass-card">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl">Yeni hesap oluşturun</CardTitle>
                      <CardDescription>
                        Rehberlik sistemini kullanmak için kayıt olun
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="form-label">Kullanıcı Adı</FormLabel>
                                <div className="relative">
                                  <FormControl>
                                    <Input 
                                      placeholder="Kullanıcı adı giriniz" 
                                      className="pl-10 input-modern" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <FormMessage className="form-error" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="form-label">Ad Soyad</FormLabel>
                                <div className="relative">
                                  <FormControl>
                                    <Input 
                                      placeholder="Adınız ve soyadınızı giriniz" 
                                      className="pl-10 input-modern" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <FormMessage className="form-error" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="form-label">Şifre</FormLabel>
                                <div className="relative">
                                  <FormControl>
                                    <Input 
                                      type="password" 
                                      placeholder="Şifre belirleyin" 
                                      className="pl-10 input-modern" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <FormMessage className="form-error" />
                              </FormItem>
                            )}
                          />

                          <div className="pt-2">
                            <Button 
                              type="submit" 
                              className="w-full h-11 btn-gradient"
                              disabled={registerMutation.isPending}
                            >
                              {registerMutation.isPending ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Kayıt Yapılıyor
                                </>
                              ) : (
                                <>
                                  Kayıt Ol <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </motion.div>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>

      {/* Right side - Hero Content */}
      <div className="relative hidden lg:block lg:flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-accent">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB4PSIwIiB5PSIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSgzMCkiPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')]">
            <div className="absolute inset-0 backdrop-blur-[100px]"></div>
            <div className="relative h-full flex flex-col justify-center p-12">
              <motion.div 
                className="max-w-xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                {/* Floating logo */}
                <div className="mb-10 w-20 h-20 relative float-animation">
                  <div className="absolute inset-0 bg-white/20 rounded-xl blur-md"></div>
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <BookOpenCheck className="h-10 w-10 text-white" />
                  </div>
                </div>

                <h1 className="text-5xl font-bold mb-6 text-white text-shadow-lg">
                  Eğitimci Dostu<br />
                  <span className="text-white/90">Rehberlik</span> Platformu
                </h1>
                
                <p className="text-xl text-white/90 mb-12 max-w-lg">
                  Öğrencilerinize daha iyi rehberlik hizmeti sunmak için tasarlanmış modern ve kullanımı kolay platform.
                </p>

                {/* Feature cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <motion.div
                    className="glass-panel backdrop-blur-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center mb-4">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Akıllı Öğrenci Takibi</h3>
                    <p className="text-sm text-white/80">
                      Öğrencilerin akademik ve kişisel gelişimlerini takip edin, detaylı analizlere erişin.
                    </p>
                  </motion.div>
                  
                  <motion.div
                    className="glass-panel backdrop-blur-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center mb-4">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Kolay Randevu Yönetimi</h3>
                    <p className="text-sm text-white/80">
                      Randevuları yönetin, görüşmeleri kaydedin ve istatistikleri inceleyin.
                    </p>
                  </motion.div>
                  
                  <motion.div
                    className="glass-panel backdrop-blur-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center mb-4">
                      <Lightbulb className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Kapsamlı Danışmanlık</h3>
                    <p className="text-sm text-white/80">
                      Öğrenci gelişimine odaklı rehberlik hizmetleri ve danışmanlık süreçleri.
                    </p>
                  </motion.div>
                  
                  <motion.div
                    className="glass-panel backdrop-blur-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center mb-4">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Modern Arayüz</h3>
                    <p className="text-sm text-white/80">
                      Kullanıcı dostu, modern ve responsive tasarım ile her cihazda mükemmel deneyim.
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
