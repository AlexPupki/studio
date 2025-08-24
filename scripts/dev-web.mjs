
import { spawn } from 'child_process';
import { config } from 'dotenv';
import path from 'path';

// Загружаем переменные окружения из корневого .env файла
config({ path: path.resolve(process.cwd(), '.env') });

const args = process.argv.slice(2);
const portFlagIndex = args.indexOf('--port');
const hostFlagIndex = args.indexOf('--hostname');

let port = process.env.PORT || '9002';
if (portFlagIndex !== -1 && args[portFlagIndex + 1]) {
  port = args[portFlagIndex + 1];
}

let hostname = process.env.HOST || '0.0.0.0';
if (hostFlagIndex !== -1 && args[hostFlagIndex + 1]) {
  hostname = args[hostFlagIndex + 1];
}

console.log(`> Starting Next.js on http://${hostname}:${port}`);

const nextProcess = spawn(
  'pnpm',
  ['run', 'dev', '--workspace', 'apps/web', '--', '--port', port, '--hostname', hostname],
  {
    stdio: 'inherit',
    shell: true,
  }
);

nextProcess.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
});
