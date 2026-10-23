import { statement } from '../db/demo';
import { workerHasConsent } from '../privacy/worker-consent';
import { buildNativeDocx } from './native-docx';
import { convertDocx } from './native-infrastructure';
import { nativeVersion, sourceBytes } from './native-repository';
import type { RenderTaskData } from './native-queue';

export async function processNativeRender(data:RenderTaskData) {
 if(!await workerHasConsent(data.userId,data.tenantId))return {skipped:true,reason:'CONSENT_REQUIRED'};
 const version=await nativeVersion(data.tenantId,data.versionId);
 if(version.revision!==data.revision)throw new Error('The template working copy changed. Request a new preview.');
 const original=await sourceBytes(data.tenantId,version.sourceId);
 const docx=data.mode==='raw'?original:await buildNativeDocx(original,data.fields??version.fields,data.values,data.mode==='final'?'final':'preview',data.mode==='original-preview');
 const result=await convertDocx(docx),now=new Date().toISOString(),expires=new Date(Date.now()+10*60_000).toISOString();
 if(!await workerHasConsent(data.userId,data.tenantId))return {skipped:true,reason:'CONSENT_REQUIRED'};
 await statement('INSERT INTO native_document_render_cache (id,tenant_id,created_at,expires_at,pdf_base64,page_count) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET pdf_base64=excluded.pdf_base64,page_count=excluded.page_count,expires_at=excluded.expires_at',data.hash,data.tenantId,now,expires,result.bytes.toString('base64'),result.pageCount).run();
 if(data.mode==='raw')await statement('UPDATE native_document_versions SET original_pages=? WHERE tenant_id=? AND source_id=?',result.pageCount,data.tenantId,version.sourceId).run();
 return {hash:data.hash,pageCount:result.pageCount};
}
