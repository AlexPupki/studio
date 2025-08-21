'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import type { categories } from '@/lib/server/db/schema';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import React from 'react';
import { deleteCategory, saveCategory } from './route.actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CategoryFormSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Название должно быть не короче 2 символов'),
  slug: z
    .string()
    .min(2, 'Слаг должен быть не короче 2 символов')
    .regex(
      /^[a-z0-9-]+$/,
      'Слаг может содержать только строчные буквы, цифры и дефисы'
    ),
});

type CategoryFormValues = z.infer<typeof CategoryFormSchema>;
type Category = typeof categories.$inferSelect;

export function CategoryEditDialog({
  category,
  children,
}: {
  category?: Category | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: {
      id: category?.id,
      name: category?.name || '',
      slug: category?.slug || '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: CategoryFormValues) {
    try {
      const result = await saveCategory(data);
      if (result.success) {
        toast({
          title: 'Успешно!',
          description: 'Категория сохранена.',
        });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error,
        });
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Непредвиденная ошибка',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Редактировать категорию' : 'Новая категория'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? `Вы редактируете категорию "${category.name}".`
              : 'Создайте новую категорию для постов.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Новости компании" {...field} />
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
                    <Input placeholder="company-news" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Сохранить
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export function CategoryDeleteButton({ categoryId }: { categoryId: string }) {
    const [isPending, startTransition] = React.useTransition();
    const router = useRouter();

    const handleDelete = () => {
        startTransition(async () => {
            try {
                const result = await deleteCategory(categoryId);
                 if (result.success) {
                    toast({
                    title: "Успешно!",
                    description: "Категория удалена.",
                    });
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
                });
            }
        });
    }
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button variant="ghost" size="icon" disabled={isPending}>
                    <Trash2 className="h-4 w-4"/>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Это действие нельзя отменить. Категория будет удалена навсегда. 
                        Посты в этой категории не будут удалены.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                         {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Удалить
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    )

}
