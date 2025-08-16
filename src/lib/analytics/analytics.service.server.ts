'use server';

import { AnalyticsEventName, IAnalyticsService } from "./analytics.contracts";

/**
 * @fileoverview Этот файл содержит реализацию сервиса аналитики, который
 * отправляет структурированные логи в Google Cloud Logging.
 */

class AnalyticsService implements IAnalyticsService {
  
  /**
   * @inheritdoc
   */
  track(eventName: AnalyticsEventName, properties: Record<string, any>): void {
    // Google Cloud Logging автоматически распознает JSON-объекты,
    // выведенные в stdout, и делает их структурированными.
    // Мы добавляем поле 'severity', чтобы можно было легко фильтровать
    // именно наши бизнес-события от обычных логов.
    const logEntry = {
      severity: 'NOTICE', // Уровень лога для бизнес-событий
      event: eventName,
      properties: properties,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(logEntry));
  }
}


// --- Service Factory ---

let analyticsServiceInstance: IAnalyticsService | null = null;

/**
 * Фабричная функция для создания или получения единственного экземпляра сервиса аналитики.
 * @returns {Promise<IAnalyticsService>} Экземпляр сервиса аналитики.
 */
export async function createAnalyticsService(): Promise<IAnalyticsService> {
  if (analyticsServiceInstance) {
    return analyticsServiceInstance;
  }
  
  analyticsServiceInstance = new AnalyticsService();
  return analyticsServiceInstance;
}
