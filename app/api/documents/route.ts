import {identity} from '../../../packages/auth/auth';
import {database,one,insert,auditStatement,statement} from '../../../packages/db/demo';
import {placementFor} from '../../../packages/domain/actions';
import {requireFeature} from '../../../packages/domain/features';
import {DomainError,requireRole} from '../../../packages/domain/policies';

export const dynamic='force-dynamic';
const names=['Training agreement','Parent / guardian consent','Student information sheet'] as const;
const maxBytes=1024*1024;
const originAllowed=(request:Request)=>request.headers.get('origin')===new URL(request.url).origin;
function responseError(error:unknown){return Response.json({error:error instanceof DomainError?error.message:'The document request could not be completed.'},{status:error instanceof DomainError?error.status:400});}
function fileType(bytes:Uint8Array){
 if(bytes.length>=5&&String.fromCharCode(...bytes.slice(0,5))==='%PDF-')return 'application/pdf';
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value))return 'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 throw new DomainError('Choose a PDF, PNG, or JPEG file.');
}
const toBase64=(bytes:Uint8Array)=>{let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.slice(i,i+8192));return btoa(binary);};
const fromBase64=(value:string)=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));

export async function POST(request:Request){try{
 if(!originAllowed(request))throw new DomainError('Request origin is not allowed.',403);
 if(Number(request.headers.get('content-length')??0)>maxBytes+30000)throw new DomainError('File must be 1 MB or smaller.',413);
 const user=await identity(request);requireRole(user,'STUDENT');await requireFeature(user,'documents');
 const body=await request.formData();const file=body.get('file');const name=body.get('name');const placementId=body.get('placementId');
 if(typeof name!=='string'||!names.includes(name as typeof names[number])||typeof placementId!=='string'||!(file instanceof File))throw new DomainError('Choose a required document type and file.');
 if(file.size===0||file.size>maxBytes)throw new DomainError('File must be between 1 byte and 1 MB.',413);
 const placement=await placementFor(user,placementId);
 const bytes=new Uint8Array(await file.arrayBuffer());const contentType=fileType(bytes);const filename=file.name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120)||'submission';
 const existing=await one('SELECT id,status,content_base64 FROM documents WHERE tenant_id=? AND placement_id=? AND name=? ORDER BY created_at DESC LIMIT 1',user.tenantId,placement.id,name);
 if(existing?.status==='APPROVED'&&existing.contentBase64)throw new DomainError('An approved document is already on record.');
 const id=String(existing?.id??crypto.randomUUID());const content=toBase64(bytes);
 const writes=existing?[statement("UPDATE documents SET filename=?,content_type=?,content_base64=?,status='PENDING',reason=NULL,reviewer_id=NULL,version=version+1 WHERE tenant_id=? AND id=?",filename,contentType,content,user.tenantId,id)]:[insert('documents',{placement_id:placement.id,name,filename,status:'PENDING',content_type:contentType,content_base64:content},id)];
 await database().batch([...writes,auditStatement(user.id,'DOCUMENT_SUBMIT',id)]);
 return Response.json({message:'Document submitted for coordinator review.',id},{headers:{'Cache-Control':'no-store'}});
}catch(error){return responseError(error);}}

export async function GET(request:Request){try{
 const user=await identity(request);requireRole(user,'STUDENT','COORDINATOR','SUPER_ADMIN');await requireFeature(user,'documents');
 const id=new URL(request.url).searchParams.get('id');if(!id)throw new DomainError('Document ID is required.');
 const row=await one('SELECT * FROM documents WHERE tenant_id=? AND id=?',user.tenantId,id);if(!row)throw new DomainError('Document not found.',404);
 await placementFor(user,String(row.placementId));
 if(!row.contentBase64||!row.contentType)throw new DomainError('This sample has no downloadable file.',404);
 const bytes=fromBase64(String(row.contentBase64));const filename=String(row.filename).replace(/[^a-zA-Z0-9._ -]/g,'_');
 await database().batch([auditStatement(user.id,'DOCUMENT_DOWNLOAD',id)]);
 return new Response(bytes,{headers:{'Content-Type':String(row.contentType),'Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(error){return responseError(error);}}
