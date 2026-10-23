import {installSqliteScopeGuards} from '../packages/db/isolation-sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import { openLocalDemoDatabase } from '../packages/db/local-demo';
import { installTestDatabase,one,seed } from '../packages/db/demo';
import type { Identity } from '../packages/validation/contracts';
import type { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function workflowTargetFixtures(sql:DatabaseSync){
 if (!(sql.prepare("PRAGMA table_info('companies')").all() as {name:string}[]).some(column => column.name === 'contact_phone')) sql.exec(readFileSync('packages/db/prisma/migrations/202610220002_industry_partner_recruitment/migration.sql','utf8'));
 const has=(name:string)=>sql.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
 if(!has('queue_entries'))sql.exec(readFileSync('packages/db/prisma/migrations/202610230001_student_queuing/migration.sql','utf8'));
 if(!has('queue_public_holidays'))sql.exec(readFileSync('packages/db/prisma/migrations/202610230002_queue_reservations/migration.sql','utf8'));
 if(!has('document_templates'))sql.exec(readFileSync('packages/db/prisma/migrations/202610150001_reflowable_document_templates/migration.sql','utf8'));
 if(!has('custom_document_templates'))sql.exec(readFileSync('packages/db/prisma/migrations/202610140003_admin_document_templates/migration.sql','utf8').replaceAll('DEFAULT CURRENT_TIMESTAMP::text','DEFAULT CURRENT_TIMESTAMP'));
 installSqliteScopeGuards(sql);
}
export async function runtimeFixture(){
 vi.stubEnv('DEPLOYMENT_MODE','demo');vi.stubEnv('DEMO_ENABLED','true');vi.stubEnv('AUTH_SECRET','fictional-test-secret-with-more-than-32-characters');
 vi.stubEnv('PRACTISYNC_LOCAL_DEMO_PATH',join(mkdtempSync(join(tmpdir(),'practisync-test-')),'fixture.sqlite'));
 const db=openLocalDemoDatabase();installTestDatabase(db);await seed();
 const actor=async(id:string)=>await one('SELECT * FROM users WHERE id=?',id) as unknown as Identity;
 return {db,actor,cleanup:()=>{installTestDatabase(undefined);vi.unstubAllEnvs();}};
}
