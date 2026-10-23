import { identity } from '@/packages/auth/auth';
import { getQueueView, manilaNow } from '@/packages/domain/queue';
import { DomainError } from '@/packages/domain/policies';
import { withTenant } from '@/packages/db/tenant-context';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await identity(request);
    const params = new URL(request.url).searchParams;
    const date = params.get('date') || manilaNow().date;
    const monitor = params.get('display') === 'monitor';
    const queue = await withTenant(user.tenantId, () => getQueueView(user, date, monitor));
    return Response.json(queue, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const status = error instanceof DomainError ? error.status : 503;
    const message = error instanceof DomainError ? error.message : 'The COE Office queue is temporarily unavailable.';
    return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
