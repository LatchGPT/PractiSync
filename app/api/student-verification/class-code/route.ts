import { withConsent } from '@/packages/privacy/api-guard';
import { identity, limit } from '@/packages/auth/auth';
import { lookupStudentClassCode } from '@/packages/domain/student-verification';
import { DomainError } from '@/packages/domain/policies';
import { readJsonObject } from '@/packages/validation/request-body';
import { verificationError } from '@/packages/validation/student-verification-response';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

async function handlerPOST(request: Request) {
 try {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new DomainError('Request origin is not allowed.', 403);
  const user = await identity(request, { allowUnverified: true });
  await limit('student-class-code:' + user.id, 10);
  return Response.json(await lookupStudentClassCode(user, await readJsonObject(request, 2000)), { headers });
 } catch (error) { return verificationError(error); }
}

export const POST=withConsent(handlerPOST);
