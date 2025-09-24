import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Play,
  Eye,
  BookOpen
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertWeeklyStudySlotSchema } from "@shared/schema";
import type { 
  WeeklyStudySlot, 
  InsertWeeklyStudySlot, 
  Course,
  SubjectProgress 
} from "@shared/schema";

// Form şemaları
const weeklySlotFormSchema = insertWeeklyStudySlotSchema.extend({
  courseId: z.number({
    required_error: "Lütfen bir ders seçin",
  }),
  dayOfWeek: z.number().min(1).max(7),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Geçerli saat formatı (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Geçerli saat formatı (HH:MM)"),
});

const autoFillFormSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih formatı"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli tarih formatı"),
  dryRun: z.boolean().default(true),
});

type WeeklySlotFormValues = z.infer<typeof weeklySlotFormSchema>;
type AutoFillFormValues = z.infer<typeof autoFillFormSchema>;

interface TwoCalendarSystemProps {
  studentId: number;
  courses: Course[];
  subjectProgress: SubjectProgress[];
}

// Günler ve saat dilimleri
const DAYS_OF_WEEK = [
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "Salı" },
  { value: 3, label: "Çarşamba" },
  { value: 4, label: "Perşembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
  { value: 7, label: "Pazar" },
];

// 30 dakikalık aralıklarla saat dilimleri (07:00 - 24:00)
const TIME_SLOTS = Array.from({ length: 34 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30; // 07:00'dan başla, 30dk ekle
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

export default function TwoCalendarSystem({ studentId, courses, subjectProgress }: TwoCalendarSystemProps) {
  const { toast } = useToast();
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<WeeklyStudySlot | null>(null);
  const [isAutoFillDialogOpen, setIsAutoFillDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  // Drag & Drop state
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<WeeklyStudySlot | null>(null);

  // Haftalık slotları getir
  const { data: weeklySlots = [], isLoading: isSlotsLoading } = useQuery<WeeklyStudySlot[]>({
    queryKey: [`/api/students/${studentId}/weekly-slots`],
  });

  // Haftalık toplam süre
  const { data: weeklyTotalData } = useQuery<{ totalMinutes: number }>({
    queryKey: [`/api/students/${studentId}/weekly-total-minutes`],
  });

  // Haftalık slot oluşturma/güncelleme mutation
  const slotMutation = useMutation({
    mutationFn: async (data: WeeklySlotFormValues) => {
      if (editingSlot) {
        const res = await apiRequest("PATCH", `/api/weekly-slots/${editingSlot.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/students/${studentId}/weekly-slots`, data);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: editingSlot ? "Slot başarıyla güncellendi" : "Slot başarıyla oluşturuldu",
      });
      setIsSlotDialogOpen(false);
      setEditingSlot(null);
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-slots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-total-minutes`] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Slot kaydedilirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Slot silme mutation
  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: number) => {
      await apiRequest("DELETE", `/api/weekly-slots/${slotId}`);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Slot başarıyla silindi",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-slots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-total-minutes`] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Slot silinirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Otomatik konu yerleştirme mutation
  const autoFillMutation = useMutation({
    mutationFn: async (data: AutoFillFormValues) => {
      const res = await apiRequest("POST", `/api/students/${studentId}/auto-fill`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.filledSlots) {
          setPreviewData(data);
          toast({
            title: "Başarılı",
            description: data.message,
          });
        }
        
        // Eğer confirm işlemiyse, subject progress'i güncelle
        if (!autoFillForm.getValues("dryRun")) {
          queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/subject-progress`] });
          setIsAutoFillDialogOpen(false);
          setPreviewData(null);
        }
      } else {
        toast({
          title: "Uyarı",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Otomatik konu yerleştirme hatası",
        variant: "destructive",
      });
    },
  });

  // Form tanımlamaları
  const slotForm = useForm<WeeklySlotFormValues>({
    resolver: zodResolver(weeklySlotFormSchema),
    defaultValues: {
      studentId,
      courseId: 0,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    },
  });

  const autoFillForm = useForm<AutoFillFormValues>({
    resolver: zodResolver(autoFillFormSchema),
    defaultValues: {
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      dryRun: true,
    },
  });

  // Slot form handlers
  const handleCreateSlot = () => {
    setEditingSlot(null);
    slotForm.reset({
      studentId,
      courseId: 0,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    });
    setIsSlotDialogOpen(true);
  };

  const handleEditSlot = (slot: WeeklyStudySlot) => {
    setEditingSlot(slot);
    slotForm.reset({
      studentId: slot.studentId,
      courseId: slot.courseId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      notes: slot.notes || "",
    });
    setIsSlotDialogOpen(true);
  };

  const handleDeleteSlot = (slotId: number) => {
    if (confirm("Bu slotu silmek istediğinizden emin misiniz?")) {
      deleteSlotMutation.mutate(slotId);
    }
  };

  // Drag & Drop handlers
  const handleCourseDragStart = (e: React.DragEvent, course: Course) => {
    setDraggedCourse(course);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleSlotDragStart = (e: React.DragEvent, slot: WeeklyStudySlot) => {
    setDraggedSlot(slot);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedCourse ? "copy" : "move";
  };

  const handleCellDrop = async (e: React.DragEvent, dayOfWeek: number, timeSlot: string) => {
    e.preventDefault();
    
    const nextTimeSlot = TIME_SLOTS[TIME_SLOTS.indexOf(timeSlot) + 1] || "23:59";
    
    if (draggedCourse) {
      // Yeni slot oluştur
      if (hasSlotInTimeRange(dayOfWeek, timeSlot, nextTimeSlot)) {
        toast({
          title: "Çakışma Uyarısı",
          description: "Bu saat aralığında zaten bir slot var!",
          variant: "destructive",
        });
        setDraggedCourse(null);
        return;
      }

      const newSlotData: WeeklySlotFormValues = {
        studentId,
        courseId: draggedCourse.id,
        dayOfWeek,
        startTime: timeSlot,
        endTime: nextTimeSlot,
        notes: "",
      };

      slotMutation.mutate(newSlotData);
      setDraggedCourse(null);
    } else if (draggedSlot) {
      // Mevcut slotu taşı
      if (draggedSlot.dayOfWeek !== dayOfWeek || draggedSlot.startTime !== timeSlot) {
        // Orijinal duration'ı hesapla ve koru
        const originalStartTime = draggedSlot.startTime;
        const originalEndTime = draggedSlot.endTime;
        const startHour = parseInt(originalStartTime.split(':')[0]);
        const startMinute = parseInt(originalStartTime.split(':')[1]);
        const endHour = parseInt(originalEndTime.split(':')[0]);
        const endMinute = parseInt(originalEndTime.split(':')[1]);
        const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        
        // Yeni end time'ı hesapla (duration koruyarak) ve same-day clamp
        const newStartHour = parseInt(timeSlot.split(':')[0]);
        const newStartMinute = parseInt(timeSlot.split(':')[1]);
        const newStartTotalMinutes = newStartHour * 60 + newStartMinute;
        const newEndTotalMinutes = newStartTotalMinutes + durationMinutes;
        
        // Same-day clamp - midnight'ı geçmesin (23:59'a kadar)
        const maxEndMinutes = 23 * 60 + 59; // 23:59
        
        if (newEndTotalMinutes > maxEndMinutes) {
          toast({
            title: "Zaman Aşımı Uyarısı",
            description: `Bu slot bu saate taşınamaz çünkü süre gece yarısını geçecek. En geç ${Math.floor((maxEndMinutes - durationMinutes) / 60).toString().padStart(2, '0')}:${((maxEndMinutes - durationMinutes) % 60).toString().padStart(2, '0')} saatine kadar taşınabilir.`,
            variant: "destructive",
          });
          setDraggedSlot(null);
          return;
        }
        
        const clampedEndMinutes = Math.min(newEndTotalMinutes, maxEndMinutes);
        const newEndHour = Math.floor(clampedEndMinutes / 60);
        const newEndMinute = clampedEndMinutes % 60;
        const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
        
        // Çakışma kontrolü (mevcut slot'u hariç tutarak)
        if (hasSlotInTimeRange(dayOfWeek, timeSlot, newEndTime, draggedSlot.id)) {
          toast({
            title: "Çakışma Uyarısı", 
            description: "Bu saat aralığında zaten bir slot var!",
            variant: "destructive",
          });
          setDraggedSlot(null);
          return;
        }

        // Explicit update mutation - slot ID ile direkt PATCH yapacağız
        const updateMutation = async () => {
          try {
            const res = await apiRequest("PATCH", `/api/weekly-slots/${draggedSlot.id}`, {
              studentId: draggedSlot.studentId,
              courseId: draggedSlot.courseId,
              dayOfWeek,
              startTime: timeSlot,
              endTime: newEndTime,
              notes: draggedSlot.notes || "",
            });
            
            if (res.ok) {
              toast({
                title: "Başarılı",
                description: "Slot başarıyla taşındı",
              });
              queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-slots`] });
              queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-total-minutes`] });
            }
          } catch (error: any) {
            toast({
              title: "Hata",
              description: error.message || "Slot taşınırken hata oluştu",
              variant: "destructive",
            });
          }
        };

        updateMutation();
      }
      setDraggedSlot(null);
    }
  };

  const onSlotSubmit = (data: WeeklySlotFormValues) => {
    slotMutation.mutate(data);
  };

  const onAutoFillSubmit = (data: AutoFillFormValues) => {
    autoFillMutation.mutate(data);
  };

  // Yardımcı fonksiyonlar
  const getCourseById = (courseId: number) => {
    return courses.find(c => c.id === courseId);
  };

  const getSlotsByDay = (dayOfWeek: number) => {
    return weeklySlots.filter(slot => slot.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Belirli gün ve saat için slot bul
  const getSlotAtTime = (dayOfWeek: number, timeSlot: string) => {
    return weeklySlots.find(slot => 
      slot.dayOfWeek === dayOfWeek && 
      slot.startTime <= timeSlot && 
      slot.endTime > timeSlot
    );
  };

  // Saat aralığındaki slotları kontrol et (belirli slot'u hariç tut)
  const hasSlotInTimeRange = (dayOfWeek: number, startTime: string, endTime: string, excludeSlotId?: number) => {
    return weeklySlots.some(slot =>
      slot.dayOfWeek === dayOfWeek &&
      slot.id !== excludeSlotId &&
      ((slot.startTime <= startTime && slot.endTime > startTime) ||
       (slot.startTime < endTime && slot.endTime >= endTime) ||
       (slot.startTime >= startTime && slot.endTime <= endTime))
    );
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}s ${mins}dk`;
  };

  const getTotalProgress = () => {
    const total = subjectProgress.reduce((sum, p) => sum + p.totalTime, 0);
    const completed = subjectProgress.reduce((sum, p) => sum + p.completedTime, 0);
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const progress = getTotalProgress();
  const weeklyTotal = weeklyTotalData?.totalMinutes || 0;

  return (
    <div className="space-y-6">
      {/* Üst bilgi paneli */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Haftalık Toplam</p>
                <p className="text-2xl font-bold">{formatMinutes(weeklyTotal)}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam İlerleme</p>
                <p className="text-2xl font-bold">%{progress.percentage}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={progress.percentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktif Slotlar</p>
                <p className="text-2xl font-bold">{weeklySlots.length}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar1" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar1">
            📅 Takvim 1: Haftalık İskelet Plan
          </TabsTrigger>
          <TabsTrigger value="calendar2">
            🎯 Takvim 2: İçerik Yerleştirme
          </TabsTrigger>
        </TabsList>

        {/* TAKVİM 1: HAFTALIK İSKELET PLAN - YENİ GRID FORMAT */}
        <TabsContent value="calendar1" className="space-y-4">
          {/* Dersler Listesi - Sürüklenebilir */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Dersler - Sürükleyip Takvime Bırakın
              </CardTitle>
              <CardDescription>
                Aşağıdaki dersleri takvim grid'ine sürükleyerek haftalık planınızı oluşturun
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => (
                  <Badge
                    key={course.id}
                    variant="outline"
                    className="px-3 py-2 cursor-grab hover:bg-primary/10 border-primary/50 text-sm font-medium"
                    draggable
                    onDragStart={(e) => handleCourseDragStart(e, course)}
                    data-testid={`draggable-course-${course.id}`}
                  >
                    📚 {course.name}
                  </Badge>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCreateSlot}
                  className="ml-4"
                  data-testid="button-create-slot"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Manuel Ekle
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Grid Takvim */}
          <Card>
            <CardHeader>
              <CardTitle>Haftalık Çalışma Takvimi</CardTitle>
              <CardDescription>
                07:00 - 24:00 arası 30 dakikalık aralıklarla. Derslerinizi sürükleyip istediğiniz saate bırakın.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header - Günler */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="h-12 border rounded bg-gray-50 flex items-center justify-center text-xs font-medium">
                    Saat
                  </div>
                  {DAYS_OF_WEEK.map((day) => (
                    <div 
                      key={day.value} 
                      className="h-12 border rounded bg-gray-50 flex items-center justify-center text-xs font-medium"
                    >
                      {day.label}
                    </div>
                  ))}
                </div>

                {/* Grid - Saatler ve Slotlar */}
                <div className="space-y-1">
                  {TIME_SLOTS.map((timeSlot, timeIndex) => (
                    <div key={timeSlot} className="grid grid-cols-8 gap-1">
                      {/* Saat Sütunu */}
                      <div className="h-8 border rounded bg-gray-50/50 flex items-center justify-center text-xs font-mono">
                        {timeSlot}
                      </div>
                      
                      {/* Gün Hücreleri */}
                      {DAYS_OF_WEEK.map((day) => {
                        const slot = getSlotAtTime(day.value, timeSlot);
                        const course = slot ? getCourseById(slot.courseId) : null;
                        
                        return (
                          <div
                            key={`${day.value}-${timeSlot}`}
                            className={`h-8 border rounded transition-colors duration-150 ${
                              slot 
                                ? "bg-primary/20 border-primary/40 cursor-move" 
                                : "bg-white hover:bg-blue-50 border-gray-200 cursor-pointer"
                            } ${
                              (draggedCourse || draggedSlot) ? "ring-2 ring-blue-200" : ""
                            }`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleCellDrop(e, day.value, timeSlot)}
                            onClick={() => {
                              if (!slot && !draggedCourse && !draggedSlot) {
                                // Manuel slot oluşturma için
                                slotForm.setValue("dayOfWeek", day.value);
                                slotForm.setValue("startTime", timeSlot);
                                slotForm.setValue("endTime", TIME_SLOTS[timeIndex + 1] || "23:59");
                                setIsSlotDialogOpen(true);
                              }
                            }}
                            data-testid={`calendar-cell-${day.value}-${timeSlot}`}
                          >
                            {slot && (
                              <div
                                className="h-full w-full flex items-center justify-center text-xs font-medium text-primary bg-primary/10 rounded cursor-move"
                                draggable
                                onDragStart={(e) => handleSlotDragStart(e, slot)}
                                title={`${course?.name || "Bilinmeyen"} (${slot.startTime}-${slot.endTime})`}
                                data-testid={`slot-${slot.id}`}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="truncate max-w-[60px]">
                                    {course?.name?.substring(0, 8) || "?"}
                                  </span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 hover:bg-primary/30"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditSlot(slot);
                                      }}
                                      data-testid={`button-edit-slot-${slot.id}`}
                                    >
                                      <Edit className="h-2 w-2" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 hover:bg-red-200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSlot(slot.id);
                                      }}
                                      data-testid={`button-delete-slot-${slot.id}`}
                                    >
                                      <Trash2 className="h-2 w-2" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Yardım Metni */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Kullanım:</strong> Üstteki dersleri sürükleyip takvime bırakın, 
                    veya boş hücrelere tıklayın. Mevcut slotları sürükleyerek taşıyabilirsiniz.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAKVİM 2: İÇERİK YERLEŞTİRME */}
        <TabsContent value="calendar2" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Otomatik Konu Yerleştirme</CardTitle>
                  <CardDescription>
                    Haftalık slotlarınıza konuları otomatik olarak yerleştirin
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsAutoFillDialogOpen(true)}
                  disabled={weeklySlots.length === 0}
                  data-testid="button-auto-fill"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Otomatik Yerleştir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {weeklySlots.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Henüz slot tanımlanmamış</h3>
                  <p className="text-muted-foreground mb-4">
                    Otomatik konu yerleştirme için önce Takvim 1'de haftalık slotlar oluşturun.
                  </p>
                  <Button variant="outline" onClick={() => document.querySelector('[value="calendar1"]')?.click()}>
                    Takvim 1'e Git
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Toplam {weeklySlots.length} haftalık slot tanımlanmış. 
                    Bu slotlara tamamlanmamış konular otomatik olarak yerleştirilecek.
                  </div>
                  
                  {previewData && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-green-800">Önizleme Sonuçları</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm">{previewData.message}</p>
                          <p className="text-sm font-medium">
                            {previewData.filledSlots?.length || 0} slot için konu yerleştirmesi planlandı.
                          </p>
                          <Button 
                            onClick={() => {
                              autoFillForm.setValue("dryRun", false);
                              autoFillMutation.mutate(autoFillForm.getValues());
                            }}
                            className="w-full"
                            data-testid="button-confirm-auto-fill"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Onayla ve Uygula
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* SLOT OLUŞTURMA/DÜZENLEME DİYALOĞU */}
      <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? "Slot Düzenle" : "Yeni Slot Oluştur"}
            </DialogTitle>
          </DialogHeader>
          <Form {...slotForm}>
            <form onSubmit={slotForm.handleSubmit(onSlotSubmit)} className="space-y-4">
              <FormField
                control={slotForm.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ders</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-course">
                          <SelectValue placeholder="Ders seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={String(course.id)}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={slotForm.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gün</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-day">
                          <SelectValue placeholder="Gün seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={slotForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlangıç</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          {...field} 
                          data-testid="input-start-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={slotForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bitiş</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          {...field} 
                          data-testid="input-end-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={slotForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar (İsteğe bağlı)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ek notlar..."
                        {...field} 
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsSlotDialogOpen(false)}
                  data-testid="button-cancel-slot"
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={slotMutation.isPending}
                  data-testid="button-save-slot"
                >
                  {slotMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* OTOMATİK KONU YERLEŞTİRME DİYALOĞU */}
      <Dialog open={isAutoFillDialogOpen} onOpenChange={setIsAutoFillDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Otomatik Konu Yerleştirme</DialogTitle>
          </DialogHeader>
          <Form {...autoFillForm}>
            <form onSubmit={autoFillForm.handleSubmit(onAutoFillSubmit)} className="space-y-4">
              <FormField
                control={autoFillForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlangıç Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={autoFillForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="input-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAutoFillDialogOpen(false);
                    setPreviewData(null);
                  }}
                  data-testid="button-cancel-auto-fill"
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={autoFillMutation.isPending}
                  variant="outline"
                  onClick={() => autoFillForm.setValue("dryRun", true)}
                  data-testid="button-preview-auto-fill"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {autoFillMutation.isPending ? "Önizleniyor..." : "Önizle"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}