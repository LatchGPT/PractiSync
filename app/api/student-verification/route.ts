import { withConsent } from '@/packages/privacy/api-guard';
import { identity, limit } from '@/packages/auth/auth';
import { studentVerificationContext, submitStudentVerification } from '@/packages/domain/student-verification';
import { DomainError } from '@/packages/domain/policies';
import { readJsonObject } from '@/packages/validation/request-body';
import { verificationError } from '@/packages/validation/student-verification-response';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
async function handlerGET(request: Request) {
 try { return Response.json(await studentVerificationContext(await identity(request, { allowUnverified: true })), { headers }); }
 catch (error) { return verificationError(error); }
}
async function handlerPOST(request: Request) {
 try {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new DomainError('Request origin is not allowed.', 403);
  const user = await identity(request, { allowUnverified: true });
  await limit('student-verification:' + user.id, 10);
  return Response.json(await submitStudentVerification(user, await readJsonObject(request, 8000)), { headers });
 } catch (error) { return verificationError(error); }
}

export const GET=withConsent(handlerGET);

export const POST=withConsent(handlerPOST);
