import { createConnection } from 'node:net';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { DomainError } from '../domain/policies';

export const converterUrl=()=>process.env.DOCUMENT_CONVERTER_URL||'http://127.0.0.1:3008';
export function redisConnection(worker=false){const url=new URL(process.env.DOCUMENT_REDIS_URL||'redis://127.0.0.1:6386');return{host:url.hostname,port:Number(url.port||6379),username:url.username||undefined,password:decodeURIComponent(url.password)||undefined,db:Number(url.pathname.slice(1)||0),...(url.protocol==='rediss:'?{tls:{}}:{}),maxRetriesPerRequest:worker?null:1,connectTimeout:2000,enableOfflineQueue:worker};}
export async function scanDocx(bytes:Uint8Array):Promise<void>{
  const url=new URL(process.env.DOCUMENT_SCANNER_URL||'tcp://127.0.0.1:3318');
  await new Promise<void>((resolve,reject)=>{
    const socket=createConnection({host:url.hostname,port:Number(url.port||3310)});let result='';
    socket.setTimeout(30_000,()=>socket.destroy(new Error('Document scan timed out.')));
    socket.on('error',()=>reject(new DomainError('Document scanning is unavailable. Please try the upload again shortly.',503)));
    socket.on('data',data=>{result+=data.toString();if(result.includes('\0'))socket.end();});
    socket.on('close',()=>{if(/: OK\0/.test(result))resolve();else if(/FOUND/.test(result))reject(new DomainError('The uploaded document was rejected by the malware scanner.',400));else reject(new DomainError('The document could not be scanned. Please try again.',503));});
    socket.on('connect',()=>{socket.write('zINSTREAM\0');for(let offset=0;offset<bytes.length;offset+=65536){const chunk=bytes.subarray(offset,offset+65536);const length=Buffer.alloc(4);length.writeUInt32BE(chunk.length);socket.write(length);socket.write(chunk);}socket.write(Buffer.alloc(4));});
  });
}
function fontFamilies(data:Buffer){
  const families=new Set<string>();if(data.length<12)return families;const count=data.readUInt16BE(4);
  for(let i=0;i<count;i++){const table=12+i*16;if(table+16>data.length)break;if(data.toString('ascii',table,table+4)!=='name')continue;const offset=data.readUInt32BE(table+8);if(offset+6>data.length)continue;const entries=data.readUInt16BE(offset+2),strings=offset+data.readUInt16BE(offset+4);
    for(let j=0;j<entries;j++){const pos=offset+6+j*12;if(pos+12>data.length)break;const platform=data.readUInt16BE(pos),id=data.readUInt16BE(pos+6),length=data.readUInt16BE(pos+8),start=strings+data.readUInt16BE(pos+10);if(![1,16].includes(id)||start+length>data.length)continue;let name: string;if(platform===0||platform===3){const bytes=Buffer.from(data.subarray(start,start+length));if(bytes.length%2)continue;bytes.swap16();name=bytes.toString('utf16le');}else name=data.toString('latin1',start,start+length);if(name.trim())families.add(name.trim());}
  }return families;
}
let fontInventory:{key:string;expires:number;result:Promise<string[]>}|undefined;
export function availableDocumentFonts(){
  const directory=process.env.DOCUMENT_FONTS_DIR||join(process.cwd(),'.local','document-fonts'),declared=process.env.DOCUMENT_INSTALLED_FONTS||'',key=JSON.stringify([directory,declared]);
  if(fontInventory?.key===key&&fontInventory.expires>Date.now())return fontInventory.result;
  const result=(async()=>{const families=new Set<string>(declared.split('|').filter(Boolean));try{for(const file of await readdir(/* turbopackIgnore: true */ directory))if(/\.(ttf|otf)$/i.test(file))for(const family of fontFamilies(await readFile(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ directory,file))))families.add(family);}catch{}return[...families].sort();})();
  fontInventory={key,expires:Date.now()+60_000,result};return result;
}
export async function convertDocx(bytes:Uint8Array){
  const form=new FormData();form.set('files',new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'document.docx');
  form.set('exportFormFields','false');
  const response=await fetch(`${converterUrl()}/forms/libreoffice/convert`,{method:'POST',body:form,signal:AbortSignal.timeout(45_000)});
  if(!response.ok)throw new DomainError('The original Word document could not be rendered. Please try again.',503);
  const size=Number(response.headers.get('content-length'));if(size>32*1024*1024)throw new DomainError('The rendered document is too large.',413);
  const bytesOut=Buffer.from(await response.arrayBuffer());if(bytesOut.length>32*1024*1024||bytesOut.subarray(0,5).toString()!=='%PDF-')throw new Error('Invalid document conversion output.');
  const pdf=await PDFDocument.load(bytesOut);return{bytes:bytesOut,pageCount:pdf.getPageCount()};
}
