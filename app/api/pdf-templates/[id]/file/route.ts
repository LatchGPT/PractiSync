import { withConsent } from '@/packages/privacy/api-guard';
import { identity } from '@/packages/auth/auth';
import { one } from '@/packages/db/demo';
import { DomainError, requireRole } from '@/packages/domain/policies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handlerGET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await identity(request);
    requireRole(user, 'SUPER_ADMIN', 'COORDINATOR', 'STUDENT');
    const { id } = await params;
    const template = await one(
      `SELECT original_filename,pdf_base64 FROM custom_document_templates
       WHERE tenant_id=? AND id=? AND pdf_base64<>'' ${user.role === 'SUPER_ADMIN' ? '' : "AND status='PUBLISHED'"}`,
      user.tenantId, id,
    );
    if (!template) throw new DomainError('PDF template not found.', 404);
    const bytes = Buffer.from(String(template.pdfBase64), 'base64');
    const filename = String(template.originalFilename || 'student-document.pdf')
      .replace(/[\\/\r\n\0"]/g, '_').replace(/\.pdf$/i, '').slice(0, 160) + '.pdf';
    const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_');
    return new Response(bytes, { headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    if (!(error instanceof DomainError)) console.error('PDF template download failed:', error);
    return Response.json(
      { error: error instanceof DomainError ? error.message : 'Could not load the PDF template.' },
      { status: error instanceof DomainError ? error.status : 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}

export const GET=withConsent(handlerGET);
