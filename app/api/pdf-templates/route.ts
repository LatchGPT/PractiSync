import { withConsent } from '@/packages/privacy/api-guard';
import { PDFDocument } from 'pdf-lib';
import { identity } from '@/packages/auth/auth';
import { auditStatement, database, list, statement } from '@/packages/db/demo';
import { DomainError, requireRole } from '@/packages/domain/policies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PDF_BYTES = 4 * 1024 * 1024;
const headers = { 'Cache-Control': 'private, no-store' };

function errorResponse(error: unknown) {
  if (!(error instanceof DomainError)) console.error('PDF template request failed:', error);
  return Response.json(
    { error: error instanceof DomainError ? error.message : 'Could not process the PDF template.' },
    { status: error instanceof DomainError ? error.status : 500, headers },
  );
}

async function handlerGET(request: Request) {
  try {
    const user = await identity(request);
    requireRole(user, 'SUPER_ADMIN', 'COORDINATOR', 'STUDENT');
    const templates = await list(
      `SELECT id,title,original_filename,category,status,created_at
       FROM custom_document_templates
       WHERE tenant_id=? AND pdf_base64<>'' ${user.role === 'SUPER_ADMIN' ? '' : "AND status='PUBLISHED'"}
       ORDER BY created_at DESC LIMIT 100`,
      user.tenantId,
    );
    return Response.json({ templates: templates.map(row => ({
      id: row.id,
      title: String(row.title),
      filename: String(row.originalFilename),
      category: String(row.category),
      status: String(row.status),
      createdAt: String(row.createdAt),
    })) }, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handlerPOST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new DomainError('Request origin is not allowed.', 403);
    const user = await identity(request);
    requireRole(user, 'SUPER_ADMIN');
    let filename: string;
    try {
      filename = decodeURIComponent(request.headers.get('x-file-name') ?? '').replace(/[\\/\r\n\0]/g, '_').slice(0, 180);
    } catch {
      throw new DomainError('Invalid filename.');
    }
    if (!filename.toLowerCase().endsWith('.pdf')) throw new DomainError('Choose a PDF file.');
    const mime = request.headers.get('content-type')?.split(';')[0];
    if (!['application/pdf', 'application/octet-stream'].includes(mime ?? '')) throw new DomainError('Choose a PDF file.');
    if (Number(request.headers.get('content-length')) > MAX_PDF_BYTES) throw new DomainError('Choose a PDF file up to 4 MB.', 413);

    const reader = request.body?.getReader();
    if (!reader) throw new DomainError('Choose a PDF file.');
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_PDF_BYTES) {
          await reader.cancel();
          throw new DomainError('Choose a PDF file up to 4 MB.', 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (total < 8) throw new DomainError('The PDF file is empty or invalid.');
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new DomainError('The uploaded file is not a PDF.');
    try {
      const document = await PDFDocument.load(bytes);
      if (document.getPageCount() === 0) throw new Error('No pages');
    } catch { throw new DomainError('The PDF could not be opened.'); }

    const id = crypto.randomUUID();
    const title = filename.replace(/\.pdf$/i, '').slice(0, 120) || 'Student document';
    await database().batch([
      statement(
        `INSERT INTO custom_document_templates
         (id,tenant_id,created_at,created_by,title,instructions,category,fields_json,status,version,original_filename,pdf_base64)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        id, user.tenantId, new Date().toISOString(), user.id, title,
        'Read the instructions in the PDF and complete the document.', 'CLEARANCE', '[]', 'PUBLISHED', 1,
        filename, Buffer.from(bytes).toString('base64'),
      ),
      auditStatement(user.id, 'PDF_TEMPLATE_UPLOADED', id, filename),
    ]);
    return Response.json({ id, title, filename }, { status: 201, headers });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET=withConsent(handlerGET);

export const POST=withConsent(handlerPOST);
