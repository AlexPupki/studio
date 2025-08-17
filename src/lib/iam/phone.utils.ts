'use server';

/**
 * @fileoverview Утилиты для работы с номерами телефонов.
 */

/**
 * Нормализует номер телефона к формату E.164.
 * @param phone - Номер телефона в произвольном формате.
 * @returns {string | null} - Нормализованный номер или null, если формат неверный.
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10) {
    return null;
  }
  
  // Если номер начинается с 7 или 8 и имеет 11 цифр (Россия/Казахстан)
  if ((digits.startsWith('7') || digits.startsWith('8')) && digits.length === 11) {
    return `+7${digits.substring(1)}`;
  }
  
  // Если номер 10 цифр (без кода страны, предполагаем Россию)
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  
  // Для других номеров просто добавляем +
  if (digits.length > 10) {
      return `+${digits}`;
  }

  return null;
}

/**
 * Маскирует номер телефона для безопасного отображения.
 * @param phoneE164 - Номер телефона в формате E.164.
 * @returns {string} - Маскированный номер.
 */
export function maskPhone(phoneE164: string): string {
    if (!phoneE164 || phoneE164.length < 12) {
        return 'Неверный номер';
    }
    const countryCode = phoneE164.slice(0, -10);
    const areaCode = phoneE164.slice(-10, -7);
    const lastDigits = phoneE164.slice(-2);
    
    return `${countryCode} (${areaCode}) ***-**-${lastDigits}`;
}
