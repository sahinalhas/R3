import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InsertClassHour, ClassHour } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/layout";
import ClassHourForm from "@/components/class-hours/class-hour-form";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Plus, Pencil, Trash, AlertCircle } from "lucide-react";
import { getTurkishDay } from "@/lib/utils";

export default function ClassHoursPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClassHour, setEditingClassHour] = useState<ClassHour | null>(null);
  const [deletingClassHour, setDeletingClassHour] = useState<ClassHour | null>(null);

  // Tüm ders saatlerini çek
  const { data: classHours, isLoading } = useQuery<ClassHour[]>({
    queryKey: ["/api/class-hours"],
  });

  // Yeni ders saati ekle
  const createClassHourMutation = useMutation({
    mutationFn: async (classHour: InsertClassHour) => {
      return apiRequest<ClassHour>("/api/class-hours", {
        method: "POST",
        body: JSON.stringify(classHour),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/class-hours"] });
      toast({
        title: "Başarılı",
        description: "Ders saati başarıyla eklendi.",
      });
      setIsAddDialogOpen(false);
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
      return apiRequest<ClassHour>(`/api/class-hours/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
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
      return apiRequest<void>(`/api/class-hours/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/class-hours"] });
      toast({
        title: "Başarılı",
        description: "Ders saati başarıyla silindi.",
      });
      setDeletingClassHour(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: `Ders saati silinirken bir hata oluştu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddClassHour = (data: InsertClassHour) => {
    createClassHourMutation.mutate(data);
  };

  const handleEditClassHour = (data: InsertClassHour) => {
    if (editingClassHour) {
      updateClassHourMutation.mutate({ id: editingClassHour.id, data });
    }
  };

  const handleDeleteClassHour = () => {
    if (deletingClassHour) {
      deleteClassHourMutation.mutate(deletingClassHour.id);
    }
  };

  // Gün filtrelemesi için
  const days = [1, 2, 3, 4, 5, 6, 7];
  const groupedClassHours = days.reduce<Record<number, ClassHour[]>>(
    (acc, day) => {
      acc[day] = classHours?.filter((ch) => ch.dayOfWeek === day) || [];
      return acc;
    },
    { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }
  );

  return (
    <Layout title="Ders Saatleri" description="Okul ders saatleri yönetimi">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ders Saatleri</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Ders Saati Ekle
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <p>Ders saatleri yükleniyor...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {days.map((day) => {
            const dayClassHours = groupedClassHours[day];
            if (dayClassHours.length === 0) return null;

            return (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle>{getTurkishDay(day - 1)}</CardTitle>
                  <CardDescription>
                    {dayClassHours.length} ders saati kayıtlı
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ders Adı</TableHead>
                          <TableHead>Başlangıç</TableHead>
                          <TableHead>Bitiş</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Açıklama</TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayClassHours.map((classHour) => (
                          <TableRow key={classHour.id}>
                            <TableCell className="font-medium">{classHour.name}</TableCell>
                            <TableCell>{classHour.startTime}</TableCell>
                            <TableCell>{classHour.endTime}</TableCell>
                            <TableCell>
                              {classHour.isActive === 1 ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Aktif
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  Pasif
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {classHour.description || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingClassHour(classHour)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingClassHour(classHour)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}

          {/* Ders saati yok ise */}
          {classHours?.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 border rounded-md">
              <Clock className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">Henüz ders saati eklenmemiş</h3>
              <p className="text-sm text-muted-foreground mb-4">
                "Yeni Ders Saati Ekle" butonuna tıklayarak ders saatleri oluşturabilirsiniz.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Yeni Ders Saati Ekle
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Yeni Ders Saati Ekle Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Ders Saati Ekle</DialogTitle>
            <DialogDescription>
              Okul için yeni bir ders saati dilimi oluşturun.
            </DialogDescription>
          </DialogHeader>
          <ClassHourForm
            onSubmit={handleAddClassHour}
            isLoading={createClassHourMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Ders Saati Düzenle Dialog */}
      <Dialog
        open={!!editingClassHour}
        onOpenChange={(open) => !open && setEditingClassHour(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ders Saati Düzenle</DialogTitle>
            <DialogDescription>
              Ders saati bilgilerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          {editingClassHour && (
            <ClassHourForm
              defaultValues={editingClassHour}
              onSubmit={handleEditClassHour}
              isLoading={updateClassHourMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <AlertDialog
        open={!!deletingClassHour}
        onOpenChange={(open) => !open && setDeletingClassHour(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu ders saatini silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu ders saati kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClassHour}>
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}