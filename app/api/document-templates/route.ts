import { identity } from '@/packages/auth/auth';
import { auditStatement, database, insert } from '@/packages/db/demo';
import { DomainError } from '@/packages/domain/policies';
export const dynamic='force-dynamic';
const MAX_PDF_BYTES=8*1024*1024;

export async function POST(request:Request){
  try{
    const origin=request.headers.get('origin');
    if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Request origin is not allowed.'},{status:403,headers:{'Cache-Control':'no-store'}});
    const user=await identity(request);
    if(user.role!=='SUPER_ADMIN')throw new DomainError('Only a Super Admin can upload student PDF templates.',403);
    const length=Number(request.headers.get('content-length'));
    if(Number.isFinite(length)&&length>MAX_PDF_BYTES+128_000)return Response.json({error:'PDF exceeds the 8 MB limit.'},{status:413,headers:{'Cache-Control':'no-store'}});
    if(!request.body)throw new DomainError('Choose a PDF to upload.');
    const reader=request.body.getReader();const chunks:Uint8Array[]=[];let total=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_PDF_BYTES+128_000){await reader.cancel();return Response.json({error:'PDF exceeds the 8 MB limit.'},{status:413,headers:{'Cache-Control':'no-store'}});}chunks.push(value);}}finally{reader.releaseLock();}
    const body=new Uint8Array(total);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
    const form=await new Response(body,{headers:{'content-type':request.headers.get('content-type')??''}}).formData();
    const file=form.get('file');if(!(file instanceof File)||file.size<8||file.size>MAX_PDF_BYTES)throw new DomainError('Choose a PDF file smaller than 8 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-'||(!file.type.toLowerCase().includes('pdf')&&file.type!==''))throw new DomainError('The uploaded file is not a valid PDF.');
    const filename=file.name.replace(/[\\/\r\n\0]/g,'_').slice(0,180)||'student-document.pdf';
    const title=filename.replace(/\.pdf$/i,'').slice(0,120)||'Student document';
    const id=crypto.randomUUID();
    await database().batch([insert('custom_document_templates',{created_by:user.id,title,instructions:'Complete the highlighted fields. Read any instructions printed in the document.',category:'CLEARANCE',fields_json:'[]',status:'PUBLISHED',version:1,original_filename:filename,pdf_base64:Buffer.from(bytes).toString('base64')},id),auditStatement(user.id,'PDF_TEMPLATE_UPLOADED',id,filename)]);
    return Response.json({id,title,filename},{headers:{'Cache-Control':'no-store'}});
  }catch(error){const status=error instanceof DomainError?error.status:400;const message=error instanceof DomainError?error.message:'PDF upload failed.';return Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}
}
