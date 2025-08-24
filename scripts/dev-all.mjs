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
