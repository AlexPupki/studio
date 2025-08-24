# Обзор NPM-скриптов

Этот документ предоставляет ясный обзор секций `scripts` из всех `package.json` файлов в проекте. Он объясняет назначение каждого скрипта и то, как они работают вместе для создания стабильного и предсказуемого окружения для разработки.

## 1. Корневой `package.json`

Этот файл выступает как главный дирижер для всего проекта. Его скрипты спроектированы для управления воркспейсами (`apps/web` и `apps/cms`) надежным способом, используя Node.js-раннер для предотвращения проблем с аргументами командной строки.

```json
{
  "scripts": {
    "dev": "node scripts/dev-web.mjs",
    "dev:web": "node scripts/dev-web.mjs",
    "dev:cms": "pnpm run dev --workspace apps/cms",
    "dev:all": "npm-run-all --parallel dev:web dev:cms",
    "build": "pnpm run build --workspaces",
    "start": "pnpm run start --workspace apps/web"
  }
}
```

- **`dev`**: Основной скрипт для среды предпросмотра Firebase Studio. Он по умолчанию запускает веб-приложение, используя кастомный раннер.
- **`dev:web`**: Этот скрипт — ключ к нашей стабильной настройке. Он выполняет выделенный Node.js скрипт (`scripts/dev-web.mjs`), который корректно обрабатывает аргументы и запускает сервер Next.js с правильным портом и хостом. Это полностью изолирует его от любых аргументов, передаваемых родительской средой.
- **`dev:cms`**: Стандартная команда для запуска воркспейса Payload CMS.
- **`dev:all`**: Утилитарный скрипт для локальной разработки, который запускает и веб-приложение, и CMS параллельно.

## 2. `apps/web/package.json`

Скрипты Next.js-приложения теперь предельно просты, так как вся сложность инкапсулирована в раннере в корне проекта.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

- **`dev`**: Просто запускает сервер для разработки Next.js. Он ожидает, что порт и хост будут предоставлены окружением, что и делает наш раннер `dev-web.mjs`.

## 3. `apps/cms/package.json`

Скрипты приложения Payload CMS также прямолинейны.

```json
{
  "scripts": {
    "dev": "payload dev",
    "build": "PAYLOAD_CONFIG_PATH=src/payload.config.ts payload build",
    "start": "PAYLOAD_CONFIG_PATH=dist/payload.config.js NODE_ENV=production node dist/server.js"
  }
}
```

- **`dev`**: Запускает сервер для разработки Payload CMS. Он настроен на запуск на отдельном порту, определенном в `.env` файле (`PORT_CMS`).
