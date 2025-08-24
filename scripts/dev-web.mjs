#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const port = process.env.PORT_WEB || '9002';
const host = process.env.HOST_WEB || '0.0.0.0';

const env = { ...process.env, PORT: String(port), HOST: host };

// Запускаем скрипт воркспейса без прокидывания позиционных аргументов.
const child = spawn('npm', ['run', '-w', 'apps/web', 'dev'], {
  cwd: resolve('.'),
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => process.exit(code ?? 0));
