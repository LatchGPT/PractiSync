import { describe,it,expect,beforeAll,afterAll } from 'vitest';
import { runtimeFixture } from './runtime-fixture';
import { withTenant } from '../packages/db/tenant-context';
import { insert,one,auditStatement } from '../packages/db/demo';
import { camelRows } from '../packages/validation/contracts';
import { verifiedEmployerAttribution } from '../packages/domain/feedback-evidence';
let fixture:Awaited<ReturnType<typeof runtimeFixture>>;
beforeAll(async()=>{fixture=await runtimeFixture();});afterAll(()=>fixture.cleanup());
describe('Tenant runtime and PostgreSQL serialization',()=>{
 it('keeps concurrent write and audit contexts independent',async()=>{
  await Promise.all(['university-a','university-b'].map(tenant=>withTenant(tenant,async()=>{
   await Promise.resolve();await insert('users',{name:tenant,username:tenant,email:tenant+'@example.invalid',role:'COORDINATOR'},tenant+'-user').run();
   await auditStatement(tenant+'-user','SCOPE_TEST',tenant).run();
  })));
  for(const tenant of ['university-a','university-b']){
   expect((await one('SELECT * FROM users WHERE id=?',tenant+'-user'))?.tenantId).toBe(tenant);
   expect((await one("SELECT * FROM audit WHERE resource_id=? AND action='SCOPE_TEST'",tenant))?.tenantId).toBe(tenant);
  }
 });
 it('serializes PostgreSQL bigint aggregates without losing large integer precision',()=>{
  const rows=camelRows([{id:'fixture',tenant_id:'demo',created_at:'2026-10-21',sample_count:BigInt(30),large_count:BigInt(Number.MAX_SAFE_INTEGER)+BigInt(1)}]);
  expect(rows[0].sampleCount).toBe(30);expect(rows[0].largeCount).toBe('9007199254740992');expect(()=>JSON.stringify(rows)).not.toThrow();
 });
 it('exposes provenance separately from academic review eligibility',()=>{
  const row={id:'school-response',tenantId:'demo',createdAt:'2026-10-21',authorshipMethod:'DIRECT',verificationState:'VERIFIED',evaluatorId:'supervisor',enteredBy:'supervisor',assignmentId:'assignment',verifiedAt:'2026-10-21',status:'APPROVED'};
  expect(verifiedEmployerAttribution(row)).toBe(true);expect(verifiedEmployerAttribution({...row,enteredBy:'coordinator'})).toBe(false);expect(verifiedEmployerAttribution({...row,authorshipMethod:'LEGACY'})).toBe(false);
 });
});
