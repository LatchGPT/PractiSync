import { createHash } from 'node:crypto';
import { auditStatement, database, insert, list, one, statement } from '../db/demo';
import { DomainError } from '../domain/policies';
import type { Identity, Row } from '../validation/contracts';
import { availableDocumentFonts } from './native-infrastructure';
import { buildNativeDocx, openNativeDocx } from './native-docx';
import { nativeFieldSchema, validateFieldConfiguration, type NativeField, type NativeVersion } from './native-types';

export const sha256=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');
export async function nativeVersion(tenantId:string,id:string):Promise<NativeVersion>{
  const row=await one('SELECT v.*,t.name,s.filename,s.sha256,s.fonts_json FROM native_document_versions v JOIN native_document_templates t ON t.id=v.template_id AND t.tenant_id=v.tenant_id JOIN native_document_sources s ON s.id=v.source_id AND s.tenant_id=v.tenant_id WHERE v.tenant_id=? AND v.id=?',tenantId,id);
  if(!row)throw new DomainError('Document template version not found.',404);
  const fonts=JSON.parse(String(row.fontsJson)) as string[];const available=await availableDocumentFonts();
  return{id:row.id,templateId:String(row.templateId),name:String(row.name),version:Number(row.version),revision:Number(row.revision),status:String(row.status),sourceId:String(row.sourceId),sourceHash:String(row.sha256),filename:String(row.filename),fonts,missingFonts:fonts.filter(font=>!available.some(name=>name.toLowerCase()===font.toLowerCase())),originalPages:Number(row.originalPages),fields:(JSON.parse(String(row.fieldsJson)) as unknown[]).map(f=>nativeFieldSchema.parse(f))};
}
export async function sourceBytes(tenantId:string,sourceId:string){const source=await one('SELECT content_base64 FROM native_document_sources WHERE tenant_id=? AND id=?',tenantId,sourceId);if(!source)throw new DomainError('Original document not found.',404);return Buffer.from(String(source.contentBase64),'base64');}
export async function authorizedVersion(user:Identity,id:string,allowPublished=true){
  const version=await nativeVersion(user.tenantId,id);
  if(user.role==='SUPER_ADMIN')return version;
  if(user.role!=='STUDENT')throw new DomainError('You do not have access to the document generator.',403);
  if(allowPublished&&version.status==='PUBLISHED')return version;
  const own=await one('SELECT id FROM native_document_drafts WHERE tenant_id=? AND user_id=? AND version_id=?',user.tenantId,user.id,id);
  if(!own)throw new DomainError('Document version not found.',404);return version;
}
export async function ownNativeDraft(user:Identity,id:string){const row=await one('SELECT * FROM native_document_drafts WHERE tenant_id=? AND user_id=? AND id=?',user.tenantId,user.id,id);if(!row)throw new DomainError('Draft not found.',404);return row;}
export async function createNativeTemplate(user:Identity,filename:string,bytes:Uint8Array,fields:NativeField[]=[],name?:string){
  const parsed=await openNativeDocx(bytes);const sourceId=crypto.randomUUID(),templateId=crypto.randomUUID(),versionId=crypto.randomUUID(),now=new Date().toISOString();
  const tokenized=fields.length?await buildNativeDocx(bytes,fields,{},'tokenized'):Buffer.from(bytes);
  await database().batch([
    insert('native_document_sources',{tenant_id:user.tenantId,created_by:user.id,filename,sha256:sha256(bytes),content_base64:Buffer.from(bytes).toString('base64'),fonts_json:JSON.stringify(parsed.fonts),scanned_at:now},sourceId),
    insert('native_document_templates',{tenant_id:user.tenantId,created_by:user.id,name:name||filename.replace(/\.docx$/i,''),status:'ACTIVE',last_version:1},templateId),
    insert('native_document_versions',{tenant_id:user.tenantId,template_id:templateId,source_id:sourceId,version:1,revision:1,status:'WORKING',fields_json:JSON.stringify(fields),tokenized_base64:tokenized.toString('base64')},versionId),
    auditStatement(user.id,'NATIVE_TEMPLATE_UPLOADED',templateId),
  ]);return nativeVersion(user.tenantId,versionId);
}
function fieldRows(tenantId:string,versionId:string,fields:NativeField[]){return fields.flatMap(field=>{
  const id=`${versionId}-${field.id}`;
  return[insert('native_document_fields',{tenant_id:tenantId,version_id:versionId,variable_key:field.key,label:field.label,type:field.type,config_json:JSON.stringify({...field,occurrences:undefined}),display_order:field.order},id),...field.occurrences.map(o=>insert('native_document_occurrences',{tenant_id:tenantId,field_id:id,location_json:JSON.stringify(o)},`${versionId}-${o.id}`))];
});}
export async function saveNativeFields(user:Identity,version:NativeVersion,fields:NativeField[],publish=false){
  if(version.status!=='WORKING')throw new DomainError('Published versions are immutable. Start a new version to edit.',409);
  if(publish)validateFieldConfiguration(fields);
  const bytes=await sourceBytes(user.tenantId,version.sourceId);const parsed=await openNativeDocx(bytes);
  const ranges=new Map<string,{start:number;end:number}[]>();
  for(const field of fields)for(const o of field.occurrences){
    const p=parsed.paragraphs.find(p=>p.part===o.part&&p.index===o.paragraph);
    if(!p||p.text.slice(o.start,o.end)!==o.originalText)throw new DomainError('The marked text does not match the original document.');
    const key=`${o.part}:${o.paragraph}`,prior=ranges.get(key)??[];if(prior.some(r=>o.start<r.end&&o.end>r.start))throw new DomainError('Marked fields cannot overlap.');prior.push(o);ranges.set(key,prior);
  }
  const tokenized=await buildNativeDocx(bytes,fields,{},'tokenized');const now=new Date().toISOString();
  await database().batch([
    statement("UPDATE native_document_versions SET revision=CASE WHEN revision=? AND status='WORKING' THEN revision+1 ELSE NULL END,fields_json=?,tokenized_base64=?,status=?,published_at=? WHERE tenant_id=? AND id=?",version.revision,JSON.stringify(fields),tokenized.toString('base64'),publish?'PUBLISHED':'WORKING',publish?now:null,user.tenantId,version.id),
    statement('DELETE FROM native_document_occurrences WHERE tenant_id=? AND field_id IN (SELECT id FROM native_document_fields WHERE tenant_id=? AND version_id=?)',user.tenantId,user.tenantId,version.id),
    statement('DELETE FROM native_document_fields WHERE tenant_id=? AND version_id=?',user.tenantId,version.id),...fieldRows(user.tenantId,version.id,fields),
    ...(publish?[statement('UPDATE native_document_templates SET published_version_id=? WHERE tenant_id=? AND id=?',version.id,user.tenantId,version.templateId)]:[]),auditStatement(user.id,publish?'NATIVE_TEMPLATE_PUBLISHED':'NATIVE_FIELDS_UPDATED',version.id),
  ]);return nativeVersion(user.tenantId,version.id);
}
export async function editNativeVersion(user:Identity,version:NativeVersion){
  const existing=await one("SELECT id FROM native_document_versions WHERE tenant_id=? AND template_id=? AND status='WORKING' ORDER BY version DESC LIMIT 1",user.tenantId,version.templateId);
  if(existing)return nativeVersion(user.tenantId,existing.id);
  const template=await one('SELECT last_version FROM native_document_templates WHERE tenant_id=? AND id=?',user.tenantId,version.templateId);const next=Number(template?.lastVersion??version.version)+1,id=crypto.randomUUID();
  const tokenized=await buildNativeDocx(await sourceBytes(user.tenantId,version.sourceId),version.fields,{},'tokenized');
  await database().batch([
    statement('UPDATE native_document_templates SET last_version=CASE WHEN last_version=? THEN last_version+1 ELSE NULL END WHERE tenant_id=? AND id=?',next-1,user.tenantId,version.templateId),
    insert('native_document_versions',{tenant_id:user.tenantId,template_id:version.templateId,source_id:version.sourceId,version:next,revision:1,status:'WORKING',fields_json:JSON.stringify(version.fields),tokenized_base64:tokenized.toString('base64'),original_pages:version.originalPages},id),
    ...fieldRows(user.tenantId,id,version.fields),
  ]);return nativeVersion(user.tenantId,id);
}
export function draftJson(row:Row){return{id:row.id,versionId:String(row.versionId),values:JSON.parse(String(row.valuesJson)),revision:Number(row.revision),updatedAt:String(row.updatedAt),templateName:String(row.templateName),templateVersion:Number(row.templateVersion)};}
export async function expireNativeFiles(){const now=new Date().toISOString();await statement("UPDATE native_generated_documents SET file_base64='',expired_at=? WHERE expires_at<? AND expired_at IS NULL",now,now).run();await statement('DELETE FROM native_document_render_cache WHERE expires_at<?',now).run();}
export async function listNativeDocuments(user:Identity){
  await expireNativeFiles();
  const versions=await list(`SELECT v.id FROM native_document_versions v JOIN native_document_templates t ON t.id=v.template_id AND t.tenant_id=v.tenant_id WHERE v.tenant_id=? ${user.role==='SUPER_ADMIN'?"AND (v.status='WORKING' OR v.id=t.published_version_id)":"AND v.id=t.published_version_id"} ORDER BY v.created_at DESC`,user.tenantId);
  const templates=await Promise.all(versions.map(v=>nativeVersion(user.tenantId,v.id)));
  const drafts=user.role==='STUDENT'?await list('SELECT d.*,t.name AS template_name,v.version AS template_version FROM native_document_drafts d JOIN native_document_versions v ON v.id=d.version_id AND v.tenant_id=d.tenant_id JOIN native_document_templates t ON t.id=v.template_id AND t.tenant_id=v.tenant_id WHERE d.tenant_id=? AND d.user_id=? ORDER BY d.updated_at DESC LIMIT 100',user.tenantId,user.id):[];
  const documents=user.role==='STUDENT'?await list('SELECT g.id,g.draft_id,g.format,g.created_at,g.expires_at,g.expired_at,t.name AS template_name,v.version AS template_version FROM native_generated_documents g JOIN native_document_versions v ON v.id=g.version_id AND v.tenant_id=g.tenant_id JOIN native_document_templates t ON t.id=v.template_id AND t.tenant_id=v.tenant_id WHERE g.tenant_id=? AND g.user_id=? ORDER BY g.created_at DESC LIMIT 100',user.tenantId,user.id):[];
  return{templates,drafts:drafts.map(draftJson),documents:documents.map(d=>({id:d.id,draftId:d.draftId,format:d.format,createdAt:d.createdAt,expiresAt:d.expiresAt,expired:!!d.expiredAt,templateName:d.templateName,templateVersion:Number(d.templateVersion)}))};
}
