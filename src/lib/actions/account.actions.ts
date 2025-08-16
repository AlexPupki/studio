'use server';

/**
 * @fileoverview Этот файл содержит серверные экшены (Server Actions)
 * для работы с личным кабинетом пользователя.
 */

import { z } from 'zod';
import { createYclientsService } from '../yclients/yclients.service.server';
import { createDbService } from '../database/db.service.server';
import { ClubMember } from '../database/db.contracts';
import { YcRecord } from '../yclients/yclients.contracts';

const actionError = { _server: ['Произошла внутренняя ошибка. Попробуйте позже.'] };

interface AccountDetails {
    clubMember: ClubMember;
    records: YcRecord[];
}

const GetAccountDetailsSchema = z.object({
  phone: z.string().min(10, 'Телефон обязателен'),
});

/**
 * Получает всю информацию для личного кабинета пользователя.
 * Агрегирует данные из нашей БД (статус, бонусы) и из YCLIENTS (история записей).
 * @param params - Параметры, содержащие телефон пользователя.
 */
export async function getAccountDetailsAction(
  params: z.infer<typeof GetAccountDetailsSchema>
): Promise<{ data: AccountDetails | null; error: Record<string, any> | null }> {
  try {
    const validation = GetAccountDetailsSchema.safeParse(params);
    if (!validation.success) {
      return { data: null, error: validation.error.flatten().fieldErrors };
    }

    const { phone } = validation.data;

    // 1. Инициализируем оба сервиса
    const dbService = await createDbService();
    const yclientsService = await createYclientsService();

    // 2. Находим пользователя в нашей базе данных
    const clubMember = await dbService.findMemberByPhone(phone);
    if (!clubMember) {
      return { data: null, error: { _server: ['Член клуба с таким телефоном не найден.'] } };
    }

    // 3. Находим его записи в YCLIENTS по ID
    const records = await yclientsService.getClientRecords(clubMember.yclientsClientId);

    // 4. Комбинируем данные и возвращаем
    const accountDetails: AccountDetails = {
      clubMember,
      records,
    };

    return { data: accountDetails, error: null };

  } catch (err) {
    console.error('Ошибка в getAccountDetailsAction:', err);
    return { data: null, error: actionError };
  }
}
