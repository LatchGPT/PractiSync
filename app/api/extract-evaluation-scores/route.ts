import { identity } from '@/packages/auth/auth';
import { database, one } from '@/packages/db/demo';
import { DomainError, requireRole } from '@/packages/domain/policies';
import { extractScoresFromPdf } from '@/packages/domain/pdf-score-extractor';
import { evaluationQuestions } from '@/packages/validation/hte';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) {
      throw new DomainError('Request origin is not allowed.', 403);
    }
    const user = await identity(request);
    requireRole(user, 'STUDENT', 'COORDINATOR', 'SUPER_ADMIN');

    const body = (await request.json()) as { pdfBase64?: string; templateId?: string };
    if (!body?.pdfBase64 || typeof body.pdfBase64 !== 'string') {
      throw new DomainError('A valid PDF file in base64 format is required.', 400);
    }

    const cleanBase64 = body.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const bytes = Buffer.from(cleanBase64, 'base64');
    if (bytes.length > 5 * 1024 * 1024) {
      throw new DomainError('Evaluation PDF must be 5 MB or smaller.', 413);
    }
    if (bytes.subarray(0, 5).toString() !== '%PDF-') {
      throw new DomainError('Uploaded file is not a valid PDF.', 400);
    }

    let questions: { key: string; label: string; options?: string[] }[] = [];
    if (body.templateId) {
      const template = await one(
        "SELECT questions_json FROM hte_evaluation_templates WHERE tenant_id=? AND id=? AND status IN ('PUBLISHED','ARCHIVED')",
        user.tenantId,
        body.templateId
      );
      if (template?.questionsJson) {
        try {
          questions = evaluationQuestions.parse(JSON.parse(String(template.questionsJson)));
        } catch {
          // ignore corrupted JSON fallback
        }
      }
    }

    if (!questions.length) {
      const activeTemplate = await one(
        "SELECT questions_json FROM hte_evaluation_templates WHERE tenant_id=? AND status='PUBLISHED' LIMIT 1",
        user.tenantId
      );
      if (activeTemplate?.questionsJson) {
        try {
          questions = evaluationQuestions.parse(JSON.parse(String(activeTemplate.questionsJson)));
        } catch {}
      }
    }

    const extracted = await extractScoresFromPdf(bytes, questions);

    return Response.json({
      success: true,
      scores: extracted.scores,
      recommendations: extracted.recommendations,
      method: extracted.method,
      fieldCount: extracted.fieldCount,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json(
      { error: error instanceof DomainError ? error.message : 'Could not analyze evaluation PDF.' },
      { status: error instanceof DomainError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
