import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  MoreVertical, 
  Eye, 
  Pencil, 
  Trash, 
  Search, 
  GraduationCap, 
  UserPlus, 
  FilePlus, 
  CalendarPlus,
  Phone, 
  Calendar,
  User,
  School
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StudentForm from "@/components/students/student-form";
import StudentImport from "@/components/students/student-import";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getInitials, calculateAge } from "@/lib/utils";
import { Student, InsertStudent } from "@shared/schema";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function StudentsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Öğrencileri çek
  const {
    data: students,
    isLoading,
    refetch,
  } = useQuery<Student[]>({
    queryKey: ["/api/students", searchQuery],
    queryFn: async ({ queryKey }) => {
      const [_, query] = queryKey;
      const url = query ? `/api/students?q=${encodeURIComponent(query as string)}` : "/api/students";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Öğrenciler yüklenirken hata oluştu");
      return res.json();
    },
  });

  // Filtrelenmiş öğrenciler
  const filteredStudents = students?.filter(student => {
    if (!searchQuery) return true;
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || 
           student.studentNumber.toLowerCase().includes(query) ||
           student.class.toLowerCase().includes(query);
  }) || [];

  // Öğrenci ekleme mutation
  const addStudentMutation = useMutation({
    mutationFn: async (student: InsertStudent) => {
      const res = await apiRequest("POST", "/api/students", student);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Öğrenci başarıyla eklendi",
      });
      setIsAddDialogOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Öğrenci güncelleme mutation
  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertStudent> }) => {
      const res = await apiRequest("PUT", `/api/students/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Öğrenci bilgileri başarıyla güncellendi",
      });
      setEditingStudent(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Öğrenci silme mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/students/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Öğrenci başarıyla silindi",
      });
      setDeletingStudent(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddStudent = (data: InsertStudent) => {
    addStudentMutation.mutate(data);
  };

  const handleEditStudent = (data: InsertStudent) => {
    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, data });
    }
  };

  const handleDeleteStudent = () => {
    if (deletingStudent) {
      deleteStudentMutation.mutate(deletingStudent.id);
    }
  };

  const columns = [
    {
      header: "Öğrenci",
      accessorKey: "name",
      cell: (student: Student) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-0 rounded-xl">
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white rounded-xl">
              {getInitials(`${student.firstName} ${student.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-foreground">
              {student.firstName} {student.lastName}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {student.studentNumber}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Sınıf",
      accessorKey: "class",
      cell: (student: Student) => (
        <Badge className="bg-primary/10 text-primary border-0 font-medium">
          <School className="h-3 w-3 mr-1" />
          {student.class}
        </Badge>
      ),
    },
    {
      header: "İletişim",
      accessorKey: "contact",
      cell: (student: Student) => (
        <div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span>{student.phone}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Veli: {student.parentName}
          </div>
        </div>
      ),
    },
    {
      header: "Doğum Tarihi",
      accessorKey: "birthDate",
      cell: (student: Student) => (
        <div className="flex flex-col">
          <span className="text-foreground">{formatDate(student.birthDate)}</span>
          <span className="text-xs text-muted-foreground">{calculateAge(student.birthDate)} yaşında</span>
        </div>
      ),
    },
    {
      header: "İşlemler",
      accessorKey: "actions",
      cell: (student: Student) => (
        <div className="flex items-center justify-end">
          <Link href={`/students/${student.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-secondary" onClick={() => setEditingStudent(student)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-primary/10">
              <Link href={`/students/${student.id}`}>
                <DropdownMenuItem className="cursor-pointer">
                  <Eye className="h-4 w-4 mr-2 text-primary" />
                  Detayları Görüntüle
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => setEditingStudent(student)} className="cursor-pointer">
                <Pencil className="h-4 w-4 mr-2 text-primary" />
                Öğrenciyi Düzenle
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <CalendarPlus className="h-4 w-4 mr-2 text-secondary" />
                Randevu Oluştur
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <FilePlus className="h-4 w-4 mr-2 text-accent" />
                Not Ekle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeletingStudent(student)} className="cursor-pointer text-destructive">
                <Trash className="h-4 w-4 mr-2" />
                Öğrenciyi Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <Layout 
      title="Öğrenci Yönetimi" 
      description="Tüm öğrencileri yönetin, ekleyin ve düzenleyin"
    >
      <div className="mb-6 glass-panel">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex flex-col h-full justify-center">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md mr-3">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-gradient">Öğrenci Yönetimi</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Rehberlik servisinizdeki tüm öğrencileri buradan yönetebilirsiniz. Yeni öğrenci ekleyin, mevcut öğrencileri düzenleyin ve öğrenci bilgilerini görüntüleyin.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button 
                  className="btn-gradient gap-2" 
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Yeni Öğrenci Ekle
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-primary/20 text-primary gap-2"
                  onClick={() => setIsImportDialogOpen(true)}
                >
                  <FilePlus className="h-4 w-4" />
                  Excel'den İçe Aktar
                </Button>
              </div>
            </div>
          </div>
          <div className="glass-effect-strong rounded-xl p-4 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">İstatistikler</h3>
            <div className="grid grid-cols-2 gap-4 mt-2 flex-grow">
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">{students?.length || 0}</span>
                <span className="text-xs text-muted-foreground">Toplam Öğrenci</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">{students?.filter(s => s.gender === 'kız').length || 0}</span>
                <span className="text-xs text-muted-foreground">Kız Öğrenci</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">{students?.filter(s => s.gender === 'erkek').length || 0}</span>
                <span className="text-xs text-muted-foreground">Erkek Öğrenci</span>
              </div>
              <div className="bg-white/30 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gradient">
                  {Array.from(new Set(students?.map(s => s.class) || [])).length}
                </span>
                <span className="text-xs text-muted-foreground">Sınıf Sayısı</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="table" className="w-full" onValueChange={(value) => setViewMode(value as "table" | "grid")}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <TabsList className="bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="table" className="rounded-lg data-[state=active]:bg-background">
              Tablo Görünümü
            </TabsTrigger>
            <TabsTrigger value="grid" className="rounded-lg data-[state=active]:bg-background">
              Kart Görünümü
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Öğrenci ara..." 
              className="pl-10 bg-muted/50 border-muted focus:border-primary transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="table" className="mt-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card overflow-hidden border-0"
          >
            <DataTable
              columns={columns}
              data={filteredStudents}
              loading={isLoading}
              pagination
              searchPlaceholder="Öğrenci ara..."
              emptyState={
                <div className="flex flex-col items-center justify-center py-12">
                  <UserPlus className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-1">Henüz öğrenci bulunmuyor</h3>
                  <p className="text-sm text-muted-foreground max-w-md text-center mb-6">
                    Henüz hiç öğrenci kaydı oluşturulmamış veya arama kriterlerinize uygun öğrenci bulunamadı.
                  </p>
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="btn-gradient"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Yeni Öğrenci Ekle
                  </Button>
                </div>
              }
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="grid" className="mt-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array(8).fill(null).map((_, index) => (
                  <Card key={index} className="glass-card border-0 animate-pulse">
                    <CardContent className="p-6 flex justify-center items-center min-h-[200px]">
                      <div className="w-20 h-20 rounded-full bg-muted/50"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AnimatePresence>
                  {filteredStudents.map((student) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card className="overflow-hidden glass-card border-0 hover:shadow-lg transition-all h-full flex flex-col">
                        <CardHeader className="pb-0">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-primary/10 text-primary border-0">
                              {student.class}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-56">
                                <Link href={`/students/${student.id}`}>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Görüntüle
                                  </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem onClick={() => setEditingStudent(student)} className="cursor-pointer">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeletingStudent(student)} className="cursor-pointer text-destructive">
                                  <Trash className="h-4 w-4 mr-2" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center pt-4 flex-grow">
                          <Avatar className="h-20 w-20 border-0 mb-4">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl">
                              {getInitials(`${student.firstName} ${student.lastName}`)}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="text-lg font-semibold text-center mt-2">
                            {student.firstName} {student.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground text-center mb-2">
                            {student.studentNumber}
                          </p>
                          <div className="grid grid-cols-2 gap-2 w-full mt-2">
                            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                              <span className="text-xs text-muted-foreground">Yaş</span>
                              <span className="font-medium">{calculateAge(student.birthDate)}</span>
                            </div>
                            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30">
                              <span className="text-xs text-muted-foreground">Cinsiyet</span>
                              <span className="font-medium capitalize">{student.gender}</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="justify-center pt-2 pb-4">
                          <Link href={`/students/${student.id}`}>
                            <Button variant="outline" size="sm" className="w-full border-primary/20 text-primary hover:bg-primary/5">
                              <Eye className="h-4 w-4 mr-2" />
                              Detayları Görüntüle
                            </Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="glass-card flex flex-col items-center justify-center py-16 border-0">
                <UserPlus className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Öğrenci bulunamadı</h3>
                <p className="text-sm text-muted-foreground max-w-md text-center mb-6">
                  Henüz hiç öğrenci kaydı oluşturulmamış veya arama kriterlerinize uygun öğrenci bulunamadı.
                </p>
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="btn-gradient"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Yeni Öğrenci Ekle
                </Button>
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto glass-panel border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Yeni Öğrenci Ekle</DialogTitle>
          </DialogHeader>
          <StudentForm
            onSubmit={handleAddStudent}
            isLoading={addStudentMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto glass-panel border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Öğrenci Düzenle</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <StudentForm
              defaultValues={{
                ...editingStudent,
                birthDate: editingStudent.birthDate.toString(),
              }}
              onSubmit={handleEditStudent}
              isLoading={updateStudentMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingStudent}
        onOpenChange={(open) => !open && setDeletingStudent(null)}
      >
        <AlertDialogContent className="glass-panel border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Bu öğrenciyi silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deletingStudent && (
                <span>
                  <strong>{`${deletingStudent.firstName} ${deletingStudent.lastName}`}</strong> adlı öğrencinin
                  tüm bilgileri silinecektir. Bu işlem geri alınamaz.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-muted">İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStudent} 
              className="bg-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              {deleteStudentMutation.isPending ? "Siliniyor..." : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Students Dialog */}
      <Dialog 
        open={isImportDialogOpen} 
        onOpenChange={setIsImportDialogOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass-panel border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Öğrencileri Excel'den İçe Aktar</DialogTitle>
          </DialogHeader>
          <StudentImport onClose={() => setIsImportDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}