'use server';

import { z } from 'zod';
import { db } from '@/lib/server/db';
import { categories } from '@/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const CategoryFormSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Название должно быть не короче 2 символов'),
  slug: z.string().min(2, 'Слаг должен быть не короче 2 символов').regex(/^[a-z0-9-]+$/, 'Слаг может содержать только строчные буквы, цифры и дефисы'),
});

type CategoryFormValues = z.infer<typeof CategoryFormSchema>;

export async function saveCategory(data: CategoryFormValues) {
  const validatedFields = CategoryFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Ошибка валидации данных.',
    };
  }
  
  const { id, ...categoryData } = validatedFields.data;

  try {
    if (id) {
      // Update existing category
      await db.update(categories).set({
        ...categoryData,
      }).where(eq(categories.id, id));
    } else {
      // Create new category
       await db.insert(categories).values({
        ...categoryData,
      });
    }

    revalidatePath('/ops/content/categories');
    revalidatePath('/ops/content/posts'); // Revalidate posts page in case category is shown there

    return { success: true };
  } catch (e: any) {
    if (e.code === '23505' && e.constraint.includes('slug')) {
        return {
            success: false,
            error: 'Категория с таким слагом (URL) уже существует.',
        }
    }
    console.error('Failed to save category:', e);
    return {
      success: false,
      error: 'Произошла ошибка на сервере. Не удалось сохранить категорию.',
    };
  }
}

export async function deleteCategory(id: string) {
    if(!id) {
         return {
            success: false,
            error: 'Не указан ID категории',
        }
    }
    try {
        await db.delete(categories).where(eq(categories.id, id));
        revalidatePath('/ops/content/categories');
        revalidatePath('/ops/content/posts');
        return { success: true };
    } catch(e: any) {
        console.error('Failed to delete category:', e);
        return {
            success: false,
            error: 'Не удалось удалить категорию. Возможно, она используется в постах.'
        }
    }
}
