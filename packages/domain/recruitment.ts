import { list } from '../db/demo';
import type { Identity, Row } from '../validation/contracts';
import { DomainError } from './policies';

export async function validateRecruitmentCourses(user: Identity, details: { courseId: string; courseIds?: string[] }) {
 const ids = [...new Set([details.courseId, ...(details.courseIds ?? [])])];
 const courses = await list(`SELECT id FROM courses WHERE tenant_id=? AND id IN (${ids.map(() => '?').join(',')})`, user.tenantId, ...ids);
 if (courses.length !== ids.length) throw new DomainError('Choose valid programs from your university.');
 if (user.role === 'COORDINATOR') {
  const assigned = await list('SELECT DISTINCT course_id AS id FROM classes WHERE tenant_id=? AND coordinator_id=?', user.tenantId, user.id);
  if (ids.some(id => !assigned.some(course => course.id === id))) throw new DomainError('You may post only for programs assigned to your classes.', 403);
 }
 return JSON.stringify(ids);
}

/** Preserve contacts on older pending requests that predate the new fields. */
export function companyContacts(details: Record<string, unknown>, current?: Row | null) {
 return Object.fromEntries(['contactName', 'contactEmail', 'contactPhone', 'contactPosition', 'website'].map(key => [key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), String(details[key] ?? current?.[key] ?? '')]));
}
