import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { database, installTestDatabase, type PreparedStatement } from '../packages/db/demo';
import type { Identity } from '../packages/validation/contracts';
import { ConsentPolicyChanged, ConsentRequired, currentPrivacyPolicy, getConsentStatus, PrivacyPolicyUnavailable, recordConsent, requireConsent } from '../packages/privacy/consent';
import { initialPrivacyPolicy } from '../packages/privacy/initial-policy';
import { publishPrivacyPolicy } from '../packages/privacy/publish';
import { consentError } from '../packages/privacy/http';
import { getConsentHistory } from '../packages/privacy/history';

let sql:DatabaseSync;
type Values=Parameters<PreparedStatement['bind']>;
const normalize=(values:Values)=>values.map(value=>value instanceof Date?value.toISOString():typeof value==='boolean'?Number(value):value);
function prepared(query:string,values:Values=[]):PreparedStatement {
 return {bind:(...args)=>prepared(query,args),
  all:async<T extends Record<string,unknown>>()=>({results:sql.prepare(query).all(...normalize(values)) as T[]}),
  first:async<T extends Record<string,unknown>>()=>(sql.prepare(query).get(...normalize(values)) as T|undefined)??null,
  run:async()=>({meta:sql.prepare(query).run(...normalize(values))})};
}
const user=(id='account-a',tenantId='tenant-a'):Identity=>({id,tenantId,name:id,username:id,email:`${id}@example.invalid`,role:'STUDENT',status:'ACTIVE',sessionVersion:1,isDemo:1,courseId:null,companyId:null});
const metadata={ipAddress:null,userAgent:null};
const append=(action:'ACCEPT'|'DECLINE'|'WITHDRAW',actor=user())=>recordConsent(actor,{action,language:'en'},metadata);
const newPolicy=()=>({version:'2026-10-25',titleEn:initialPrivacyPolicy.titleEn,bodyEn:initialPrivacyPolicy.bodyEn,titleFil:initialPrivacyPolicy.titleFil,bodyFil:initialPrivacyPolicy.bodyFil,effectiveAt:'2026-10-24T00:00:00Z'});

beforeEach(()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-24T04:00:00Z'));
 vi.stubEnv('DEPLOYMENT_MODE','demo');vi.stubEnv('DEMO_ENABLED','true');vi.stubEnv('PRACTISYNC_LOCAL_DEMO','true');
 sql=new DatabaseSync(':memory:');sql.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT NOT NULL,tenant_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',PRIMARY KEY(id,tenant_id)); INSERT INTO users(id,tenant_id) VALUES ('account-a','tenant-a'),('account-b','tenant-b'),('linked-student','tenant-a');");
 sql.exec(readFileSync('packages/db/prisma/migrations/202610240001_privacy_consent/sqlite.sql','utf8'));
 installTestDatabase({prepare:query=>prepared(query),batch:async statements=>{
  sql.exec('BEGIN');try{const results=[];for(const item of statements)results.push(await item.run());sql.exec('COMMIT');return results;}
  catch(error){sql.exec('ROLLBACK');throw error;}
 }});
});

describe('tenant-scoped consent history',()=>{
 it('returns an empty history and no acceptance date before the first choice',async()=>{
  expect(await getConsentHistory(user())).toMatchObject({acceptedAt:null,history:[],nextCursor:null,state:{status:null,required:true}});
 });
 it('returns actual choices, language and acceptance date without audit metadata',async()=>{
  const accepted=await recordConsent(user(),{action:'ACCEPT',language:'fil'},{ipAddress:'203.0.113.7',userAgent:'Private audit metadata'});
  const declined=await append('DECLINE');
  const page=await getConsentHistory(user());
  expect(page.acceptedAt).toBe(accepted.createdAt);expect(page.history.map(entry=>entry.id)).toEqual([declined.id,accepted.id]);
  expect(page.history[1]).toMatchObject({status:'ACCEPTED',language:'fil',policy:{version:initialPrivacyPolicy.version}});
  expect(JSON.stringify(page)).not.toMatch(/ip_address|ipAddress|user_agent|userAgent|203\.0\.113\.7|Private audit/);
 });
 it('never returns another account or tenant history',async()=>{
  await append('ACCEPT');await append('DECLINE',user('account-b','tenant-b'));
  expect((await getConsentHistory(user())).history.map(entry=>entry.status)).toEqual(['ACCEPTED']);
  expect((await getConsentHistory(user('account-b','tenant-b'))).history.map(entry=>entry.status)).toEqual(['DECLINED']);
  expect((await getConsentHistory(user('account-a','tenant-b'))).history).toEqual([]);
 });
 it('uses the authenticating account for a mapped student',async()=>{
  const accepted=await append('ACCEPT');await append('DECLINE',user('linked-student'));
  expect((await getConsentHistory({...user('linked-student'),authenticationId:'account-a'})).history.map(entry=>entry.id)).toEqual([accepted.id]);
 });
 it('paginates identical timestamps without gaps or duplicates',async()=>{
  const insert=sql.prepare("INSERT INTO user_consents(id,user_id,tenant_id,policy_id,status,language,created_at) VALUES (?,'account-a','tenant-a',?,'ACCEPTED','en','2026-10-24T04:00:00.000Z')");
  for(let index=0;index<65;index++)insert.run('history-'+String(index).padStart(3,'0'),initialPrivacyPolicy.id);
  const first=await getConsentHistory(user());expect(first.history).toHaveLength(50);expect(first.nextCursor).not.toBeNull();
  const second=await getConsentHistory(user(),first.nextCursor);expect(second.history).toHaveLength(15);expect(second.nextCursor).toBeNull();
  expect(new Set([...first.history,...second.history].map(entry=>entry.id)).size).toBe(65);
  expect([...first.history,...second.history].map(entry=>entry.id)).toEqual(Array.from({length:65},(_,i)=>'history-'+String(64-i).padStart(3,'0')));
 });
 it('keeps earlier policy choices while reporting the current version acceptance separately',async()=>{
  await append('ACCEPT');await publishPrivacyPolicy(newPolicy());vi.setSystemTime(new Date('2026-10-24T04:00:00.001Z'));await append('WITHDRAW');
  const page=await getConsentHistory(user());expect(page.acceptedAt).toBeNull();
  expect(page.history.map(entry=>entry.policy.version)).toEqual(['2026-10-25','2026-10-24']);
 });
 it.each(['invalid!','e30','x'.repeat(1025)])('rejects an invalid cursor',async cursor=>{
  await expect(getConsentHistory(user(),cursor)).rejects.toMatchObject({status:400});
 });
});
afterEach(()=>{vi.restoreAllMocks();installTestDatabase(undefined);sql.close();vi.unstubAllEnvs();vi.useRealTimers();});

describe('database consent requirement',()=>{
 it('fails closed without a consent row, with a machine-readable 403',async()=>{
  await expect(requireConsent(user())).rejects.toMatchObject({status:403,code:'CONSENT_REQUIRED'});
  const response=consentError(new ConsentRequired(initialPrivacyPolicy.version));
  expect(response.status).toBe(403);expect(await response.json()).toMatchObject({code:'CONSENT_REQUIRED',policyVersion:initialPrivacyPolicy.version});
 });
 it('permits ACCEPTED for the current version',async()=>{
  await append('ACCEPT');await expect(requireConsent(user())).resolves.toMatchObject({status:'ACCEPTED',required:false});
 });
 it.each(['DECLINE','WITHDRAW'] as const)('blocks %s even after an earlier acceptance',async action=>{
  await append('ACCEPT');await append(action);await expect(requireConsent(user())).rejects.toBeInstanceOf(ConsentRequired);
 });
 it('uses the latest choice without relying on a cached/JWT value, even in the same millisecond or after a clock rollback',async()=>{
  const accepted=await append('ACCEPT'),withdrawn=await append('WITHDRAW');
  expect(Date.parse(withdrawn.createdAt)).toBeGreaterThan(Date.parse(accepted.createdAt));
  vi.setSystemTime(new Date('2026-10-23T00:00:00Z'));
  const acceptedAgain=await append('ACCEPT');
  expect(Date.parse(acceptedAgain.createdAt)).toBeGreaterThan(Date.parse(withdrawn.createdAt));
  expect((await requireConsent(user())).status).toBe('ACCEPTED');
  expect(sql.prepare('SELECT count(*) AS count FROM user_consents').get()?.count).toBe(3);
 });
 it('requires consent again immediately after publication of a new version',async()=>{
  await append('ACCEPT');await publishPrivacyPolicy(newPolicy());
  expect(await getConsentStatus(user())).toMatchObject({status:null,required:true,policy:{version:'2026-10-25'}});
  await expect(requireConsent(user())).rejects.toBeInstanceOf(ConsentRequired);
  await append('ACCEPT');expect((await requireConsent(user())).required).toBe(false);
 });
 it('never transfers consent between tenants or users',async()=>{
  await append('ACCEPT');
  await expect(requireConsent(user('account-a','tenant-b'))).rejects.toBeInstanceOf(ConsentRequired);
  await expect(requireConsent(user('account-b','tenant-b'))).rejects.toBeInstanceOf(ConsentRequired);
  await expect(append('ACCEPT',user('account-a','tenant-b'))).rejects.toBeInstanceOf(ConsentPolicyChanged);
 });
 it('uses the authentication account when student registration maps another student record',async()=>{
  const mapped={...user('linked-student'),authenticationId:'account-a'};
  await append('ACCEPT',user('linked-student'));
  await expect(requireConsent(mapped)).rejects.toBeInstanceOf(ConsentRequired);
  const receipt=await append('ACCEPT',mapped);
  expect(sql.prepare('SELECT user_id FROM user_consents WHERE id=?').get(receipt.id)?.user_id).toBe('account-a');
  expect((await requireConsent(mapped)).required).toBe(false);
 });
 it('rejects stale notice submissions without appending a row',async()=>{
  await publishPrivacyPolicy(newPolicy());
  await expect(recordConsent(user(),{action:'ACCEPT',language:'fil'},metadata,`"${initialPrivacyPolicy.version}"`)).rejects.toBeInstanceOf(ConsentPolicyChanged);
  expect(sql.prepare('SELECT count(*) AS count FROM user_consents').get()?.count).toBe(0);
 });
 it('does not record acceptance if publication wins the race before the transaction',async()=>{
  const db=database(),batch=db.batch.bind(db);
  vi.spyOn(db,'batch').mockImplementationOnce(async statements=>{await publishPrivacyPolicy(newPolicy());return batch(statements);});
  await expect(append('ACCEPT')).rejects.toBeInstanceOf(ConsentPolicyChanged);
  expect((await getConsentStatus(user())).required).toBe(true);
  expect(sql.prepare('SELECT count(*) AS count FROM user_consents').get()?.count).toBe(0);
 });
 it('fails closed when there is no current notice',async()=>{
  sql.exec('UPDATE privacy_policies SET is_current=0');
  await expect(requireConsent(user())).rejects.toBeInstanceOf(PrivacyPolicyUnavailable);
  await expect(currentPrivacyPolicy()).rejects.toBeInstanceOf(PrivacyPolicyUnavailable);
  await expect(append('ACCEPT')).rejects.toBeInstanceOf(PrivacyPolicyUnavailable);
 });
});
