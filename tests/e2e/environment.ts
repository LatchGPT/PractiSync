import { basename, dirname, resolve } from 'node:path';

export const privacyTestBaseURL=process.env.PRACTISYNC_PRIVACY_TEST_URL??'http://localhost:3115';
const url=new URL(privacyTestBaseURL);
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.protocol!=='http:'||url.username||url.password||url.pathname!=='/')throw new Error('Privacy E2E tests require a local HTTP test server.');
export const privacyTestPort=url.port||'80';
export const privacyTestDatabase=resolve(process.env.PRACTISYNC_PRIVACY_TEST_DB??'.local/privacy-e2e.sqlite');
if(dirname(privacyTestDatabase)!==resolve('.local')||!basename(privacyTestDatabase).startsWith('privacy-'))throw new Error('Privacy E2E tests require a dedicated .local/privacy-*.sqlite file.');

process.env.DEPLOYMENT_MODE='demo';
process.env.DEMO_ENABLED='true';
process.env.PRACTISYNC_LOCAL_DEMO='true';
process.env.PRACTISYNC_LOCAL_DEMO_PATH=privacyTestDatabase;
process.env.MAIL_TRANSPORT='test';
process.env.DATABASE_URL='postgresql://practisync:local-demo-only@localhost:5433/practisync_demo';
