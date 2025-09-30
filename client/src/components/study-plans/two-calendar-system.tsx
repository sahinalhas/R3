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
  Plus, 
  Edit, 
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
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<WeeklyStudySlot | null>(null);
  const [isAutoFillDialogOpen, setIsAutoFillDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  
  // Drag & Drop state
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<WeeklyStudySlot | null>(null);
  
  // Resize state
  const [resizingSlot, setResizingSlot] = useState<{ id: number; edge: 'top' | 'bottom'; slot: WeeklyStudySlot } | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeOriginalTime, setResizeOriginalTime] = useState({ start: '', end: '' });
  const [resizePreviewTime, setResizePreviewTime] = useState({ start: '', end: '' });

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
      startDate: selectedWeekStart,
      endDate: format(addDays(parseISO(selectedWeekStart), 6), "yyyy-MM-dd"),
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
    const cellHeight = 32;
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
            studentId: slot.studentId,
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
                07:00 - 24:00 arası 30 dakikalık aralıklarla. Blokları sürükleyerek taşıyın veya kenarlarından boyutlandırın.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header - Günler */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="h-12 border rounded bg-muted/50 flex items-center justify-center text-sm font-semibold">
                    Saat
                  </div>
                  {DAYS_OF_WEEK.map((day) => (
                    <div 
                      key={day.value} 
                      className="h-12 border rounded bg-muted/50 flex items-center justify-center text-sm font-semibold"
                      data-testid={`header-day-${day.value}`}
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
                      <div className="h-8 border rounded bg-muted/30 flex items-center justify-center text-xs font-mono text-muted-foreground">
                        {timeSlot}
                      </div>
                      
                      {/* Gün Hücreleri */}
                      {DAYS_OF_WEEK.map((day) => {
                        const slot = getSlotAtTime(day.value, timeSlot);
                        const course = slot ? getCourseById(slot.courseId) : null;
                        const isSlotStart = slot && slot.startTime === timeSlot;
                        
                        return (
                          <div
                            key={`${day.value}-${timeSlot}`}
                            className={`h-8 border rounded transition-all duration-150 relative ${
                              slot 
                                ? "bg-primary/10 border-primary/30" 
                                : "bg-background hover:bg-accent/50 border-border cursor-pointer"
                            } ${
                              (draggedCourse || draggedSlot) ? "ring-1 ring-primary/30" : ""
                            }`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleCellDrop(e, day.value, timeSlot)}
                            onClick={() => {
                              if (!slot && !draggedCourse && !draggedSlot) {
                                slotForm.setValue("dayOfWeek", day.value);
                                slotForm.setValue("startTime", timeSlot);
                                slotForm.setValue("endTime", TIME_SLOTS[timeIndex + 2] || "23:59");
                                setIsSlotDialogOpen(true);
                              }
                            }}
                            data-testid={`calendar-cell-${day.value}-${timeSlot}`}
                          >
                            {slot && isSlotStart && (
                              <div
                                className="absolute inset-0 flex items-center justify-center text-xs font-medium bg-primary/20 border border-primary/40 rounded cursor-move group"
                                draggable
                                onDragStart={(e) => handleSlotDragStart(e, slot)}
                                title={`${course?.name || "?"} (${slot.startTime}-${slot.endTime})`}
                                data-testid={`slot-${slot.id}`}
                              >
                                {/* Resize handle - top */}
                                <div
                                  className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                  onPointerDown={(e) => handleResizeStart(e, slot, 'top')}
                                  onPointerMove={handleResizeMove}
                                  onPointerUp={handleResizeEnd}
                                  data-testid={`resize-top-${slot.id}`}
                                >
                                  <div className="h-1 bg-primary/60 rounded-full mx-auto w-12"></div>
                                </div>

                                <div className="flex items-center gap-1 px-2 truncate w-full justify-between">
                                  <span className="truncate text-xs font-semibold text-primary">
                                    {course?.name?.substring(0, 10) || "?"}
                                  </span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 hover:bg-primary/30"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditSlot(slot);
                                      }}
                                      data-testid={`button-edit-slot-${slot.id}`}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 hover:bg-destructive/30"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSlot(slot.id);
                                      }}
                                      data-testid={`button-delete-slot-${slot.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Resize handle - bottom */}
                                <div
                                  className="absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
                                  onPointerDown={(e) => handleResizeStart(e, slot, 'bottom')}
                                  onPointerMove={handleResizeMove}
                                  onPointerUp={handleResizeEnd}
                                  data-testid={`resize-bottom-${slot.id}`}
                                >
                                  <div className="h-1 bg-primary/60 rounded-full mx-auto w-12"></div>
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
                <div className="mt-4 p-4 bg-accent/50 rounded-lg border">
                  <p className="text-sm">
                    💡 <strong>Kullanım:</strong> Üstteki dersleri sürükleyip takvime bırakın (otomatik 60 dakika). 
                    Slotları sürükleyerek taşıyın veya üst/alt kenarlarından 30 dakika aralıklarla boyutlandırın.
                  </p>
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
                        value={field.value || ""}
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
