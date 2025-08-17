/**
 * @fileoverview Определяет интерфейс для rate-limiter и его реализации.
 */

export interface IRateLimiter {
  /**
   * Проверяет, превышен ли лимит для данного ключа.
   * @param key - Уникальный ключ (например, IP-адрес или номер телефона).
   * @returns `true`, если лимит превышен, иначе `false`.
   */
  isLimited(key: string): Promise<boolean>;
}

/**
 * TODO: In-memory реализация для разработки.
 * ВНИМАНИЕ: Не подходит для продакшена с несколькими инстансами.
 */
class InMemoryRateLimiter implements IRateLimiter {
    // Временная реализация-заглушка
    async isLimited(key: string): Promise<boolean> {
        console.log(`[InMemoryRateLimiter] Checking limit for ${key} (not implemented)`);
        return false;
    }
}


/**
 * TODO: Реализация на основе Redis для продакшена.
 */
class RedisRateLimiter implements IRateLimiter {
    async isLimited(key: string): Promise<boolean> {
        console.log(`[RedisRateLimiter] Checking limit for ${key} (not implemented)`);
        return false;
    }
}


// --- Service Factory ---

let rateLimiterInstance: IRateLimiter | null = null;

export async function createRateLimiter(): Promise<IRateLimiter> {
  if (rateLimiterInstance) {
    return rateLimiterInstance;
  }

  // TODO: В будущем здесь будет выбор реализации на основе env (например, наличие REDIS_URL)
  console.log('Initializing InMemoryRateLimiter...');
  rateLimiterInstance = new InMemoryRateLimiter();

  return rateLimiterInstance;
}
