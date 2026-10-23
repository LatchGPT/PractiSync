import { withConsent } from '@/packages/privacy/api-guard';
import { z } from 'zod';
import { identity } from '@/packages/auth/auth';
import { requireRole,DomainError } from '@/packages/domain/policies';
import { readJsonObject } from '@/packages/validation/request-body';
import { letterError } from '@/packages/documents/http';
import { authorizedVersion,sourceBytes } from '@/packages/documents/native-repository';
import { openNativeDocx,type WordParagraph } from '@/packages/documents/native-docx';
import { mergePreviewValues,renderNativePdf } from '@/packages/documents/native-queue';
import { nativeFieldSchema,resolveNativeValues,valuesSchema,type NativeField } from '@/packages/documents/native-types';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=120;
function validatePreviewFields(fields:NativeField[],paragraphs:WordParagraph[]){
  const keys=new Set<string>(),ids=new Set<string>(),ranges=new Map<string,{start:number;end:number}[]>();
  for(const field of fields){
    if(keys.has(field.key)||ids.has(field.id))throw new DomainError('Preview fields must have unique names and IDs.');keys.add(field.key);ids.add(field.id);
    for(const occurrence of field.occurrences){
      const paragraph=paragraphs.find(item=>item.part===occurrence.part&&item.index===occurrence.paragraph);
      if(!paragraph||occurrence.end<=occurrence.start||paragraph.text.slice(occurrence.start,occurrence.end)!==occurrence.originalText)throw new DomainError('A marked location no longer matches the original document.');
      const key=`${occurrence.part}:${occurrence.paragraph}`,prior=ranges.get(key)??[];
      if(prior.some(range=>occurrence.start<range.end&&occurrence.end>range.start))throw new DomainError('Preview fields cannot overlap.');
      prior.push({start:occurrence.start,end:occurrence.end});ranges.set(key,prior);
    }
  }
}
async function handlerPOST(request:Request){try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
  const user=await identity(request);requireRole(user,'STUDENT','SUPER_ADMIN');
  const input=z.object({versionId:z.string().min(1).max(120),sessionId:z.string().uuid(),sequence:z.number().int().min(1),delta:valuesSchema,original:z.boolean().default(false),clean:z.boolean().default(false),fields:z.array(nativeFieldSchema).max(80).optional()}).parse(await readJsonObject(request,500_000));
  const version=await authorizedVersion(user,input.versionId);if(input.original&&user.role!=='SUPER_ADMIN')throw new DomainError('Only an admin can mark original template text.',403);
  const previewFields=input.fields??version.fields;
  if(input.fields){
    requireRole(user,'SUPER_ADMIN');if(version.status!=='WORKING')throw new DomainError('Unsaved field previews are only available on a working copy.',409);
    const source=await openNativeDocx(await sourceBytes(user.tenantId,version.sourceId));validatePreviewFields(input.fields,source.paragraphs);
  }
  const merged=await mergePreviewValues(`${user.tenantId}-${user.id}`,version.id,input.sessionId,input.sequence,input.delta);
  const fieldKeys=new Set(previewFields.map(field=>field.key)),currentValues=Object.fromEntries(Object.entries(merged).filter(([key])=>fieldKeys.has(key)));
  let values;try{values=resolveNativeValues(previewFields,currentValues);}catch(error){throw new DomainError(error instanceof Error?error.message:'Check the document fields.');}
  let originalPages=version.originalPages;if(!originalPages)originalPages=(await renderNativePdf(user,version,{},'raw')).pageCount;
  const rendered=await renderNativePdf(user,version,values,input.original?'original-preview':input.clean?'final':'preview',input.fields);
  return new Response(rendered.bytes,{headers:{'Content-Type':'application/pdf','Content-Length':String(rendered.bytes.length),'Cache-Control':'private, no-store','X-Document-Pages':String(rendered.pageCount),'X-Original-Pages':String(originalPages),'X-Render-Hash':rendered.hash,'X-Content-Type-Options':'nosniff'}});
}catch(error){return letterError(error);}}

export const POST=withConsent(handlerPOST);
