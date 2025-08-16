'use server';

/**
 * @fileoverview Этот файл содержит серверные экшены (Server Actions)
 * для работы с каталогом услуг. Эти функции вызываются клиентскими
 * компонентами для получения данных или выполнения операций на сервере.
 */

import { createYclientsService } from '../yclients/yclients.service.server';
import { z } from 'zod';
import { YcClient } from '../yclients/yclients.contracts';

const actionError = { _server: ['Произошла внутренняя ошибка. Попробуйте позже.'] };

// --- Get Services ---

const GetServicesSchema = z.object({
  branchId: z.number().int().positive('Branch ID должен быть положительным числом'),
});

export async function getServicesAction(params: z.infer<typeof GetServicesSchema>) {
  try {
    const validation = GetServicesSchema.safeParse(params);
    if (!validation.success) {
      return { data: null, error: validation.error.flatten().fieldErrors };
    }

    const yclientsService = await createYclientsService();
    const services = await yclientsService.getServices({ branchId: validation.data.branchId });

    return { data: services, error: null };
  } catch (err) {
    console.error('Ошибка в getServicesAction:', err);
    return { data: null, error: actionError };
  }
}

// --- Get Available Slots ---

const GetAvailableSlotsSchema = z.object({
    branchId: z.number().int(),
    staffId: z.number().int(),
    serviceId: z.number().int(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),
});

export async function getAvailableSlotsAction(params: z.infer<typeof GetAvailableSlotsSchema>) {
    try {
        const validation = GetAvailableSlotsSchema.safeParse(params);
        if (!validation.success) {
            return { data: null, error: validation.error.flatten().fieldErrors };
        }

        const yclientsService = await createYclientsService();
        const slots = await yclientsService.getAvailableSlots(validation.data);

        return { data: slots, error: null };
    } catch (err) {
        console.error('Ошибка в getAvailableSlotsAction:', err);
        return { data: null, error: actionError };
    }
}


// --- Create Booking Request ---

const CreateBookingRequestSchema = z.object({
    branchId: z.number().int(),
    staffId: z.number().int(),
    serviceId: z.number().int(),
    serviceTitle: z.string(),
    datetime: z.string().datetime('Дата и время должны быть в формате ISO 8601'),
    client: z.object({
        name: z.string().min(2, 'Имя обязательно'),
        phone: z.string().min(10, 'Телефон обязателен'),
        email: z.string().email('Неверный формат email').optional(),
    }),
});

export async function createBookingRequestAction(params: z.infer<typeof CreateBookingRequestSchema>) {
    try {
        const validation = CreateBookingRequestSchema.safeParse(params);
        if (!validation.success) {
            return { data: null, error: validation.error.flatten().fieldErrors };
        }
        
        const { client: clientData, serviceTitle, datetime } = validation.data;
        const yclientsService = await createYclientsService();

        // 1. Найти или создать клиента
        let client: YcClient | null = await yclientsService.findClientByPhone(clientData.phone);
        if (!client) {
            client = await yclientsService.createClient(clientData);
        }
        if (!client) {
            // Этого не должно случиться, если API работает корректно
            throw new Error('Failed to find or create a client in YCLIENTS');
        }

        // 2. Сформировать комментарий для заявки
        const requestDate = new Date(datetime).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const comment = `[GTS-APP] Новая заявка от ${clientData.name} (${clientData.phone}). Услуга: "${serviceTitle}". Желаемое время: ${requestDate}.`;
        
        // 3. Обновить комментарий клиента в YCLIENTS
        await yclientsService.updateClientComment(client.id, comment);

        return { data: { success: true, clientId: client.id }, error: null };

    } catch (err) {
        console.error('Ошибка в createBookingRequestAction:', err);
        return { data: null, error: actionError };
    }
}
