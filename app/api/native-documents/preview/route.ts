import { z } from 'zod';
import { identity } from '@/packages/auth/auth';
import { requireRole,DomainError } from '@/packages/domain/policies';
import { readJsonObject } from '@/packages/validation/request-body';
import { letterError } from '@/packages/documents/http';
import { authorizedVersion } from '@/packages/documents/native-repository';
import { mergePreviewValues,renderNativePdf } from '@/packages/documents/native-queue';
import { resolveNativeValues,valuesSchema } from '@/packages/documents/native-types';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=120;
export async function POST(request:Request){try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
  const user=await identity(request);requireRole(user,'STUDENT','SUPER_ADMIN');
  const input=z.object({versionId:z.string().min(1).max(120),sessionId:z.string().uuid(),sequence:z.number().int().min(1),delta:valuesSchema,original:z.boolean().default(false),clean:z.boolean().default(false)}).parse(await readJsonObject(request,200_000));
  const version=await authorizedVersion(user,input.versionId);if(input.original&&user.role!=='SUPER_ADMIN')throw new DomainError('Only an admin can mark original template text.',403);
  const merged=await mergePreviewValues(`${user.tenantId}-${user.id}`,version.id,input.sessionId,input.sequence,input.delta);
  let values;try{values=resolveNativeValues(version.fields,merged);}catch(error){throw new DomainError(error instanceof Error?error.message:'Check the document fields.');}
  let originalPages=version.originalPages;if(!originalPages)originalPages=(await renderNativePdf(user.tenantId,version,{},'raw')).pageCount;
  const rendered=await renderNativePdf(user.tenantId,version,values,input.original?'original-preview':input.clean?'final':'preview');
  return new Response(rendered.bytes,{headers:{'Content-Type':'application/pdf','Content-Length':String(rendered.bytes.length),'Cache-Control':'private, no-store','X-Document-Pages':String(rendered.pageCount),'X-Original-Pages':String(originalPages),'X-Render-Hash':rendered.hash,'X-Content-Type-Options':'nosniff'}});
}catch(error){return letterError(error);}}
