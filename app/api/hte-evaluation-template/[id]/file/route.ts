import { withConsent } from '@/packages/privacy/api-guard';
import { identity } from '@/packages/auth/auth';
import { one } from '@/packages/db/demo';
import { DomainError } from '@/packages/domain/policies';

export const runtime = 'nodejs';
async function handlerGET(request: Request, context: { params: Promise<{ id: string }> }) {
 try {
  const user = await identity(request), { id } = await context.params;
  const row = await one(`SELECT filename,pdf_base64 FROM hte_evaluation_templates WHERE tenant_id=? AND id=? ${user.role === 'SUPER_ADMIN' ? '' : "AND status IN ('PUBLISHED','ARCHIVED')"}`, user.tenantId, id);
  if (!row) throw new DomainError('School evaluation document not found.', 404);
  return new Response(Buffer.from(String(row.pdfBase64), 'base64'), { headers: { 'Content-Type':'application/pdf', 'Content-Disposition': `attachment; filename="school-evaluation.pdf"; filename*=UTF-8''${encodeURIComponent(String(row.filename))}`, 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"sandbox" } });
 } catch(e) { return Response.json({ error: e instanceof DomainError ? e.message : 'Document unavailable.' }, { status: e instanceof DomainError ? e.status : 500 }); }
}

export const GET=withConsent(handlerGET);
