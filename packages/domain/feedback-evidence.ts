import type { Row } from '../validation/contracts';

/** Historical verification is independent of the evaluator's current access. */
export function verifiedEmployerAttribution(row: Row): boolean {
 return row.authorshipMethod === 'DIRECT' && row.verificationState === 'VERIFIED'
  && !!row.evaluatorId && !!row.enteredBy
  && row.evaluatorId === row.enteredBy && !!row.assignmentId && !!row.verifiedAt;
}
export function verifiedEmployerEvidence(row:Row):boolean {return verifiedEmployerAttribution(row)&&row.status==='SUBMITTED';}

export function latestEmployerEvidence(placements: Row[], feedback: Row[]): Row[] {
 const owners = new Map(placements.map(p => [`${p.tenantId}:${p.id}`, p]));
 const current = new Map<string, Row>();
 for (const row of feedback) {
  const key = `${row.tenantId}:${row.placementId}`, p = owners.get(key);
  if (!p || !verifiedEmployerEvidence(row) || p.companyId !== row.companyId || p.courseId !== row.courseId || p.period !== row.academicPeriod) continue;
  const previous = current.get(key);
  const order = `${row.submittedAt ?? row.createdAt}:${row.id}`;
  if (!previous || order > `${previous.submittedAt ?? previous.createdAt}:${previous.id}`) current.set(key, row);
 }
 return [...current.values()];
}
