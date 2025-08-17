'use server';
/**
 * @fileoverview Определяет интерфейс для отправки SMS и его реализации.
 */

export interface ISmsProvider {
  /**
   * Отправляет код подтверждения на указанный номер телефона.
   * @param phoneE164 - Номер телефона в формате E.164.
   * @param code - Код для отправки.
   */
  sendCode(phoneE164: string, code: string): Promise<void>;
}

/**
 * Реализация-заглушка, которая просто выводит код в консоль сервера.
 * Используется для разработки и тестирования.
 */
class StubSmsProvider implements ISmsProvider {
  async sendCode(phoneE164: string, code: string): Promise<void> {
    console.log(`\n--- SMS STUB ---`);
    console.log(`To: ${phoneE164}`);
    console.log(`Code: ${code}`);
    console.log(`---------------\n`);
    return Promise.resolve();
  }
}

/**
 * TODO: Реализация для настоящего SMS-шлюза (например, Twilio, Vonage, etc.)
 */
class RealSmsProvider implements ISmsProvider {
  async sendCode(phoneE164: string, code: string): Promise<void> {
    // Здесь будет логика для отправки SMS через реальный сервис
    console.log(`[RealSmsProvider] Sending code to ${phoneE164} (not implemented)`);
    // throw new Error('RealSmsProvider is not implemented yet.');
    return Promise.resolve();
  }
}


// --- Service Factory ---

import { features } from './config';

let smsProviderInstance: ISmsProvider | null = null;

export async function createSmsProvider(): Promise<ISmsProvider> {
  if (smsProviderInstance) {
    return smsProviderInstance;
  }

  if (features.realSms) {
    console.log('Initializing RealSmsProvider...');
    smsProviderInstance = new RealSmsProvider();
  } else {
    console.log('Initializing StubSmsProvider...');
    smsProviderInstance = new StubSmsProvider();
  }

  return smsProviderInstance;
}
