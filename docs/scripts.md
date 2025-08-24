# NPM Scripts Breakdown

This document provides a clear overview of the `scripts` sections from all `package.json` files in the project. It explains the purpose of each script and how they work together to create a stable and predictable development environment.

## 1. Root `package.json`

This file acts as the main conductor for the entire project. Its scripts are designed to manage the workspaces (`apps/web` and `cms`) in a robust way, using a Node.js runner to prevent command-line argument issues.

```json
{
  "scripts": {
    "dev": "npm run dev:web",
    "dev:web": "node scripts/dev-web.mjs",
    "dev:cms": "npm run dev --workspace apps/cms",
    "dev:all": "npm-run-all --parallel dev:web dev:cms"
  }
}
```

- **`dev`**: The primary script for the Firebase Studio preview environment. It defaults to running the web application.
- **`dev:web`**: This is the key to our stable setup. It executes a dedicated Node.js script (`scripts/dev-web.mjs`) that reads the `.env` file and starts the Next.js server with the correct port and host. This completely isolates it from any arguments passed by the parent environment, solving the "invalid directory" error.
- **`dev:cms`**: A standard command to run the Payload CMS workspace.
- **`dev:all`**: A utility script for local development that runs both the web application and the CMS in parallel.

## 2. `apps/web/package.json`

The Next.js application's scripts are now extremely simple, as the complexity is handled by the runner script in the root.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

- **`dev`**: Simply starts the Next.js development server. It expects the port and host to be provided by the environment, which our `dev-web.mjs` runner does.

## 3. `apps/cms/package.json`

The Payload CMS application's scripts are also straightforward.

```json
{
  "scripts": {
    "dev": "payload dev",
    "build": "PAYLOAD_CONFIG_PATH=src/payload.config.ts payload build",
    "start": "PAYLOAD_CONFIG_PATH=dist/payload.config.js NODE_ENV=production node dist/server.js"
  }
}
```

- **`dev`**: Starts the Payload CMS development server. It's configured to run on a separate port defined in the `.env` file (`PORT_CMS`).
