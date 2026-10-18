import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { one } from '../db/demo';
import { DomainError } from '../domain/policies';
import { redisConnection } from './native-infrastructure';
import { sha256 } from './native-repository';
import type { NativeField,NativeValues,NativeVersion } from './native-types';

export interface RenderTaskData {tenantId:string;versionId:string;revision:number;values:NativeValues;fields?:NativeField[];mode:'raw'|'original-preview'|'preview'|'final';hash:string}
const globals=globalThis as typeof globalThis&{nativeDocumentsQueue?:{queue:Queue;events:QueueEvents;redis:Redis;ready?:Promise<void>}};
export function documentQueue(){
  if(!globals.nativeDocumentsQueue){const connection=redisConnection();const queue=new Queue('practisync-native-documents',{connection});const events=new QueueEvents('practisync-native-documents',{connection:redisConnection(true)});const redis=new Redis(connection);
    queue.on('error',()=>{});events.on('error',()=>{});redis.on('error',()=>{});
    globals.nativeDocumentsQueue={queue,events,redis};}
  return globals.nativeDocumentsQueue;
}
export async function mergePreviewValues(userId:string,versionId:string,sessionId:string,sequence:number,delta:NativeValues){
  const connection=documentQueue(),{redis}=connection;
  if(redis.status!=='ready'){
    connection.ready??=new Promise<void>((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);redis.off('ready',ready);redis.off('error',failed);};
      const ready=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(new DomainError('The preview service is starting or temporarily unavailable. Please try again shortly.',503));};
      const timer=setTimeout(failed,3000);redis.once('ready',ready);redis.once('error',failed);
      if(redis.status==='wait'||redis.status==='end')void redis.connect().catch(failed);
    }).finally(()=>{connection.ready=undefined;});
    await connection.ready;
  }
  const limited=await redis.incr(`native-rate:${userId}:${Math.floor(Date.now()/60000)}`);if(limited===1)await redis.expire(`native-rate:${userId}:${Math.floor(Date.now()/60000)}`,65);
  if(limited>Number(process.env.DOCUMENT_PREVIEW_RATE_PER_MINUTE||90))throw new DomainError('Preview requests are arriving too quickly. Pause briefly and try again.',429);
  const result=await redis.eval(`local previous=redis.call('GET',KEYS[1]); local state={sequence=-1,values={}}; if previous then state=cjson.decode(previous) end; if tonumber(ARGV[1])<=tonumber(state.sequence) then return '' end; local patch=cjson.decode(ARGV[2]); for key,value in pairs(patch) do state.values[key]=value end; state.sequence=tonumber(ARGV[1]); local result=cjson.encode(state); redis.call('SET',KEYS[1],result,'EX',3600); return result`,1,`native-session:${userId}:${versionId}:${sessionId}`,sequence,JSON.stringify(delta));
  if(!result)throw new DomainError('A newer preview request already exists.',409);
  return(JSON.parse(String(result)) as{values:NativeValues}).values;
}
export async function renderNativePdf(tenantId:string,version:NativeVersion,values:NativeValues,mode:RenderTaskData['mode'],fields?:NativeField[]){
  const canonical=Object.fromEntries(Object.entries(values).sort(([a],[b])=>a.localeCompare(b)));
  const identity:unknown[]=[tenantId,version.id,version.revision,version.sourceHash,process.env.DOCUMENT_RENDER_PROFILE||'libreoffice-native-v2',mode,canonical];if(fields)identity.push(fields);
  const hash=sha256(JSON.stringify(identity));
  const cached=await one('SELECT pdf_base64,page_count FROM native_document_render_cache WHERE tenant_id=? AND id=? AND expires_at>?',tenantId,hash,new Date().toISOString());
  if(cached)return{bytes:Buffer.from(String(cached.pdfBase64),'base64'),pageCount:Number(cached.pageCount),hash};
  const {queue,events}=documentQueue();
  if(await queue.getWaitingCount()>200)throw new DomainError('The document preview service is busy. Please try again shortly.',429);
  // BullMQ removes aged jobs lazily. A new cache window must not reuse an idle,
  // completed job whose SQL PDF has already expired and been cleaned up.
  const window=Math.floor(Date.now()/600_000);
  const job=await queue.add('render',{tenantId,versionId:version.id,revision:version.revision,values:canonical,...(fields?{fields}:{}),mode,hash} satisfies RenderTaskData,{jobId:`render-${hash}-${window}`,attempts:1,removeOnComplete:{age:120},removeOnFail:{age:30}});
  try{await job.waitUntilFinished(events,55_000);}catch{throw new DomainError('The document rendering service is busy or temporarily unavailable. Please try again shortly.',503);}
  const result=await one('SELECT pdf_base64,page_count FROM native_document_render_cache WHERE tenant_id=? AND id=?',tenantId,hash);
  if(!result)throw new DomainError('The preview is not available yet. Please try again.',503);
  return{bytes:Buffer.from(String(result.pdfBase64),'base64'),pageCount:Number(result.pageCount),hash};
}
