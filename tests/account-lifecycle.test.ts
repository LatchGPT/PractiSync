import { acceptFixtureUsers } from './consent-fixture';
import { beforeAll,afterAll,describe,it,expect,vi } from 'vitest';
import { runtimeFixture } from './runtime-fixture';
import { mutate } from '../packages/domain/actions';
import { one,list,insert,statement } from '../packages/db/demo';
import { consumePasswordToken,requestRecovery,tokenDigest,authorizeGoogle } from '../packages/auth/accounts';
import { capturedTestMail,decryptMail,deliverAccountMail } from '../packages/auth/mail';
import { verifyPassword } from '../packages/auth/password';
import { googleConfigured } from '../packages/auth/runtime';
let fixture:Awaited<ReturnType<typeof runtimeFixture>>;
beforeAll(async()=>{fixture=await runtimeFixture();vi.stubEnv('APP_ORIGIN','http://localhost:3100');vi.stubEnv('MAIL_TRANSPORT','test');});
afterAll(()=>fixture.cleanup());
const mailToken=(text:string)=>new URLSearchParams(text.split('#')[1].split('\n')[0]).get('token')!;
describe('Prepared account lifecycle (local delivery and trusted-claim policy tests)',()=>{
 it('uses neutral recovery, encrypted queued email, one-use tokens and session revocation',async()=>{
  const admin=await fixture.actor('demo-admin');
  const created=await mutate(admin,'account',{name:'Recovery fixture',username:'recovery.fixture',email:'recovery@example.invalid',role:'SUPERVISOR',password:'BeforeReset!2026'});
  const existing=await requestRecovery('recovery@example.invalid','local-fixture'),missing=await requestRecovery('absent@example.invalid','local-fixture');
  expect(existing.message).toBe(missing.message);
  const outbox=(await list('SELECT * FROM email_outbox'))[0];
  expect(String(outbox.encryptedPayload)).not.toContain('recovery@');
  expect(await deliverAccountMail()).toBe(1);expect(await deliverAccountMail()).toBe(0);
  const token=mailToken(capturedTestMail[0].text),row=await one('SELECT * FROM account_tokens WHERE token_hash=?',tokenDigest(token));
  expect(row?.tokenHash).not.toBe(token);
  await consumePasswordToken(token,'AfterReset!2026','local-fixture');
  const user=await one('SELECT * FROM users WHERE id=?',created.id!);expect(user?.sessionVersion).toBe(2);expect(await verifyPassword('AfterReset!2026',String(user?.passwordHash))).toBe(true);
  await expect(consumePasswordToken(token,'AnotherReset!2026','local-fixture')).rejects.toThrow('already used');
  expect((await one('SELECT * FROM email_outbox WHERE id=?',outbox.id))?.encryptedPayload).toBe('');
 });
 it('rejects expired activation and disabled accounts, preserving fixed demo identities',async()=>{
  const admin=await fixture.actor('demo-admin');
  await expect(mutate(admin,'inviteAccount',{userId:'demo-student'})).rejects.toThrow('Fixed demo');
  const row=await one("SELECT * FROM users WHERE username='recovery.fixture'");
  await mutate(admin,'inviteAccount',{userId:row!.id});
  const queued=(await list("SELECT * FROM email_outbox WHERE status='PENDING'"))[0],token=mailToken(decryptMail(String(queued.encryptedPayload)).text);
  await expect(consumePasswordToken(token,'NotExpired!2026','activation-test',new Date(Date.now()+25*3600000))).rejects.toThrow('expired');
  await statement("UPDATE users SET status='DISABLED' WHERE id=?",row!.id).run();
  await expect(consumePasswordToken(token,'NotDisabled!2026','activation-test')).rejects.toThrow('invalid');
 });
 it('checks Google trust claims and never links an existing student by matching email',async()=>{
  const good={iss:'https://accounts.google.com',sub:'fictional-google-sub',email:'fresh.student@rtu.edu.ph',email_verified:true,hd:'rtu.edu.ph',name:'Fresh student'};
  for(const bad of [{...good,hd:undefined},{...good,email_verified:false},{...good,email:'fresh@outside.example'},{...good,iss:'https://attacker.invalid'}])await expect(authorizeGoogle(bad)).rejects.toThrow('verified RTU');
  const created=await authorizeGoogle(good);expect(created.role).toBe('STUDENT');expect(await one('SELECT id FROM student_verifications WHERE requester_id=?',created.id)).not.toBeNull();
  expect((await authorizeGoogle(good)).id).toBe(created.id);
  await expect(authorizeGoogle({...good,sub:'another-sub',email:'demo.student@rtu.edu.ph'})).rejects.toThrow('invitation');
  expect(googleConfigured()).toBe(false);
 });
 it('revokes only the current account even when a payload names another account',async()=>{
  const admin=await fixture.actor('demo-admin'),before=admin.sessionVersion;
  const created=await mutate(admin,'account',{name:'Own-session fixture',username:'own.session',email:'own.session@example.invalid',role:'SUPERVISOR',password:'OwnSession!2026'});
  await acceptFixtureUsers();const user=await fixture.actor(created.id!);await mutate(user,'revokeOwnSessions',{userId:admin.id,tenantId:'another-university'});
  expect((await fixture.actor(created.id!)).sessionVersion).toBe(user.sessionVersion+1);expect((await fixture.actor(admin.id)).sessionVersion).toBe(before);
 });
 it('records provider failure and bounded email retries without claiming delivery',async()=>{
  const admin=await fixture.actor('demo-admin');
  await mutate(admin,'account',{name:'Email failure fixture',username:'email.failure',email:'email.failure@example.invalid',role:'SUPERVISOR',password:'FailedMail!2026'});
  await requestRecovery('email.failure@example.invalid','mail-failure-test');
  const token=(await list("SELECT * FROM account_tokens WHERE email='email.failure@example.invalid'"))[0];
  vi.stubEnv('DEPLOYMENT_MODE','institutional');vi.stubEnv('INSTITUTIONAL_ENABLED','true');vi.stubEnv('INSTITUTIONAL_TENANT_ID','mail-fixture');vi.stubEnv('RESEND_API_KEY','fictional-unused-key');vi.stubEnv('MAIL_FROM','fixture@example.invalid');vi.stubEnv('MAIL_TRANSPORT','resend');vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Simulated provider outage.')));
  const start=Date.now();
  try{
   for(const offset of [0,61000,362000])expect(await deliverAccountMail(new Date(start+offset),'fictional-university')).toBe(0);
   const job=await one('SELECT * FROM email_outbox WHERE id=?',token.id);expect(job?.status).toBe('FAILED');expect(job?.attempts).toBe(3);expect(job?.deliveredAt).toBeNull();
  }finally{vi.unstubAllGlobals();vi.stubEnv('DEPLOYMENT_MODE','demo');vi.stubEnv('MAIL_TRANSPORT','test');}
 });
 it('claims a preassigned institutional staff invitation without client-selected roles',async()=>{
  vi.stubEnv('DEPLOYMENT_MODE','institutional');vi.stubEnv('INSTITUTIONAL_ENABLED','true');vi.stubEnv('INSTITUTIONAL_TENANT_ID','university-b');vi.stubEnv('APP_ORIGIN','https://practisync.example.invalid');vi.stubEnv('MAIL_TRANSPORT','resend');vi.stubEnv('RESEND_API_KEY','fictional-not-used');vi.stubEnv('MAIL_FROM','fixture@example.invalid');
  await statement("CREATE TABLE IF NOT EXISTS Tenant (id TEXT PRIMARY KEY,mode TEXT NOT NULL)").run();await statement("INSERT INTO Tenant (id,mode) VALUES ('university-b','INSTITUTIONAL')").run();
  await insert('users',{tenant_id:'university-b',name:'Invited coordinator',username:'invited.coordinator',email:'invited.coordinator@rtu.edu.ph',role:'COORDINATOR',status:'INVITED',is_demo:0,session_version:1},'staff-b').run();
  await insert('users',{tenant_id:'university-b',name:'University B admin',username:'admin.university.b',email:'admin-b@example.invalid',role:'SUPER_ADMIN',status:'ACTIVE'},'admin-b').run();await acceptFixtureUsers();
  const admin=await fixture.actor('admin-b');
  await mutate(admin,'inviteAccount',{userId:'staff-b'});
  const mail=(await list("SELECT * FROM email_outbox WHERE tenant_id='university-b'"))[0],token=mailToken(decryptMail(String(mail.encryptedPayload)).text);
  const profile={iss:'https://accounts.google.com',sub:'staff-sub',email:'invited.coordinator@rtu.edu.ph',email_verified:true,hd:'rtu.edu.ph'};
  await expect(authorizeGoogle({...profile,email:'wrong@rtu.edu.ph'},token)).rejects.toThrow('another account');
  const linked=await authorizeGoogle(profile,token);expect(linked.id).toBe('staff-b');expect(linked.role).toBe('COORDINATOR');expect(linked.status).toBe('ACTIVE');
  expect((await one("SELECT * FROM account_tokens WHERE token_hash=?",tokenDigest(token)))?.usedAt).toBeTruthy();
  await expect(authorizeGoogle({...profile,sub:'replacement-sub'},token)).rejects.toThrow('invitation');
 });
});
