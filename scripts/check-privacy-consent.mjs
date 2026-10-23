import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const base=process.env.PRACTISYNC_BASE_URL||'http://localhost:3105';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Privacy UI checks require a local test server.');
const testDb=resolve(process.env.PRACTISYNC_PRIVACY_TEST_DB||'.local/privacy-ui.sqlite');
if(dirname(testDb)!==resolve('.local')||!basename(testDb).startsWith('privacy-'))throw new Error('Use a dedicated .local/privacy-*.sqlite database, never the working demo.');
process.env.DEPLOYMENT_MODE='demo';process.env.DEMO_ENABLED='true';process.env.PRACTISYNC_LOCAL_DEMO='true';process.env.PRACTISYNC_LOCAL_DEMO_PATH=testDb;
const {currentPrivacyPolicy}=await import('../packages/privacy/consent.ts');
const {publishPrivacyPolicy}=await import('../packages/privacy/publish.ts');
const output=resolve('.local/privacy-evidence');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[];
async function publish(){
 const p=await currentPrivacyPolicy(),version='ui-'+Date.now()+'-'+crypto.randomUUID().slice(0,8);
 await publishPrivacyPolicy({version,titleEn:p.titleEn,bodyEn:p.bodyEn,titleFil:p.titleFil,bodyFil:p.bodyFil,effectiveAt:'2026-01-01T00:00:00Z'});
 return version;
}
async function signIn(context,role){
 const csrf=await(await context.request.get(base+'/api/auth/csrf')).json();
 const response=await context.request.post(base+'/api/auth/callback/credentials',{headers:{Origin:base,'X-Auth-Return-Redirect':'1','x-real-ip':`2001:db8::${Math.floor(Math.random()*60000).toString(16)}`},form:{csrfToken:csrf.csrfToken,username:'demo.'+role,password:'Demo@2026!',callbackUrl:base+'/'}});
 const body=await response.json();assert.equal(response.status(),200);assert.ok(!body.url?.includes('error='),JSON.stringify(body));
}
async function fits(page,label){const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.width+1,label+' overflows');checks.push(label);}
async function accept(page){await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept and continue',exact:true}).click();await page.waitForURL(/\/dashboard\//);}
try{
 for(const [role,path] of [['student','student'],['coordinator','coordinator'],['supervisor','hte-supervisor'],['admin','admin']]){
  await publish();const context=await browser.newContext(),page=await context.newPage();
  const requestedQuery=role==='supervisor'?'':'?view=profile';
  await signIn(context,role);await page.goto(base+'/dashboard/'+path+requestedQuery);
  await page.getByRole('heading',{name:'PractiSync Privacy Notice',exact:true}).waitFor();assert.ok(new URL(page.url()).pathname==='/consent');
  assert.equal(await page.getByRole('checkbox').isChecked(),false);assert.equal(await page.getByRole('button',{name:'Accept and continue',exact:true}).isDisabled(),true);
  const api=await context.request.get(base+'/api/data');assert.equal(api.status(),403);assert.equal((await api.json()).code,'CONSENT_REQUIRED');
  // Session updates must never trust client-supplied consent claims.
  const csrf=await(await context.request.get(base+'/api/auth/csrf')).json();
  const forged=await context.request.post(base+'/api/auth/session',{headers:{Origin:base},data:{csrfToken:csrf.csrfToken,data:{consentVersion:(await currentPrivacyPolicy()).version,user:{id:'demo-admin'}}}});
  assert.equal((await forged.json()).consentVersion,null);
  if(role==='student'){
   for(const width of [390,820,1440]){await page.setViewportSize({width,height:1000});await fits(page,'consent-'+width);await page.screenshot({path:resolve(output,`consent-${width}.png`),fullPage:true,style:"nextjs-portal{display:none}"});}
   await page.getByRole('button',{name:'Filipino',exact:true}).click();await page.getByRole('heading',{name:'Abiso sa Pagkapribado ng PractiSync',exact:true}).waitFor();
   await page.reload();await page.getByRole('heading',{name:'Abiso sa Pagkapribado ng PractiSync',exact:true}).waitFor();
   await page.getByRole('button',{name:'English',exact:true}).click();
   await page.getByRole('button',{name:'Decline',exact:true}).click();await page.getByRole('heading',{name:"You can't use PractiSync without agreeing to the Privacy Notice",exact:true}).waitFor();
   const declinedUrl=page.url();assert.equal(new URL(declinedUrl).pathname,'/consent');
   await page.reload();await page.getByRole('button',{name:'Review and give consent',exact:true}).click();
   assert.equal(await page.getByRole('checkbox').isChecked(),false);
   await page.getByRole('checkbox').focus();assert.equal(await page.evaluate(()=>document.activeElement.id),'privacy-acknowledgement');
   // Errors preserve the acknowledgement and allow a retry.
   await page.route('**/api/consent',route=>route.abort(),{times:1});await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept and continue',exact:true}).click();await page.locator('.privacy-feedback[role=alert]').waitFor();
   assert.equal(await page.getByRole('checkbox').isChecked(),true);
  }
  await accept(page);assert.equal(new URL(page.url()).pathname,'/dashboard/'+path);assert.equal(new URL(page.url()).searchParams.get('view'),role==='supervisor'?null:'profile');
  await page.reload();assert.equal(new URL(page.url()).pathname,'/dashboard/'+path);assert.equal(await page.getByRole('heading',{name:'Access denied',exact:true}).count(),0);if(role==='supervisor')await page.locator('.hte-portal').waitFor();
  const session=await(await context.request.get(base+'/api/auth/session')).json();assert.equal(session.consentVersion,(await currentPrivacyPolicy()).version);
  assert.equal((await context.request.get(base+'/api/data')).status(),200);checks.push('accept-'+role);
  if(role==='student'){
   // A different tab's withdrawal must defeat the still-accepted token immediately.
   const response=await context.request.post(base+'/api/consent',{headers:{Origin:base},data:{action:'WITHDRAW',language:'en'}});assert.equal(response.status(),200);
   const blocked=await context.request.get(base+'/api/data');assert.equal(blocked.status(),403);assert.equal((await blocked.json()).code,'CONSENT_REQUIRED');
   await page.goto(base+'/dashboard/student');await page.getByRole('button',{name:'Review and give consent',exact:true}).click();await accept(page);checks.push('withdrawal');
   await publish();await page.goto(base+'/dashboard/student');await page.getByRole('heading',{name:'PractiSync Privacy Notice',exact:true}).waitFor();assert.equal(await page.getByRole('checkbox').isChecked(),false);checks.push('new-version');
   // Publishing while the notice is already open must ask for a fresh review.
   await publish();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept and continue',exact:true}).click();await page.getByRole('button',{name:'Reload notice',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Accept and continue',exact:true}).isDisabled(),true);checks.push('stale-notice');
  }
  await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();
 await page.goto(base+'/privacy?language=fil');await page.getByRole('heading',{name:'Abiso sa Pagkapribado ng PractiSync',exact:true}).waitFor();assert.ok(await page.getByText('[DPO NAME]',{exact:false}).isVisible());
 assert.equal((await context.request.get(base+'/api/config')).status(),200);
 assert.equal((await context.request.get(base+'/api/guest-evaluation/fixture')).status(),401);checks.push('public-policy-and-bootstrap');
 await context.close();console.log(JSON.stringify({passed:checks,screenshots:output},null,2));
}finally{await browser.close();}
