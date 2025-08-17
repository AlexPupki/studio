'use server';

import 'server-only';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { features } from './config';
import { createIamService } from './iam.service.server';
import { normalizePhone } from './phone.utils';
import { createRateLimiter } from './rate-limiter.service.server';
import { createSessionService } from './session.service.server';

/**
 * @fileoverview Этот файл содержит серверные экшены (Server Actions)
 * для процесса аутентификации.
 * @see /docs/stage_1_playbook.md
 */

const RequestLoginCodeInputSchema = z.object({
  phoneE164: z.string(),
  // locale: z.enum(['ru', 'en']).optional(),
  // captchaToken: z.string().optional(),
});
export type RequestLoginCodeInput = z.infer<typeof RequestLoginCodeInputSchema>;

export async function requestLoginCodeAction(
  input: RequestLoginCodeInput
): Promise<{ data: { cooldownSec: number } | null; error: string | null }> {
  try {
    const { phoneE164 } = RequestLoginCodeInputSchema.parse(input);

    const rateLimiter = await createRateLimiter();
    // TODO: Получать IP из запроса
    if (await rateLimiter.isLimited(`req_code:phone:${phoneE164}`)) {
      return { data: null, error: 'Слишком много запросов. Попробуйте позже.' };
    }

    const iamService = await createIamService();
    const result = await iamService.requestLoginCode(phoneE164);

    if (!result.success) {
      return { data: null, error: result.error };
    }
    
    return { data: { cooldownSec: 60 }, error: null };

  } catch (error) {
    console.error('requestLoginCodeAction error:', error);
    return { data: null, error: 'Произошла непредвиденная ошибка.' };
  }
}

const VerifyLoginCodeInputSchema = z.object({
  phoneE164: z.string(),
  code: z.string().length(6, 'Код должен состоять из 6 цифр'),
});
export type VerifyLoginCodeInput = z.infer<typeof VerifyLoginCodeInputSchema>;

export async function verifyLoginCodeAction(
  input: VerifyLoginCodeInput
): Promise<{ data: { sessionId: string } | null; error: string | null }> {
   try {
    const { phoneE164, code } = VerifyLoginCodeInputSchema.parse(input);

    const iamService = await createIamService();
    const result = await iamService.verifyLoginCode(phoneE164, code);
    
    if (!result.success) {
      return { data: null, error: result.error };
    }
    
    const { user, loginCode } = result;

    const sessionService = await createSessionService();
    const session = await sessionService.createSession(user.id);
    const sealedSession = await sessionService.sealSession(session);

    cookies().set(process.env.COOKIE_NAME || 'gts.sid', sealedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: (parseInt(process.env.SESSION_TTL_DAYS || '30', 10)) * 86400,
    });
    
    return { data: { sessionId: session.id }, error: null };

  } catch (error) {
    console.error('verifyLoginCodeAction error:', error);
    return { data: null, error: 'Произошла непредвиденная ошибка.' };
  }
}

export async function logoutAction(): Promise<void> {
  const cookieName = process.env.COOKIE_NAME || 'gts.sid';
  const cookieValue = cookies().get(cookieName)?.value;

  if (cookieValue) {
    const sessionService = await createSessionService();
    // Попытаться расшифровать и инвалидировать сессию на сервере
    try {
        const session = await sessionService.unsealSession(cookieValue);
        if (session) {
            await sessionService.revokeSession(session.id);
        }
    } catch (error) {
        console.warn('Could not revoke session on logout:', error);
    }
  }

  // В любом случае удалить куку у клиента
  cookies().delete(cookieName);
}
