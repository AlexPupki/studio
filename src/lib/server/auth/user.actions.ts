'use server';

import { z } from 'zod';
import {
  createIamService,
  createRateLimiter,
  createSmsProvider,
} from './auth.service.server';
import { normalizePhone } from '@/lib/shared/phone.utils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFeature, getEnv } from '../config.server';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from '@/lib/shared/iam.contracts';

const iamService = createIamService();
const smsProvider = createSmsProvider();
const rateLimiter = createRateLimiter();

const PhoneSchema = z.string().transform((val) => normalizePhone(val) || '');

async function getJwtSecretKey() {
    const secret = getEnv('JWT_SECRET');
    if (!secret) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    return new TextEncoder().encode(secret);
}

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
});

export async function verifyLoginCode(
  input: z.infer<typeof VerifyCodeInputSchema>
) {
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

  if (!result.success || !result.user) {
    return {
      success: false,
      error: 'Неверный код или срок действия кода истек.',
    };
  }

  // Create JWT
  const secretKey = await getJwtSecretKey();
  const token = await new SignJWT({ sub: result.user.id, roles: result.user.roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${getEnv('SESSION_TTL_DAYS')}d`)
    .sign(secretKey);

  cookies().set(getEnv('COOKIE_NAME'), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(Date.now() + getEnv('SESSION_TTL_DAYS') * 24 * 60 * 60 * 1000),
    sameSite: 'lax',
  });

  return { success: true, redirectTo: input.redirectTo || '/account' };
}

export async function getCurrentUser(): Promise<User | null> {
  if (!getFeature('FEATURE_ACCOUNT')) {
    return null;
  }
  const cookieStore = cookies();
  const cookieName = getEnv('COOKIE_NAME');
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  try {
      const secretKey = await getJwtSecretKey();
      const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });
      if (!payload.sub) return null;
      const user = await iamService.findUserById(payload.sub);
      return user;
  } catch (e) {
      return null;
  }
}

export async function logout() {
  const cookieName = getEnv('COOKIE_NAME');
  cookies().set(cookieName, '', { expires: new Date(0), path: '/' });
  redirect('/login');
}
