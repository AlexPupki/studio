# Обзор NPM-скриптов (v2: Node.js Runners)

**Версия: 2.0.0**

Этот документ предоставляет ясный обзор секций `scripts` из всех `package.json` файлов в проекте. Он объясняет назначение каждого скрипта и то, как они работают вместе для создания стабильного и предсказуемого окружения для разработки.

## 1. Философия запуска: Node.js Раннеры

Мы используем выделенные Node.js-скрипты-раннеры (в директории `scripts/`), чтобы решить две ключевые проблемы:
1.  **Проблема "хвостовых аргументов"**: Среда разработки (например, Firebase Studio) может добавлять свои флаги (`--port`, `--hostname`) при вызове `npm run dev`. Наши раннеры перехватывают эти аргументы и не дают им сломать дочерние процессы (`next dev`, `payload dev`).
2.  **Независимость от пакетного менеджера**: Раннеры напрямую вызывают бинарные файлы `next` и `payload` из `node_modules`, не полагаясь на то, установлен ли в системе `pnpm` или `npm`.

Этот подход гарантирует, что наши приложения всегда запускаются с предсказуемыми и правильными параметрами, которые задаются в файле `.env`.

---

## 2. Скрипты и их содержимое

### 2.1. Корневой `package.json`

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
    "start": "npm run -w apps/web start",
    "lint": "pnpm run lint --workspace apps/web",
    "typecheck": "pnpm run typecheck --workspaces --if-present",
    "db:generate": "pnpm run db:generate --workspace apps/web",
    "db:migrate": "pnpm run db:migrate --workspace apps/web",
    "db:seed": "pnpm run db:seed --workspace apps/web",
    "test": "pnpm run test --workspace apps/web",
    "test:watch": "pnpm run test:watch --workspace apps/web",
    "test:e2e": "pnpm run test:e2e --workspace apps/web",
    "cms:generate:types": "pnpm run generate:types --workspace apps/cms"
  },
  "devDependencies": {
    "dotenv": "^16.4.5",
    "npm-run-all": "^4.1.5",
    "typescript": "^5"
  },
  "dependencies": {},
  "workspaces": [
    "apps/*"
  ]
}
```

-   **`dev`**: Основной скрипт. Запускает `scripts/dev-all.mjs`, который параллельно запускает и веб-приложение, и CMS.
-   **`dev:web`**: Запускает только Next.js приложение через раннер `scripts/dev-web.mjs`.
-   **`dev:cms`**: Запускает только Payload CMS через раннер `scripts/dev-cms.mjs`.

---

### 2.2. `apps/web/package.json`

Скрипты Next.js-приложения максимально просты. Вся сложность инкапсулирована в раннере.

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx -r dotenv/config src/lib/server/db/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.623.0",
    "@aws-sdk/s3-request-presigner": "^3.623.0",
    "@genkit-ai/googleai": "^1.14.1",
    "@genkit-ai/next": "^1.14.1",
    "@hookform/resolvers": "^4.1.3",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-menubar": "^1.1.6",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-radio-group": "^1.2.3",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.32.1",
    "embla-carousel-react": "^8.6.0",
    "firebase": "^11.9.1",
    "firebase-admin": "^12.3.0",
    "genkit": "^1.14.1",
    "input-otp": "^1.2.4",
    "ioredis": "^5.4.1",
    "jose": "^5.6.3",
    "lucide-react": "^0.475.0",
    "next": "15.3.3",
    "pg": "^8.12.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "recharts": "^2.15.1",
    "tailwind-merge": "^3.0.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.3",
    "@testing-library/react": "^16.0.0",
    "@types/ioredis": "^5.0.0",
    "@types/pg": "^8.11.6",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^4.3.1",
    "drizzle-kit": "^0.23.0",
    "genkit-cli": "^1.14.1",
    "jsdom": "^24.1.1",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "tsx": "^4.16.2",
    "typescript": "^5",
    "vitest": "^2.0.4"
  }
}
```

-   **`dev`**: Просто запускает `next dev`. Он ожидает, что порт и хост будут предоставлены окружением, что и делает наш раннер.

---

### 2.3. `apps/cms/package.json`

Скрипты приложения Payload CMS также прямолинейны.

```json
{
  "name": "cms",
  "private": true,
  "version": "1.0.0",
  "description": "Payload CMS",
  "main": "dist/server.js",
  "scripts": {
    "dev": "payload dev",
    "build": "PAYLOAD_CONFIG_PATH=src/payload.config.ts payload build",
    "start": "PAYLOAD_CONFIG_PATH=dist/payload.config.js NODE_ENV=production node dist/server.js",
    "generate:types": "PAYLOAD_CONFIG_PATH=src/payload.config.ts payload generate:types",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@payloadcms/db-postgres": "^0.6.0",
    "@payloadcms/richtext-slate": "^1.5.0",
    "express": "^4.19.2",
    "payload": "^2.17.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "dotenv": "^16.4.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  }
}
```

-   **`dev`**: Запускает `payload dev`. Раннер `scripts/dev-cms.mjs` обеспечивает его запуск на правильном порту, определенном в `.env` файле (`PORT_CMS`).

---

### 2.4. Раннер `scripts/dev-web.mjs`

```javascript
#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const port = process.env.PORT_WEB || '9002';
const host = process.env.HOST_WEB || '0.0.0.0';

const requireFromWeb = createRequire(resolve('apps/web/package.json'));
const nextBin = requireFromWeb.resolve('next/dist/bin/next');

console.log(`> WEB: http://${host}:${port}`);
const web = spawn(process.execPath, [nextBin, 'dev', '-p', String(port), '-H', host], {
  cwd: resolve('apps/web'),
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port), HOST: host },
});
web.on('exit', code => process.exit(code ?? 0));
```

### 2.5. Раннер `scripts/dev-cms.mjs`

```javascript
#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const port = process.env.PORT_CMS || '9003';
const host = process.env.HOST_CMS || '0.0.0.0';

const requireFromCms = createRequire(resolve('apps/cms/package.json'));
let payloadBin;
try {
  // Payload CLI (предпочтительно)
  payloadBin = requireFromCms.resolve('payload/dist/bin.js');
} catch {
  console.error('❌ Не найден payload/dist/bin.js. Уточни, как стартует CMS (CLI или кастомный сервер).');
  process.exit(1);
}

console.log(`> CMS: http://${host}:${port}`);
const cms = spawn(process.execPath, [payloadBin, 'dev'], {
  cwd: resolve('apps/cms'),
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(port),
    HOST: host,
    // Скорректируй путь, если конфиг лежит в другом месте:
    PAYLOAD_CONFIG_PATH: process.env.PAYLOAD_CONFIG_PATH || 'src/payload.config.ts',
  },
});
cms.on('exit', code => process.exit(code ?? 0));
```

### 2.6. Раннер `scripts/dev-all.mjs`

```javascript
#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const web = spawn(process.execPath, [resolve('scripts/dev-web.mjs')], {
  stdio: 'inherit',
  env: process.env,
});
const cms = spawn(process.execPath, [resolve('scripts/dev-cms.mjs')], {
  stdio: 'inherit',
  env: process.env,
});

function shutdown(signal) {
  if (web.exitCode === null) web.kill(signal);
  if (cms.exitCode === null) cms.kill(signal);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

let exitCode = 0;
web.on('exit', code => { exitCode = exitCode || code || 0; shutdown('SIGINT'); });
cms.on('exit', code => { exitCode = exitCode || code || 0; shutdown('SIGINT'); });

process.on('exit', () => process.exit(exitCode));
```
