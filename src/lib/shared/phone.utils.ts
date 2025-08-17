// This file is safe to import on the client and server.

/**
 * Normalizes a phone number to E.164 format.
 * @param phone The phone number to normalize.
 * @returns The normalized phone number in E.164 format, or null if invalid.
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return null;
  }
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.startsWith('+')) {
      return digits;
  }
  return null;
}

/**
 * Masks a phone number, showing only the first characters of the country code
 * and the last two digits.
 * Example: +79261234567 -> +7 (***) ***-**-67
 * @param phoneE164 The phone number in E.164 format.
 * @returns The masked phone number.
 */
export function maskPhone(phoneE164: string): string {
    if (!phoneE164 || phoneE164.length < 12) {
        return 'Неверный номер';
    }
    const countryCode = phoneE164.slice(0, 2); // +7
    const lastTwo = phoneE164.slice(-2);
    return `${countryCode} (***) ***-**-${lastTwo}`;
}
