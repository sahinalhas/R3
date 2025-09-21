import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const weekDays = [
  { id: 1, name: "Pazartesi" },
  { id: 2, name: "Salı" },
  { id: 3, name: "Çarşamba" },
  { id: 4, name: "Perşembe" },
  { id: 5, name: "Cuma" },
  { id: 6, name: "Cumartesi" },
  { id: 7, name: "Pazar" },
];

const formSchema = z.object({
  name: z.string().min(1, "Ders saati adı boş olamaz"),
  startTime: z.string().min(1, "Başlangıç saati boş olamaz"),
  endTime: z.string().min(1, "Bitiş saati boş olamaz"),
  description: z.string().optional(),
  isActive: z.coerce.number().default(1),
  days: z
    .array(z.number())
    .min(1, "En az bir gün seçmelisiniz")
    .refine((days) => days.length > 0, {
      message: "En az bir gün seçmelisiniz",
    }),
});

type BulkClassHourFormValues = z.infer<typeof formSchema>;

type BulkClassHourFormProps = {
  onSubmit: (data: BulkClassHourFormValues) => void;
  isLoading?: boolean;
};

export default function BulkClassHourForm({
  onSubmit,
  isLoading = false,
}: BulkClassHourFormProps) {
  const form = useForm<BulkClassHourFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      startTime: "",
      endTime: "",
      description: "",
      isActive: 1,
      days: [1, 2, 3, 4, 5], // Pazartesi-Cuma varsayılan olarak seçili
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ders Saati Adı</FormLabel>
              <FormControl>
                <Input placeholder="Örn: 1. Ders" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Başlangıç Saati</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bitiş Saati</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="days"
          render={() => (
            <FormItem>
              <FormLabel>Günler</FormLabel>
              <FormDescription>
                Ders saatinin geçerli olacağı günleri seçin
              </FormDescription>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {weekDays.map((day) => (
                  <FormField
                    key={day.id}
                    control={form.control}
                    name="days"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={day.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(day.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, day.id].sort())
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== day.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {day.name}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ders saati ile ilgili ek bilgiler..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Aktif</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Bu ders saati aktif olarak kullanılacak mı?
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value === 1}
                  onCheckedChange={(checked) => {
                    field.onChange(checked ? 1 : 0);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Kaydediliyor..." : "Seçili Günlere Uygula"}
        </Button>
      </form>
    </Form>
  );
}