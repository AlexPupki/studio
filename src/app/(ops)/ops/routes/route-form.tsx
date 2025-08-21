
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/hooks/use-toast";
import type { routes } from "@/lib/server/db/schema";
import { saveRoute } from "./route.actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RouteFormSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title_ru: z.string().min(3, "Название должно быть не короче 3 символов"),
  slug: z.string().min(3, "Слаг должен быть не короче 3 символов").regex(/^[a-z0-9-]+$/, "Слаг может содержать только строчные буквы, цифры и дефисы"),
  description_ru: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]),
  basePriceMinor: z.coerce.number().int().positive("Цена должна быть положительным числом"),
  durationMinutes: z.coerce.number().int().positive("Длительность должна быть положительным числом"),
});

type RouteFormValues = z.infer<typeof RouteFormSchema>;

export function RouteForm({ route }: { route: typeof routes.$inferSelect | null }) {
  const router = useRouter();
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(RouteFormSchema),
    defaultValues: {
      id: route?.id,
      title_ru: route?.title?.ru || "",
      slug: route?.slug || "",
      description_ru: route?.description?.ru || "",
      status: route?.status || "draft",
      basePriceMinor: route?.basePriceMinor ? route.basePriceMinor / 100 : 0,
      durationMinutes: route?.durationMinutes || 0,
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: RouteFormValues) {
    try {
      const result = await saveRoute(data);
      if (result.success) {
        toast({
          title: "Успешно!",
          description: "Маршрут сохранен.",
        });
        router.push("/ops/routes");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: result.error,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Непредвиденная ошибка",
        description: "Не удалось сохранить маршрут. Попробуйте снова.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title_ru"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название (RU)</FormLabel>
              <FormControl>
                <Input placeholder="Полет на вертолете над морем" {...field} />
              </FormControl>
              <FormDescription>Основное название услуги.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Слаг (URL)</FormLabel>
              <FormControl>
                <Input placeholder="helicopter-ride-sea" {...field} />
              </FormControl>
              <FormDescription>Уникальный идентификатор для URL.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description_ru"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание (RU)</FormLabel>
              <FormControl>
                <Textarea placeholder="Краткое описание маршрута для каталога..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid md:grid-cols-3 gap-8">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Статус</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Черновик</SelectItem>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="archived">В архиве</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Статус маршрута в каталоге.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="basePriceMinor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Базовая цена (в рублях)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50000" {...field} />
                </FormControl>
                <FormDescription>Цена будет храниться в копейках.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Длительность (в минутах)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="60" {...field} />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
          Сохранить маршрут
        </Button>
      </form>
    </Form>
  );
}
