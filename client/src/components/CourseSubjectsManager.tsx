import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit, 
  Trash, 
  Book, 
  BookOpen, 
  List, 
  Upload, 
  FileSpreadsheet, 
  Eye,
  ClipboardPaste,
  Info,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import * as XLSX from 'xlsx';

// Types
type Course = {
  id: number;
  name: string;
  createdAt: string;
};

type CourseSubject = {
  id: number;
  courseId: number;
  name: string;
  duration: number;
  createdAt: string;
};

type ImportedSubject = {
  name: string;
  duration: number;
};

// Categories for grouping courses
 type Category = 'okul' | 'tyt' | 'ayt' | 'ydt' | 'lgs';
 const CATEGORY_LABELS: Record<Category, string> = {
  okul: 'Okul Dersleri',
  tyt: 'TYT',
  ayt: 'AYT',
  ydt: 'YDT',
  lgs: 'LGS',
 };
 function getCourseCategory(name: string): Category {
  const original = name || '';
  const lower = original.toLowerCase();
  // Basic prefix or tag checks
  if (/^(tyt|\[tyt\]|tyt[\s:-])/i.test(original) || lower.includes(' tyt ')) return 'tyt';
  if (/^(ayt|\[ayt\]|ayt[\s:-])/i.test(original) || lower.includes(' ayt ')) return 'ayt';
  if (/^(lgs|\[lgs\]|lgs[\s:-])/i.test(original) || lower.includes(' lgs ')) return 'lgs';
  if (/^(ydt|\[ydt\]|ydt[\s:-])/i.test(original) || lower.includes(' ydt ')) return 'ydt';
  return 'okul';
 }

// Schemas
const courseSchema = z.object({
  name: z.string().min(1, "Ders adı zorunludur")
});

const courseSubjectSchema = z.object({
  name: z.string().min(1, "Konu adı zorunludur"),
  duration: z.coerce.number().positive("Süre pozitif bir değer olmalıdır")
});

// Component
export function CourseSubjectsManager() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<CourseSubject | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [isImportingSubjects, setIsImportingSubjects] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importedSubjects, setImportedSubjects] = useState<ImportedSubject[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState<Category>('okul');

  const queryClient = useQueryClient();

  // Query: Get courses
  const { 
    data: courses = [], 
    isLoading: isLoadingCourses,
    error: coursesError 
  } = useQuery({ 
    queryKey: ['/api/courses'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/courses');
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        const data = await response.json();
        return data as Course[];
      } catch (error) {
        console.error('Error fetching courses:', error);
        return [];
      }
    }
  });

  // Query: Get subjects for selected course
  const { 
    data: subjects = [], 
    isLoading: isLoadingSubjects,
    error: subjectsError,
    refetch: refetchSubjects 
  } = useQuery({ 
    queryKey: ['/api/courses', selectedCourse?.id, 'subjects'],
    queryFn: async () => {
      if (!selectedCourse) return [];
      try {
        const response = await fetch(`/api/courses/${selectedCourse.id}/subjects`);
        if (!response.ok) {
          throw new Error('Failed to fetch subjects');
        }
        const data = await response.json();
        return data as CourseSubject[];
      } catch (error) {
        console.error('Error fetching subjects:', error);
        return [];
      }
    },
    enabled: !!selectedCourse
  });

  // Mutation: Add course
  const addCourseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof courseSchema>) => {
      try {
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to add course');
        }
        
        const result = await response.json();
        return result as Course;
      } catch (error) {
        console.error('Error adding course:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({
        title: "Başarılı",
        description: "Ders başarıyla eklendi.",
      });
      setIsAddingCourse(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ders eklenirken bir hata oluştu.",
      });
    }
  });

  // Mutation: Update course
  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof courseSchema> }) => {
      try {
        const response = await fetch(`/api/courses/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to update course');
        }
        
        const result = await response.json();
        return result as Course;
      } catch (error) {
        console.error('Error updating course:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({
        title: "Başarılı",
        description: "Ders başarıyla güncellendi.",
      });
      setIsEditingCourse(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ders güncellenirken bir hata oluştu.",
      });
    }
  });

  // Mutation: Delete course
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await fetch(`/api/courses/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete course');
        }

        // Server returns 204 No Content on success, so avoid parsing JSON for empty response
        if (response.status === 204) {
          return { success: true };
        }

        // If there's a body, parse it safely
        const text = await response.text();
        if (!text) return { success: true };
        try {
          return JSON.parse(text);
        } catch (err) {
          return { success: true };
        }
      } catch (error) {
        console.error('Error deleting course:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      if (selectedCourse) {
        setSelectedCourse(null);
      }
      toast({
        title: "Başarılı",
        description: "Ders başarıyla silindi.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ders silinirken bir hata oluştu.",
      });
    }
  });

  // Mutation: Add subject
  const addSubjectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof courseSubjectSchema> & { courseId: number }) => {
      try {
        const response = await fetch('/api/course-subjects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to add subject');
        }
        
        const result = await response.json();
        return result as CourseSubject;
      } catch (error) {
        console.error('Error adding subject:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', selectedCourse?.id, 'subjects'] });
      toast({
        title: "Başarılı",
        description: "Ders konusu başarıyla eklendi.",
      });
      setIsAddingSubject(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ders konusu eklenirken bir hata oluştu.",
      });
    }
  });

  // Mutation: Update subject
  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof courseSubjectSchema> }) => {
      try {
        const response = await fetch(`/api/course-subjects/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to update subject');
        }
        
        const result = await response.json();
        return result as CourseSubject;
      } catch (error) {
        console.error('Error updating subject:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', selectedCourse?.id, 'subjects'] });
      toast({
        title: "Başarılı",
        description: "Ders konusu başarıyla güncellendi.",
      });
      setIsEditingSubject(false);
      setSelectedSubject(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ders konusu güncellenirken bir hata oluştu.",
      });
    }
  });

  // Mutation: Delete subject
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await fetch(`/api/course-subjects/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete subject');
        }

        if (response.status === 204) {
          return { success: true };
        }

        const text = await response.text();
        if (!text) return { success: true };
        try {
          return JSON.parse(text);
        } catch (err) {
          return { success: true };
        }
      } catch (error) {
        console.error('Error deleting subject:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', selectedCourse?.id, 'subjects'] });
      toast({
        title: "Başarılı",
        description: "Ders konusu başarıyla silindi.",
      });
      if (selectedSubject) {
        setSelectedSubject(null);
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ders konusu silinirken bir hata oluştu.",
      });
    }
  });

  // Mutation: Import subjects from Excel
  const importSubjectsMutation = useMutation({
    mutationFn: async ({ courseId, subjects }: { courseId: number, subjects: ImportedSubject[] }) => {
      try {
        const response = await fetch(`/api/courses/${courseId}/subjects/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subjects })
        });
        
        if (!response.ok) {
          throw new Error('Failed to import subjects');
        }
        
        const result = await response.json();
        return result as CourseSubject[];
      } catch (error) {
        console.error('Error importing subjects:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses', selectedCourse?.id, 'subjects'] });
      toast({
        title: "Başarılı",
        description: `${importedSubjects.length} ders konusu başarıyla içe aktarıldı.`,
      });
      setIsImportingSubjects(false);
      setImportedSubjects([]);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ders konuları içe aktarılırken bir hata oluştu.",
      });
    }
  });

  // Mutation: Bulk import all courses and subjects from Excel
  const bulkImportCoursesMutation = useMutation({
    mutationFn: async (coursesData: { name: string, subjects: ImportedSubject[] }[]) => {
      try {
        const response = await fetch('/api/courses/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courses: coursesData })
        });
        
        if (!response.ok) {
          throw new Error('Failed to bulk import courses');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error bulk importing courses:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({
        title: "Başarılı",
        description: data.message || "Tüm dersler ve konuları başarıyla içe aktarıldı.",
      });
      setIsImportingSubjects(false);
      setImportedSubjects([]);
      setSelectedFile(null);
      sessionStorage.removeItem('importedCourses');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Dersler ve konuları içe aktar��lırken bir hata oluştu.",
      });
    }
  });

  // Forms
  const [bulkText, setBulkText] = useState<string>("");
  const [isBulkAdding, setIsBulkAdding] = useState<boolean>(false);
  const [parsedSubjects, setParsedSubjects] = useState<ImportedSubject[]>([]);

  const courseForm = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: ""
    }
  });

  const subjectForm = useForm<z.infer<typeof courseSubjectSchema>>({
    resolver: zodResolver(courseSubjectSchema),
    defaultValues: {
      name: "",
      duration: 1
    }
  });

  // Handle file upload and Excel parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportedSubjects([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Process the Excel data from the mebi konuları sheet
        // Each two columns represent one course (first col: topics, second col: durations)
        
        // Convert to JSON with header: false to get array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (selectedCourse) {
          // If a course is selected, import subjects for that course only
          // Process the data to extract subjects and durations
          const subjects: ImportedSubject[] = [];
          
          // Start from row index 1 to skip header if present
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length >= 2) {
              // Check if we have a name (column 0) and duration (column 1)
              const name = row[0]?.toString().trim();
              let duration = row[1];
              
              // If we have a valid name and numeric duration, add to subjects
              if (name && duration !== undefined && duration !== null) {
                if (typeof duration === 'string') {
                  duration = parseInt(duration);
                }
                
                if (!isNaN(duration) && duration > 0) {
                  subjects.push({
                    name,
                    duration
                  });
                }
              }
            }
          }
          
          setImportedSubjects(subjects);
        } else {
          // If no course is selected, import all courses and subjects
          // Process all data as courses with subjects
          // Each pair of columns is a course - odd columns (0, 2, 4...) are subject names, 
          // even columns (1, 3, 5...) are durations
          
          // First, extract course names from the header row
          const courseNames: string[] = [];
          const headerRow = jsonData[0] || [];
          
          for (let colIdx = 0; colIdx < headerRow.length; colIdx += 2) {
            if (headerRow[colIdx]) {
              courseNames.push(headerRow[colIdx].toString().trim());
            }
          }
          
          // For each course (column pair), extract subjects
          const allCourseSubjects: { courseName: string, subjects: ImportedSubject[] }[] = [];
          
          for (let courseIdx = 0; courseIdx < courseNames.length; courseIdx++) {
            const courseName = courseNames[courseIdx];
            const subjects: ImportedSubject[] = [];
            const nameColIdx = courseIdx * 2;
            const durationColIdx = nameColIdx + 1;
            
            // Start from row 1 to skip header
            for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) {
              const row = jsonData[rowIdx];
              if (!row || row.length <= nameColIdx) continue;
              
              const name = row[nameColIdx]?.toString().trim();
              let duration = row[durationColIdx];
              
              if (name && duration !== undefined && duration !== null) {
                if (typeof duration === 'string') {
                  duration = parseInt(duration);
                }
                
                if (!isNaN(duration) && duration > 0) {
                  subjects.push({
                    name,
                    duration
                  });
                }
              }
            }
            
            if (subjects.length > 0) {
              allCourseSubjects.push({
                courseName,
                subjects
              });
            }
          }
          
          // Display preview message
          if (allCourseSubjects.length > 0) {
            toast({
              title: "Excel Dosyası İçeriği",
              description: `${allCourseSubjects.length} ders ve toplamda ${allCourseSubjects.reduce((sum, course) => sum + course.subjects.length, 0)} konu bulundu. İçe aktarma işlemi tüm dersleri ve konuları ekleyecektir.`,
            });
            
            // Store the imported courses data for the bulk import
            sessionStorage.setItem('importedCourses', JSON.stringify(allCourseSubjects));
          }
        }
        
        setImportProgress(100);
        
      } catch (error) {
        console.error('Excel parsing error:', error);
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Excel dosyası işlenirken bir hata oluştu. Dosya formatını kontrol edin.",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Reset forms when dialogs close
  useEffect(() => {
    if (!isAddingCourse) {
      courseForm.reset();
    }
  }, [isAddingCourse, courseForm]);

  useEffect(() => {
    if (!isEditingCourse && selectedCourse) {
      courseForm.reset({
        name: selectedCourse.name
      });
    }
  }, [isEditingCourse, selectedCourse, courseForm]);

  useEffect(() => {
    if (!isAddingSubject) {
      subjectForm.reset();
    }
  }, [isAddingSubject, subjectForm]);

  useEffect(() => {
    if (!isEditingSubject && selectedSubject) {
      subjectForm.reset({
        name: selectedSubject.name,
        duration: selectedSubject.duration
      });
    }
  }, [isEditingSubject, selectedSubject, subjectForm]);

  const handleSubmitCourse = (data: z.infer<typeof courseSchema>) => {
    if (isEditingCourse && selectedCourse) {
      updateCourseMutation.mutate({ id: selectedCourse.id, data });
    } else {
      addCourseMutation.mutate(data);
    }
  };

  const handleSubmitSubject = (data: z.infer<typeof courseSubjectSchema>) => {
    if (!selectedCourse) return;

    if (isEditingSubject && selectedSubject) {
      updateSubjectMutation.mutate({ id: selectedSubject.id, data });
    } else {
      addSubjectMutation.mutate({ ...data, courseId: selectedCourse.id });
    }
  };

  const handleImportSubjects = () => {
    if (selectedCourse && importedSubjects.length > 0) {
      // Import subjects for selected course
      importSubjectsMutation.mutate({
        courseId: selectedCourse.id,
        subjects: importedSubjects
      });
    } else {
      // Bulk import all courses and subjects
      const importedCoursesStr = sessionStorage.getItem('importedCourses');
      if (!importedCoursesStr) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "İçe aktarılacak veri bulunamadı. Lütfen önce bir Excel dosyası seçin.",
        });
        return;
      }
      
      try {
        const importedCourses = JSON.parse(importedCoursesStr) as { courseName: string, subjects: ImportedSubject[] }[];
        
        // Convert to the format expected by the API
        const coursesData = importedCourses.map(course => ({
          name: course.courseName,
          subjects: course.subjects
        }));
        
        // Call the API to import all courses
        bulkImportCoursesMutation.mutate(coursesData);
      } catch (error) {
        console.error('Error parsing imported courses:', error);
        toast({
          variant: "destructive",
          title: "Hata",
          description: "İçe aktarma verisi işlenirken bir hata oluştu.",
        });
      }
    }
  };

  const handleDeleteCourse = (course: Course) => {
    if (window.confirm(`"${course.name}" dersini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      deleteCourseMutation.mutate(course.id);
    }
  };

  const handleDeleteSubject = (subject: CourseSubject) => {
    if (window.confirm(`"${subject.name}" konusunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      deleteSubjectMutation.mutate(subject.id);
    }
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    refetchSubjects();
  };

  const filteredCourses = courses.filter((c) => getCourseCategory(c.name) === activeCategory);

  useEffect(() => {
    if (selectedCourse && getCourseCategory(selectedCourse.name) !== activeCategory) {
      setSelectedCourse(null);
    }
  }, [activeCategory]);

  return (
    <div className="space-y-6">
      <div>
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)} className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-xl mb-4">
            <TabsTrigger value="okul" className="rounded-lg">Okul Dersleri</TabsTrigger>
            <TabsTrigger value="tyt" className="rounded-lg">TYT</TabsTrigger>
            <TabsTrigger value="ayt" className="rounded-lg">AYT</TabsTrigger>
            <TabsTrigger value="ydt" className="rounded-lg">YDT</TabsTrigger>
            <TabsTrigger value="lgs" className="rounded-lg">LGS</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Courses List */}
        <div className="w-full md:w-1/3">
          <Card className="h-full glass-card rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Dersler</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsAddingCourse(true)}
                  className="h-8 w-8 text-primary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {filteredCourses.length} ders listeleniyor ({CATEGORY_LABELS[activeCategory]})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCourses ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  <Book className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>Bu kategoride ders yok</p>
                  <Button 
                    variant="link" 
                    className="mt-2 text-primary"
                    onClick={() => setIsAddingCourse(true)}
                  >
                    İlk dersi ekle
                  </Button>
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredCourses.map((course) => (
                    <li key={course.id}>
                      <div 
                        className={`p-2 rounded-md flex items-center justify-between cursor-pointer transition-colors ${
                          selectedCourse?.id === course.id 
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handleSelectCourse(course)}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{course.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourse(course);
                              courseForm.reset({ name: course.name });
                              setIsEditingCourse(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(course);
                            }}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subjects for Selected Course */}
        <div className="w-full md:w-2/3">
          <Card className="h-full glass-card rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {selectedCourse ? (
                      <>
                        <span>{selectedCourse.name}</span>
                        <span className="text-sm text-muted-foreground">Konuları</span>
                      </>
                    ) : (
                      <span>Ders Konuları</span>
                    )}
                  </CardTitle>
                  {selectedCourse && (
                    <CardDescription>
                      {subjects.length} konu listeleniyor
                    </CardDescription>
                  )}
                </div>
                {selectedCourse && (
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsImportingSubjects(true)}
                      className="h-8 text-primary gap-1"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>İçe Aktar</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsBulkAdding(true)}
                      className="h-8 text-primary gap-1"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      <span>Toplu Ekle</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setIsAddingSubject(true)}
                      className="h-8 w-8 text-primary"
                      disabled={!selectedCourse}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCourse ? (
                <div className="text-center p-8 text-muted-foreground">
                  <List className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="mb-1">Konuları görüntülemek için bir ders seçin</p>
                  <p className="text-sm">Sol panelden ders seçimi yapabilirsiniz</p>
                </div>
              ) : isLoadingSubjects ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <List className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="mb-1">Bu derse ait konu bulunmuyor</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsImportingSubjects(true)}
                      className="gap-1"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>İçe Aktar</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsBulkAdding(true)}
                      className="gap-1"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      <span>Toplu Ekle</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsAddingSubject(true)}
                      className="gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Konu Ekle</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Konu Adı</TableHead>
                        <TableHead className="w-24 text-right">Süre</TableHead>
                        <TableHead className="w-24 text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell className="text-right">{subject.duration}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setSelectedSubject(subject);
                                  subjectForm.reset({
                                    name: subject.name,
                                    duration: subject.duration
                                  });
                                  setIsEditingSubject(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive/90"
                                onClick={() => handleDeleteSubject(subject)}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Course Dialog */}
      <Dialog open={isAddingCourse || isEditingCourse} onOpenChange={(open) => {
        if (!open) {
          setIsAddingCourse(false);
          setIsEditingCourse(false);
        }
      }}>
        <DialogContent className="glass-card sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditingCourse ? "Dersi Düzenle" : "Yeni Ders Ekle"}</DialogTitle>
            <DialogDescription>
              {isEditingCourse 
                ? "Ders bilgilerini düzenleyin." 
                : "Yeni bir ders ekleyin. Daha sonra bu derse konular ekleyebilirsiniz."}
            </DialogDescription>
          </DialogHeader>
          <Form {...courseForm}>
            <form onSubmit={courseForm.handleSubmit(handleSubmitCourse)} className="space-y-6">
              <FormField
                control={courseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ders Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Ders adını girin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={addCourseMutation.isPending || updateCourseMutation.isPending}
                >
                  {(addCourseMutation.isPending || updateCourseMutation.isPending) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  ) : isEditingCourse ? "Güncelle" : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Subject Dialog */}
      <Dialog open={isAddingSubject || isEditingSubject} onOpenChange={(open) => {
        if (!open) {
          setIsAddingSubject(false);
          setIsEditingSubject(false);
          setSelectedSubject(null);
        }
      }}>
        <DialogContent className="glass-card sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditingSubject ? "Konuyu Düzenle" : "Yeni Konu Ekle"}</DialogTitle>
            <DialogDescription>
              {isEditingSubject 
                ? "Konu bilgilerini düzenleyin." 
                : selectedCourse ? `${selectedCourse.name} dersine yeni bir konu ekleyin.` : "Yeni bir konu ekleyin."}
            </DialogDescription>
          </DialogHeader>
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(handleSubmitSubject)} className="space-y-6">
              <FormField
                control={subjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konu Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Konu adını girin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subjectForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Süre (ders saati)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="Süreyi girin" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      Bu konunun işlenmesi için gereken ders saati sayısı
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={addSubjectMutation.isPending || updateSubjectMutation.isPending}
                >
                  {(addSubjectMutation.isPending || updateSubjectMutation.isPending) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  ) : isEditingSubject ? "Güncelle" : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Import Subjects Dialog */}
      <Dialog open={isImportingSubjects} onOpenChange={(open) => {
        if (!open) {
          setIsImportingSubjects(false);
          setImportedSubjects([]);
          setSelectedFile(null);
          setImportProgress(0);
        }
      }}>
        <DialogContent className="glass-card sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedCourse 
                ? `${selectedCourse.name} - Konuları İçe Aktar` 
                : `Excel'den Tüm Dersleri ve Konuları İçe Aktar`}
            </DialogTitle>
            <DialogDescription>
              {selectedCourse 
                ? `${selectedCourse.name} dersine Excel dosyasından konu içe aktarın.` 
                : `Excel dosyasından tüm dersleri ve konuları tek seferde içe aktarın. Excel dosyasının ilk satırı sütun başlıklarını içermeli ve her iki sütun bir derse ait olmalıdır (ilk sütun konu adları, ikinci sütun süreler).`}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Dosya Yükle</TabsTrigger>
              <TabsTrigger value="preview" disabled={importedSubjects.length === 0}>Önizleme</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg">
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground/60" />
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium">Excel dosyasını buraya sürükleyin</p>
                    <p className="text-xs text-muted-foreground">veya dosya seçin</p>
                  </div>
                  <Label 
                    htmlFor="excel-file" 
                    className="mt-2 cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                  >
                    Dosya Seç
                  </Label>
                  <input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </div>
                
                {selectedFile && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                    
                    <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                    
                    {importedSubjects.length > 0 && (
                      <div className="mt-2 text-sm text-center">
                        <p className="text-primary font-medium">
                          {importedSubjects.length} konu bulundu
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          İçe aktarmak için "Önizleme" sekmesine geçin
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">
                    {selectedCourse 
                      ? `İçe Aktarılacak Konular (${selectedCourse.name})` 
                      : `İçe Aktarılacak Tüm Dersler ve Konuları`}
                  </h3>
                  {selectedCourse ? (
                    <p className="text-xs text-muted-foreground">Toplam {importedSubjects.length} konu</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Tüm dersler ve konuları içe aktarılacak
                    </p>
                  )}
                </div>
                
                {selectedCourse ? (
                  // Single course preview for selected course
                  <div className="border rounded-md max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Konu Adı</TableHead>
                          <TableHead className="text-right w-24">Süre</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importedSubjects.map((subject, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{subject.name}</TableCell>
                            <TableCell className="text-right">{subject.duration}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  // Bulk import preview 
                  <div className="border rounded-md max-h-[300px] overflow-y-auto">
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {(() => {
                        // Get imported courses data from session storage
                        const importedCoursesStr = sessionStorage.getItem('importedCourses');
                        if (!importedCoursesStr) {
                          return (
                            <p>İçe aktarılacak veri bulunamadı. Lütfen önce bir Excel dosyası seçin.</p>
                          )
                        }
                        
                        try {
                          const importedCourses = JSON.parse(importedCoursesStr) as { courseName: string, subjects: ImportedSubject[] }[];
                          const totalSubjects = importedCourses.reduce((sum, course) => sum + course.subjects.length, 0);
                          
                          return (
                            <div className="space-y-4">
                              <p className="font-medium text-base text-primary">
                                {importedCourses.length} ders ve {totalSubjects} konu içe aktarılacak
                              </p>
                              
                              <div className="grid grid-cols-1 gap-4">
                                {importedCourses.map((course, index) => (
                                  <div key={index} className="border p-3 rounded-md text-left">
                                    <h4 className="font-medium mb-2">{course.courseName} <span className="text-xs font-normal text-muted-foreground">({course.subjects.length} konu)</span></h4>
                                    <div className="text-xs text-muted-foreground">
                                      {course.subjects.slice(0, 3).map((subject, idx) => (
                                        <div key={idx} className="flex justify-between">
                                          <span>{subject.name}</span>
                                          <span>{subject.duration} saat</span>
                                        </div>
                                      ))}
                                      {course.subjects.length > 3 && (
                                        <p className="text-center mt-1">... ve {course.subjects.length - 3} konu daha</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        } catch (error) {
                          return (
                            <p>İçe aktarma verisi işlenirken bir hata oluştu.</p>
                          )
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImportingSubjects(false);
                setImportedSubjects([]);
                setSelectedFile(null);
              }}
              className="mr-2"
            >
              İptal
            </Button>
            <Button 
              onClick={handleImportSubjects}
              disabled={(selectedCourse && importedSubjects.length === 0) || 
                (!selectedCourse && !sessionStorage.getItem('importedCourses')) || 
                importSubjectsMutation.isPending || 
                bulkImportCoursesMutation.isPending}
              className="gap-2"
            >
              {importSubjectsMutation.isPending || bulkImportCoursesMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  <span>İçe Aktarılıyor...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>{selectedCourse ? 'Konuları İçe Aktar' : 'Tüm Dersleri İçe Aktar'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Add Subjects Dialog */}
      <Dialog open={isBulkAdding} onOpenChange={(open) => {
        if (!open) {
          setIsBulkAdding(false);
          setBulkText("");
          setParsedSubjects([]);
        }
      }}>
        <DialogContent className="glass-card sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Toplu Konu Ekle</DialogTitle>
            <DialogDescription>
              {selectedCourse 
                ? `${selectedCourse.name} dersine toplu olarak konular ekleyin. Her satıra bir konu yazın.` 
                : "Kopyala-yapıştır ile toplu olarak konular ekleyin. Her satıra bir konu yazın."}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="input" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="input">Metni Yapıştır</TabsTrigger>
              <TabsTrigger value="preview" disabled={parsedSubjects.length === 0}>Önizleme</TabsTrigger>
            </TabsList>
            
            <TabsContent value="input" className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="bulk-text">Konu Listesi</Label>
                  <Textarea 
                    id="bulk-text"
                    placeholder="Her satıra bir konu yazın. Örnek:
Fonksiyonlar, 5
Türev, 8
İntegral, 10"
                    className="min-h-[200px]"
                    value={bulkText}
                    onChange={(e) => {
                      setBulkText(e.target.value);
                      
                      // Parse the text into subjects
                      const lines = e.target.value.split("\n")
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
                      
                      const subjects: ImportedSubject[] = [];
                      
                      lines.forEach(line => {
                        // Try to parse each line as "name, duration" or "name - duration" or "name\tduration"
                        const commaMatch = line.match(/^(.+),\s*(\d+)$/);
                        const dashMatch = line.match(/^(.+)\s*-\s*(\d+)$/);
                        const tabMatch = line.match(/^(.+)\t+(\d+)$/);
                        
                        let name = "";
                        let duration = 0;
                        
                        if (commaMatch) {
                          name = commaMatch[1].trim();
                          duration = parseInt(commaMatch[2]);
                        } else if (dashMatch) {
                          name = dashMatch[1].trim();
                          duration = parseInt(dashMatch[2]);
                        } else if (tabMatch) {
                          name = tabMatch[1].trim();
                          duration = parseInt(tabMatch[2]);
                        } else {
                          // If no pattern matches, just use the whole line as the name with default duration
                          name = line;
                          duration = 1;
                        }
                        
                        if (name && !isNaN(duration) && duration > 0) {
                          subjects.push({ name, duration });
                        }
                      });
                      
                      setParsedSubjects(subjects);
                    }}
                  />
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Eye className="h-4 w-4 mr-1" />
                  <span>Her satır "Konu adı, süre" formatında olmalıdır. Virgül, tire veya tab ile ayrılabilir.</span>
                </div>
                
                {parsedSubjects.length > 0 && (
                  <div className="text-sm text-center">
                    <p className="text-primary font-medium">
                      {parsedSubjects.length} konu bulundu
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Önizleme için "Önizleme" sekmesine geçin
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Eklenecek Konular</h3>
                  <p className="text-xs text-muted-foreground">Toplam {parsedSubjects.length} konu</p>
                </div>
                
                <div className="border rounded-md max-h-[250px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Konu Adı</TableHead>
                        <TableHead className="text-right w-24">Süre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedSubjects.map((subject, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{subject.name}</TableCell>
                          <TableCell className="text-right">{subject.duration}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsBulkAdding(false);
                setBulkText("");
                setParsedSubjects([]);
              }}
              className="mr-2"
            >
              İptal
            </Button>
            <Button 
              onClick={() => {
                if (selectedCourse && parsedSubjects.length > 0) {
                  importSubjectsMutation.mutate({
                    courseId: selectedCourse.id,
                    subjects: parsedSubjects
                  });
                }
              }}
              disabled={parsedSubjects.length === 0 || importSubjectsMutation.isPending}
              className="gap-2"
            >
              {importSubjectsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  <span>Ekleniyor...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Konuları Ekle</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
