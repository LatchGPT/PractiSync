import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { privacyTestBaseURL, privacyTestPort } from '../tests/e2e/environment.ts';

const child=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'dev','--hostname',new URL(privacyTestBaseURL).hostname,'--port',privacyTestPort],{
 cwd:process.cwd(),
 env:{...process.env,AUTH_SECRET:randomBytes(32).toString('base64url'),PRACTISYNC_BUILD_DIR:'.next-privacy-e2e'},
 stdio:'inherit',
});
child.on('error',error=>{console.error('Privacy E2E server failed:',error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
