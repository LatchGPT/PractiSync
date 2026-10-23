import { withConsent } from '@/packages/privacy/api-guard';
import { identity } from '@/packages/auth/auth';
import { one,statement } from '@/packages/db/demo';
import { DomainError,requireRole } from '@/packages/domain/policies';
import { letterError } from '@/packages/documents/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function handlerGET(request:Request,{params}:{params:Promise<{id:string}>}){try{
  const user=await identity(request);requireRole(user,'STUDENT');const {id}=await params;
  const row=await one('SELECT * FROM native_generated_documents WHERE tenant_id=? AND user_id=? AND id=?',user.tenantId,user.id,id);if(!row)throw new DomainError('Generated document not found.',404);
  if(String(row.expiresAt)<new Date().toISOString()||row.expiredAt||!row.fileBase64){await statement("UPDATE native_generated_documents SET file_base64='',expired_at=? WHERE tenant_id=? AND id=?",new Date().toISOString(),user.tenantId,id).run();throw new DomainError('This download expired. Regenerate it from your document history.',410);}
  const bytes=Buffer.from(String(row.fileBase64),'base64'),format=String(row.format);
  return new Response(bytes,{headers:{'Content-Type':format==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf','Content-Disposition':`attachment; filename="Completed-Document.${format}"`,'Content-Length':String(bytes.length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(error){return letterError(error);}}

export const GET=withConsent(handlerGET);
