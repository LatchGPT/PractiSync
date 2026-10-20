import { one } from '../db/demo';
import type { Row } from '../validation/contracts';

export async function digestClassCode(code: string) {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim().toUpperCase()))), value => value.toString(16).padStart(2, '0')).join('');
}

export async function activeClassByCode(tenantId: string, code: string): Promise<Row | null> {
 return one(`SELECT c.id,c.course_id,c.section,c.name,c.coordinator_id,co.code AS course_code,co.name AS course_name,u.name AS coordinator_name FROM classes c JOIN courses co ON co.id=c.course_id AND co.tenant_id=c.tenant_id JOIN users u ON u.id=c.coordinator_id AND u.tenant_id=c.tenant_id WHERE c.tenant_id=? AND c.code_hash=? AND c.revoked=0 AND (c.expires_at IS NULL OR c.expires_at>?) AND u.role='COORDINATOR' AND u.status='ACTIVE'`, tenantId, await digestClassCode(code), new Date().toISOString());
}

export async function activeClassById(tenantId: string, classId: string): Promise<Row | null> {
 return one(`SELECT c.id,c.course_id,c.section,c.name,c.coordinator_id,co.code AS course_code,co.name AS course_name,u.name AS coordinator_name FROM classes c JOIN courses co ON co.id=c.course_id AND co.tenant_id=c.tenant_id JOIN users u ON u.id=c.coordinator_id AND u.tenant_id=c.tenant_id WHERE c.tenant_id=? AND c.id=? AND c.revoked=0 AND (c.expires_at IS NULL OR c.expires_at>?) AND u.role='COORDINATOR' AND u.status='ACTIVE'`, tenantId, classId, new Date().toISOString());
}
