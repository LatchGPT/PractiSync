import { identity } from '@/packages/auth/auth';
import { list, one } from '@/packages/db/demo';
import { DomainError, requireRole } from '@/packages/domain/policies';

export const dynamic = 'force-dynamic';

const pageSize = 50;

export async function GET(request: Request) {
  try {
    const user = await identity(request);
    requireRole(user, 'SUPER_ADMIN');

    const params = new URL(request.url).searchParams;
    const requestedPage = Number(params.get('page'));
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100_000) : 1;
    const search = (params.get('search') ?? '').trim().slice(0, 100);
    const courseId = (params.get('courseId') ?? '').trim();
    const status = (params.get('status') ?? 'ALL').trim();

    if (status !== 'ALL' && status !== 'ACTIVE' && status !== 'DISABLED') {
      throw new DomainError('Choose a valid account status.');
    }

    const where = ['u.tenant_id=?', "u.role='STUDENT'"];
    const values: (string | number | null)[] = [user.tenantId];

    if (search) {
      where.push("(LOWER(COALESCE(u.name,'')) LIKE LOWER(?) OR LOWER(u.username) LIKE LOWER(?) OR LOWER(COALESCE(u.email,'')) LIKE LOWER(?))");
      const term = `%${search}%`;
      values.push(term, term, term);
    }

    if (courseId) {
      where.push('u.course_id=?');
      values.push(courseId);
    }

    if (status !== 'ALL') {
      where.push('u.status=?');
      values.push(status);
    }

    const predicate = where.join(' AND ');
    const offset = (page - 1) * pageSize;
    const [students, count] = await Promise.all([
      list(`SELECT u.id,u.tenant_id,u.name,u.username,u.email,u.role,u.status,u.course_id,u.is_demo,u.email_domain_exception,u.created_at,c.code AS course_code,c.name AS course_name FROM users u LEFT JOIN courses c ON c.id=u.course_id AND c.tenant_id=u.tenant_id WHERE ${predicate} ORDER BY COALESCE(u.name,''),u.id LIMIT ? OFFSET ?`, ...values, pageSize, offset),
      one(`SELECT COUNT(*) AS total FROM users u WHERE ${predicate}`, ...values),
    ]);

    return Response.json(
      { students, total: Number(count?.total ?? 0), page, pageSize },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const status = error instanceof DomainError ? error.status : 503;
    const message = error instanceof DomainError ? error.message : 'Student accounts are temporarily unavailable.';
    return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
