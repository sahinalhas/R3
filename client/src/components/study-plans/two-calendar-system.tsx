import { useState, useEffect, useRef } from "react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  BookOpen,
  Filter
} from "lucide-react";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertWeeklyStudySlotSchema } from "@shared/schema";
import type { 
  WeeklyStudySlot, 
  Course,
  SubjectProgress,
  CourseSubject
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

// Kategoriler
type Category = 'all' | 'okul' | 'tyt' | 'ayt' | 'ydt' | 'lgs';
const CATEGORY_LABELS: Record<Category, string> = {
  all: 'Tümü',
  okul: 'Okul Dersleri',
  tyt: 'TYT',
  ayt: 'AYT',
  ydt: 'YDT',
  lgs: 'LGS',
};

function getCourseCategory(name: string): Exclude<Category, 'all'> {
  const original = name || '';
  const lower = original.toLowerCase();
  if (/^(tyt|\[tyt\]|tyt[\s:-])/i.test(original) || lower.includes(' tyt ')) return 'tyt';
  if (/^(ayt|\[ayt\]|ayt[\s:-])/i.test(original) || lower.includes(' ayt ')) return 'ayt';
  if (/^(lgs|\[lgs\]|lgs[\s:-])/i.test(original) || lower.includes(' lgs ')) return 'lgs';
  if (/^(ydt|\[ydt\]|ydt[\s:-])/i.test(original) || lower.includes(' ydt ')) return 'ydt';
  return 'okul';
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
  const totalMinutes = 7 * 60 + i * 30;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

export default function TwoCalendarSystem({ studentId, courses, subjectProgress }: TwoCalendarSystemProps) {
  const { toast } = useToast();
  const [isAutoFillDialogOpen, setIsAutoFillDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  
  // Drag & Drop state
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<WeeklyStudySlot | null>(null);
  const [dropPreview, setDropPreview] = useState<{ day: number; time: string; endTime: string } | null>(null);
  
  // Resize state
  const [resizingSlot, setResizingSlot] = useState<{ id: number; edge: 'top' | 'bottom'; slot: WeeklyStudySlot } | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeOriginalTime, setResizeOriginalTime] = useState({ start: '', end: '' });
  const [resizePreviewTime, setResizePreviewTime] = useState({ start: '', end: '' });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Haftalık slotları getir
  const { data: weeklySlots = [], isLoading: isSlotsLoading } = useQuery<WeeklyStudySlot[]>({
    queryKey: [`/api/students/${studentId}/weekly-slots`],
  });

  // Haftalık toplam süre
  const { data: weeklyTotalData } = useQuery<{ totalMinutes: number }>({
    queryKey: [`/api/students/${studentId}/weekly-total-minutes`],
  });

  // Tüm course subjects'leri çek (subjectId -> courseId mapping için)
  const { data: allCourseSubjects = [] } = useQuery<CourseSubject[]>({
    queryKey: ['/api/courses', 'subjects'],
    queryFn: async () => {
      const courseSubjects: CourseSubject[] = [];
      for (const course of courses) {
        const res = await fetch(`/api/courses/${course.id}/subjects`);
        if (res.ok) {
          const subjects = await res.json();
          courseSubjects.push(...subjects);
        }
      }
      return courseSubjects;
    },
    enabled: courses.length > 0,
  });

  // Haftalık slot oluşturma mutation (sadece drag & drop için)
  const slotMutation = useMutation({
    mutationFn: async (data: WeeklySlotFormValues) => {
      const res = await apiRequest("POST", `/api/students/${studentId}/weekly-slots`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Ders başarıyla eklendi",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-slots`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-total-minutes`] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Ders eklenirken hata oluştu",
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

  // İlerleme sıfırlama mutation
  const resetProgressMutation = useMutation({
    mutationFn: async (progressId: number) => {
      const res = await apiRequest("PATCH", `/api/subject-progress/${progressId}/reset`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İlerleme sıfırlandı",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/subject-progress`] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "İlerleme sıfırlanırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Form tanımlamaları
  const autoFillForm = useForm<AutoFillFormValues>({
    resolver: zodResolver(autoFillFormSchema),
    defaultValues: {
      startDate: selectedWeekStart,
      endDate: format(addDays(parseISO(selectedWeekStart), 6), "yyyy-MM-dd"),
      dryRun: true,
    },
  });

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

  const handleDragOver = (e: React.DragEvent, dayOfWeek?: number, timeSlot?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedCourse ? "copy" : "move";
    
    // Önizleme göster
    if (draggedCourse && dayOfWeek && timeSlot) {
      const timeIndex = TIME_SLOTS.indexOf(timeSlot);
      const nextTimeSlot = TIME_SLOTS[timeIndex + 2] || "23:59";
      setDropPreview({ day: dayOfWeek, time: timeSlot, endTime: nextTimeSlot });
    } else if (draggedSlot && dayOfWeek && timeSlot) {
      const originalStartTime = draggedSlot.startTime;
      const originalEndTime = draggedSlot.endTime;
      const startHour = parseInt(originalStartTime.split(':')[0]);
      const startMinute = parseInt(originalStartTime.split(':')[1]);
      const endHour = parseInt(originalEndTime.split(':')[0]);
      const endMinute = parseInt(originalEndTime.split(':')[1]);
      const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      
      const newStartHour = parseInt(timeSlot.split(':')[0]);
      const newStartMinute = parseInt(timeSlot.split(':')[1]);
      const newStartTotalMinutes = newStartHour * 60 + newStartMinute;
      const newEndTotalMinutes = newStartTotalMinutes + durationMinutes;
      
      const maxEndMinutes = 23 * 60 + 59;
      const clampedEndMinutes = Math.min(newEndTotalMinutes, maxEndMinutes);
      const newEndHour = Math.floor(clampedEndMinutes / 60);
      const newEndMinute = clampedEndMinutes % 60;
      const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
      
      setDropPreview({ day: dayOfWeek, time: timeSlot, endTime: newEndTime });
    }
  };
  
  const handleDragLeave = () => {
    setDropPreview(null);
  };

  const handleCellDrop = async (e: React.DragEvent, dayOfWeek: number, timeSlot: string) => {
    e.preventDefault();
    setDropPreview(null);
    
    const timeIndex = TIME_SLOTS.indexOf(timeSlot);
    const nextTimeSlot = TIME_SLOTS[timeIndex + 2] || "23:59"; // 60 dakikalık blok (2 x 30dk)
    
    if (draggedCourse) {
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
      if (draggedSlot.dayOfWeek !== dayOfWeek || draggedSlot.startTime !== timeSlot) {
        const originalStartTime = draggedSlot.startTime;
        const originalEndTime = draggedSlot.endTime;
        const startHour = parseInt(originalStartTime.split(':')[0]);
        const startMinute = parseInt(originalStartTime.split(':')[1]);
        const endHour = parseInt(originalEndTime.split(':')[0]);
        const endMinute = parseInt(originalEndTime.split(':')[1]);
        const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        
        const newStartHour = parseInt(timeSlot.split(':')[0]);
        const newStartMinute = parseInt(timeSlot.split(':')[1]);
        const newStartTotalMinutes = newStartHour * 60 + newStartMinute;
        const newEndTotalMinutes = newStartTotalMinutes + durationMinutes;
        
        const maxEndMinutes = 23 * 60 + 59;
        
        if (newEndTotalMinutes > maxEndMinutes) {
          toast({
            title: "Zaman Aşımı Uyarısı",
            description: `Bu slot bu saate taşınamaz çünkü süre gece yarısını geçecek.`,
            variant: "destructive",
          });
          setDraggedSlot(null);
          return;
        }
        
        const clampedEndMinutes = Math.min(newEndTotalMinutes, maxEndMinutes);
        const newEndHour = Math.floor(clampedEndMinutes / 60);
        const newEndMinute = clampedEndMinutes % 60;
        const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
        
        if (hasSlotInTimeRange(dayOfWeek, timeSlot, newEndTime, draggedSlot.id)) {
          toast({
            title: "Çakışma Uyarısı", 
            description: "Bu saat aralığında zaten bir slot var!",
            variant: "destructive",
          });
          setDraggedSlot(null);
          return;
        }

        const updateMutation = async () => {
          try {
            const res = await apiRequest("PATCH", `/api/weekly-slots/${draggedSlot.id}`, {
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

  // Resize handlers
  const handleResizeStart = (e: React.PointerEvent, slot: WeeklyStudySlot, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setResizingSlot({ id: slot.id, edge, slot });
    setResizeStartY(e.clientY);
    setResizeOriginalTime({ start: slot.startTime, end: slot.endTime });
    setResizePreviewTime({ start: slot.startTime, end: slot.endTime });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizingSlot) return;
    
    const deltaY = e.clientY - resizeStartY;
    const cellHeight = 48;
    const deltaSlots = Math.round(deltaY / cellHeight);
    
    if (deltaSlots === 0) return;

    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const minutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    let newStartTime = resizeOriginalTime.start;
    let newEndTime = resizeOriginalTime.end;

    if (resizingSlot.edge === 'top') {
      const startMins = timeToMinutes(resizeOriginalTime.start) + (deltaSlots * 30);
      const endMins = timeToMinutes(resizeOriginalTime.end);
      
      if (startMins >= 7 * 60 && startMins < endMins - 30) {
        newStartTime = minutesToTime(startMins);
      }
    } else {
      const startMins = timeToMinutes(resizeOriginalTime.start);
      const endMins = timeToMinutes(resizeOriginalTime.end) + (deltaSlots * 30);
      
      if (endMins <= 23 * 60 + 59 && endMins > startMins + 30) {
        newEndTime = minutesToTime(endMins);
      }
    }

    // Update preview state for optimistic UI
    setResizePreviewTime({ start: newStartTime, end: newEndTime });
  };

  const handleResizeEnd = async (e: React.PointerEvent) => {
    if (!resizingSlot) return;
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    const slot = resizingSlot.slot;
    const newStartTime = resizePreviewTime.start;
    const newEndTime = resizePreviewTime.end;
    
    // Only make API call if time changed
    if (newStartTime !== resizeOriginalTime.start || newEndTime !== resizeOriginalTime.end) {
      if (hasSlotInTimeRange(slot.dayOfWeek, newStartTime, newEndTime, slot.id)) {
        toast({
          title: "Çakışma Uyarısı",
          description: "Bu saat aralığında zaten bir slot var!",
          variant: "destructive",
        });
      } else {
        try {
          await apiRequest("PATCH", `/api/weekly-slots/${slot.id}`, {
            courseId: slot.courseId,
            dayOfWeek: slot.dayOfWeek,
            startTime: newStartTime,
            endTime: newEndTime,
            notes: slot.notes || "",
          });
          
          queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-slots`] });
          queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/weekly-total-minutes`] });
          
          toast({
            title: "Başarılı",
            description: "Slot başarıyla boyutlandırıldı",
          });
        } catch (error: any) {
          toast({
            title: "Hata",
            description: error.message || "Slot boyutlandırılırken hata oluştu",
            variant: "destructive",
          });
        }
      }
    }
    
    setResizingSlot(null);
    setResizePreviewTime({ start: '', end: '' });
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

  const getSlotAtTime = (dayOfWeek: number, timeSlot: string) => {
    return weeklySlots.find(slot => 
      slot.dayOfWeek === dayOfWeek && 
      slot.startTime <= timeSlot && 
      slot.endTime > timeSlot
    );
  };

  const hasSlotInTimeRange = (dayOfWeek: number, startTime: string, endTime: string, excludeSlotId?: number) => {
    return weeklySlots.some(slot =>
      slot.dayOfWeek === dayOfWeek &&
      slot.id !== excludeSlotId &&
      ((slot.startTime <= startTime && slot.endTime > startTime) ||
       (slot.startTime < endTime && slot.endTime >= endTime) ||
       (slot.startTime >= startTime && slot.endTime <= endTime))
    );
  };

  // Slot yüksekliğini hesapla (kaç hücreyi kaplayacak)
  const calculateSlotHeight = (startTime: string, endTime: string) => {
    const startIndex = TIME_SLOTS.indexOf(startTime);
    const endIndex = TIME_SLOTS.findIndex(t => t >= endTime);
    const actualEndIndex = endIndex === -1 ? TIME_SLOTS.length : endIndex;
    const cellCount = actualEndIndex - startIndex;
    const heightInPixels = cellCount * 48; // Her hücre 48px (h-12)
    return heightInPixels;
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

  const filteredCourses = courses.filter(course => 
    selectedCategory === 'all' || getCourseCategory(course.name) === selectedCategory
  );

  const progress = getTotalProgress();
  const weeklyTotal = weeklyTotalData?.totalMinutes || 0;
  const weeklyHours = weeklyTotal / 60;

  // Hafta değiştiğinde form'u güncelle
  useEffect(() => {
    autoFillForm.setValue("startDate", selectedWeekStart);
    autoFillForm.setValue("endDate", format(addDays(parseISO(selectedWeekStart), 6), "yyyy-MM-dd"));
  }, [selectedWeekStart]);

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
                {weeklyHours < 5 && weeklyTotal > 0 && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Çalışma süren çok düşük!
                  </p>
                )}
                {weeklyHours > 10 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Plan çok yoğun!
                  </p>
                )}
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
          <TabsTrigger value="calendar1" data-testid="tab-calendar1">
            📅 Takvim 1: Haftalık Ders Çizelgesi
          </TabsTrigger>
          <TabsTrigger value="calendar2" data-testid="tab-calendar2">
            🎯 Takvim 2: Konu Bazlı Plan
          </TabsTrigger>
        </TabsList>

        {/* TAKVİM 1: HAFTALIK DERS ÇİZELGESİ */}
        <TabsContent value="calendar1" className="space-y-4">
          {/* Dersler Listesi ve Filtre */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Dersler
                  </CardTitle>
                  <CardDescription>
                    Dersleri takvime sürükleyerek haftalık planınızı oluşturun
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val as Category)}>
                    <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {filteredCourses.map((course) => (
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
                {filteredCourses.length === 0 && (
                  <p className="text-sm text-muted-foreground">Bu kategoride ders bulunmuyor</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grid Takvim */}
          <Card>
            <CardHeader>
              <CardTitle>Haftalık Çalışma Takvimi</CardTitle>
              <CardDescription>
                07:00 - 24:00 arası 30 dakikalık aralıklarla. Ders bloklarını sürükle-bırak ile taşıyın, üst/alt kenarlarından boyutlandırın.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[900px] border rounded-lg overflow-hidden">
                {/* Header - Günler */}
                <div className="grid grid-cols-8">
                  <div className="h-12 border-b border-r bg-muted/50 flex items-center justify-center text-sm font-semibold">
                    Saat
                  </div>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <div 
                      key={day.value} 
                      className={`h-12 border-b ${index < DAYS_OF_WEEK.length - 1 ? 'border-r' : ''} bg-muted/50 flex items-center justify-center text-sm font-semibold`}
                      data-testid={`header-day-${day.value}`}
                    >
                      {day.label}
                    </div>
                  ))}
                </div>

                {/* Grid - Saatler ve Slotlar */}
                <div>
                  {TIME_SLOTS.map((timeSlot, timeIndex) => (
                    <div key={timeSlot} className="grid grid-cols-8">
                      {/* Saat Sütunu */}
                      <div className={`h-12 ${timeIndex < TIME_SLOTS.length - 1 ? 'border-b' : ''} border-r bg-muted/30 flex items-center justify-center text-xs font-mono text-muted-foreground`}>
                        {timeSlot}
                      </div>
                      
                      {/* Gün Hücreleri */}
                      {DAYS_OF_WEEK.map((day, dayIndex) => {
                        const slot = getSlotAtTime(day.value, timeSlot);
                        const course = slot ? getCourseById(slot.courseId) : null;
                        const isSlotStart = slot && slot.startTime === timeSlot;
                        const displayTime = resizingSlot?.id === slot?.id ? resizePreviewTime : null;
                        
                        // Slot yüksekliğini hesapla
                        const slotStartTime = displayTime?.start || slot?.startTime || '';
                        const slotEndTime = displayTime?.end || slot?.endTime || '';
                        const slotHeight = slot && isSlotStart ? calculateSlotHeight(slotStartTime, slotEndTime) : 0;
                        
                        // Önizleme kontrolü - bu hücre önizleme aralığında mı?
                        const isInPreview = dropPreview && 
                          dropPreview.day === day.value && 
                          dropPreview.time <= timeSlot && 
                          dropPreview.endTime > timeSlot;
                        const isPreviewStart = dropPreview?.day === day.value && dropPreview?.time === timeSlot;
                        const previewHeight = isPreviewStart && dropPreview ? calculateSlotHeight(dropPreview.time, dropPreview.endTime) : 0;
                        
                        return (
                          <div
                            key={`${day.value}-${timeSlot}`}
                            className={`h-12 ${timeIndex < TIME_SLOTS.length - 1 ? 'border-b' : ''} ${dayIndex < DAYS_OF_WEEK.length - 1 ? 'border-r' : ''} transition-all duration-200 relative ${
                              slot 
                                ? "bg-primary/10" 
                                : isInPreview
                                  ? "bg-green-100/50 dark:bg-green-900/30 ring-2 ring-inset ring-green-500/60"
                                  : "bg-background hover:bg-primary/5 cursor-pointer"
                            } ${
                              (draggedCourse || draggedSlot) && !isInPreview ? "ring-1 ring-inset ring-primary/30" : ""
                            }`}
                            onDragOver={(e) => handleDragOver(e, day.value, timeSlot)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleCellDrop(e, day.value, timeSlot)}
                            data-testid={`calendar-cell-${day.value}-${timeSlot}`}
                          >
                            {/* Önizleme overlay */}
                            {isPreviewStart && dropPreview && previewHeight > 0 && (
                              <div 
                                className="absolute top-0 left-0 right-0 flex items-center justify-center bg-green-500/20 border-2 border-green-500 rounded-md z-[5] pointer-events-none"
                                style={{ height: `${previewHeight}px` }}
                              >
                                <span className="text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                                  {draggedCourse?.name || "Taşınıyor..."}
                                </span>
                              </div>
                            )}
                            {slot && isSlotStart && slotHeight > 0 && (
                              <div
                                className="absolute top-0 left-0 right-0 flex flex-col items-stretch text-xs font-medium bg-gradient-to-br from-primary/30 via-primary/20 to-primary/15 border-l-4 border-l-primary border-y border-r border-primary/40 rounded-md cursor-move group z-10 hover:shadow-xl hover:from-primary/35 hover:via-primary/25 hover:to-primary/20 hover:border-primary/60 transition-all overflow-hidden"
                                style={{ height: `${slotHeight}px` }}
                                draggable
                                onDragStart={(e) => handleSlotDragStart(e, slot)}
                                title={`${course?.name || "?"} (${displayTime?.start || slot.startTime}-${displayTime?.end || slot.endTime})`}
                                data-testid={`slot-${slot.id}`}
                              >
                                {/* Resize handle - top */}
                                <div
                                  className="absolute -top-2 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-primary/20 to-transparent"
                                  onPointerDown={(e) => handleResizeStart(e, slot, 'top')}
                                  onPointerMove={handleResizeMove}
                                  onPointerUp={handleResizeEnd}
                                  data-testid={`resize-top-${slot.id}`}
                                >
                                  <div className="h-1.5 bg-primary rounded-full w-20 shadow-md"></div>
                                </div>

                                <div className="flex-1 flex items-center gap-2 px-3 py-1.5 justify-between min-h-0">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="truncate text-sm font-bold text-primary dark:text-primary-foreground drop-shadow-sm">
                                      {course?.name || "?"}
                                    </span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 hover:bg-destructive/60 rounded-full bg-background/80 backdrop-blur-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSlot(slot.id);
                                      }}
                                      data-testid={`button-delete-slot-${slot.id}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="text-[10px] px-3 pb-1.5 text-primary/90 dark:text-primary-foreground/80 font-mono font-semibold">
                                  {displayTime?.start || slot.startTime} - {displayTime?.end || slot.endTime}
                                </div>

                                {/* Resize handle - bottom */}
                                <div
                                  className="absolute -bottom-2 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-primary/20 to-transparent"
                                  onPointerDown={(e) => handleResizeStart(e, slot, 'bottom')}
                                  onPointerMove={handleResizeMove}
                                  onPointerUp={handleResizeEnd}
                                  data-testid={`resize-bottom-${slot.id}`}
                                >
                                  <div className="h-1.5 bg-primary rounded-full w-20 shadow-md"></div>
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
                <div className="mt-4 p-4 bg-gradient-to-r from-accent/50 to-accent/30 rounded-lg border-2 border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">💡</div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-primary">Nasıl Kullanılır?</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• <strong>Ders Ekle:</strong> Dersi sürüklerken yeşil önizleme göreceksiniz - istediğiniz saate bırakın (otomatik 60 dk)</li>
                        <li>• <strong>Taşı:</strong> Ders bloğunu tıklayıp başka bir güne/saate sürükleyin - önizleme nereye düşeceğini gösterir</li>
                        <li>• <strong>Boyutlandır:</strong> Bloğun üzerine gelin, üst veya alt kenardan sürükleyerek boyutlandırın (30 dk adımlarla)</li>
                        <li>• <strong>Sil:</strong> Bloğun üzerine gelin ve sil düğmesine basın</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAKVİM 2: KONU BAZLI PLAN */}
        <TabsContent value="calendar2" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Konu Bazlı Çalışma Planı</CardTitle>
                  <CardDescription>
                    Haftalık slotlarınıza konuları otomatik olarak yerleştirin
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={selectedWeekStart}
                    onChange={(e) => setSelectedWeekStart(e.target.value)}
                    className="w-[180px]"
                    data-testid="input-week-start"
                  />
                  <Button 
                    onClick={() => setIsAutoFillDialogOpen(true)}
                    disabled={weeklySlots.length === 0}
                    data-testid="button-auto-fill"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Planı Oluştur
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {weeklySlots.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Henüz slot tanımlanmamış</h3>
                  <p className="text-muted-foreground mb-6">
                    Konu bazlı plan oluşturmak için önce Takvim 1'de haftalık ders slotları oluşturun.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const tab = document.querySelector('[value="calendar1"]') as HTMLElement;
                      tab?.click();
                    }}
                    data-testid="button-go-to-calendar1"
                  >
                    Takvim 1'e Git
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Günlük Plan Listesi */}
                  {DAYS_OF_WEEK.map((day) => {
                    const daySlots = getSlotsByDay(day.value);
                    const dayDate = addDays(parseISO(selectedWeekStart), day.value - 1);
                    
                    if (daySlots.length === 0) return null;
                    
                    return (
                      <div key={day.value} className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5" />
                          {day.label}, {format(dayDate, "d MMMM", { locale: tr })}
                        </h3>
                        <div className="space-y-2">
                          {daySlots.map((slot) => {
                            const course = getCourseById(slot.courseId);
                            const category = course ? getCourseCategory(course.name) : 'okul';
                            
                            // Bu derse ait subject'leri bul
                            const courseSubjects = allCourseSubjects.filter(cs => cs.courseId === slot.courseId);
                            
                            // Bu subject'lerin progress'ini bul
                            const courseProgressItems = subjectProgress.filter(sp => 
                              courseSubjects.some(cs => cs.id === sp.subjectId)
                            );
                            
                            // Toplam progress hesapla
                            const totalTime = courseProgressItems.reduce((sum, p) => sum + p.totalTime, 0);
                            const completedTime = courseProgressItems.reduce((sum, p) => sum + p.completedTime, 0);
                            const progressPercentage = totalTime > 0 ? Math.round((completedTime / totalTime) * 100) : 0;
                            
                            return (
                              <Card key={slot.id} className="border-l-4 border-l-primary" data-testid={`plan-slot-${slot.id}`}>
                                <CardContent className="pt-4 pb-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-mono text-sm font-medium">
                                          {slot.startTime} - {slot.endTime}
                                        </span>
                                        <Badge variant="outline" className="ml-2">
                                          {CATEGORY_LABELS[category]}
                                        </Badge>
                                      </div>
                                      <div>
                                        <p className="font-semibold text-base">{course?.name || "Bilinmeyen Ders"}</p>
                                        {totalTime > 0 && (
                                          <div className="mt-2 space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                              <span className="text-muted-foreground">
                                                İlerleme: {formatMinutes(completedTime)} / {formatMinutes(totalTime)}
                                              </span>
                                              <span className="font-medium">
                                                %{progressPercentage}
                                              </span>
                                            </div>
                                            <Progress 
                                              value={progressPercentage} 
                                              className="h-2"
                                            />
                                          </div>
                                        )}
                                        {courseProgressItems.length > 0 && (
                                          <div className="mt-2 text-xs text-muted-foreground">
                                            {courseProgressItems.length} konu
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {courseProgressItems.length > 0 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (confirm("Bu derse ait tüm konuların ilerlemesini sıfırlamak istediğinizden emin misiniz?")) {
                                            courseProgressItems.forEach(progress => {
                                              resetProgressMutation.mutate(progress.id);
                                            });
                                          }
                                        }}
                                        data-testid={`button-reset-progress-course-${slot.courseId}`}
                                      >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Sıfırla
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Otomatik Konu Yerleştirme Önizleme */}
                  {previewData && (
                    <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                      <CardHeader>
                        <CardTitle className="text-green-800 dark:text-green-200">Önizleme Sonuçları</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-green-700 dark:text-green-300">{previewData.message}</p>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
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
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

              <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
                💡 Sistem, haftalık slotlarınıza tamamlanmamış konuları otomatik olarak yerleştirecek.
              </div>

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
                  onClick={() => autoFillForm.setValue("dryRun", true)}
                  data-testid="button-preview-auto-fill"
                >
                  <Play className="h-4 w-4 mr-2" />
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
