import { readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { database } from '../packages/db/demo';

export function installConsentFixtureSchema(sql:DatabaseSync) {
 if(!sql.prepare("SELECT 1 FROM sqlite_master WHERE name='privacy_policies'").get())sql.exec(readFileSync('packages/db/prisma/migrations/202610240001_privacy_consent/sqlite.sql','utf8'));
 sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS scope_users_identity ON users(id,tenant_id)');
}

/** Explicit setup for existing domain tests; never used by application seeds. */
export async function acceptFixtureUsers() {
 await database().prepare(`INSERT INTO user_consents(id,user_id,tenant_id,policy_id,status,language,created_at)
 SELECT 'fixture-consent-'||u.id||'-'||p.id,u.id,u.tenant_id,p.id,'ACCEPTED','en',?
 FROM users u CROSS JOIN privacy_policies p WHERE p.is_current=TRUE
 AND NOT EXISTS(SELECT 1 FROM user_consents c WHERE c.user_id=u.id AND c.tenant_id=u.tenant_id AND c.policy_id=p.id)`)
 .bind(new Date().toISOString()).run();
}
