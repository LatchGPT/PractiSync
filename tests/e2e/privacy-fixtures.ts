import { test as base, expect, type APIRequestContext, type Page } from 'playwright/test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { privacyTestBaseURL } from './environment';

// Use the repository's tsx runtime for data setup, matching its scripts/workers and JSON imports.
function dataCommand(command:'publish'|'new-student'):unknown {
 const result=spawnSync(process.execPath,['--import','tsx',resolve('scripts/privacy-e2e-data.ts'),command],{encoding:'utf8',windowsHide:true,env:process.env});
 if(result.status!==0)throw new Error('Privacy test setup failed: '+result.stderr);
 return JSON.parse(result.stdout);
}

export const test=base.extend<{policyVersion:string}>({
 policyVersion:async({baseURL},provide)=>{
  expect(baseURL).toBe(privacyTestBaseURL);
  const version=await publishTestPolicy();
  await provide(version);
 },
});
export { expect };

export async function publishTestPolicy() {
 return (dataCommand('publish') as {version:string}).version;
}

export async function signIn(request:APIRequestContext,username='demo.student',password='Demo@2026!') {
 const csrfResponse=await request.get('/api/auth/csrf');
 expect(csrfResponse.ok()).toBe(true);
 const csrf=await csrfResponse.json() as {csrfToken:string};
 const response=await request.post('/api/auth/callback/credentials',{headers:{Origin:privacyTestBaseURL,'X-Auth-Return-Redirect':'1','x-real-ip':'2001:db8::'+crypto.randomUUID().slice(0,4)},
  form:{username,password,csrfToken:csrf.csrfToken,callbackUrl:privacyTestBaseURL+'/'}});
 expect(response.ok()).toBe(true);
 const body=await response.json() as {url:string};expect(body.url).not.toContain('error=');
}

export async function newStudent() {
 return dataCommand('new-student') as {username:string;password:string};
}

export async function accept(page:Page,destination:RegExp=/\/dashboard\//) {
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Accept and continue',exact:true}).click();
 await expect(page).toHaveURL(destination);
}

export async function status(request:APIRequestContext) {
 const response=await request.get('/api/consent/status');expect(response.ok()).toBe(true);
 return response.json() as Promise<{status:string|null;required:boolean;language:'en'|'fil'|null;policy:{version:string}}>;
}

export async function choose(request:APIRequestContext,action:'ACCEPT'|'DECLINE'|'WITHDRAW',language:'en'|'fil'='en') {
 return request.post('/api/consent',{headers:{Origin:privacyTestBaseURL},data:{action,language}});
}
