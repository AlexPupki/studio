# Руководство по Системе Логирования

Этот документ описывает архитектуру и правила использования встроенной системы логирования в приложении.

## 1. Архитектура

Система состоит из трех основных компонентов:

*   **Сервис Логгера (`src/lib/logger.ts`)**:
    *   **Основа**: Центральный модуль, предоставляющий `logger`.
    *   **Уровни**: Поддерживает уровни: `error`, `warn`, `info`, `debug`. Управляется переменной `.env` `LOG_LEVEL`.
    *   **Вывод**: Пишет одновременно в консоль сервера и в файл `/public/debug.log`.
    *   **Формат**: Может выводить как обычный текст, так и `json` (управляется `LOG_FORMAT` в `.env`).
    *   **Возможности**: Поддерживает категории для контекста и замеры производительности.

*   **Серверные Экшены (`src/lib/actions/log.actions.ts`)**:
    *   `getLogsAction()`: Читает файл `debug.log` и возвращает его содержимое и размер для отображения в UI.
    *   `clearLogsAction()`: Полностью очищает файл `debug.log`.

*   **Интерфейс Администратора (`src/app/dashboard/logs/page.tsx`)**:
    *   **Доступ**: Страница доступна только пользователям с ролью `Admin`.
    *   **Функционал**:
        *   Просмотр, обновление, очистка (с подтверждением) и фильтрация логов.
        *   Отображение текущего размера файла `debug.log`.
        *   Возможность включить автоматическую очистку файла, если его размер превышает установленный лимит (например, 5 МБ).

## 2. Как использовать логгер

### Основные правила

1.  **Импорт**: Всегда импортируйте главный инстанс логгера из `@/lib/logger`.
    ```typescript
    import { logger } from '@/lib/logger';
    ```
2.  **Категории**: Для каждого "модуля" или файла создавайте свой экземпляр логгера с категорией. Это делает логи легко фильтруемыми.
    ```typescript
    // Пример из storage.service.ts
    const storageLogger = logger.withCategory('STORAGE_SERVICE');
    ```
3.  **Уровни**: Используйте правильный уровень для каждого события.
    *   `logger.error()`: Для критических ошибок, которые ломают функционал (например, падение API). Всегда передавайте объект ошибки.
    *   `logger.warn()`: Для некритичных, но неожиданных ситуаций (например, API вернуло пустой ответ, не найден файл).
    *   `logger.info()`: Для ключевых бизнес-событий (например, "Пользователь Х создал встречу", "Запущена обработка файла").
    *   `logger.debug()`: Для подробной технической информации, полезной при отладке (например, "Создан сервис с конфигом...", "Отправлен запрос к API...").

### Примеры использования

#### Информирование и отладка в сервисе
```typescript
// src/lib/services/storage.service.ts

// ...
const storageLogger = logger.withCategory('STORAGE_SERVICE');

export async function getFromStorage(key: string): Promise<string> {
    if (!S3_BUCKET_NAME) throw new Error('S3_BUCKET_NAME is not configured.');
    
    const params = { Bucket: S3_BUCKET_NAME, Key: key };
    
    // DEBUG-уровень для технической информации
    storageLogger.debug('Fetching from storage...', { key, bucket: S3_BUCKET_NAME });
    
    try {
        const result = await s3.getObject(params).promise();
        // INFO-уровень для важных успешных событий
        storageLogger.info('Successfully fetched from storage.', { key });
        return result.Body?.toString('utf-8') || '';
    } catch (error) {
        // ERROR-уровень для всех ошибок
        storageLogger.error(`Failed to fetch from S3 for key ${key}`, error);
        throw new Error(`S3 fetch failed: ${(error as Error).message}`);
    }
}
```

#### Логирование ошибок
```typescript
try {
  // ... какой-то код, который может выбросить ошибку
} catch (error: any) {
  logger.error('Failed to process meeting', error);
}

// В логе (text):
// [2025-07-25T10:05:00.000Z] [ERROR] [APP] Failed to process meeting
// { "error": { "message": "API key is invalid", "stack": [...] } }
```

#### Замер производительности
Используйте для измерения времени выполнения критически важных операций.
```typescript
const operationId = `process-${file.name}`;
logger.time(operationId);

// ... длительная операция ...

logger.info(`Processing finished for ${file.name}.`);
logger.timeEnd(operationId);

// В логе (text):
// [2025-07-25T10:10:00.000Z] [INFO] [APP] Processing finished for large_file.mp3.
// [2025-07-25T10:10:00.000Z] [DEBUG] [APP] process-large_file.mp3 took 5432ms
```
---
**Вывод:** Текущая реализация системы логирования является завершенной и соответствует лучшим практикам. Она предоставляет все необходимые инструменты для эффективной отладки и мониторинга приложения.
