import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Save } from 'lucide-react';

// Okul bilgileri için form şeması
const schoolInfoSchema = z.object({
  schoolName: z.string().min(1, { message: 'Okul adı zorunludur' }),
  province: z.string().min(1, { message: 'İl bilgisi zorunludur' }),
  district: z.string().min(1, { message: 'İlçe bilgisi zorunludur' }),
  logoUrl: z.string().optional(),
});

type SchoolInfoFormValues = z.infer<typeof schoolInfoSchema>;

export default function SchoolInfoComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Okul bilgilerini getir
  const schoolInfoQuery = useQuery<SchoolInfoFormValues>({
    queryKey: ['/api/school-info'],
    queryFn: async () => {
      const response = await apiRequest('/api/school-info');
      const data = await response.json();
      return data as SchoolInfoFormValues;
    },
  });

  // Form
  const form = useForm<SchoolInfoFormValues>({
    resolver: zodResolver(schoolInfoSchema),
    defaultValues: {
      schoolName: '',
      province: '',
      district: '',
      logoUrl: '',
    },
    values: schoolInfoQuery.data as SchoolInfoFormValues,
  });

  // Formu sunucuya gönder
  const updateMutation = useMutation({
    mutationFn: async (data: SchoolInfoFormValues) => {
      const response = await fetch('/api/school-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-info'] });
      toast({
        title: 'Bilgiler kaydedildi',
        description: 'Okul bilgileri başarıyla güncellendi.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: 'Okul bilgileri güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
      console.error('Güncelleme hatası:', error);
    },
  });

  function onSubmit(data: SchoolInfoFormValues) {
    updateMutation.mutate(data);
  }

  return (
    <div className="w-full">
      {schoolInfoQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Okul Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: Atatürk Anadolu Lisesi" {...field} />
                  </FormControl>
                  <FormDescription>
                    Okulunuzun tam resmi adını yazınız.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İl</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: İstanbul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İlçe</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: Kadıköy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL (İsteğe Bağlı)</FormLabel>
                  <FormControl>
                    <Input placeholder="Logo görsel adresi" {...field} />
                  </FormControl>
                  <FormDescription>
                    Okulunuzun logo görselinin internet adresini yazabilirsiniz.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('logoUrl') && (
              <div className="mt-2 flex justify-center">
                <img 
                  src={form.watch('logoUrl')} 
                  alt="Okul logosu" 
                  className="max-h-40 object-contain" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    toast({
                      title: 'Görsel yüklenemedi',
                      description: 'Logo URL geçersiz veya erişilemez',
                      variant: 'destructive',
                    });
                  }}
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                className="flex gap-2"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Bilgileri Kaydet
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}