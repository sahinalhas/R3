import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Şifre için daha katı kurallar
const authUserSchema = insertUserSchema.extend({
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

type AuthUser = Omit<User, 'password'>;
type UpdateProfileData = {
  username?: string;
  fullName?: string;
  role?: string;
};

type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthUser, Error, RegisterData>;
  updateProfileMutation: UseMutationResult<AuthUser, Error, UpdateProfileData>;
  changePasswordMutation: UseMutationResult<{success: boolean; message: string}, Error, ChangePasswordData>;
};

type LoginData = Pick<z.infer<typeof authUserSchema>, "username" | "password">;
type RegisterData = z.infer<typeof authUserSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: (user: AuthUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Giriş başarılı",
        description: `Hoş geldiniz, ${user.fullName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Giriş başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      return await res.json();
    },
    onSuccess: (user: AuthUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Kayıt başarılı",
        description: `Hoş geldiniz, ${user.fullName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Kayıt başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Çıkış yapıldı",
        description: "Başarıyla çıkış yaptınız.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Çıkış yapılamadı",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: UpdateProfileData) => {
      const res = await apiRequest("PUT", "/api/user", profileData);
      return await res.json();
    },
    onSuccess: (updatedUser: AuthUser) => {
      // Cache'deki kullanıcı bilgilerini güncelle
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profil güncellendi",
        description: "Kullanıcı bilgileriniz başarıyla güncellendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Profil güncellenemedi",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: ChangePasswordData) => {
      const res = await apiRequest("POST", "/api/user/change-password", passwordData);
      return await res.json();
    },
    onSuccess: (data: {success: boolean; message: string}) => {
      toast({
        title: "Şifre değiştirildi",
        description: data.message || "Şifreniz başarıyla değiştirildi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Şifre değiştirilemedi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
        changePasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
