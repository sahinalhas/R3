import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DownloadCloud, Upload, AlertCircle, CheckCircle2, FileX } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { InsertStudent } from "@shared/schema";
import { getClassOptions } from "@/lib/utils";

// Öğrenci import tipi
interface ImportedStudent {
  studentNumber: string;
  firstName: string;
  lastName: string;
  class: string;
  gender: string;
  birthDate?: string;
  parentName?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isValid: boolean;
  errors?: string[];
}

// Şablon için örnek başlıklar
const TEMPLATE_HEADERS = [
  "Öğrenci No*", "Ad*", "Soyad*", "Sınıf*", "Cinsiyet*", 
  "Doğum Tarihi", "Veli Adı", "Telefon", "Adres", "Notlar"
];

const REQUIRED_HEADERS = ["Öğrenci No*", "Ad*", "Soyad*", "Sınıf*", "Cinsiyet*"];

type StudentImportProps = {
  onClose: () => void;
};

export default function StudentImport({ onClose }: StudentImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'completed' | 'error'>('upload');
  const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [importProgress, setImportProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Not: Sınıf değerleri artık kullanıcı tarafından serbestçe girilebilir
  
  // Excel şablonunu oluştur ve indir
  const generateTemplate = () => {
    // Boş bir workbook oluştur
    const wb = XLSX.utils.book_new();
    
    // Başlıkları içeren bir worksheet oluştur
    const wsData = [TEMPLATE_HEADERS];
    
    // Örnek bir veri satırı ekle (isteğe bağlı)
    const exampleRow = [
      "20230001", "Ahmet", "Yılmaz", "9A", "erkek",
      "2007-05-15", "Ali Yılmaz", "05555551212", "Örnek Mah. Okul Cad. No:1", "Örnek not"
    ];
    wsData.push(exampleRow);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Worksheeti workbooka ekle
    XLSX.utils.book_append_sheet(wb, ws, "Öğrenciler");
    
    // Workbooku indir
    XLSX.writeFile(wb, "ogrenci_import_sablonu.xlsx");
  };
  
  // Excel dosyasını oku ve öğrencileri içe aktar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setImportedStudents([]);
    setErrorMessage("");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Excel verilerini JSON'a dönüştür
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length <= 1) {
          setErrorMessage("Dosyada öğrenci verisi bulunamadı.");
          return;
        }
        
        // Başlık satırını al
        const headers = jsonData[0] as string[];
        
        // Zorunlu alanları kontrol et
        const missingRequiredHeaders = REQUIRED_HEADERS.filter(header => 
          !headers.some(h => h?.includes(header.replace("*", "")))
        );
        
        if (missingRequiredHeaders.length > 0) {
          setErrorMessage(`Zorunlu alanlar eksik: ${missingRequiredHeaders.join(", ")}`);
          return;
        }
        
        // Başlık indekslerini bul
        const getColumnIndex = (columnName: string) => {
          const exactIndex = headers.findIndex(h => h === columnName);
          if (exactIndex !== -1) return exactIndex;
          
          // Eğer tam eşleşme yoksa, benzer başlıkları ara
          const baseColumnName = columnName.replace("*", "").toLowerCase().trim();
          return headers.findIndex(h => 
            h?.toLowerCase().trim().includes(baseColumnName)
          );
        };
        
        const studentNumberIdx = getColumnIndex("Öğrenci No*");
        const firstNameIdx = getColumnIndex("Ad*");
        const lastNameIdx = getColumnIndex("Soyad*");
        const classIdx = getColumnIndex("Sınıf*");
        const genderIdx = getColumnIndex("Cinsiyet*");
        const birthDateIdx = getColumnIndex("Doğum Tarihi");
        const parentNameIdx = getColumnIndex("Veli Adı");
        const phoneIdx = getColumnIndex("Telefon");
        const addressIdx = getColumnIndex("Adres");
        const notesIdx = getColumnIndex("Notlar");
        
        // Veri satırlarını işle ve öğrencileri oluştur
        const students: ImportedStudent[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0 || !row.some(cell => cell)) continue;
          
          const studentNumber = row[studentNumberIdx]?.toString().trim() || "";
          const firstName = row[firstNameIdx]?.toString().trim() || "";
          const lastName = row[lastNameIdx]?.toString().trim() || "";
          const classValue = row[classIdx]?.toString().trim() || "";
          let genderValue = row[genderIdx]?.toString().toLowerCase().trim() || "";
          
          // Cinsiyet değerini kontrol et ve düzenle
          if (genderValue === "e" || genderValue === "erkek" || genderValue === "bay" || genderValue === "m" || genderValue === "male") {
            genderValue = "erkek";
          } else if (genderValue === "k" || genderValue === "kız" || genderValue === "kadın" || genderValue === "bayan" || genderValue === "f" || genderValue === "female") {
            genderValue = "kız";
          }
          
          const errors: string[] = [];
          
          // Doğrulama kontrolleri
          if (!studentNumber) errors.push("Öğrenci no gereklidir");
          if (!firstName) errors.push("Ad gereklidir");
          if (!lastName) errors.push("Soyad gereklidir");
          if (!classValue) errors.push("Sınıf gereklidir");
          if (!genderValue) errors.push("Cinsiyet gereklidir");
          if (genderValue !== "erkek" && genderValue !== "kız") errors.push(`Geçerli bir cinsiyet değil: ${genderValue}. 'erkek' veya 'kız' olmalıdır`);
          
          // Doğum tarihi formatını kontrol et
          let birthDate = birthDateIdx >= 0 ? row[birthDateIdx]?.toString().trim() || "" : "";
          if (birthDate) {
            // Excel tarih formatını YYYY-MM-DD formatına dönüştür
            try {
              // Excel tarihlerini JS tarihlerine dönüştür
              if (typeof row[birthDateIdx] === 'number') {
                const excelDate = row[birthDateIdx];
                const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
                birthDate = date.toISOString().split('T')[0];
              } else if (typeof birthDate === 'string') {
                // Tarih string ise formatını kontrol et ve dönüştür
                const dateRegex = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/;
                const match = birthDate.match(dateRegex);
                if (match) {
                  const day = match[1].padStart(2, '0');
                  const month = match[2].padStart(2, '0');
                  const year = match[3];
                  birthDate = `${year}-${month}-${day}`;
                }
              }
            } catch (error) {
              errors.push("Doğum tarihi formatı geçerli değil");
            }
          }
          
          const student: ImportedStudent = {
            studentNumber,
            firstName,
            lastName,
            class: classValue,
            gender: genderValue,
            birthDate: birthDate || undefined,
            parentName: parentNameIdx >= 0 ? row[parentNameIdx]?.toString().trim() || undefined : undefined,
            phone: phoneIdx >= 0 ? row[phoneIdx]?.toString().trim() || undefined : undefined,
            address: addressIdx >= 0 ? row[addressIdx]?.toString().trim() || undefined : undefined,
            notes: notesIdx >= 0 ? row[notesIdx]?.toString().trim() || undefined : undefined,
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
          };
          
          students.push(student);
        }
        
        setImportedStudents(students);
        setImportStep('preview');
      } catch (error) {
        console.error("Excel'i okurken hata oluştu:", error);
        setErrorMessage("Dosya okunurken bir hata oluştu. Lütfen doğru formatta bir Excel dosyası yüklediğinizden emin olun.");
      }
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Öğrencileri toplu olarak içe aktar
  const importStudentsMutation = useMutation({
    mutationFn: async (students: InsertStudent[]) => {
      const response = await fetch('/api/students/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Öğrenciler içe aktarılırken bir hata oluştu');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      setImportStep('completed');
      toast({
        title: "Başarılı",
        description: `${data.successCount || importedStudents.length} öğrenci başarıyla içe aktarıldı.`,
      });
    },
    onError: (error: Error) => {
      setImportStep('error');
      setErrorMessage(error.message);
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Öğrenciler içe aktarılırken bir hata oluştu.",
      });
    }
  });
  
  // İçe aktarma işlemini başlat
  const handleImport = () => {
    const validStudents = importedStudents.filter(student => student.isValid);
    
    if (validStudents.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İçe aktarılacak geçerli öğrenci bulunamadı.",
      });
      return;
    }
    
    setImportStep('importing');
    setImportProgress(0);
    
    // Öğrencileri InsertStudent tipine dönüştür
    const studentsToImport: InsertStudent[] = validStudents.map(student => ({
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      class: student.class,
      gender: student.gender,
      birthDate: student.birthDate || new Date().toISOString().split('T')[0], // Varsayılan olarak bugünün tarihi
      parentName: student.parentName || "Belirtilmedi",
      phone: student.phone || "Belirtilmedi",
      address: student.address || "Belirtilmedi",
      notes: student.notes || "",
    }));
    
    // İlerleme simülasyonu
    const steps = 10;
    let currentStep = 0;
    
    const progressInterval = setInterval(() => {
      currentStep++;
      setImportProgress(Math.min((currentStep / steps) * 90, 90)); // Maksimum %90'a kadar git
      
      if (currentStep >= steps) {
        clearInterval(progressInterval);
      }
    }, 300);
    
    // İçe aktarma işlemini başlat
    importStudentsMutation.mutate(studentsToImport);
  };
  
  // Geçerli ve geçersiz öğrenci sayıları
  const validStudentsCount = importedStudents.filter(s => s.isValid).length;
  const invalidStudentsCount = importedStudents.length - validStudentsCount;
  
  return (
    <div className="space-y-6">
      {importStep === 'upload' && (
        <>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-primary/10 rounded-full p-3">
                <Upload size={24} className="text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium">Öğrenci Verilerini İçe Aktar</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Excel dosyasından toplu öğrenci verisi ekleyebilirsiniz. 
                Lütfen aşağıdaki şablona uygun bir dosya kullanın.
              </p>
            </div>
            
            <div className="grid gap-4">
              <Button 
                variant="outline" 
                className="bg-white dark:bg-background border-dashed border-primary/20 hover:border-primary/60"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} className="mr-2" />
                Excel Dosyası Seç
              </Button>
              
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
              
              <Button 
                variant="outline" 
                className="bg-white dark:bg-background border-primary/20 text-primary hover:text-primary hover:bg-primary/5"
                onClick={generateTemplate}
              >
                <DownloadCloud size={16} className="mr-2" />
                Şablonu İndir
              </Button>
            </div>
            
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-muted-foreground mt-2">
              <p className="font-medium text-foreground">Gerekli Alanlar:</p>
              <p className="mt-1">Öğrenci No, Ad, Soyad, Sınıf ve Cinsiyet alanları zorunludur.</p>
              <p className="mt-1">Sınıf değeri serbestçe girilebilir (9A, 10B, 11-C, 12/D gibi).</p>
              <p className="mt-1">Cinsiyet değeri "erkek" veya "kız" olmalıdır.</p>
            </div>
          </div>
          
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </>
      )}
      
      {importStep === 'preview' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">İçe Aktarılacak Öğrenciler</h3>
              <p className="text-sm text-muted-foreground">
                Toplam {importedStudents.length} öğrenci, {validStudentsCount} geçerli, {invalidStudentsCount} hatalı
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={invalidStudentsCount > 0 ? "destructive" : "outline"} className="gap-1 px-2">
                <AlertCircle className="h-3 w-3" />
                <span>{invalidStudentsCount} Hatalı</span>
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary gap-1 px-2">
                <CheckCircle2 className="h-3 w-3" />
                <span>{validStudentsCount} Geçerli</span>
              </Badge>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="w-[80px]">Durum</TableHead>
                    <TableHead>Öğrenci No</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Soyad</TableHead>
                    <TableHead>Sınıf</TableHead>
                    <TableHead>Cinsiyet</TableHead>
                    <TableHead>Hata</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {importedStudents.map((student, index) => (
                    <TableRow key={index} className={student.isValid ? "" : "bg-destructive/5"}>
                      <TableCell>
                        {student.isValid ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            <CheckCircle2 className="h-3 w-3" />
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{student.studentNumber || "-"}</TableCell>
                      <TableCell>{student.firstName || "-"}</TableCell>
                      <TableCell>{student.lastName || "-"}</TableCell>
                      <TableCell>{student.class || "-"}</TableCell>
                      <TableCell>{student.gender || "-"}</TableCell>
                      <TableCell className="text-xs text-destructive">
                        {student.errors?.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {invalidStudentsCount > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Hatalı Kayıtlar Mevcut</AlertTitle>
              <AlertDescription>
                {invalidStudentsCount} öğrenci kaydında hata bulunuyor. Hataları düzeltip tekrar deneyin veya sadece geçerli kayıtları içe aktarmaya devam edebilirsiniz.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
      
      {importStep === 'importing' && (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-primary/10 rounded-full p-4">
              <Upload size={32} className="text-primary animate-pulse" />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Öğrenciler İçe Aktarılıyor</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Lütfen işlem tamamlanana kadar bekleyin...
            </p>
          </div>
          
          <Progress value={importProgress} className="w-full h-2" />
          
          <p className="text-xs text-muted-foreground">
            {validStudentsCount} öğrenci içe aktarılıyor ({Math.round(importProgress)}%)
          </p>
        </div>
      )}
      
      {importStep === 'completed' && (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-primary/10 rounded-full p-4">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">İçe Aktarma Tamamlandı</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {validStudentsCount} öğrenci başarıyla içe aktarıldı.
            </p>
          </div>
          
          <Alert className="bg-primary/5 border-primary/20 text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>İşlem Başarılı</AlertTitle>
            <AlertDescription>
              Tüm öğrenciler başarıyla veritabanına eklendi. Öğrenci listesinde görüntüleyebilirsiniz.
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {importStep === 'error' && (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-destructive/10 rounded-full p-4">
              <FileX size={32} className="text-destructive" />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">İçe Aktarma Başarısız</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Öğrenciler içe aktarılırken bir hata oluştu.
            </p>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>
              {errorMessage || "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <DialogFooter>
        {importStep === 'upload' && (
          <>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="mr-2"
            >
              İptal
            </Button>
          </>
        )}
        
        {importStep === 'preview' && (
          <>
            <Button 
              variant="outline" 
              onClick={() => setImportStep('upload')} 
              className="mr-2"
            >
              Geri
            </Button>
            <Button 
              variant="default"
              onClick={handleImport} 
              disabled={validStudentsCount === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {validStudentsCount} Öğrenciyi İçe Aktar
            </Button>
          </>
        )}
        
        {(importStep === 'completed' || importStep === 'error') && (
          <Button 
            variant="default"
            onClick={onClose} 
          >
            Kapat
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}