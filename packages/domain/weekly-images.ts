import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { one } from '../db/demo';
import type { Identity } from '../validation/contracts';
import { DomainError } from './policies';
import { weeklyReportAccess } from './weekly-reports';

const maxBytes=5*1024*1024;
const root=()=>resolve(/*turbopackIgnore: true*/ process.env.PRACTISYNC_WEEKLY_IMAGE_DIR||join(process.cwd(),'.local','weekly-images'));
function imagePath(id:string){if(!/^[0-9a-f-]{36}$/.test(id))throw new DomainError('Image unavailable.',404);return join(root(),id);}
export async function readImageBody(request:Request){
  if(Number(request.headers.get('content-length'))>maxBytes)throw new DomainError('Each image must be 5 MB or smaller.',413);
  if(!request.body)throw new DomainError('Choose an image.');
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new DomainError('Each image must be 5 MB or smaller.',413);}chunks.push(value);}}finally{reader.releaseLock();}
  return Buffer.concat(chunks);
}
export async function uploadWeeklyImage(user:Identity,reportId:string,input:Buffer,name:string){
  await weeklyReportAccess(user,reportId,true);
  if(input.length>maxBytes)throw new DomainError('Each image must be 5 MB or smaller.',413);
  let bytes:Buffer,mime:string;
  try{
    const decoder=sharp(input,{limitInputPixels:20_000_000,animated:false});
    const metadata=await decoder.metadata();
    if(!['jpeg','png','webp'].includes(metadata.format||'')||(metadata.pages??1)>1)throw new Error('format');
    // Re-encoding strips EXIF/GPS and any embedded file payloads.
    bytes=await decoder.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();mime='image/webp';
  }catch{throw new DomainError('Choose a readable JPEG, PNG or WebP image (up to 20 megapixels).');}
  const id=crypto.randomUUID();await mkdir(root(),{recursive:true});await writeFile(imagePath(id),bytes,{flag:'wx',mode:0o600});
  try{
    const inserted=await one(`INSERT INTO weekly_report_images (id,tenant_id,created_at,report_id,name,mime) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM weekly_reports WHERE tenant_id=? AND id=? AND status='DRAFT') AND (SELECT COUNT(*) FROM weekly_report_images WHERE tenant_id=? AND report_id=?)<5 RETURNING id`,id,user.tenantId,new Date().toISOString(),reportId,name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,160)||'Weekly evidence',mime,user.tenantId,reportId,user.tenantId,reportId);
    if(!inserted)throw new DomainError('A report supports up to five images, and must still be a draft.',409);
  }catch(e){await unlink(imagePath(id)).catch(()=>{});throw e;}
  return {id,name};
}
export async function getWeeklyImage(user:Identity,id:string){
  const image=await one('SELECT * FROM weekly_report_images WHERE tenant_id=? AND id=?',user.tenantId,id);
  if(!image)throw new DomainError('Image unavailable.',404);
  await weeklyReportAccess(user,String(image.reportId));
  try{return {bytes:await readFile(imagePath(id)),mime:String(image.mime)};}catch{throw new DomainError('This image file is temporarily unavailable.',503);}
}
export async function deleteWeeklyImage(user:Identity,id:string){
  const image=await one('SELECT * FROM weekly_report_images WHERE tenant_id=? AND id=?',user.tenantId,id);
  if(!image)throw new DomainError('Image unavailable.',404);
  await weeklyReportAccess(user,String(image.reportId),true);
  const removed=await one("DELETE FROM weekly_report_images WHERE tenant_id=? AND id=? AND EXISTS (SELECT 1 FROM weekly_reports r WHERE r.id=weekly_report_images.report_id AND r.tenant_id=weekly_report_images.tenant_id AND r.status='DRAFT') RETURNING id",user.tenantId,id);
  if(!removed)throw new DomainError('This report is finalized.',409);
  await unlink(imagePath(id)).catch(()=>{});
}
