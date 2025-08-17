/**
 * @fileoverview Этот файл централизует управление feature-флагами в приложении.
 * Он читает переменные окружения и предоставляет типизированный и безопасный
 * способ проверки, включен ли тот или иной функционал.
 */

// Helper function to parse boolean-like values from environment variables
function getFlag(envVar: string | undefined, defaultValue: boolean): boolean {
  if (envVar === undefined) {
    return defaultValue;
  }
  return envVar === '1' || envVar.toLowerCase() === 'true';
}

export const features = {
  /**
   * Управляет доступом к личному кабинету клиента (`/account`).
   * @env FEATURE_ACCOUNT
   */
  account: getFlag(process.env.FEATURE_ACCOUNT, true),

  /**
   * Включает систему локализации (i18n), как минимум для RU/EN.
   * @env FEATURE_I18N
   */
  i18n: getFlag(process.env.FEATURE_I18N, true),

  /**
   * Определяет, используется ли реальный SMS-шлюз или заглушка (stub).
   * @env FEATURE_REAL_SMS
   */
  realSms: getFlag(process.env.FEATURE_REAL_SMS, false),

  /**
   * Включает отображение CAPTCHA после нескольких неудачных попыток входа.
   * @env FEATURE_CAPTCHA
   */
  captcha: getFlag(process.env.FEATURE_CAPTCHA, false),

  /**
   * Включает выпуск JWT токенов после успешной аутентификации для будущих API.
   * @env FEATURE_JWT_ISSUING
   */
  jwtIssuing: getFlag(process.env.FEATURE_JWT_ISSUING, false),
};
