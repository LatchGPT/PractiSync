import { withConsent } from '@/packages/privacy/api-guard';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';
import { identity } from '@/packages/auth/auth';
import { auditStatement, database, insert } from '@/packages/db/demo';
import { DomainError, requireRole } from '@/packages/domain/policies';
import type { EvaluationQuestion } from '@/packages/validation/hte';

export const runtime = 'nodejs';
async function handlerPOST(request: Request) {
 try {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new DomainError('Request origin is not allowed.', 403);
  const user = await identity(request); requireRole(user, 'SUPER_ADMIN');
  let filename: string;
  try { filename = decodeURIComponent(request.headers.get('x-file-name') ?? '').replace(/[\\/\r\n\0]/g, '_').slice(0, 180); }
  catch { throw new DomainError('Invalid filename.'); }
  if (!filename.toLowerCase().endsWith('.pdf') || request.headers.get('content-type')?.split(';')[0] !== 'application/pdf') throw new DomainError('Upload the school evaluation as a PDF.');
  const max = 4 * 1024 * 1024;
  if (Number(request.headers.get('content-length')) > max) throw new DomainError('PDF must be 4 MB or smaller.', 413);
  const reader = request.body?.getReader(); if (!reader) throw new DomainError('Choose a PDF file.');
  const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > max) { await reader.cancel(); throw new DomainError('PDF must be 4 MB or smaller.', 413); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  if (bytes.subarray(0,5).toString() !== '%PDF-') throw new DomainError('This file is not a PDF.');
  let pdf: PDFDocument;
  try { pdf = await PDFDocument.load(bytes); if (!pdf.getPageCount()) throw new Error('No pages'); }
  catch { throw new DomainError('The PDF cannot be opened. Upload an unencrypted, valid PDF.'); }
  const questions: EvaluationQuestion[] = [];
  for (const field of pdf.getForm().getFields()) {
   if (field.isReadOnly()) continue;
   const options = field instanceof PDFCheckBox ? ['Yes','No'] : field instanceof PDFDropdown || field instanceof PDFRadioGroup ? field.getOptions().filter(Boolean).slice(0,20) : [];
   if (!(field instanceof PDFTextField) && options.length < 2) continue;
   questions.push({ key: `question${questions.length + 1}`, label: field.getName().slice(0,500), type: options.length ? 'select' : 'text', required: field.isRequired(), options });
   if (questions.length === 60) break;
  }
  const id = crypto.randomUUID();
  await database().batch([insert('hte_evaluation_templates', { tenant_id: user.tenantId, created_by: user.id, title: filename.replace(/\.pdf$/i,'').slice(0,160), filename, pdf_base64: bytes.toString('base64'), questions_json: JSON.stringify(questions), status: 'DRAFT' }, id), auditStatement(user.id, 'HTE_EVALUATION_UPLOADED', id)]);
  return Response.json({ id, message: 'PDF uploaded as a draft. Check the questions and publish when ready.' }, { status: 201, headers: { 'Cache-Control':'no-store' } });
 } catch (e) {
  return Response.json({ error: e instanceof DomainError ? e.message : 'The evaluation PDF could not be uploaded.' }, { status: e instanceof DomainError ? e.status : 500, headers: { 'Cache-Control':'no-store' } });
 }
}

export const POST=withConsent(handlerPOST);
