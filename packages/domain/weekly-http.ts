import { DomainError } from './policies';
import { RequestBodyError } from '../validation/request-body';
import { ZodError } from 'zod';
export function weeklyError(error:unknown) {
  const status=error instanceof DomainError||error instanceof RequestBodyError?error.status:error instanceof ZodError?400:503;
  return Response.json({error:error instanceof DomainError||error instanceof RequestBodyError?error.message:error instanceof ZodError?error.issues.slice(0,5).map(i=>`${i.path.join('.')}: ${i.message}`).join('; '):'Weekly reports are temporarily unavailable. Your input has been kept; please retry.'},{status,headers:{'Cache-Control':'private, no-store'}});
}
