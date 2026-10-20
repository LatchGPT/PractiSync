import { DomainError } from '../domain/policies';
import { RequestBodyError } from './request-body';
import { ZodError } from 'zod';
const headers = { 'Cache-Control': 'private, no-store' };
export function verificationError(error: unknown) {
 const known = error instanceof DomainError || error instanceof RequestBodyError;
 return Response.json({ error: known ? error.message : error instanceof ZodError ? 'Check the highlighted details.' : 'Verification is temporarily unavailable. Your submitted details are safe. Try again shortly.', ...(error instanceof ZodError ? { fieldErrors: error.flatten().fieldErrors } : {}) }, { status: known ? error.status : error instanceof ZodError ? 400 : 503, headers });
}
