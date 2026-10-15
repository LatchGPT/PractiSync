import { afterEach,describe,expect,it,vi } from 'vitest';
import type { NativeVersion } from '../packages/documents/native-types';
const state=vi.hoisted(()=>({cache:null as null|{pdfBase64:string;pageCount:number;expires:number},jobs:new Set<string>(),renders:0}));
vi.mock('../packages/db/demo',()=>({one:vi.fn(async(query:string)=>query.includes('expires_at>')&&state.cache&&state.cache.expires<=Date.now()?null:state.cache)}));
vi.mock('../packages/documents/native-repository',()=>({sha256:()=> 'stable-version-and-values-hash'}));
vi.mock('../packages/documents/native-infrastructure',()=>({redisConnection:()=>({})}));
vi.mock('ioredis',async()=>{const{EventEmitter}=await import('node:events');return{default:class extends EventEmitter{
  status='connecting';constructor(){super();queueMicrotask(()=>{this.status='ready';this.emit('ready');});}
  async incr(){if(this.status!=='ready')throw new Error('Stream is not writeable');return 1;}
  async expire(){return 1;}async eval(...args:unknown[]){return JSON.stringify({values:JSON.parse(String(args.at(-1)))});}
}};});
vi.mock('bullmq',()=>({
  QueueEvents:class{on(){}},
  Queue:class{
    on(){}async getWaitingCount(){return 0;}
    async add(_name:string,_values:unknown,options:{jobId:string}){
      // Completed jobs can remain in Redis while an idle worker's SQL cache expires.
      const existing=state.jobs.has(options.jobId);state.jobs.add(options.jobId);
      return{waitUntilFinished:async()=>{if(!existing){state.renders++;state.cache={pdfBase64:Buffer.from('%PDF-fresh').toString('base64'),pageCount:1,expires:Date.now()+600_000};}}};
    }
  },
}));
import { mergePreviewValues,renderNativePdf } from '../packages/documents/native-queue';
afterEach(()=>vi.useRealTimers());
describe('render cache expiry with idle BullMQ jobs',()=>{
  it('waits for the initial Redis connection before merging the first preview',async()=>{
    expect(await mergePreviewValues('student','version','session',1,{name:'Jamie'})).toEqual({name:'Jamie'});
  });
  it('renders again after retention cleanup even if the old completed job remains in Redis',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-15T00:01:00Z'));state.cache=null;state.jobs.clear();state.renders=0;
    const version={id:'published-version',revision:1,sourceHash:'original'} as NativeVersion;
    expect((await renderNativePdf('tenant',version,{name:'Jamie'},'preview')).bytes.toString()).toBe('%PDF-fresh');
    await renderNativePdf('tenant',version,{name:'Jamie'},'preview');expect(state.renders).toBe(1);
    vi.setSystemTime(new Date('2026-10-15T00:12:00Z'));state.cache=null;
    expect((await renderNativePdf('tenant',version,{name:'Jamie'},'preview')).bytes.toString()).toBe('%PDF-fresh');expect(state.renders).toBe(2);
  });
});
