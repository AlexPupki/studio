
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
import type { posts, categories } from "@/lib/server/db/schema";
import { savePost } from "./route.actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PostFormSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().min(3, "Заголовок должен быть не короче 3 символов"),
  slug: z.string().min(3, "Слаг должен быть не короче 3 символов").regex(/^[a-z0-9-]+$/, "Слаг может содержать только строчные буквы, цифры и дефисы"),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(["draft", "published", "scheduled", "archived"]),
  categoryId: z.string().uuid().optional().nullable(),
  publishedAt: z.date().optional().nullable(),
});

type PostFormValues = z.infer<typeof PostFormSchema>;
type Category = typeof categories.$inferSelect;

export function PostForm({ post, categories }: { post: typeof posts.$inferSelect | null, categories: Category[] }) {
  const router = useRouter();
  const form = useForm<PostFormValues>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: {
      id: post?.id,
      title: post?.title || "",
      slug: post?.slug || "",
      excerpt: post?.excerpt || "",
      content: post?.content || "",
      status: post?.status || "draft",
      categoryId: post?.categoryId,
      publishedAt: post?.publishedAt ? new Date(post.publishedAt) : null,
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: PostFormValues) {
    try {
      const result = await savePost(data);
      if (result.success) {
        toast({
          title: "Успешно!",
          description: "Пост сохранен.",
        });
        router.push("/ops/content/posts");
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
        description: "Не удалось сохранить пост. Попробуйте снова.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Заголовок</FormLabel>
              <FormControl>
                <Input placeholder="Как мы провели лето в Сочи" {...field} />
              </FormControl>
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
                <Input placeholder="how-we-spent-summer-in-sochi" {...field} />
              </FormControl>
              <FormDescription>Уникальный идентификатор для URL.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Краткое содержание (excerpt)</FormLabel>
              <FormControl>
                <Textarea placeholder="Краткая выжимка из статьи для превью..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Основной контент</FormLabel>
              <FormControl>
                <Textarea rows={10} placeholder="Полный текст статьи. Поддерживается Markdown." {...field} />
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
                    <SelectItem value="scheduled">Запланирован</SelectItem>
                    <SelectItem value="published">Опубликован</SelectItem>
                    <SelectItem value="archived">В архиве</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Категория</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Без категории</SelectItem>
                    {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
          control={form.control}
          name="publishedAt"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Дата публикации</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Выберите дату</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Для статуса "Запланирован" эта дата будет использована для автоматической публикации.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
          Сохранить пост
        </Button>
      </form>
    </Form>
  );
}
