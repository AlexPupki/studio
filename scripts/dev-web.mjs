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
