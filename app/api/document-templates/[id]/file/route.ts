import { identity } from '@/packages/auth/auth';
import { one } from '@/packages/db/demo';
import { DomainError } from '@/packages/domain/policies';
export const dynamic='force-dynamic';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await identity(request);const {id}=await params;
    const template=await one('SELECT id,original_filename,pdf_base64,fields_json,status FROM custom_document_templates WHERE tenant_id=? AND id=?',user.tenantId,id);
    if(!template)throw new DomainError('PDF template not found.',404);
    if(user.role==='STUDENT'){
      const placement=await one('SELECT id FROM placements WHERE tenant_id=? AND student_id=? AND status IN (\'PLANNED\',\'ACTIVE\') LIMIT 1',user.tenantId,user.id);
      if(!placement||template.status!=='PUBLISHED'||String(template.fieldsJson)==='[]')throw new DomainError('PDF template not found.',404);
    }else if(user.role==='COORDINATOR'){
      const scoped=await one('SELECT r.id FROM custom_document_responses r JOIN placements p ON p.id=r.placement_id AND p.tenant_id=r.tenant_id JOIN classes c ON c.id=p.class_id AND c.tenant_id=p.tenant_id WHERE r.tenant_id=? AND r.template_id=? AND c.coordinator_id=? LIMIT 1',user.tenantId,id,user.id);
      if(!scoped)throw new DomainError('PDF template not found.',404);
    }else if(user.role!=='SUPER_ADMIN')throw new DomainError('You do not have permission to view this PDF.',403);
    const bytes=Buffer.from(String(template.pdfBase64),'base64');
    const filename=String(template.originalFilename||'student-document.pdf').replace(/["\r\n]/g,'_');
    return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Length':String(bytes.byteLength),'Content-Disposition':`inline; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }catch(error){const status=error instanceof DomainError?error.status:400;return Response.json({error:error instanceof DomainError?error.message:'Could not load PDF.'},{status,headers:{'Cache-Control':'no-store'}});}
}
