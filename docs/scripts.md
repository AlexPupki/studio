# Обзор NPM-скриптов

Этот документ предоставляет ясный обзор секций `scripts` из всех `package.json` файлов в проекте. Он объясняет назначение каждого скрипта и то, как они работают вместе для создания стабильного и предсказуемого окружения для разработки.

## 1. Философия запуска

Мы используем выделенные Node.js-скрипты-раннеры (в директории `scripts/`), чтобы избежать проблем с передачей аргументов командной строки (`--port`, `--hostname`) от среды разработки (например, Firebase Studio) напрямую в `next dev` или `payload dev`. Этот подход гарантирует, что наши приложения всегда запускаются с предсказуемыми и правильными параметрами, которые задаются в файле `.env`.

## 2. Корневой `package.json`

Этот файл выступает как главный дирижер для всего проекта. Его скрипты запускают наши кастомные раннеры.

```json
{
  "name": "gts-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "node scripts/dev-all.mjs",
    "dev:web": "node scripts/dev-web.mjs",
    "dev:cms": "node scripts/dev-cms.mjs",
    "build": "npm run -w apps/web build && npm run -w apps/cms build",
    "start": "npm run -w apps/web start"
  },
  "workspaces": [
    "apps/*"
  ]
}
```

- **`dev`**: Основной скрипт для среды предпросмотра Firebase Studio. Он выполняет `scripts/dev-all.mjs`, который параллельно запускает и веб-приложение, и CMS.
- **`dev:web`**: Запускает только Next.js приложение через раннер `scripts/dev-web.mjs`.
- **`dev:cms`**: Запускает только Payload CMS через раннер `scripts/dev-cms.mjs`.
- **`build` / `start`**: Стандартные команды для сборки и запуска production-версии соответствующего приложения.

## 3. `apps/web/package.json`

Скрипты Next.js-приложения максимально просты. Вся сложность инкапсулирована в раннере.

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

- **`dev`**: Просто запускает сервер для разработки Next.js. Он ожидает, что порт и хост будут предоставлены окружением, что и делает наш раннер `scripts/dev-web.mjs`.

## 4. `apps/cms/package.json`

Скрипты приложения Payload CMS также прямолинейны.

```json
{
  "name": "cms",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "payload dev",
    "build": "PAYLOAD_CONFIG_PATH=src/payload.config.ts payload build",
    "start": "PAYLOAD_CONFIG_PATH=dist/payload.config.js NODE_ENV=production node dist/server.js"
  }
}
```

- **`dev`**: Запускает сервер для разработки Payload CMS. Раннер `scripts/dev-cms.mjs` обеспечивает его запуск на правильном порту, определенном в `.env` файле (`PORT_CMS`).
