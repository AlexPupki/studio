
'use server';

import { z } from 'zod';
import { db } from '@/lib/server/db';
import { posts } from '@/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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

export async function savePost(data: PostFormValues) {
  const validatedFields = PostFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Ошибка валидации данных.',
    };
  }
  
  const { id, ...postData } = validatedFields.data;

  try {
    if (id) {
      // Update existing post
      await db.update(posts).set({
        ...postData,
        updatedAt: new Date(),
      }).where(eq(posts.id, id));
    } else {
      // Create new post
       await db.insert(posts).values({
        ...postData,
      });
    }

    revalidatePath('/ops/content/posts');
    revalidatePath(`/blog`);
    if(postData.slug) {
        revalidatePath(`/blog/${postData.slug}`);
    }

    return { success: true };
  } catch (e: any) {
    // Check for unique constraint violation on slug
    if (e.code === '23505' && e.constraint.includes('slug')) {
        return {
            success: false,
            error: 'Пост с таким слагом (URL) уже существует. Пожалуйста, выберите другой.',
        }
    }
    console.error('Failed to save post:', e);
    return {
      success: false,
      error: 'Произошла ошибка на сервере. Не удалось сохранить пост.',
    };
  }
}
