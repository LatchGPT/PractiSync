import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { authHandler } from '../packages/auth/auth';
import { ensureNewStudentDemo } from '../packages/domain/student-verification';
import { database } from '../packages/db/demo';
import { currentPrivacyPolicy, recordConsent } from '../packages/privacy/consent';
import { publishPrivacyPolicy } from '../packages/privacy/publish';
import { consentInput } from '../packages/validation/consent';
import { runtimeFixture } from './runtime-fixture';
import { POST } from '../app/api/consent/route';
import { GET } from '../app/api/consent/status/route';
import { GET as historyRoute } from '../app/api/consent/history/route';
import { GET as protectedData } from '../app/api/data/route';
import { POST as protectedAction } from '../app/api/action/route';
import { GET as protectedGuest } from '../app/api/guest-evaluation/[token]/route';
import { mutate } from '../packages/domain/actions';
import { workerHasConsent } from '../packages/privacy/worker-consent';
import { runDeadlineReminders } from '../packages/domain/reminders';

let fixture:Awaited<ReturnType<typeof runtimeFixture>>,policyId:string,version:string;
let sequence=0,loginSequence=0;
const origin='http://consent-test.local';
const cookie=(response:Response)=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
async function signIn(demoId='demo-student') {
 const csrfResponse=await authHandler(new Request(origin+'/api/auth/csrf'));
 const csrf=await csrfResponse.json() as {csrfToken:string};
 const response=await authHandler(new Request(origin+'/api/auth/callback/credentials',{method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:cookie(csrfResponse),'X-Auth-Return-Redirect':'1','x-real-ip':`2001:db8::${(++loginSequence).toString(16)}`},
  body:new URLSearchParams({demoId,csrfToken:csrf.csrfToken,callbackUrl:origin})}));
 const result=await response.json() as {url:string};expect(result.url).not.toContain('error=');
 return cookie(response);
}
function request(payload:unknown,session:string,headers:Record<string,string>={}) {
 return new Request(origin+'/api/consent',{method:'POST',headers:{origin,Cookie:session,'Content-Type':'application/json',...headers},body:JSON.stringify(payload)});
}
const status=(session='')=>GET(new Request(origin+'/api/consent/status',{headers:{Cookie:session}}));
const count=async()=>Number((await database().prepare('SELECT count(*) AS count FROM user_consents WHERE policy_id=?').bind(policyId).first<{count:number|bigint}>())?.count??0);

beforeAll(async()=>{
 fixture=await runtimeFixture();vi.stubEnv('PRACTISYNC_LOCAL_DEMO','true');
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-24T04:00:00Z'));
});
beforeEach(async()=>{
 const current=await currentPrivacyPolicy();version=`api-test-${++sequence}`;
 await publishPrivacyPolicy({version,titleEn:current.titleEn,bodyEn:current.bodyEn,titleFil:current.titleFil,bodyFil:current.bodyFil,effectiveAt:'2026-10-24T00:00:00Z'});
 policyId=(await currentPrivacyPolicy()).id;
});
afterAll(()=>{fixture.cleanup();vi.useRealTimers();});

describe('consent API validation',()=>{
 it.each([
  {},{action:'ACCEPT'},{action:'ACCEPT',language:'de'},{action:'ACCEPTED',language:'en'},
  {action:'ACCEPT',language:'en',userId:'someone-else'},
  {action:'ACCEPT',language:'en',tenantId:'another-university'},
  {action:'ACCEPT',language:'en',policyId:'older-policy'},
  {action:'ACCEPT',language:'en',ipAddress:'127.0.0.1'},
  {action:'ACCEPT',language:'en',userAgent:'forged'},
 ])('rejects invalid or client-selected identity/metadata: %j',async payload=>{
  expect(consentInput.safeParse(payload).success).toBe(false);
  const response=await POST(request(payload,await signIn()));
  expect(response.status).toBe(400);expect(await response.json()).toMatchObject({code:'INVALID_CONSENT_INPUT'});expect(await count()).toBe(0);
 });
 it('requires authentication for both endpoints',async()=>{
  const response=await POST(request({action:'ACCEPT',language:'en'},''));
  expect(response.status).toBe(401);expect(await response.json()).toMatchObject({code:'AUTH_REQUIRED'});
  expect((await status()).status).toBe(401);expect(await count()).toBe(0);
 });
 it('rejects cross-origin and missing-origin submissions',async()=>{
  const session=await signIn();
  expect((await POST(request({action:'ACCEPT',language:'en'},session,{origin:'https://untrusted.invalid'}))).status).toBe(403);
  const missing=request({action:'ACCEPT',language:'en'},session);missing.headers.delete('origin');
  expect((await POST(missing)).status).toBe(403);expect(await count()).toBe(0);
 });
 it('rejects malformed, oversized, array and non-JSON bodies without writes',async()=>{
  const session=await signIn();
  const make=(body:string,contentType='application/json')=>new Request(origin+'/api/consent',{method:'POST',headers:{origin,Cookie:session,'Content-Type':contentType},body});
  expect((await POST(make('{'))).status).toBe(400);
  expect((await POST(make('[]'))).status).toBe(400);
  expect((await POST(make('x'.repeat(4097)))).status).toBe(413);
  expect((await POST(make('action=ACCEPT','application/x-www-form-urlencoded'))).status).toBe(415);
  expect(await count()).toBe(0);
 });
});

describe('authenticated consent endpoints',()=>{
 it('exposes only the signed-in account history, including while unconsented',async()=>{
  expect((await historyRoute(new Request(origin+'/api/consent/history'))).status).toBe(401);
  const adminReceipt=await recordConsent(await fixture.actor('demo-admin'),{action:'ACCEPT',language:'en'},{ipAddress:'203.0.113.7',userAgent:'Private audit data'});
  const ownReceipt=await recordConsent(await fixture.actor('demo-student'),{action:'DECLINE',language:'fil'},{ipAddress:null,userAgent:null});
  const session=await signIn();
  const response=await historyRoute(new Request(origin+'/api/consent/history?userId=demo-admin&tenantId=other',{headers:{Cookie:session}}));
  expect(response.status).toBe(200);
  const body=await response.json() as {history:{id:string}[];acceptedAt:string|null;state:{required:boolean}};
  expect(body).toMatchObject({acceptedAt:null,state:{required:true}});
  expect(body.history.map(entry=>entry.id)).toContain(ownReceipt.id);expect(body.history.map(entry=>entry.id)).not.toContain(adminReceipt.id);
  const invalid=await historyRoute(new Request(origin+'/api/consent/history?cursor=invalid!',{headers:{Cookie:session}}));
  expect(invalid.status).toBe(400);expect(await invalid.json()).toMatchObject({code:'INVALID_REQUEST'});
 });
 it('blocks protected reads, mutations and guest evaluation with CONSENT_REQUIRED',async()=>{
  const session=await signIn();
  for(const response of [await protectedData(new Request(origin+'/api/data',{headers:{Cookie:session}})),
   await protectedAction(new Request(origin+'/api/action',{method:'POST',headers:{Cookie:session,origin,'Content-Type':'application/json'},body:JSON.stringify({action:'markAllNotificationsRead',values:{}})})),
   await protectedGuest(new Request(origin+'/api/guest-evaluation/fixture',{headers:{Cookie:session}}))]){
   expect(response.status).toBe(403);expect(await response.json()).toMatchObject({code:'CONSENT_REQUIRED'});
  }
  await expect(mutate(await fixture.actor('demo-student'),'markAllNotificationsRead',{})).rejects.toMatchObject({code:'CONSENT_REQUIRED'});
 });
 it('refreshes JWT consent from the database and ignores forged session claims',async()=>{
  const session=await signIn();
  async function update(data:unknown){
   const csrfResponse=await authHandler(new Request(origin+'/api/auth/csrf',{headers:{Cookie:session}}));
   const csrf=await csrfResponse.json() as {csrfToken:string};
   const response=await authHandler(new Request(origin+'/api/auth/session',{method:'POST',headers:{Cookie:session+'; '+cookie(csrfResponse),'Content-Type':'application/json',origin},body:JSON.stringify({csrfToken:csrf.csrfToken,data})}));
   expect(response.status).toBe(200);return response.json() as Promise<{consentVersion:string|null;user:{id:string}}>;
  }
  expect(await update({consentVersion:version,user:{id:'demo-admin'}})).toMatchObject({consentVersion:null,user:{id:'demo-student'}});
  await recordConsent(await fixture.actor('demo-student'),{action:'ACCEPT',language:'en'},{ipAddress:null,userAgent:null});
  expect((await update({})).consentVersion).toBe(version);
  await recordConsent(await fixture.actor('demo-student'),{action:'WITHDRAW',language:'en'},{ipAddress:null,userAgent:null});
  expect((await update({consentVersion:version})).consentVersion).toBeNull();
 });
 it('skips worker users without current consent, including legacy ownerless jobs',async()=>{
  expect(await workerHasConsent(undefined,'fictional-university')).toBe(false);
  expect(await workerHasConsent('demo-student','fictional-university')).toBe(false);
  const user=await fixture.actor('demo-student');
  await recordConsent(user,{action:'ACCEPT',language:'en'},{ipAddress:null,userAgent:null});
  expect(await workerHasConsent(user.id,user.tenantId)).toBe(true);
  expect(await workerHasConsent(user.id,'other-tenant')).toBe(false);
  await recordConsent(user,{action:'WITHDRAW',language:'en'},{ipAddress:null,userAgent:null});
  expect(await workerHasConsent(user.id,user.tenantId)).toBe(false);
 });
 it('suppresses actual reminder delivery to a user who withdrew consent',async()=>{
  const admin=await fixture.actor('demo-admin'),student=await fixture.actor('demo-student');
  for(const user of [admin,student])await recordConsent(user,{action:'ACCEPT',language:'en'},{ipAddress:null,userAgent:null});
  const event=await mutate(admin,'calendarEvent',{eventType:'DEADLINE',title:'Privacy reminder fixture',startDate:'2026-11-01',endDate:'2026-11-10',audience:'CLASS',classId:'class-it',remindersEnabled:1,reminderTarget:'NONE'});
  await recordConsent(student,{action:'WITHDRAW',language:'en'},{ipAddress:null,userAgent:null});
  await runDeadlineReminders(student.tenantId,new Date('2026-11-07T01:00:00Z'));
  expect(await database().prepare("SELECT id FROM notifications WHERE resource_type='deadline_reminder' AND resource_id=? AND user_id=?").bind(event.id!,student.id).first()).toBeNull();
 });
 it('returns no consent for a new version with private, uncached status and a version ETag',async()=>{
  const response=await status(await signIn());expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({status:null,required:true,policy:{version}});
  expect(response.headers.get('cache-control')).toBe('private, no-store');expect(response.headers.get('etag')).toBe(`"${version}"`);
 });
 it.each([
  ['demo-student','STUDENT'],['demo-coordinator','COORDINATOR'],['demo-supervisor','SUPERVISOR'],['demo-admin','SUPER_ADMIN'],
 ])('allows %s (%s) to consent before business access checks',async id=>{
  const session=await signIn(id),response=await POST(request({action:'ACCEPT',language:'fil'},session,{'If-Match':`"${version}"`,'x-forwarded-for':'2001:db8::10, 127.0.0.1','User-Agent':'Consent API fixture'}));
  expect(response.status).toBe(200);
  const receipt=await response.json() as {id:string};
  const row=await database().prepare('SELECT user_id,tenant_id,status,language,ip_address,user_agent FROM user_consents WHERE id=?').bind(receipt.id).first();
  expect(row).toMatchObject({user_id:id,tenant_id:'fictional-university',status:'ACCEPTED',language:'fil',ip_address:'2001:db8::10',user_agent:'Consent API fixture'});
  expect(await (await status(session)).json()).toMatchObject({status:'ACCEPTED',required:false,language:'fil'});
 });
 it('allows declining, reconsidering and withdrawing through append-only rows',async()=>{
  const session=await signIn();
  for(const [action,expected] of [['DECLINE','DECLINED'],['ACCEPT','ACCEPTED'],['WITHDRAW','WITHDRAWN']] as const){
   const response=await POST(request({action,language:'en'},session));expect(response.status).toBe(200);
   expect(await (await status(session)).json()).toMatchObject({status:expected,required:expected!=='ACCEPTED'});
  }
  expect(await count()).toBe(3);
 });
 it('lets an unregistered student consent using the signed-in account rather than a linked student',async()=>{
  await ensureNewStudentDemo();
  // Represents a historical approved mapping; consent still belongs to the authenticating account.
  await database().prepare("UPDATE student_verifications SET status='APPROVED',approved_student_id='student-2' WHERE requester_id='demo-new-student'").run();
  const session=await signIn('demo-new-student');
  const response=await POST(request({action:'ACCEPT',language:'en'},session));expect(response.status).toBe(200);
  expect(await database().prepare('SELECT user_id FROM user_consents WHERE policy_id=?').bind(policyId).first()).toMatchObject({user_id:'demo-new-student'});
 });
 it('does not expose another account consent through status or query-string identity',async()=>{
  await recordConsent(await fixture.actor('demo-admin'),{action:'ACCEPT',language:'en'},{ipAddress:null,userAgent:null});
  const response=await GET(new Request(origin+'/api/consent/status?userId=demo-admin&tenantId=elsewhere',{headers:{Cookie:await signIn()}}));
  expect(await response.json()).toMatchObject({status:null,required:true});
 });
 it('rejects a stale version precondition without recording a choice',async()=>{
  const response=await POST(request({action:'ACCEPT',language:'en'},await signIn(),{'If-Match':'"old-version"'}));
  expect(response.status).toBe(409);expect(await response.json()).toMatchObject({code:'CONSENT_POLICY_CHANGED'});expect(await count()).toBe(0);
 });
 it('validates IP headers and records missing metadata as null',async()=>{
  const session=await signIn();
  const response=await POST(request({action:'DECLINE',language:'en'},session,{'x-real-ip':'not-an-ip','x-forwarded-for':'also-not-an-ip'}));
  const receipt=await response.json() as {id:string};expect(response.status).toBe(200);
  expect(await database().prepare('SELECT ip_address,user_agent FROM user_consents WHERE id=?').bind(receipt.id).first()).toEqual({ip_address:null,user_agent:null});
 });
});
