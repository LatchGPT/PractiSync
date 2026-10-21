import { auditStatement, database, insert, one, settings, statement, type PreparedStatement } from '../db/demo';
import { DomainError, demoAllowed, requireRole, TENANT } from './policies';
import { studentEmailAllowed } from '../auth/student-email';
import type { Identity } from '../validation/contracts';
import { activeClassByCode } from './class-codes';
import { studentClassCodeInput, studentDetailsInput, type StudentVerificationContext } from '../validation/student-verification';

export class StudentVerificationRequired extends DomainError {
 constructor() { super('Complete your student registration before records are available.', 403); }
}
const requesterId = (user: Identity) => user.authenticationId ?? user.id;
const conflict = () => new DomainError('Your registration changed. Refresh and try again.', 409);

export async function verificationFor(user: Identity) {
 if (user.role !== 'STUDENT') return null;
 return one('SELECT * FROM student_verifications WHERE tenant_id=? AND requester_id=?', user.tenantId, requesterId(user));
}

export async function assertStudentVerified(user: Identity) {
 const request = await verificationFor(user);
 if (request && (request.status !== 'APPROVED' || request.approvedStudentId !== user.id)) throw new StudentVerificationRequired();
}

async function admittedStudent(user: Identity) {
 requireRole(user, 'STUDENT');
 const account = await one("SELECT * FROM users WHERE tenant_id=? AND id=? AND role='STUDENT' AND status='ACTIVE'", user.tenantId, requesterId(user));
 if (!account || !studentEmailAllowed(account)) throw new DomainError('Student access requires an @rtu.edu.ph email or an authorized manual account.', 403);
 return account;
}

async function commit(tx: PreparedStatement[]) {
 try { await database().batch(tx); }
 catch (error) {
  if (/constraint|unique|not.null/i.test(String(error))) throw new DomainError('Your registration or class changed. Refresh and try again. No partial registration was saved.', 409);
  throw error;
 }
}

export async function ensureNewStudentDemo() {
 await database().batch([
  statement("INSERT OR IGNORE INTO users (id,tenant_id,created_at,name,username,email,role,is_demo) VALUES (?,?,?,?,?,?,?,1)", 'demo-new-student', TENANT, new Date().toISOString(), 'Isabel Mendoza', 'demo.newstudent', 'isabel.mendoza@rtu.edu.ph', 'STUDENT'),
  statement("UPDATE users SET email='isabel.mendoza@rtu.edu.ph' WHERE id='demo-new-student' AND username='demo.newstudent' AND is_demo=1"),
  statement("INSERT OR IGNORE INTO student_verifications (id,tenant_id,created_at,requester_id,status,updated_at) VALUES (?,?,?,?,'DRAFT',?)", 'verification-demo-new-student', TENANT, new Date().toISOString(), 'demo-new-student', new Date().toISOString()),
 ]);
}

export async function studentVerificationContext(user: Identity): Promise<StudentVerificationContext> {
 const account = await admittedStudent(user);
 const cfg = settings();
 const demo = demoAllowed(cfg.DEPLOYMENT_MODE, cfg.DEMO_ENABLED);
 const request = await one(`SELECT v.*,c.section,c.name AS class_name,u.name AS coordinator_name,co.code AS course_code,co.name AS course_name FROM student_verifications v LEFT JOIN classes c ON c.id=v.class_id AND c.tenant_id=v.tenant_id LEFT JOIN users u ON u.id=c.coordinator_id AND u.tenant_id=c.tenant_id LEFT JOIN courses co ON co.id=COALESCE(c.course_id,v.course_id) AND co.tenant_id=v.tenant_id WHERE v.tenant_id=? AND v.requester_id=?`, user.tenantId, requesterId(user));
 return { email: String(account.email), name: String(account.name), request: request ?? { id: '', tenantId: user.tenantId, createdAt: '', status: 'APPROVED' }, sections: [], courses: [], demo };
}

export async function lookupStudentClassCode(user: Identity, payload: unknown) {
 await admittedStudent(user);
 const request = await verificationFor(user);
 if (!request || request.status === 'APPROVED') throw conflict();
 const { classCode } = studentClassCodeInput.parse(payload);
 const classSpace = await activeClassByCode(user.tenantId, classCode);
 if (!classSpace) throw new DomainError('That class code is invalid or no longer active. Check it with your coordinator.');
 return { class: { courseCode: String(classSpace.courseCode), courseName: String(classSpace.courseName), section: String(classSpace.section), coordinatorName: String(classSpace.coordinatorName) } };
}

export async function submitStudentVerification(user: Identity, payload: unknown) {
 await admittedStudent(user);
 const request = await verificationFor(user);
 if (!request) throw conflict();
 // A retried response never creates a second profile or changes saved details.
 if (request.status === 'APPROVED') return { message: 'Your student registration is complete.' };
 const d = studentDetailsInput.parse(payload);
 if (Number(request.version) !== d.version) throw conflict();
 const section = await activeClassByCode(user.tenantId, d.classCode);
 if (!section) throw new DomainError('That class code is invalid or no longer active. Check it with your coordinator.');
 if (await one('SELECT id FROM student_profiles WHERE tenant_id=? AND student_number=?', user.tenantId, d.studentNumber)) throw new DomainError('That student number is already in use. Check your number or contact the OJT office. Existing records have not been linked to your account.', 409);
 const accountId = requesterId(user);
 const now = new Date().toISOString();
 await commit([
  // Recheck the class and request inside the transaction before creating data.
  statement(`UPDATE student_verifications SET version=CASE WHEN version=? AND status<>'APPROVED' AND EXISTS (SELECT 1 FROM classes c JOIN users u ON u.id=c.coordinator_id AND u.tenant_id=c.tenant_id WHERE c.tenant_id=student_verifications.tenant_id AND c.id=? AND c.course_id=? AND c.revoked=0 AND (c.expires_at IS NULL OR c.expires_at>?) AND u.role='COORDINATOR' AND u.status='ACTIVE') THEN version+1 ELSE NULL END WHERE tenant_id=? AND id=?`, d.version, section.id, String(section.courseId), now, user.tenantId, request.id),
  statement("UPDATE users SET name=?,course_id=? WHERE tenant_id=? AND id=? AND role='STUDENT' AND status='ACTIVE'", d.legalName, String(section.courseId), user.tenantId, accountId),
  insert('student_profiles', { tenant_id: user.tenantId, user_id: accountId, student_number: d.studentNumber, year_level: d.yearLevel }),
  insert('enrollments', { tenant_id: user.tenantId, class_id: section.id, student_id: accountId, active: 1 }),
  statement("UPDATE student_verifications SET status='APPROVED',approved_student_id=?,legal_name=?,student_number=?,course_id=?,year_level=?,class_id=?,review_note=NULL,reviewer_id=NULL,reviewed_at=NULL,submitted_at=?,updated_at=? WHERE tenant_id=? AND id=?", accountId, d.legalName, d.studentNumber, String(section.courseId), d.yearLevel, section.id, now, now, user.tenantId, request.id),
  auditStatement(accountId, 'STUDENT_REGISTRATION_COMPLETED', request.id,null,user.tenantId),
 ]);
 return { message: 'Your registration is complete. Welcome to your class.' };
}
