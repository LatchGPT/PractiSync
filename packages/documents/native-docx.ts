import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { nativeDisplay, type NativeField, type NativeValues, type Occurrence } from './native-types';

interface XmlNode {name:string;start:number;openEnd:number;closeStart:number;end:number;parent?:XmlNode;children:XmlNode[]}
interface Unit {node:XmlNode;run:XmlNode;start:number;end:number;text:string;highlighted:boolean}
export interface WordParagraph { part:string;index:number;text:string;runs:number;units:Unit[];node:XmlNode }
const local=(node:XmlNode)=>node.name.split(':').at(-1)!;
const decode=(text:string)=>text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity:string)=>entity[0]==='#'?String.fromCodePoint(parseInt(entity.slice(entity[1].toLowerCase()==='x'?2:1),entity[1].toLowerCase()==='x'?16:10)):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[entity.toLowerCase()]!);
const escape=(text:string)=>{if(!text.isWellFormed()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\uFFFE\uFFFF]/.test(text))throw new Error('Invalid characters in a document field.');return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);};
function tree(xml:string){
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('XML entities are not supported.');
  new DOMParser({onError:()=>{throw new Error('Invalid Word XML.');}}).parseFromString(xml,'application/xml');
  const root:XmlNode={name:'root',start:0,openEnd:0,closeStart:xml.length,end:xml.length,children:[]};const stack=[root];let i=0;
  while((i=xml.indexOf('<',i))>=0){
    if(xml.startsWith('<!--',i)){i=xml.indexOf('-->',i)+3;continue;}
    if(xml.startsWith('<?',i)){i=xml.indexOf('?>',i)+2;continue;}
    if(xml.startsWith('<![CDATA[',i))throw new Error('CDATA inside Word text is not supported.');
    let end=i+1,quote='';for(;end<xml.length;end++){const c=xml[end];if(quote){if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='>')break;}
    const tag=xml.slice(i,end+1);const name=tag.match(/^<\/?([^\s/>]+)/)?.[1];if(!name)throw new Error('Invalid Word XML tag.');
    if(tag.startsWith('</')){const node=stack.pop()!;if(node.name!==name)throw new Error('Invalid Word XML nesting.');node.closeStart=i;node.end=end+1;}
    else{const node:XmlNode={name,start:i,openEnd:end+1,closeStart:end+1,end:end+1,parent:stack.at(-1),children:[]};node.parent!.children.push(node);if(!tag.endsWith('/>'))stack.push(node);}
    i=end+1;
  }
  return root;
}
const all=(node:XmlNode,name:string):XmlNode[]=>node.children.flatMap(child=>[...(local(child)===name?[child]:[]),...all(child,name)]);
const nearest=(node:XmlNode,name:string):XmlNode|undefined=>node.parent?(local(node.parent)===name?node.parent:nearest(node.parent,name)):undefined;
const wordParts=/^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/;
export async function openNativeDocx(bytes:Uint8Array){
  if(bytes.length<8||bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error('Choose a valid DOCX file.');
  const zip=await JSZip.loadAsync(bytes);const entries=Object.values(zip.files);
  if(entries.length>2000||entries.reduce((n,f)=>n+Number((f as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize??0),0)>48*1024*1024)throw new Error('The DOCX expands beyond the supported size.');
  const types=await zip.file('[Content_Types].xml')?.async('string');
  if(!types?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')||!zip.file('word/document.xml'))throw new Error('This is not a standard DOCX document.');
  if(entries.some(f=>/vbaProject|activeX|embeddings\//i.test(f.name))||/macroEnabled/i.test(types))throw new Error('Macros, ActiveX and embedded executables are not accepted.');
  const paragraphs:WordParagraph[]=[];const parts=new Map<string,string>();const fonts=new Set<string>();
  for(const file of entries.filter(f=>wordParts.test(f.name)||/^word\/(styles|fontTable)\.xml$/.test(f.name))){
    const xml=await file.async('string');parts.set(file.name,xml);const root=tree(xml);
    for(const node of all(root,'rFonts'))for(const match of xml.slice(node.start,node.openEnd).matchAll(/\bw:(?:ascii|hAnsi|eastAsia|cs)="([^"]+)"/g))fonts.add(decode(match[1]));
    if(!wordParts.test(file.name))continue;
    for(const [index,p]of all(root,'p').entries()){
      const units:Unit[]=[];let text='';
      for(const node of [...all(p,'t'),...all(p,'br'),...all(p,'tab')].filter(n=>nearest(n,'p')===p).sort((a,b)=>a.start-b.start)){
        const run=nearest(node,'r');if(!run)continue;
        const value=local(node)==='t'?decode(xml.slice(node.openEnd,node.closeStart)):local(node)==='br'?'\n':'\t';
        const props=run.children.find(c=>local(c)==='rPr');const propsXml=props?xml.slice(props.start,props.end):'';
        const highlighted=/<w:highlight\b[^>]*w:val="yellow"|<w:shd\b[^>]*w:fill="FFFF00"/i.test(propsXml);
        units.push({node,run,start:text.length,end:text.length+value.length,text:value,highlighted});text+=value;
      }
      paragraphs.push({part:file.name,index,text,runs:new Set(units.map(u=>u.run.start)).size,units,node:p});
    }
  }
  return{zip,parts,paragraphs,fonts:[...fonts].filter(f=>f&&!/^\+/.test(f)).sort()};
}
export function yellowOccurrences(paragraphs:WordParagraph[]):Occurrence[]{
  const result:Occurrence[]=[];
  for(const p of paragraphs){let start=-1,end=-1;const flush=()=>{if(start>=0&&p.text.slice(start,end).trim())result.push({id:crypto.randomUUID(),part:p.part,paragraph:p.index,start,end,originalText:p.text.slice(start,end),run:[...new Set(p.units.map(u=>u.run.start))].indexOf(p.units.find(u=>u.start<=start&&u.end>start)!.run.start),display:'value'});start=-1;};
    for(const unit of p.units){if(unit.highlighted&&!['br','tab'].includes(local(unit.node))){if(start<0)start=unit.start;end=unit.end;}else flush();}flush();
  }return result;
}
function normalized(text:string){let value='';const offsets:{start:number;end:number}[]=[];let offset=0;for(const char of text){for(const c of char.normalize('NFKC'))if(!/[\s\u00ad]/u.test(c)){value+=c;for(let i=0;i<c.length;i++)offsets.push({start:offset,end:offset+char.length});}offset+=char.length;}return{value,offsets};}
export function selectionCandidates(paragraphs:WordParagraph[],quote:string,before='',after=''){
  const needle=normalized(quote).value;if(!needle||needle.length>2000)throw new Error('Select a short piece of text within one paragraph.');
  const candidates:(Occurrence&{context:string;score:number})[]=[];
  for(const p of paragraphs){const n=normalized(p.text);let index=n.value.indexOf(needle);while(index>=0){const start=n.offsets[index].start,end=n.offsets[index+needle.length-1].end;const prefix=normalized(before).value.slice(-40),suffix=normalized(after).value.slice(0,40);let score=0;if(prefix&&n.value.slice(0,index).endsWith(prefix))score+=prefix.length;if(suffix&&n.value.slice(index+needle.length).startsWith(suffix))score+=suffix.length;
      candidates.push({id:crypto.randomUUID(),part:p.part,paragraph:p.index,start,end,originalText:p.text.slice(start,end),run:[...new Set(p.units.map(u=>u.run.start))].indexOf(p.units.find(u=>u.start<=start&&u.end>start)!.run.start),display:'value',context:p.text,score});index=n.value.indexOf(needle,index+1);}}
  return candidates.sort((a,b)=>b.score-a.score);
}
function propsFor(xml:string,run:XmlNode,field:boolean,mode:'preview'|'final'|'tokenized'){
  const props=run.children.find(c=>local(c)==='rPr');const prefix=run.name.includes(':')?run.name.split(':')[0]+':':'';
  let value=props?xml.slice(props.start,props.end):`<${prefix}rPr></${prefix}rPr>`;
  if(!field)return value;
  value=value.replace(/<w:(highlight|shd)\b[^>]*(?:\/>|>[\s\S]*?<\/w:\1>)/g,'');
  if(mode==='preview'){const shade=`<${prefix}shd ${prefix}val="clear" ${prefix}color="auto" ${prefix}fill="C6EFCE"/>`;value=value.endsWith('/>')?value.slice(0,-2)+`>${shade}</${prefix}rPr>`:value.replace(`</${prefix}rPr>`,`${shade}</${prefix}rPr>`);}
  return value;
}
export async function buildNativeDocx(source:Uint8Array,fields:NativeField[],values:NativeValues,mode:'preview'|'final'|'tokenized',originalValues=false):Promise<Buffer>{
  const doc=await openNativeDocx(source);const edits=new Map<string,{start:number;end:number;text:string}[]>();
  for(const paragraph of doc.paragraphs){
    const occurrences=fields.flatMap(field=>field.occurrences.filter(o=>o.part===paragraph.part&&o.paragraph===paragraph.index).map(occurrence=>({field,occurrence,value:mode==='tokenized'?`{${field.key}}`:originalValues?occurrence.originalText:nativeDisplay(field,values[field.key]??'',occurrence)}))).sort((a,b)=>a.occurrence.start-b.occurrence.start);
    if(!occurrences.length)continue;
    for(const {occurrence}of occurrences)if(paragraph.text.slice(occurrence.start,occurrence.end)!==occurrence.originalText)throw new Error('A marked location no longer matches the original document.');
    const xml=doc.parts.get(paragraph.part)!;const runs=[...new Set(paragraph.units.map(u=>u.run))];
    for(const run of runs){
      const units=paragraph.units.filter(u=>u.run===run);const affected=occurrences.filter(o=>units.some(u=>u.start<o.occurrence.end&&u.end>o.occurrence.start));if(!affected.length)continue;
      if(run.children.some(c=>!['rPr','t','br','tab','lastRenderedPageBreak'].includes(local(c))))throw new Error('Select the text separately from drawings or Word field codes.');
      const prefix=run.name.includes(':')?run.name.split(':')[0]+':':'';const open=xml.slice(run.start,run.openEnd),close=`</${run.name}>`;
      const pieces:{field:boolean;content:string}[]=[];
      for(const node of run.children.filter(c=>local(c)!=='rPr')){
        const unit=units.find(u=>u.node===node);if(!unit){pieces.push({field:false,content:xml.slice(node.start,node.end)});continue;}
        if(!affected.some(o=>unit.start<o.occurrence.end&&unit.end>o.occurrence.start)){pieces.push({field:false,content:xml.slice(node.start,node.end)});continue;}
        let cursor=unit.start;
        const addText=(text:string,isField:boolean)=>{if(!text&&!isField)return;const content=text.split('\n').map(escape).map(t=>`<${prefix}t xml:space="preserve">${t}</${prefix}t>`).join(`<${prefix}br/>`);pieces.push({field:isField,content});};
        for(const item of affected){const o=item.occurrence;if(o.end<=unit.start||o.start>=unit.end)continue;
          if(o.start>cursor)addText(unit.text.slice(cursor-unit.start,o.start-unit.start),false);
          const start=Math.max(cursor,o.start),end=Math.min(unit.end,o.end);
          const unchanged=item.value===o.originalText&&mode!=='tokenized';
          if(unchanged)addText(unit.text.slice(start-unit.start,end-unit.start),true);
          else if(mode==='tokenized'){if(o.start>=unit.start&&o.start<unit.end)addText(item.value,true);}
          else {
            const replacement=item.value||(mode==='preview'?item.field.placeholderText||`[${item.field.label}]`:'');
            // Distribute across the existing character styles, including superscript ordinals.
            const characters=Array.from(replacement),length=o.end-o.start;
            addText(characters.slice(Math.floor((start-o.start)*characters.length/length),Math.floor((end-o.start)*characters.length/length)).join(''),true);
          }
          cursor=end;
        }
        if(cursor<unit.end)addText(unit.text.slice(cursor-unit.start),false);
      }
      // Preserve the exact source run if text/formatting already match the requested final build.
      const fullyUnchanged=mode==='final'&&affected.every(o=>o.value===o.occurrence.originalText)&&!/<w:(?:highlight|shd)\b/.test(xml.slice(run.start,run.end));
      if(fullyUnchanged)continue;
      const replacement=pieces.map(piece=>open+propsFor(xml,run,piece.field,mode)+piece.content+close).join('');
      const list=edits.get(paragraph.part)??[];list.push({start:run.start,end:run.end,text:replacement});edits.set(paragraph.part,list);
    }
  }
  if(!edits.size)return Buffer.from(source);
  for(const [part,changes]of edits){let xml=doc.parts.get(part)!;const sorted=changes.sort((a,b)=>b.start-a.start);for(let i=1;i<sorted.length;i++)if(sorted[i-1].start<sorted[i].end)throw new Error('Overlapping field runs cannot be edited.');for(const change of sorted)xml=xml.slice(0,change.start)+change.text+xml.slice(change.end);doc.zip.file(part,xml);}
  return doc.zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
}
