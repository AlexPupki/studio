'use server';

/**
 * @fileoverview Этот файл содержит серверные экшены (Server Actions)
 * для работы с каталогом услуг. Эти функции вызываются клиентскими
 * компонентами для получения данных или выполнения операций на сервере.
 */

import { createYclientsService } from '../yclients/yclients.service.server';
import { z } from 'zod';

const GetServicesSchema = z.object({
  branchId: z.number().int().positive('Branch ID должен быть положительным числом'),
});

/**
 * Получает список услуг для указанного филиала, используя сервис YCLIENTS.
 * 
 * @param params - Параметры для запроса.
 * @param params.branchId - ID филиала в YCLIENTS.
 * @returns Промис, который разрешается в объект с данными (услуги) или ошибкой.
 */
export async function getServicesAction(params: z.infer<typeof GetServicesSchema>) {
  try {
    const validation = GetServicesSchema.safeParse(params);
    if (!validation.success) {
      return { data: null, error: validation.error.flatten().fieldErrors };
    }

    // 1. Используем фабрику для получения сервиса
    const yclientsService = await createYclientsService();

    // 2. Вызываем метод сервиса
    const services = await yclientsService.getServices({ branchId: validation.data.branchId });

    return { data: services, error: null };
  } catch (err) {
    console.error('Ошибка в getServicesAction:', err);
    // Возвращаем стандартизированный ответ об ошибке
    return { data: null, error: { _server: ['Не удалось получить список услуг.'] } };
  }
}
