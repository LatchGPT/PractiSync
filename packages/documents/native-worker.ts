import { Worker } from 'bullmq';
import { statement } from '../db/demo';
import { buildNativeDocx } from './native-docx';
import { convertDocx, redisConnection } from './native-infrastructure';
import { expireNativeFiles, nativeVersion, sourceBytes } from './native-repository';
import type { RenderTaskData } from './native-queue';

const worker=new Worker<RenderTaskData>('practisync-native-documents',async job=>{
  const data=job.data,version=await nativeVersion(data.tenantId,data.versionId);
  if(version.revision!==data.revision)throw new Error('The template working copy changed. Request a new preview.');
  const original=await sourceBytes(data.tenantId,version.sourceId);
  const docx=data.mode==='raw'?original:await buildNativeDocx(original,version.fields,data.values,data.mode==='final'?'final':'preview',data.mode==='original-preview');
  const result=await convertDocx(docx);const now=new Date().toISOString(),expires=new Date(Date.now()+10*60_000).toISOString();
  await statement('INSERT INTO native_document_render_cache (id,tenant_id,created_at,expires_at,pdf_base64,page_count) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET pdf_base64=excluded.pdf_base64,page_count=excluded.page_count,expires_at=excluded.expires_at',data.hash,data.tenantId,now,expires,result.bytes.toString('base64'),result.pageCount).run();
  if(data.mode==='raw')await statement('UPDATE native_document_versions SET original_pages=? WHERE tenant_id=? AND source_id=?',result.pageCount,data.tenantId,version.sourceId).run();
  return{hash:data.hash,pageCount:result.pageCount};
},{connection:redisConnection(true),concurrency:Number(process.env.DOCUMENT_WORKER_CONCURRENCY||2)});
worker.on('failed',(job,error)=>console.error('Document conversion failed',job?.id,error.message));
worker.on('error',error=>console.error('Document queue unavailable',error.message));
const cleanup=setInterval(()=>{void expireNativeFiles().catch(error=>console.error('Document retention cleanup failed',error.message));},60_000);cleanup.unref();
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{clearInterval(cleanup);void worker.close().then(()=>process.exit(0));});
console.log('Native DOCX conversion worker is ready.');
