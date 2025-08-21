'use server';

import { z } from 'zod';
import {
  createIamService,
  createRateLimiter,
  createSessionService,
  createSmsProvider,
} from './auth.service.server';
import { normalizePhone } from '@/lib/shared/phone.utils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFeature, getEnv } from '../config.server';

// --- Сервисы ---
const iamService = createIamService();
const sessionService = createSessionService();
const smsProvider = createSmsProvider();
const rateLimiter = createRateLimiter();

// --- Схемы ---
const PhoneSchema = z
  .string()
  .transform((val) => normalizePhone(val) || '');

// --- Экшены ---

export async function requestLoginCode(phone: string) {
  const validatedPhone = PhoneSchema.safeParse(phone);

  if (!validatedPhone.success || !validatedPhone.data) {
    return { success: false, error: 'Неверный формат номера телефона.' };
  }
  const phoneE164 = validatedPhone.data;

  const rateLimitResult = await rateLimiter.check(
    `req_code:phone:${phoneE164}`
  );
  if (!rateLimitResult.success) {
    return {
      success: false,
      error: 'Слишком много запросов. Попробуйте позже.',
    };
  }

  try {
    const { code } = await iamService.createLoginCode(phoneE164);
    await smsProvider.send(phoneE164, `Ваш код для входа: ${code}`);

    return { success: true, phoneE164 };
  } catch (error) {
    console.error('RequestLoginCode Error:', error);
    return { success: false, error: 'Не удалось отправить код.' };
  }
}

const VerifyCodeInputSchema = z.object({
  phoneE164: z.string(),
  code: z.string(),
  redirectTo: z.string().nullable().optional(),
})

export async function verifyLoginCode(input: z.infer<typeof VerifyCodeInputSchema>) {
  const rateLimitResult = await rateLimiter.check(
    `verify:phone:${input.phoneE164}`
  );
  if (!rateLimitResult.success) {
    return {
      success: false,
      error: 'Слишком много попыток. Попробуйте запросить код снова.',
    };
  }

  const result = await iamService.verifyLoginCode(input);

  if (!result.success) {
    return { success: false, error: 'Неверный код или срок действия кода истек.' };
  }

  const session = await sessionService.create(result.user.id);
  const cookie = sessionService.serialize(session);

  cookies().set(cookie.name, cookie.value, cookie.options);

  return { success: true, redirectTo: input.redirectTo || '/account' };
}


export async function getCurrentUser() {
    if (!getFeature('FEATURE_ACCOUNT')) {
        return null;
    }
    const cookieName = getEnv('COOKIE_NAME');
    const cookieValue = cookies().get(cookieName)?.value;
    if (!cookieValue) return null;

    const session = await sessionService.read(cookieValue);
    if (!session?.userId) return null;
    
    // In a real app, you'd probably want to re-fetch the user from the DB
    // to ensure the data is fresh. For MVP, we trust the session.
    const user = await iamService.findUserById(session.userId);
    
    return user;
}

export async function logout() {
    const cookieName = getEnv('COOKIE_NAME');
    const cookieValue = cookies().get(cookieName)?.value;
    if (cookieValue) {
        await sessionService.revoke(cookieValue);
    }
    // Clear the cookie by setting it with an expired date
    cookies().set(cookieName, '', { expires: new Date(0), path: '/' });

    redirect('/login');
}
