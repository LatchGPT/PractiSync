import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const localDir = join(root, '.local');
const secretPath = join(localDir, 'auth-secret');
mkdirSync(localDir, { recursive: true });

let authSecret;
try {
  authSecret = readFileSync(secretPath, 'utf8').trim();
} catch {
  authSecret = randomBytes(32).toString('base64url');
  writeFileSync(secretPath, authSecret, { flag: 'wx', mode: 0o600 });
}

const env = { ...process.env };
env.PRACTISYNC_LOCAL_DEMO = 'true';
env.PRACTISYNC_LOCAL_DEMO_PATH ??= join(localDir, 'practisync-demo.sqlite');
env.DEPLOYMENT_MODE = 'demo';
env.DEMO_ENABLED = 'true';
env.AUTH_SECRET = authSecret;
// Keep Prisma's unused fallback URL confined to the local fictional demo database.
env.DATABASE_URL = 'postgresql://practisync:local-demo-only@localhost:5433/practisync_demo';

console.log('Starting PractiSync with a persistent local SQLite demo database.');
console.log('Demo sign-ins: demo.student, demo.coordinator, demo.admin, demo.supervisor');
console.log('Password for all demo accounts: Demo@2026!');

const next = spawn(process.execPath, [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: 'inherit',
});

next.on('error', (error) => {
  console.error(`Could not start Next.js: ${error.message}`);
  process.exitCode = 1;
});
next.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 1;
});
