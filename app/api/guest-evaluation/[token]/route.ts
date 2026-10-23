import { withConsent } from '@/packages/privacy/api-guard';
import { guestEvaluationContext, submitGuestEvaluation } from '@/packages/domain/industry-workflows';
import { DomainError } from '@/packages/domain/policies';
import { limit } from '@/packages/auth/auth';
import { readJsonObject, RequestBodyError } from '@/packages/validation/request-body';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
type RouteParams = { params: Promise<{ token: string }> };

async function handlerGET() {
  return Response.json({ error: 'Enter the separate access code to open this evaluation.' }, { status: 401, headers: noStore });
}

async function handlerPOST(request: Request, { params }: RouteParams) {
  try {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: 'Request origin is not allowed.' }, { status: 403, headers: noStore });
    const { token } = await params;
    const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'private';
    await limit(`guest-evaluation:${await digest(`${token}:${ip}`)}`, 5);
    const body = await readJsonObject(request, 12000);
    if (Object.keys(body).length === 1 && typeof body.accessCode === 'string') {
      return Response.json({ context: await guestEvaluationContext(token, body.accessCode) }, { headers: noStore });
    }
    return Response.json(await submitGuestEvaluation(token, body), { headers: noStore });
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : error instanceof DomainError ? error.status : error instanceof ZodError ? 400 : 503;
    const message = error instanceof RequestBodyError || error instanceof DomainError ? error.message : error instanceof ZodError ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : 'The evaluation could not be submitted.';
    return Response.json({ error: message }, { status, headers: noStore });
  }
}

export const GET=withConsent(handlerGET);

export const POST=withConsent(handlerPOST);
