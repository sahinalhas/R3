import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock8 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { insertStudyPlanSchema, Course } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";

// Form şemasını genişlet
const studyPlanFormSchema = insertStudyPlanSchema.extend({
  courseId: z.number({
    required_error: "Lütfen bir ders seçin",
  }),
  date: z.string({
    required_error: "Lütfen bir tarih seçin",
  }),
  startTime: z.string({
    required_error: "Lütfen başlangıç saati girin",
  }).refine((value) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value), {
    message: "Geçerli bir saat formatı girin (HH:MM)",
  }),
  endTime: z.string({
    required_error: "Lütfen bitiş saati girin",
  }).refine((value) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value), {
    message: "Geçerli bir saat formatı girin (HH:MM)",
  }),
});

type StudyPlanFormValues = z.infer<typeof studyPlanFormSchema>;

interface StudyPlanFormProps {
  courses: Course[];
  defaultValues?: Partial<StudyPlanFormValues>;
  onSubmit: (data: StudyPlanFormValues) => void;
  isLoading?: boolean;
}

// Saat dilimleri
const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00"
];

// Günler
const daysOfWeek = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export default function StudyPlanForm({
  courses,
  defaultValues,
  onSubmit,
  isLoading = false,
}: StudyPlanFormProps) {
  const [date, setDate] = useState<Date | undefined>(
    defaultValues?.date ? new Date(defaultValues.date) : new Date()
  );
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{start: string, end: string} | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null);

  const form = useForm<StudyPlanFormValues>({
    resolver: zodResolver(studyPlanFormSchema),
    defaultValues: {
      studentId: defaultValues?.studentId || 0,
      courseId: defaultValues?.courseId || 0,
      date: defaultValues?.date || format(new Date(), "yyyy-MM-dd"),
      startTime: defaultValues?.startTime || "09:00",
      endTime: defaultValues?.endTime || "10:00",
      notes: defaultValues?.notes || "",
    },
  });

  // Tarih değiştiğinde form değerini güncelle
  useEffect(() => {
    if (date) {
      form.setValue("date", format(date, "yyyy-MM-dd"));
    }
  }, [date, form]);

  // Seçilen kurs değiştiğinde
  useEffect(() => {
    if (form.watch("courseId")) {
      const course = courses.find(c => c.id === form.watch("courseId"));
      setSelectedCourse(course || null);
    }
  }, [form.watch("courseId"), courses]);

  // Zaman dilimini seçme
  const handleTimeSlotClick = (time: string) => {
    if (!selectedTimeSlot) {
      // İlk tıklama - başlangıç saati olarak ayarla
      form.setValue("startTime", time);
      setSelectedTimeSlot({ start: time, end: "" });
    } else if (!selectedTimeSlot.end) {
      // İkinci tıklama - bitiş saati olarak ayarla
      // Başlangıç saatinden sonra olduğunu kontrol et
      const startHour = parseInt(selectedTimeSlot.start.split(":")[0]);
      const clickedHour = parseInt(time.split(":")[0]);
      
      if (clickedHour <= startHour) {
        // Bitiş saati başlangıç saatinden önce olamaz
        // Bir saat sonrasını otomatik seç
        const endHour = startHour + 1;
        const endTime = `${endHour.toString().padStart(2, '0')}:00`;
        form.setValue("endTime", endTime);
        setSelectedTimeSlot({ ...selectedTimeSlot, end: endTime });
      } else {
        form.setValue("endTime", time);
        setSelectedTimeSlot({ ...selectedTimeSlot, end: time });
      }
    } else {
      // Yeni bir seçim başlatılıyor
      form.setValue("startTime", time);
      form.setValue("endTime", "");
      setSelectedTimeSlot({ start: time, end: "" });
    }
  };

  // Zaman dilimi üzerine gelindiğinde
  const handleTimeSlotHover = (time: string) => {
    setHoveredTimeSlot(time);
    
    // Eğer başlangıç saati seçilmiş ama bitiş saati seçilmemişse
    // hover durumu göster
    if (selectedTimeSlot?.start && !selectedTimeSlot.end) {
      const startHour = parseInt(selectedTimeSlot.start.split(":")[0]);
      const hoverHour = parseInt(time.split(":")[0]);
      
      if (hoverHour > startHour) {
        form.setValue("endTime", time);
      }
    }
  };

  // Zaman dilimi içinde mi kontrolü
  const isTimeSlotSelected = (time: string) => {
    if (!selectedTimeSlot || !selectedTimeSlot.start) return false;
    
    if (!selectedTimeSlot.end) {
      return time === selectedTimeSlot.start;
    }
    
    const timeHour = parseInt(time.split(":")[0]);
    const startHour = parseInt(selectedTimeSlot.start.split(":")[0]);
    const endHour = parseInt(selectedTimeSlot.end.split(":")[0]);
    
    return timeHour >= startHour && timeHour < endHour;
  };

  // Zaman dilimi hover durumunda mı kontrolü
  const isTimeSlotHovered = (time: string) => {
    if (!hoveredTimeSlot || !selectedTimeSlot || !selectedTimeSlot.start || selectedTimeSlot.end) return false;
    
    const timeHour = parseInt(time.split(":")[0]);
    const startHour = parseInt(selectedTimeSlot.start.split(":")[0]);
    const hoverHour = parseInt(hoveredTimeSlot.split(":")[0]);
    
    // Başlangıç saatinden büyük ve hover saatinden küçük veya eşit olmalı
    return timeHour > startHour && timeHour <= hoverHour;
  };

  const getDayOfWeekFromDate = () => {
    if (!date) return "Gün seçilmedi";
    const dayIndex = date.getDay();
    // Türkçe gün adını döndür (Pazar=0 olduğu için düzenleme yapalım)
    return daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1];
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ders</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value ? field.value.toString() : undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ders seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Çalışma planı oluşturulacak dersi seçin
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col mt-4">
                  <FormLabel>Tarih</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          {date ? (
                            format(date, "PPP", { locale: tr })
                          ) : (
                            <span>Tarih Seçin</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Çalışma planının uygulanacağı tarihi seçin
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <FormLabel>Seçilen Ders ve Zamanı</FormLabel>
              <Card className="mt-1 bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Ders:</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedCourse ? selectedCourse.name : "Ders seçilmedi"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Gün:</span>
                      <Badge variant="outline" className="ml-2">
                        {date ? getDayOfWeekFromDate() : "Gün seçilmedi"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Saat:</span>
                      <Badge variant="outline" className="ml-2">
                        {selectedTimeSlot?.start && selectedTimeSlot?.end 
                          ? `${selectedTimeSlot.start} - ${selectedTimeSlot.end}` 
                          : "Saat seçilmedi"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Çalışma planı için notlar yazın..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="bg-muted/20 rounded-lg p-4">
            <h3 className="text-md font-medium mb-3 flex items-center">
              <Clock8 className="mr-2 h-4 w-4" />
              Saat Seçin
            </h3>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/40 border-b font-medium text-center">
                {date ? format(date, "PPP", { locale: tr }) : "Tarih seçilmedi"}
              </div>
              <div className="grid grid-cols-1 gap-1 p-2">
                {timeSlots.map((time, index) => {
                  // Sonraki zaman dilimini hesapla
                  const hour = parseInt(time.split(":")[0]);
                  const nextHour = hour + 1;
                  const nextTime = `${nextHour.toString().padStart(2, '0')}:00`;
                  
                  const isSelected = isTimeSlotSelected(time);
                  const isHovered = isTimeSlotHovered(time);
                  
                  return (
                    <div
                      key={time}
                      className={cn(
                        "p-2 border-b last:border-b-0 cursor-pointer transition-colors",
                        isSelected 
                          ? "bg-primary text-primary-foreground" 
                          : isHovered 
                            ? "bg-primary/20" 
                            : "hover:bg-muted"
                      )}
                      onClick={() => handleTimeSlotClick(time)}
                      onMouseEnter={() => handleTimeSlotHover(time)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{time}</span>
                        <span className="text-xs opacity-70">-</span>
                        <span>{nextTime}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              <p>
                * Çalışma saatini seçmek için yukarıdaki zaman dilimlerinden birine tıklayın.
                Bir kez tıklayarak başlangıç saatini, ikinci kez tıklayarak bitiş saatini seçebilirsiniz.
              </p>
            </div>
          </div>
        </div>
        
        {/* Gizli form alanları */}
        <input type="hidden" {...form.register("startTime")} />
        <input type="hidden" {...form.register("endTime")} />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                Çalışma Planı Oluşturuluyor...
              </>
            ) : (
              "Çalışma Planı Oluştur"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}