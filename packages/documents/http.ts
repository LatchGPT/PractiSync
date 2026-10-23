import { ZodError } from 'zod';
import { DomainError } from '../domain/policies';
import { RequestBodyError } from '../validation/request-body';
export function letterError(error: unknown) {
  const detail = error instanceof Error ? error.message : '';
  if ((/version|revision/.test(detail) && /not.null|23502/i.test(detail)) || (/document_submissions|native_document/.test(detail) && /unique constraint|23505/i.test(detail))) return Response.json({ error: 'This document changed in another session. Reload before continuing.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  const status = error instanceof DomainError || error instanceof RequestBodyError ? error.status : error instanceof ZodError ? 400 : 500;
  const message = error instanceof ZodError ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : error instanceof DomainError || error instanceof RequestBodyError ? error.message : 'Could not process the recommendation letter. Please try again.';
  if (!(error instanceof DomainError || error instanceof RequestBodyError || error instanceof ZodError)) console.error('Recommendation letter request failed:', error);
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
