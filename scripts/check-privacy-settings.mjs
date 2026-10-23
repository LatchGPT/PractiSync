import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const base=process.env.PRACTISYNC_BASE_URL||'http://localhost:3105';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Privacy settings checks require a local test server.');
const testDb=resolve(process.env.PRACTISYNC_PRIVACY_TEST_DB||'.local/privacy-phase6-ui.sqlite');
if(dirname(testDb)!==resolve('.local')||!basename(testDb).startsWith('privacy-'))throw new Error('Use a dedicated .local/privacy-*.sqlite database.');
process.env.DEPLOYMENT_MODE='demo';process.env.DEMO_ENABLED='true';process.env.PRACTISYNC_LOCAL_DEMO='true';process.env.PRACTISYNC_LOCAL_DEMO_PATH=testDb;
const {currentPrivacyPolicy,recordConsent}=await import('../packages/privacy/consent.ts');
const {publishPrivacyPolicy}=await import('../packages/privacy/publish.ts');
const output=resolve('.local/privacy-settings-evidence');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[];
async function signIn(context,role){
 const csrf=await(await context.request.get(base+'/api/auth/csrf')).json();
 const response=await context.request.post(base+'/api/auth/callback/credentials',{headers:{Origin:base,'X-Auth-Return-Redirect':'1','x-real-ip':`2001:db8::${Math.floor(Math.random()*60000).toString(16)}`},form:{csrfToken:csrf.csrfToken,username:'demo.'+role,password:'Demo@2026!',callbackUrl:base+'/'}});
 assert.ok(!(await response.json()).url?.includes('error='));
}
async function fits(page,label){const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(size.scroll<=size.width+1,label+' overflows');checks.push(label);}
try{
 for(const [role,path] of [['student','student'],['coordinator','coordinator'],['supervisor','hte-supervisor'],['admin','admin']]){
  const p=await currentPrivacyPolicy();await publishPrivacyPolicy({version:'settings-'+Date.now()+'-'+role,titleEn:p.titleEn,bodyEn:p.bodyEn,titleFil:p.titleFil,bodyFil:p.bodyFil,effectiveAt:'2026-01-01T00:00:00Z'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);await signIn(context,role);
  await page.goto(base+'/settings/privacy');await page.getByRole('heading',{name:'PractiSync Privacy Notice',exact:true}).waitFor();
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept and continue',exact:true}).click();await page.waitForURL('**/settings/privacy');
  await page.getByRole('heading',{name:'Settings · Privacy',exact:true}).waitFor();
  const state=await(await context.request.get(base+'/api/consent/history')).json();assert.equal(state.state.status,'ACCEPTED');assert.ok(state.acceptedAt);
  const acceptedDate=new Date(state.acceptedAt).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'});
  assert.equal(await page.locator('dl').getByText(acceptedDate,{exact:true}).count(),1);
  if(role==='student'){
   for(const width of [390,820,1440]){await page.setViewportSize({width,height:1000});await fits(page,'privacy-settings-'+width);await page.screenshot({path:resolve(output,`privacy-settings-${width}.png`),fullPage:true,style:'nextjs-portal{display:none}'});}
  }
  await page.goto(base+'/dashboard/'+path+(role==='supervisor'?'':'?view=settings'));
  if(role==='supervisor'){await page.getByRole('link',{name:'Settings · Privacy',exact:true}).click();await page.waitForURL('**/settings/privacy');}
  else {
   if(role==='student')await page.route('**/api/consent/history',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Simulated history outage.'})}));
   await page.getByRole('tab',{name:'Privacy',exact:true}).click();
   if(role==='student'){await page.getByRole('button',{name:'Try again',exact:true}).waitFor();await page.unroute('**/api/consent/history');await page.getByRole('button',{name:'Try again',exact:true}).click();}
   await page.getByRole('heading',{name:'Consent history',exact:true}).waitFor();checks.push('settings-tab-'+role);
   if(role==='student'){await page.setViewportSize({width:390,height:1000});await fits(page,'settings-tab-mobile');}
   await page.goto(base+'/settings/privacy');
  }
  const trigger=page.getByRole('button',{name:'Withdraw consent',exact:true});
  await trigger.click();const dialog=page.getByRole('alertdialog');await dialog.waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Cancel');
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal((await(await context.request.get(base+'/api/consent/status')).json()).status,'ACCEPTED');checks.push('cancel-'+role);
  if(role==='student'){
   // History pagination retains already loaded entries on a failed request.
   for(let index=0;index<55;index++)await recordConsent({id:'demo-student',tenantId:'fictional-university'},{action:'ACCEPT',language:'en'},{ipAddress:null,userAgent:null});
   await page.reload();const list=page.locator('[aria-labelledby="privacy-history-heading"] ol li');assert.equal(await list.count(),50);
   await page.route('**/api/consent/history?cursor=*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Simulated pagination outage.'})}),{times:1});
   await page.getByRole('button',{name:'Load earlier choices',exact:true}).click();await page.getByRole('button',{name:'Try again',exact:true}).waitFor();assert.equal(await list.count(),50);
   await page.getByRole('button',{name:'Try again',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[aria-labelledby="privacy-history-heading"] ol li').length>50);checks.push('history-pagination-recovery');
   await trigger.click();await page.route('**/api/consent',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Simulated withdrawal outage.'})}),{times:1});
   await dialog.getByRole('button',{name:'Withdraw consent',exact:true}).click();await dialog.getByRole('alert').waitFor();assert.equal((await(await context.request.get(base+'/api/consent/status')).json()).status,'ACCEPTED');
   await page.setViewportSize({width:390,height:800});await page.screenshot({path:resolve(output,'privacy-withdrawal-error-390.png'),style:'nextjs-portal{display:none}'});
   // Session-refresh failure cannot keep access alive after the saved withdrawal.
   await page.route('**/api/auth/csrf',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}),{times:1});checks.push('withdrawal-error-recovery');
  }else await trigger.click();
  await dialog.getByRole('button',{name:'Withdraw consent',exact:true}).click();await page.waitForURL(/\/consent/);await page.getByRole('button',{name:'Review and give consent',exact:true}).waitFor();
  assert.equal((await(await context.request.get(base+'/api/consent/status')).json()).status,'WITHDRAWN');
  const blocked=await context.request.get(base+'/api/data');assert.equal(blocked.status(),403);assert.equal((await blocked.json()).code,'CONSENT_REQUIRED');checks.push('withdraw-'+role);
  if(role==='student'){
   await page.getByRole('button',{name:'Review and give consent',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept and continue',exact:true}).click();await page.waitForURL('**/settings/privacy');
   assert.ok(await page.locator('[aria-labelledby="privacy-history-heading"]').getByText('Withdrawn',{exact:true}).isVisible());checks.push('reconsent-history');
  }
  await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'/settings/privacy');await page.waitForURL(/\/login/);await context.close();checks.push('signed-out-settings');
 console.log(JSON.stringify({passed:checks,screenshots:output},null,2));
}finally{await browser.close();}
