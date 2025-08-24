#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const port = process.env.PORT_WEB || '9002';
const host = process.env.HOST_WEB || '0.0.0.0';

// Запускаем next прямо из воркспейса apps/web, без "npm run внутри npm run"
const nextBin = resolve('apps/web/node_modules/next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, 'dev', '-p', port, '-H', host], {
  cwd: resolve('apps/web'),
  stdio: 'inherit',
  env: { ...process.env, PORT: port, HOST: host },
});

child.on('exit', code => process.exit(code ?? 0));
