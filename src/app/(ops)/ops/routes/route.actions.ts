
'use server';

import { z } from 'zod';
import { db } from '@/lib/server/db';
import { routes } from '@/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const RouteFormSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title_ru: z.string().min(3),
  slug: z.string().min(3),
  description_ru: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]),
  basePriceMinor: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
});

type RouteFormValues = z.infer<typeof RouteFormSchema>;

export async function saveRoute(data: RouteFormValues) {
  const validatedFields = RouteFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Ошибка валидации данных.',
    };
  }
  
  const { id, title_ru, slug, description_ru, status, basePriceMinor, durationMinutes } = validatedFields.data;

  try {
    if (id) {
      // Update existing route
      await db.update(routes).set({
        title: { ru: title_ru },
        slug,
        description: { ru: description_ru || '' },
        status,
        basePriceMinor: basePriceMinor * 100, // convert to minor units
        durationMinutes,
        updatedAt: new Date(),
      }).where(eq(routes.id, id));
    } else {
      // Create new route
       await db.insert(routes).values({
        title: { ru: title_ru },
        slug,
        description: { ru: description_ru || '' },
        status,
        basePriceMinor: basePriceMinor * 100,
        durationMinutes,
      });
    }

    revalidatePath('/ops/routes');
    revalidatePath(`/routes/${slug}`);
    revalidatePath('/routes');
    revalidatePath('/');

    return { success: true };
  } catch (e: any) {
    // Check for unique constraint violation on slug
    if (e.code === '23505' && e.constraint.includes('slug')) {
        return {
            success: false,
            error: 'Маршрут с таким слагом (URL) уже существует. Пожалуйста, выберите другой.',
        }
    }
    console.error('Failed to save route:', e);
    return {
      success: false,
      error: 'Произошла ошибка на сервере. Не удалось сохранить маршрут.',
    };
  }
}
