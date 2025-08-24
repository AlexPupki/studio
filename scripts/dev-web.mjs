
#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

// Берём порт/хост из .env или используем дефолтные значения
const port = process.env.PORT_WEB || '9002';
const host = process.env.HOST_WEB || '0.0.0.0';

// Надёжно резолвим бинарь next из контекста apps/web (работает и при хоистинге)
const requireFromWeb = createRequire(resolve('apps/web/package.json'));
const nextBin = requireFromWeb.resolve('next/dist/bin/next');

console.log(`> Starting Next.js on http://${host}:${port}`);

const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(port), '-H', host], {
  cwd: resolve('apps/web'),
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port), HOST: host },
});

child.on('exit', code => process.exit(code ?? 0));
