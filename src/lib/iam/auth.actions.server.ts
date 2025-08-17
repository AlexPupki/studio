'use server';

/**
 * @fileoverview Этот файл содержит серверные экшены (Server Actions)
 * для процесса аутентификации.
 *
 * @see /docs/stage_1_playbook.md
 *
 * ## Контракты экшенов
 *
 * ### Запрос кода
 * `requestLoginCode(input: RequestLoginCodeInput): Promise<RequestLoginCodeOutput>`
 * - Input: `{ phoneE164: string, locale?: 'ru'|'en', captchaToken?: string }`
 * - Output: `{ requestId: string, cooldownSec: number }`
 *
 * ### Проверка кода
 * `verifyLoginCode(input: VerifyLoginCodeInput): Promise<VerifyLoginCodeOutput>`
 * - Input: `{ phoneE164: string, code: string, requestId?: string }`
 * - Output: `{ sessionId: string, jwt?: string }` (jwt при `FEATURE_JWT_ISSUING=true`)
 *
 * ### Выход из системы
 * `logout(): Promise<void>`
 */

// TODO: Реализовать экшены requestLoginCode, verifyLoginCode, logout
