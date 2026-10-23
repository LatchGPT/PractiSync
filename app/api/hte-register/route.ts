import { seed } from '@/packages/db/demo';
import { limit } from '@/packages/auth/auth';
import { registerHte } from '@/packages/domain/hte-workflows';
import { DomainError } from '@/packages/domain/policies';
import { readJsonObject, RequestBodyError } from '@/packages/validation/request-body';
import { ZodError } from 'zod';

export const runtime = 'nodejs';
export async function POST(request: Request) {
 try {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new DomainError('Request origin is not allowed.', 403);
  await seed();
  await limit('hte-registration:' + (request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'), 5);
  return Response.json(await registerHte(await readJsonObject(request, 12000)), { status: 201, headers: { 'Cache-Control': 'no-store' } });
 } catch (e) {
  return Response.json({ error: e instanceof DomainError || e instanceof RequestBodyError ? e.message : e instanceof ZodError ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') : 'Registration could not be saved. Try again.' }, { status: e instanceof DomainError || e instanceof RequestBodyError ? e.status : 400, headers: { 'Cache-Control': 'no-store' } });
 }
}
