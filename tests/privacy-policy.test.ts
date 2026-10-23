import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installTestDatabase, type PreparedStatement } from '../packages/db/demo';
import { initialPrivacyPolicy } from '../packages/privacy/initial-policy';
import { privacyPolicyInput, publishPrivacyPolicy, seedPrivacyPolicy } from '../packages/privacy/publish';

let sql:DatabaseSync;
type Values=Parameters<PreparedStatement['bind']>;
const normalize=(values:Values)=>values.map(value=>value instanceof Date?value.toISOString():typeof value==='boolean'?Number(value):value);
function prepared(query:string,values:Values=[]):PreparedStatement {
 return {
  bind:(...args)=>prepared(query,args),
  all:async<T extends Record<string,unknown>>()=>({results:sql.prepare(query).all(...normalize(values)) as T[]}),
  first:async<T extends Record<string,unknown>>()=>(sql.prepare(query).get(...normalize(values)) as T|undefined)??null,
  run:async()=>sql.prepare(query).run(...normalize(values)),
 };
}
const nextPolicy=()=>({...initialPrivacyPolicy,id:undefined,version:'2026-10-25',effectiveAt:'2026-10-24T00:00:00Z'});
const publishInput=()=>{const {id:ignored,...input}=nextPolicy();void ignored;return input;};

beforeEach(()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-24T04:00:00Z'));
 vi.stubEnv('DEPLOYMENT_MODE','demo');vi.stubEnv('DEMO_ENABLED','true');vi.stubEnv('PRACTISYNC_LOCAL_DEMO','true');
 sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT NOT NULL,tenant_id TEXT NOT NULL,PRIMARY KEY(id,tenant_id));');
 sql.exec("INSERT INTO users VALUES ('account-a','tenant-a'),('account-b','tenant-b');");
 sql.exec(readFileSync('packages/db/prisma/migrations/202610240001_privacy_consent/sqlite.sql','utf8'));
 installTestDatabase({prepare:query=>prepared(query),batch:async statements=>{
  sql.exec('BEGIN');try{const results=[];for(const item of statements)results.push(await item.run());sql.exec('COMMIT');return results;}
  catch(error){sql.exec('ROLLBACK');throw error;}
 }});
});
afterEach(()=>{installTestDatabase(undefined);sql.close();vi.unstubAllEnvs();vi.useRealTimers();});

describe('privacy policy storage and publication',()=>{
 it('seeds the exact bilingual notice once, without consenting on behalf of users',async()=>{
  const row=sql.prepare('SELECT * FROM privacy_policies').get();
  expect(row).toMatchObject({version:initialPrivacyPolicy.version,title_en:initialPrivacyPolicy.titleEn,body_en:initialPrivacyPolicy.bodyEn,title_fil:initialPrivacyPolicy.titleFil,body_fil:initialPrivacyPolicy.bodyFil,is_current:1});
  await seedPrivacyPolicy();expect(sql.prepare('SELECT count(*) AS count FROM privacy_policies').get()?.count).toBe(1);
  expect(sql.prepare('SELECT count(*) AS count FROM user_consents').get()?.count).toBe(0);
 });
 it('publishes atomically and never reactivates the initial notice during seeding',async()=>{
  await publishPrivacyPolicy(publishInput());await seedPrivacyPolicy();
  expect(sql.prepare('SELECT version FROM privacy_policies WHERE is_current=1').get()?.version).toBe('2026-10-25');
  await expect(publishPrivacyPolicy(publishInput())).rejects.toThrow();
  expect(sql.prepare('SELECT version FROM privacy_policies WHERE is_current=1').get()?.version).toBe('2026-10-25');
  expect(()=>sql.prepare('UPDATE privacy_policies SET is_current=1').run()).toThrow();
 });
 it('preserves notices that consent records refer to',()=>{
  expect(()=>sql.prepare("UPDATE privacy_policies SET body_en='changed'").run()).toThrow('Publish a new version');
  expect(()=>sql.prepare('DELETE FROM privacy_policies').run()).toThrow();
  expect(()=>sql.prepare("INSERT OR REPLACE INTO privacy_policies SELECT id,version,title_en,'changed',title_fil,body_fil,effective_at,is_current,created_at FROM privacy_policies").run()).toThrow('Publish a new version');
 });
 it('allows only append-only, scoped consent history and supported languages/statuses',()=>{
  const insert=sql.prepare('INSERT INTO user_consents (id,user_id,tenant_id,policy_id,status,language) VALUES (?,?,?,?,?,?)');
  for(const [index,status] of ['ACCEPTED','DECLINED','WITHDRAWN'].entries())insert.run(`consent-${index}`,'account-a','tenant-a',initialPrivacyPolicy.id,status,'en');
  expect(()=>sql.prepare("UPDATE user_consents SET status='ACCEPTED'").run()).toThrow('append-only');
  expect(()=>sql.prepare('DELETE FROM user_consents').run()).toThrow('append-only');
  expect(()=>sql.prepare("INSERT OR REPLACE INTO user_consents SELECT id,user_id,tenant_id,policy_id,'ACCEPTED',language,ip_address,user_agent,created_at FROM user_consents").run()).toThrow('append-only');
  expect(()=>insert.run('cross-tenant','account-a','tenant-b',initialPrivacyPolicy.id,'ACCEPTED','en')).toThrow('Invalid scoped relationship');
  expect(()=>insert.run('bad-policy','account-a','tenant-a','missing','ACCEPTED','en')).toThrow();
  expect(()=>insert.run('bad-status','account-a','tenant-a',initialPrivacyPolicy.id,'UNKNOWN','en')).toThrow();
  expect(()=>insert.run('bad-language','account-a','tenant-a',initialPrivacyPolicy.id,'ACCEPTED','de')).toThrow();
  expect(()=>sql.prepare("DELETE FROM users WHERE id='account-a'").run()).toThrow();
  expect(()=>sql.prepare("UPDATE users SET tenant_id='tenant-b' WHERE id='account-a'").run()).toThrow();
 });
 it('keeps scope checks active when local foreign key enforcement is disabled',()=>{
  sql.exec('PRAGMA foreign_keys=OFF');
  expect(()=>sql.prepare("INSERT INTO user_consents (id,user_id,tenant_id,policy_id,status,language) VALUES ('bad','account-a','tenant-b',?,'ACCEPTED','fil')").run(initialPrivacyPolicy.id)).toThrow('Invalid scoped relationship');
 });
 it('requires bilingual content, rejects unknown fields, and disallows future publication',()=>{
  expect(privacyPolicyInput.safeParse(publishInput()).success).toBe(true);
  expect(privacyPolicyInput.safeParse({...publishInput(),bodyFil:''}).success).toBe(false);
  expect(privacyPolicyInput.safeParse({...publishInput(),effectiveAt:'2999-01-01T00:00:00Z'}).success).toBe(false);
  expect(privacyPolicyInput.safeParse({...publishInput(),isCurrent:true}).success).toBe(false);
 });
});
