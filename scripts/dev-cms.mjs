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
  console.error('❌ Не найден payload/dist/bin.js. Уточните, как стартует CMS (CLI или кастомный сервер).');
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
