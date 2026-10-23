import { test, expect, accept, choose, newStudent, publishTestPolicy, signIn, status } from './privacy-fixtures';
import { privacyTestBaseURL } from './environment';

test('a new unregistered student is gated before student registration',async({page,policyVersion})=>{
 const student=await newStudent();await signIn(page.request,student.username,student.password);
 await page.goto('/dashboard/student');
 await expect(page).toHaveURL(/\/consent\?/);
 await expect(page.getByRole('heading',{name:'PractiSync Privacy Notice',exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox')).not.toBeChecked();
 await expect(page.getByRole('button',{name:'Accept and continue',exact:true})).toBeDisabled();
 expect(await status(page.request)).toMatchObject({status:null,required:true,policy:{version:policyVersion}});
 await accept(page,/\/student-verification$/);
});

test('direct URLs and API calls are gated; accepting preserves the destination and refresh never re-prompts',async({page,policyVersion})=>{
 await signIn(page.request);await page.goto('/dashboard/student?view=attendance');
 await expect(page).toHaveURL(/\/consent\?/);
 const denied=await page.request.get('/api/data');expect(denied.status()).toBe(403);expect(await denied.json()).toMatchObject({code:'CONSENT_REQUIRED'});
 const checkbox=page.getByRole('checkbox');await checkbox.focus();await page.keyboard.press('Space');await expect(checkbox).toBeChecked();
 await page.getByRole('button',{name:'Accept and continue',exact:true}).click();await expect(page).toHaveURL(/\/dashboard\/student\?view=attendance$/);
 await page.reload();await expect(page).toHaveURL(/\/dashboard\/student\?view=attendance$/);
 expect(await status(page.request)).toMatchObject({status:'ACCEPTED',required:false,policy:{version:policyVersion}});
 const session=await page.request.get('/api/auth/session');expect(await session.json()).toMatchObject({consentVersion:policyVersion});
});

test('declining stays on the gate, survives refresh, and permits reconsideration',async({page,policyVersion})=>{
 expect(policyVersion).toBeTruthy();await signIn(page.request);await page.goto('/dashboard/student');
 await page.getByRole('button',{name:'Decline',exact:true}).click();
 await expect(page.getByRole('heading',{name:"You can't use PractiSync without agreeing to the Privacy Notice",exact:true})).toBeVisible();
 await expect(page).toHaveURL(/\/consent\?/);expect((await status(page.request)).status).toBe('DECLINED');
 await page.reload();await page.getByRole('button',{name:'Review and give consent',exact:true}).click();await expect(page.getByRole('checkbox')).toBeFocused();
 await expect(page.getByRole('checkbox')).not.toBeChecked();await accept(page);
 expect((await status(page.request)).status).toBe('ACCEPTED');
});

test('a newly published version re-gates an existing accepted user on the next request',async({page,policyVersion})=>{
 await signIn(page.request);await page.goto('/dashboard/student');await accept(page);
 const next=await publishTestPolicy();expect(next).not.toBe(policyVersion);
 const denied=await page.request.get('/api/data');expect(denied.status()).toBe(403);expect(await denied.json()).toMatchObject({code:'CONSENT_REQUIRED'});
 await page.goto('/dashboard/student');await expect(page).toHaveURL(/\/consent\?/);
 await expect(page.getByRole('checkbox')).not.toBeChecked();expect(await status(page.request)).toMatchObject({status:null,policy:{version:next}});
});

test('withdrawal defeats a still-accepted token and the database page guard returns to the gate',async({page,policyVersion})=>{
 await signIn(page.request);await page.goto('/dashboard/student');await accept(page);
 expect((await choose(page.request,'WITHDRAW')).ok()).toBe(true);
 const session=await page.request.get('/api/auth/session');expect(await session.json()).toMatchObject({consentVersion:policyVersion});
 const denied=await page.request.get('/api/data');expect(denied.status()).toBe(403);expect(await denied.json()).toMatchObject({code:'CONSENT_REQUIRED'});
 await page.goto('/dashboard/student');await expect(page).toHaveURL(/\/consent\?/);await expect(page.getByRole('button',{name:'Review and give consent',exact:true})).toBeVisible();
});

test('language selection persists and the consent row records Filipino',async({page,policyVersion})=>{
 expect(policyVersion).toBeTruthy();await signIn(page.request);await page.goto('/dashboard/student');
 await page.getByRole('button',{name:'Filipino',exact:true}).click();await page.reload();
 await expect(page.getByRole('heading',{name:'Abiso sa Pagkapribado ng PractiSync',exact:true})).toBeVisible();
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Sumang-ayon at magpatuloy',exact:true}).click();await expect(page).toHaveURL(/\/dashboard\/student$/);
 expect(await status(page.request)).toMatchObject({status:'ACCEPTED',language:'fil'});
});

for(const [role,username,path] of [
 ['STUDENT','demo.student','student'],['COORDINATOR','demo.coordinator','coordinator'],
 ['SUPERVISOR','demo.supervisor','hte-supervisor'],['SUPER_ADMIN','demo.admin','admin'],
] as const){
 test(`${role} can accept and use their own workspace`,async({page,policyVersion})=>{
  await signIn(page.request,username);await page.goto('/dashboard/'+path);
  await expect(page).toHaveURL(/\/consent\?/);await accept(page,new RegExp('/dashboard/'+path+'$'));
  expect(await status(page.request)).toMatchObject({status:'ACCEPTED',policy:{version:policyVersion}});
  expect((await page.request.get('/api/data')).ok()).toBe(true);
  await expect(page.getByRole('heading',{name:'Access denied',exact:true})).toHaveCount(0);
 });
}

test('session updates ignore forged client consent and identity claims',async({page,policyVersion})=>{
 await signIn(page.request);
 const csrf=await(await page.request.get('/api/auth/csrf')).json() as {csrfToken:string};
 const response=await page.request.post('/api/auth/session',{headers:{Origin:privacyTestBaseURL},data:{csrfToken:csrf.csrfToken,data:{consentVersion:policyVersion,user:{id:'demo-admin'}}}});
 expect(await response.json()).toMatchObject({consentVersion:null,user:{id:'demo-student'}});
 expect((await page.request.get('/api/data')).status()).toBe(403);
});

test('a notice published while the form is open cannot be accepted without a fresh review',async({page,policyVersion})=>{
 await signIn(page.request);await page.goto('/dashboard/student');const next=await publishTestPolicy();expect(next).not.toBe(policyVersion);
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept and continue',exact:true}).click();
 await expect(page.getByRole('button',{name:'Reload notice',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Accept and continue',exact:true})).toBeDisabled();
 expect(await status(page.request)).toMatchObject({status:null,policy:{version:next}});
});

test('Settings withdrawal requires confirmation and re-consent preserves its history',async({page,policyVersion})=>{
 expect(policyVersion).toBeTruthy();await signIn(page.request);await page.goto('/settings/privacy');await accept(page,/\/settings\/privacy$/);
 await page.getByRole('button',{name:'Withdraw consent',exact:true}).click();const dialog=page.getByRole('alertdialog');
 await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();expect((await status(page.request)).status).toBe('ACCEPTED');
 await page.getByRole('button',{name:'Withdraw consent',exact:true}).click();await dialog.getByRole('button',{name:'Withdraw consent',exact:true}).click();
 await expect(page).toHaveURL(/\/consent\?/);expect((await status(page.request)).status).toBe('WITHDRAWN');
 await page.getByRole('button',{name:'Review and give consent',exact:true}).click();await accept(page,/\/settings\/privacy$/);
 await expect(page.locator('[aria-labelledby="privacy-history-heading"]').getByText('Withdrawn',{exact:true}).first()).toBeVisible();
});

test('the public policy keeps every deployment placeholder visible without sign-in',async({page,policyVersion})=>{
 expect(policyVersion).toBeTruthy();await page.goto('/privacy');
 for(const placeholder of ['[HOSTING PROVIDER AND DATA LOCATION: currently local development, to be filled in before deployment]','[LIST]','[5 YEARS, placeholder]','[1 YEAR, placeholder]','[DPO NAME]','[DPO EMAIL]','[DPO PHONE/OFFICE]']){
  await expect(page.getByText(placeholder,{exact:false})).toBeVisible();
 }
 expect((await page.request.get('/api/config')).ok()).toBe(true);
 expect((await page.request.get('/api/guest-evaluation/fixture')).status()).toBe(401);
});
