import { withConsent } from '@/packages/privacy/api-guard';
import { z } from 'zod';
import { identity } from '@/packages/auth/auth';
import { auditStatement,database,insert,one,statement } from '@/packages/db/demo';
import { DomainError,requireRole } from '@/packages/domain/policies';
import { manilaToday } from '@/packages/domain/assessment-period';
import { readJsonObject } from '@/packages/validation/request-body';
import { letterError } from '@/packages/documents/http';
import { buildNativeDocx,openNativeDocx,selectionCandidates } from '@/packages/documents/native-docx';
import { authorizedVersion,draftJson,editNativeVersion,listNativeDocuments,nativeVersion,ownNativeDraft,saveNativeFields,sourceBytes } from '@/packages/documents/native-repository';
import { nativeFieldSchema,occurrenceSchema,newNativeField,resolveNativeValues,valuesSchema,validateFieldConfiguration,type NativeValues } from '@/packages/documents/native-types';
import { renderNativePdf } from '@/packages/documents/native-queue';
export const dynamic='force-dynamic';export const runtime='nodejs';export const maxDuration=120;
const headers={'Cache-Control':'private, no-store'};
const id=z.string().min(1).max(120);
async function handlerGET(request:Request){try{const user=await identity(request);requireRole(user,'STUDENT','SUPER_ADMIN');const data=await listNativeDocuments(user);return Response.json(data,{headers});}catch(error){return letterError(error);}}
async function handlerPOST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)throw new DomainError('Request origin is not allowed.',403);
    const user=await identity(request);requireRole(user,'STUDENT','SUPER_ADMIN');const body=await readJsonObject(request,500_000);
    if(body.action==='delete-template'){
      requireRole(user,'SUPER_ADMIN');
      const input=z.object({templateId:id}).parse(body.values);
      const template=await one("SELECT id FROM native_document_templates WHERE tenant_id=? AND id=? AND status='ACTIVE'",user.tenantId,input.templateId);
      if(!template)throw new DomainError('Document template not found.',404);
      await database().batch([
        statement("UPDATE native_document_templates SET status='ARCHIVED' WHERE tenant_id=? AND id=? AND status='ACTIVE'",user.tenantId,input.templateId),
        auditStatement(user.id,'NATIVE_TEMPLATE_DELETED',input.templateId),
      ]);
      return Response.json({ok:true},{headers});
    }
    if(['edit','locate','mark','save-fields','publish'].includes(String(body.action))){
      requireRole(user,'SUPER_ADMIN');
      const input=z.object({versionId:id,revision:z.number().int().positive().optional()}).passthrough().parse(body.values);
      const version=await nativeVersion(user.tenantId,input.versionId);
      if(body.action==='edit')return Response.json({version:await editNativeVersion(user,version)},{headers});
      if(version.status!=='WORKING')throw new DomainError('Published templates are immutable. Edit the template to make changes.',409);
      if(input.revision!==undefined&&input.revision!==version.revision)throw new DomainError('This working copy changed. Reload it before editing.',409);
      if(body.action==='locate'){
        const selection=z.object({quote:z.string().min(1).max(2000),before:z.string().max(300).default(''),after:z.string().max(300).default('')}).parse(input);
        const source=await openNativeDocx(await sourceBytes(user.tenantId,version.sourceId));const candidates=selectionCandidates(source.paragraphs,selection.quote,selection.before,selection.after);
        if(!candidates.length)throw new DomainError('That selection could not be matched to one paragraph. Select a shorter piece of text.');
        return Response.json({candidates:candidates.slice(0,30)},{headers});
      }
      if(body.action==='mark'){
        const mark=z.object({occurrences:z.array(occurrenceSchema).min(1).max(100),fieldId:id.optional(),label:z.string().trim().min(1).max(120).default('New field')}).parse(input);
        let fields=version.fields;
        if(mark.fieldId){if(!fields.some(f=>f.id===mark.fieldId))throw new DomainError('Choose an existing field.');fields=fields.map(f=>f.id===mark.fieldId?{...f,occurrences:[...f.occurrences,...mark.occurrences]}:f);}
        else{let key=mark.label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,48)||'field';if(!/^[a-z]/.test(key))key=`field_${key}`;if(fields.some(f=>f.key===key))key+=`_${fields.length+1}`;fields=[...fields,newNativeField(key,mark.label,mark.occurrences,fields.length)];}
        return Response.json({version:await saveNativeFields(user,version,fields)},{headers});
      }
      const fields=z.array(nativeFieldSchema).max(80).parse(input.fields);
      if(body.action==='publish'){
        try{validateFieldConfiguration(fields);}catch(error){throw new DomainError(error instanceof Error?error.message:'Check the field settings.');}
        // Run the original through the same real layout engine before publishing.
        await renderNativePdf(user,version,{},'raw');
      }
      return Response.json({version:await saveNativeFields(user,version,fields,body.action==='publish')},{headers});
    }
    if(body.action==='version'){
      const input=z.object({versionId:id}).parse(body.values);return Response.json({version:await authorizedVersion(user,input.versionId,false)},{headers});
    }
    requireRole(user,'STUDENT');
    if(body.action==='discard-draft'){
      const input=z.object({draftId:id,revision:z.number().int().positive()}).parse(body.values);const draft=await ownNativeDraft(user,input.draftId);
      if(Number(draft.revision)!==input.revision)throw new DomainError('This draft changed in another session. Refresh the document list before discarding it.',409);
      const removed=await statement('WITH deleted AS (DELETE FROM native_document_drafts WHERE tenant_id=? AND user_id=? AND id=? AND revision=? RETURNING id) INSERT INTO audit (id,tenant_id,created_at,actor_id,action,resource_id) SELECT ?,?,?,?,?,id FROM deleted',user.tenantId,user.id,draft.id,input.revision,crypto.randomUUID(),user.tenantId,new Date().toISOString(),user.id,'NATIVE_DRAFT_DISCARDED').run();
      if(Number(removed)!==1)throw new DomainError('This draft changed in another session. Refresh the document list before discarding it.',409);
      return Response.json({ok:true},{headers});
    }
    if(body.action==='delete-generated-document'){
      const input=z.object({documentId:id}).parse(body.values);
      const removed=await statement('WITH deleted AS (DELETE FROM native_generated_documents WHERE tenant_id=? AND user_id=? AND id=? RETURNING id) INSERT INTO audit (id,tenant_id,created_at,actor_id,action,resource_id) SELECT ?,?,?,?,?,id FROM deleted',user.tenantId,user.id,input.documentId,crypto.randomUUID(),user.tenantId,new Date().toISOString(),user.id,'NATIVE_DOCUMENT_DELETED').run();
      if(Number(removed)!==1)throw new DomainError('Generated document not found.',404);
      return Response.json({ok:true},{headers});
    }
    if(body.action==='start'){
      const input=z.object({versionId:id}).parse(body.values);const version=await authorizedVersion(user,input.versionId);
      if(version.status!=='PUBLISHED')throw new DomainError('Choose a published template.',403);
      const template=await one("SELECT id FROM native_document_templates WHERE tenant_id=? AND id=? AND status='ACTIVE'",user.tenantId,version.templateId);
      if(!template)throw new DomainError('This document template is no longer available.',404);
      const existing=await one('SELECT * FROM native_document_drafts WHERE tenant_id=? AND user_id=? AND version_id=?',user.tenantId,user.id,version.id);
      let row=existing;
      if(!row){const values:NativeValues={};for(const f of version.fields)values[f.key]=f.defaultValue||(f.type==='date'?manilaToday():/student_(full_)?name/.test(f.key)?user.name:'');
        const now=new Date().toISOString(),draftId=crypto.randomUUID();
        try{await insert('native_document_drafts',{tenant_id:user.tenantId,user_id:user.id,version_id:version.id,values_json:JSON.stringify(resolveNativeValues(version.fields,values)),revision:1,updated_at:now},draftId).run();}catch(error){if(!await one('SELECT id FROM native_document_drafts WHERE tenant_id=? AND user_id=? AND version_id=?',user.tenantId,user.id,version.id))throw error;}
        row=await one('SELECT * FROM native_document_drafts WHERE tenant_id=? AND user_id=? AND version_id=?',user.tenantId,user.id,version.id);
      }
      return Response.json({draft:{...draftJson(row!),templateName:version.name},version},{headers});
    }
    if(body.action==='save-draft'){
      const input=z.object({draftId:id,revision:z.number().int().positive(),values:valuesSchema}).parse(body.values);const draft=await ownNativeDraft(user,input.draftId);const version=await nativeVersion(user.tenantId,String(draft.versionId));
      if(Number(draft.revision)!==input.revision)throw new DomainError('This draft changed in another session. Reopen it before saving.',409);
      let values:NativeValues;try{values=resolveNativeValues(version.fields,input.values);}catch(error){throw new DomainError(error instanceof Error?error.message:'Check your values.');}
      const now=new Date().toISOString();
      await statement('UPDATE native_document_drafts SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END,values_json=?,updated_at=? WHERE tenant_id=? AND user_id=? AND id=?',input.revision,JSON.stringify(values),now,user.tenantId,user.id,draft.id).run();
      return Response.json({draft:{...draftJson({...draft,valuesJson:JSON.stringify(values),revision:input.revision+1,updatedAt:now}),templateName:version.name}},{headers});
    }
    if(body.action==='generate'){
      const input=z.object({draftId:id.optional(),documentId:id.optional(),revision:z.number().int().positive().optional(),format:z.enum(['pdf','docx'])}).parse(body.values);
      let draftId:string|null,versionId:string,values:NativeValues;
      if(input.documentId){const generated=await one('SELECT * FROM native_generated_documents WHERE tenant_id=? AND user_id=? AND id=?',user.tenantId,user.id,input.documentId);if(!generated)throw new DomainError('Generated document not found.',404);draftId=generated.draftId===null?null:String(generated.draftId);versionId=String(generated.versionId);values=JSON.parse(String(generated.valuesJson));}
      else{if(!input.draftId)throw new DomainError('Choose a draft.');const draft=await ownNativeDraft(user,input.draftId);if(input.revision!==undefined&&Number(draft.revision)!==input.revision)throw new DomainError('This draft changed in another session. Reload it before generating.',409);draftId=draft.id;versionId=String(draft.versionId);values=JSON.parse(String(draft.valuesJson));}
      const version=await nativeVersion(user.tenantId,versionId);try{values=resolveNativeValues(version.fields,values,true);}catch(error){throw new DomainError(error instanceof Error?error.message:'Check the required fields.');}
      const file=input.format==='docx'?await buildNativeDocx(await sourceBytes(user.tenantId,version.sourceId),version.fields,values,'final'):(await renderNativePdf(user,version,values,'final')).bytes;
      const generatedId=crypto.randomUUID(),expiresAt=new Date(Date.now()+Number(process.env.DOCUMENT_RETENTION_DAYS||30)*86400_000).toISOString();
      await database().batch([insert('native_generated_documents',{tenant_id:user.tenantId,user_id:user.id,draft_id:draftId,version_id:version.id,format:input.format,values_json:JSON.stringify(values),file_base64:file.toString('base64'),expires_at:expiresAt},generatedId),auditStatement(user.id,'NATIVE_DOCUMENT_GENERATED',generatedId)]);
      return Response.json({id:generatedId,url:`/api/native-documents/files/${generatedId}`,format:input.format},{headers});
    }
    throw new DomainError('Unknown document action.');
  }catch(error){return letterError(error);}
}

export const GET=withConsent(handlerGET);

export const POST=withConsent(handlerPOST);
