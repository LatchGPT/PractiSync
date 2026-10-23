import { installConsentFixtureSchema, acceptFixtureUsers } from './consent-fixture';
import { afterAll,beforeAll,describe,expect,it,vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { installTestDatabase,type PreparedStatement } from '../packages/db/demo';
import type { Identity } from '../packages/validation/contracts';
const auth=vi.hoisted(()=>({user:null as Identity|null}));
vi.mock('../packages/auth/auth',()=>({identity:vi.fn(async()=>auth.user)}));
vi.mock('../packages/documents/native-queue',()=>({renderNativePdf:vi.fn(async()=>({bytes:Buffer.from('%PDF-1.7\nNative document'),pageCount:1,hash:'render'}))}));
import { GET,POST } from '../app/api/native-documents/route';
import { GET as download } from '../app/api/native-documents/files/[id]/route';
import { createNativeTemplate,editNativeVersion,saveNativeFields,sourceBytes } from '../packages/documents/native-repository';
import { recommendationReferenceFields } from '../packages/documents/native-reference';
import type { NativeDraft,NativeVersion } from '../packages/documents/native-types';

let sql:DatabaseSync,version:NativeVersion,draft:NativeDraft,generatedId:string;
const user=(id:string,role:Identity['role'],tenantId='fictional-university')=>({id,name:id,role,tenantId,username:id,email:`${id}@example.test`,status:'ACTIVE',sessionVersion:1,isDemo:1,courseId:null,companyId:null}) as Identity;
const admin=user('admin','SUPER_ADMIN'),student=user('student','STUDENT');
function prepared(query:string,values:(string|number|null)[]=[]):PreparedStatement{return{bind:(...values)=>prepared(query,values.map(value=>value instanceof Date?value.toISOString():typeof value==='boolean'?Number(value):value)),all:async<T extends Record<string,unknown>>()=>({results:sql.prepare(query).all(...values) as T[]}),first:async<T extends Record<string,unknown>>()=>(sql.prepare(query).get(...values) as T|undefined)??null,run:async()=>({meta:sql.prepare(query).run(...values)})};}
const request=(action:string,values:unknown,origin='http://localhost')=>new Request('http://localhost/api/native-documents',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({action,values})});
const json=async(response:Response)=>await response.json() as {templates:NativeVersion[];drafts:NativeDraft[];version:NativeVersion;draft:NativeDraft;id:string};
beforeAll(async()=>{
  vi.stubEnv('DEPLOYMENT_MODE','demo');vi.stubEnv('DEMO_ENABLED','true');sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');sql.exec(readFileSync('packages/db/prisma/migrations/202610150002_native_document_generator/migration.sql','utf8'));
  sql.exec('CREATE TABLE audit(id TEXT PRIMARY KEY,tenant_id TEXT,created_at TEXT,actor_id TEXT,action TEXT,resource_id TEXT,reason TEXT)');
  installTestDatabase({prepare:query=>prepared(query),batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const item of statements)results.push(await item.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}});
  sql.exec("CREATE TABLE users(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,status TEXT DEFAULT 'ACTIVE'); INSERT INTO users(id,tenant_id) VALUES ('admin','fictional-university'),('student','fictional-university'),('other','other-tenant'),('coordinator','fictional-university'),('other-student','fictional-university');");installConsentFixtureSchema(sql);await acceptFixtureUsers();
  const bytes=readFileSync('packages/documents/fixtures/recommendation.docx'),fields=await recommendationReferenceFields(bytes);fields.find(f=>f.key==='required_hours')!.locked=true;
  version=await createNativeTemplate(admin,'recommendation.docx',bytes,fields);version=await saveNativeFields(admin,version,fields,true);
});
afterAll(()=>{installTestDatabase(undefined);sql.close();vi.unstubAllEnvs();});
describe('native document authorization, immutable versions and saved values',()=>{
  it('retains the exact original and prevents modifying published field settings',async()=>{
    expect(await sourceBytes(admin.tenantId,version.sourceId)).toEqual(readFileSync('packages/documents/fixtures/recommendation.docx'));
    await expect(saveNativeFields(admin,version,version.fields)).rejects.toThrow(/immutable/);
    auth.user=student;expect((await POST(request('edit',{versionId:version.id}))).status).toBe(403);
    auth.user=admin;expect((await POST(request('save-fields',{versionId:version.id,revision:version.revision,fields:[]}))).status).toBe(409);
  });
  it('limits template listings by tenant and rejects coordinator/cross-origin access',async()=>{
    auth.user=user('other','STUDENT','other-tenant');expect((await json(await GET(new Request('http://localhost')))).templates).toHaveLength(0);
    auth.user=user('coordinator','COORDINATOR');expect((await GET(new Request('http://localhost'))).status).toBe(403);
    auth.user=student;expect((await POST(request('start',{versionId:version.id},'https://evil.test'))).status).toBe(403);
  });
  it('saves incomplete drafts with locked defaults and rejects stale or foreign writes',async()=>{
    auth.user=student;let response=await POST(request('start',{versionId:version.id}));expect(response.status).toBe(200);draft=(await json(response)).draft;
    const values={...draft.values,company_address:'Line 1\nLine 2',required_hours:'999'};response=await POST(request('save-draft',{draftId:draft.id,revision:draft.revision,values}));expect(response.status).toBe(200);const updated=(await json(response)).draft;
    expect(updated.values.required_hours).toBe('480');expect(updated.values.company_address).toContain('\n');expect((await POST(request('save-draft',{draftId:draft.id,revision:draft.revision,values}))).status).toBe(409);draft=updated;
    auth.user=user('other-student','STUDENT');expect((await POST(request('save-draft',{draftId:draft.id,revision:draft.revision,values}))).status).toBe(404);
    auth.user=student;expect((await POST(request('generate',{draftId:draft.id,format:'pdf'}))).status).toBe(400);
  });
  it('pins the draft to its old version when the admin publishes an edit',async()=>{
    let edited=await editNativeVersion(admin,version);expect(edited.version).toBe(2);edited=await saveNativeFields(admin,edited,edited.fields.map(f=>({...f,label:`New ${f.label}`})),true);
    auth.user=student;const body=await json(await POST(request('version',{versionId:draft.versionId})));expect(body.version.id).toBe(version.id);expect(body.version.fields[0].label).toBe('Letter date');
    const listed=await json(await GET(new Request('http://localhost')));expect(listed.templates[0].id).toBe(edited.id);expect(listed.drafts[0].versionId).toBe(version.id);
  });
  it('generates both formats without approval and keeps the draft editable',async()=>{
    auth.user=student;const values={...draft.values,letter_date:'2026-10-15',representative_name:'Ms. Reyes',representative_position:'HR Head',company_name:'Example & Co.',company_address:'Makati City',student_full_name:'Jamie Reyes',pronoun:'their',year_level:'4th',college:'Engineering',major:'IT'};
    draft=(await json(await POST(request('save-draft',{draftId:draft.id,revision:draft.revision,values})))).draft;
    for(const format of ['pdf','docx']){const response=await POST(request('generate',{draftId:draft.id,revision:draft.revision,format}));expect(response.status).toBe(200);generatedId=(await json(response)).id;const result=await download(new Request('http://localhost'),{params:Promise.resolve({id:generatedId})});expect(result.status).toBe(200);expect(result.headers.get('content-type')).toContain(format==='pdf'?'application/pdf':'wordprocessingml');}
    const updated=await POST(request('save-draft',{draftId:draft.id,revision:draft.revision,values:{...values,major:'Computer Science'}}));expect(updated.status).toBe(200);
    expect((await POST(request('generate',{draftId:draft.id,revision:draft.revision,format:'pdf'}))).status).toBe(409);
    expect((await POST(request('generate',{documentId:generatedId,format:'pdf'}))).status).toBe(200);
    auth.user=user('other-student','STUDENT');expect((await download(new Request('http://localhost'),{params:Promise.resolve({id:generatedId})})).status).toBe(404);
  });
  it('expires file binaries while preserving values for regeneration',async()=>{
    sql.prepare("UPDATE native_generated_documents SET expires_at='2020-01-01T00:00:00.000Z' WHERE id=?").run(generatedId);auth.user=student;
    expect((await download(new Request('http://localhost'),{params:Promise.resolve({id:generatedId})})).status).toBe(410);
    expect(sql.prepare('SELECT file_base64 FROM native_generated_documents WHERE id=?').get(generatedId)?.file_base64).toBe('');
    expect((await POST(request('generate',{documentId:generatedId,format:'docx'}))).status).toBe(200);
  });
});
