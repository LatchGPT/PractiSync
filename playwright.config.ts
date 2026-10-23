import { defineConfig } from 'playwright/test';
import { privacyTestBaseURL } from './tests/e2e/environment';

export default defineConfig({
 testDir:'./tests/e2e',
 testMatch:'**/*.spec.ts',
 fullyParallel:false,
 workers:1,
 retries:0,
 timeout:60_000,
 expect:{timeout:15_000},
 outputDir:'.local/privacy-playwright-results',
 reporter:[['list'],['html',{outputFolder:'.local/privacy-playwright-report',open:'never'}],['json',{outputFile:'.local/privacy-playwright-results.json'}]],
 use:{baseURL:privacyTestBaseURL,channel:'msedge',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'node --import tsx scripts/privacy-e2e-server.mjs',url:privacyTestBaseURL+'/api/config',reuseExistingServer:false,timeout:120_000},
});
