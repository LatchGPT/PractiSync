import { identity } from '@/packages/auth/auth';
import { requireRole,DomainError } from '@/packages/domain/policies';
import { letterError } from '@/packages/documents/http';
import { openNativeDocx } from '@/packages/documents/native-docx';
import { scanDocx } from '@/packages/documents/native-infrastructure';
import { createNativeTemplate } from '@/packages/documents/native-repository';
export const runtime='nodejs';export const maxDuration=120;
export async function POST(request:Request){try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
  const user=await identity(request);requireRole(user,'SUPER_ADMIN');let filename:string;try{filename=decodeURIComponent(request.headers.get('x-file-name')??'').replace(/[\\/\r\n\0]/g,'_').slice(0,180);}catch{throw new DomainError('Invalid filename.');}
  if(!filename.toLowerCase().endsWith('.docx')||filename.toLowerCase().endsWith('.docm'))throw new DomainError('Only standard DOCX files are accepted. Macro-enabled files are not supported.');
  const mime=request.headers.get('content-type')?.split(';')[0];if(!['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/octet-stream'].includes(mime??''))throw new DomainError('Choose a DOCX file.');
  const max=4*1024*1024;if(Number(request.headers.get('content-length'))>max)throw new DomainError('Choose a DOCX file up to 4 MB.',413);
  const reader=request.body?.getReader();if(!reader)throw new DomainError('Choose a DOCX file.');const chunks:Uint8Array[]=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw new DomainError('Choose a DOCX file up to 4 MB.',413);}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{await openNativeDocx(bytes);}catch(error){throw new DomainError(error instanceof Error?error.message:'Invalid DOCX document.');}
  await scanDocx(bytes);const version=await createNativeTemplate(user,filename,bytes);
  return Response.json({version},{headers:{'Cache-Control':'no-store'}});
}catch(error){return letterError(error);}}
