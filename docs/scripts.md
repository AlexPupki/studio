# NPM Scripts Breakdown

This document provides a clear overview of the `scripts` sections from all `package.json` files in the project. It explains the purpose of each script and how they work together to create a stable and predictable development environment.

## 1. Root `package.json`

This file acts as the main conductor for the entire project. Its scripts are designed to manage the workspaces (`apps/web` and `apps/cms`) without passing down any complex or fragile arguments.

```json
{
  "scripts": {
    "//": "The main 'dev' script simply runs the web app, which is the primary use case for the preview environment.",
    "dev": "npm run dev:web",

    "//": "Runs the web application workspace. It relies on the .env file for PORT/HOST configuration.",
    "dev:web": "npm run dev --workspace apps/web",

    "//": "Runs the CMS workspace. It also relies on the .env file for its PORT/HOST.",
    "dev:cms": "npm run dev --workspace apps/cms",

    "//": "Runs both the web app and the CMS in parallel for full local development. Essential for testing the integration.",
    "dev:all": "npm-run-all --parallel dev:web dev:cms",

    "//": "Workspace-aware build command.",
    "build": "npm run build --workspaces",

    "//": "Starts the production build of the web app.",
    "start": "npm run start --workspace apps/web",

    "//": "Generic commands that delegate to the web app's specific scripts.",
    "lint": "npm run lint --workspace apps/web",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "db:generate": "npm run db:generate --workspace apps/web",
    "db:migrate": "npm run db:migrate --workspace apps/web",
    "db:seed": "npm run db:seed --workspace apps/web",
    "test": "npm run test --workspace apps/web",
    "test:watch": "npm run test:watch --workspace apps/web",
    "test:e2e": "npm run test:e2e --workspace apps/web",

    "//": "A specific command to generate types for the CMS.",
    "cms:generate:types": "npm run generate:types --workspace apps/cms"
  }
}
```

## 2. `apps/web/package.json`

This is the Next.js application. Its `dev` script is now self-contained and relies on environment variables for configuration, which is the standard and most reliable practice for Next.js.

```json
{
  "scripts": {
    "//": "The dev script is now simple and robust. It uses environment variables PORT_WEB and HOST_WEB from the .env file. This prevents the 'Invalid project directory' error.",
    "dev": "next dev -p ${PORT_WEB:-9002} -H ${HOST_WEB:-0.0.0.0}",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "//": "Database-related scripts that use drizzle-kit.",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx -r dotenv/config src/lib/server/db/seed.ts",
    "//": "Testing scripts using Vitest and Playwright.",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

## 3. `apps/cms/package.json`

This is the Payload CMS application. Its `dev` script is also self-contained and configured via environment variables.

```json
{
  "scripts": {
    "//": "The dev script for the CMS is now simple and uses environment variables PORT_CMS and HOST_CMS from the .env file.",
    "dev": "payload dev",
    "build": "PAYLOAD_CONFIG_PATH=src/payload.config.ts payload build",
    "start": "PAYLOAD_CONFIG_PATH=dist/payload.config.js NODE_ENV=production node dist/server.js",
    "generate:types": "PAYLOAD_CONFIG_PATH=src/payload.config.ts payload generate:types",
    "typecheck": "tsc --noEmit"
  }
}
```
