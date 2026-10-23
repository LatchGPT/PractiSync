import { Worker } from 'bullmq';
import { redisConnection } from './native-infrastructure';
import { expireNativeFiles } from './native-repository';
import type { RenderTaskData } from './native-queue';
import { processNativeRender } from './native-render-job';

const worker=new Worker<RenderTaskData>('practisync-native-documents',job=>processNativeRender(job.data),{connection:redisConnection(true),concurrency:Number(process.env.DOCUMENT_WORKER_CONCURRENCY||2)});
worker.on('failed',(job,error)=>console.error('Document conversion failed',job?.id,error.message));
worker.on('error',error=>console.error('Document queue unavailable',error.message));
const cleanup=setInterval(()=>{void expireNativeFiles().catch(error=>console.error('Document retention cleanup failed',error.message));},60_000);cleanup.unref();
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{clearInterval(cleanup);void worker.close().then(()=>process.exit(0));});
console.log('Native DOCX conversion worker is ready.');
