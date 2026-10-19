'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import { LoaderCircle,ScanLine,ZoomIn,ZoomOut } from 'lucide-react';
import type { PDFDocumentProxy,PDFDocumentLoadingTask,RenderTask } from 'pdfjs-dist/types/src/display/api';
import type { TextLayer } from 'pdfjs-dist/types/src/display/text_layer';
import 'pdfjs-dist/web/pdf_viewer.css';
import type { NativeField,NativeValues,NativeVersion } from '@/packages/documents/native-types';

export interface DocumentSelection {quote:string;before:string;after:string;page:number}
function PdfPage({pdf,pageNumber,zoom,selectable,onSelection}:{pdf:PDFDocumentProxy;pageNumber:number;zoom:number;selectable:boolean;onSelection?:(selection:DocumentSelection)=>void}){
  const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),text=useRef<HTMLDivElement>(null);
  const [size,setSize]=useState({width:595,height:842});const[visible,setVisible]=useState(pageNumber===1);
  useEffect(()=>{const node=root.current;if(!node)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))setVisible(true);},{rootMargin:'1000px'});observer.observe(node);return()=>observer.disconnect();},[]);
  useEffect(()=>{
    let canceled=false,task:RenderTask|undefined,layer:TextLayer|undefined;
    void(async()=>{
      const page=await pdf.getPage(pageNumber);const viewport=page.getViewport({scale:zoom});
      if(canceled)return;setSize({width:viewport.width,height:viewport.height});if(!visible)return;
      const pdfjs=await import('pdfjs-dist');const ratio=window.devicePixelRatio||1;
      const offscreen=document.createElement('canvas');offscreen.width=Math.floor(viewport.width*ratio);offscreen.height=Math.floor(viewport.height*ratio);const context=offscreen.getContext('2d');if(!context)return;
      task=page.render({canvas:offscreen,canvasContext:context,viewport,transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]});await task.promise;if(canceled)return;
      const target=canvas.current;if(!target)return;target.width=offscreen.width;target.height=offscreen.height;target.style.width=`${viewport.width}px`;target.style.height=`${viewport.height}px`;target.getContext('2d')?.drawImage(offscreen,0,0);
      if(text.current){const container=document.createElement('div');container.className='textLayer';container.style.setProperty('--total-scale-factor',String(zoom));container.style.setProperty('--scale-factor',String(zoom));
        layer=new pdfjs.TextLayer({textContentSource:await page.getTextContent(),container,viewport});await layer.render();if(!canceled)text.current.replaceChildren(container);}
    })().catch(error=>{if(!canceled&&error?.name!=='RenderingCancelledException')console.error('Document page rendering failed',error);});
    return()=>{canceled=true;task?.cancel();layer?.cancel();};
  },[pdf,pageNumber,zoom,visible]);
  function select(){
    if(!selectable||!text.current)return;const selection=window.getSelection();if(!selection?.rangeCount||selection.isCollapsed)return;
    const range=selection.getRangeAt(0);if(!text.current.contains(range.startContainer)||!text.current.contains(range.endContainer))return;
    const quote=selection.toString().trim();if(!quote)return;
    const before=range.cloneRange();before.selectNodeContents(text.current);before.setEnd(range.startContainer,range.startOffset);
    const after=range.cloneRange();after.selectNodeContents(text.current);after.setStart(range.endContainer,range.endOffset);
    onSelection?.({quote,before:before.toString().slice(-150),after:after.toString().slice(0,150),page:pageNumber});
  }
  return <div ref={root} className={`native-pdf-page ${selectable?'is-selectable':''}`} style={{width:size.width,height:size.height}} aria-label={`Document page ${pageNumber}`} onMouseUp={select} onTouchEnd={select}><canvas ref={canvas}/><div ref={text} className="native-text-layer-host"/></div>;
}
export default function NativeDocumentPreview({version,values,fields,original=false,clean=false,onSelection}:{version:NativeVersion;values:NativeValues;fields?:NativeField[];original?:boolean;clean?:boolean;onSelection?:(selection:DocumentSelection)=>void}){
  const[zoom,setZoom]=useState(.85),[pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[updating,setUpdating]=useState(true),[error,setError]=useState(''),[originalPages,setOriginalPages]=useState(version.originalPages),[paperSize,setPaperSize]=useState('');
  const[retry,setRetry]=useState(0);
  const scrollRoot=useRef<HTMLDivElement>(null),fitWidth=useRef(.85),fitting=useRef(true);
  const previewFields=fields??version.fields;
  const effectiveValues=useMemo(()=>Object.fromEntries(previewFields.map(field=>[field.key,values[field.key]??field.defaultValue])),[previewFields,values]);
  const request=useRef<{key:string;sessionId:string;sequence:number;ack:NativeValues}>({key:'',sessionId:'',sequence:0,ack:{}});const loaded=useRef<PDFDocumentLoadingTask|null>(null);
  useEffect(()=>{
    const controller=new AbortController();const key=`${version.id}:${version.revision}`;
    if(request.current.key!==key)request.current={key,sessionId:crypto.randomUUID(),sequence:0,ack:{}};
    const sequence=++request.current.sequence;
    const timer=window.setTimeout(()=>{setUpdating(true);setError('');
      const delta=Object.fromEntries(Object.entries(effectiveValues).filter(([field,value])=>request.current.ack[field]!==value));
      void fetch('/api/native-documents/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({versionId:version.id,sessionId:request.current.sessionId,sequence,delta,original,clean,fields}),signal:controller.signal}).then(async response=>{
        if(!response.ok){const result=await response.json() as{error?:string};throw new Error(result.error||'The document could not be rendered.');}
        const bytes=new Uint8Array(await response.arrayBuffer());if(controller.signal.aborted||sequence!==request.current.sequence)return;
        const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
        const task=pdfjs.getDocument({data:bytes});const next=await task.promise;
        if(controller.signal.aborted||sequence!==request.current.sequence){void task.destroy();return;}
        const first=await next.getPage(1);const box=first.getViewport({scale:1});
        if(controller.signal.aborted||sequence!==request.current.sequence){void task.destroy();return;}
        const previous=loaded.current;loaded.current=task;setPdf(next);setPaperSize(`${(box.width*25.4/72).toFixed(1)} × ${(box.height*25.4/72).toFixed(1)} mm`);setOriginalPages(Number(response.headers.get('X-Original-Pages')||version.originalPages));request.current.ack={...effectiveValues};setUpdating(false);void previous?.destroy();
      }).catch(error=>{if(!controller.signal.aborted&&sequence===request.current.sequence){setError(error.message);setUpdating(false);}});
    },400);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[version.id,version.revision,version.originalPages,effectiveValues,previewFields,fields,original,clean,retry]);
  useEffect(()=>()=>{void loaded.current?.destroy();},[]);
  useEffect(()=>{
    const node=scrollRoot.current;if(!node||!pdf)return;
    let canceled=false,observer:ResizeObserver|undefined;
    void pdf.getPage(1).then(page=>{
      if(canceled)return;
      const pageWidth=page.getViewport({scale:1}).width;
      const fit=()=>{if(!node.clientWidth)return;const next=Math.max(.25,Math.min(1.2,(node.clientWidth-40)/pageWidth));fitWidth.current=next;if(fitting.current)setZoom(next);};
      fit();observer=new ResizeObserver(fit);observer.observe(node);
    });
    return()=>{canceled=true;observer?.disconnect();};
  },[pdf]);
  return <section className="recommendation-preview native-document-preview" aria-label="Original Word document preview"><div className="recommendation-toolbar"><span title={version.filename}>{pdf?`${pdf.numPages} page${pdf.numPages===1?'':'s'}`:'Document'} · {paperSize||version.filename}</span><div>{updating&&<span className="native-updating" role="status"><LoaderCircle size={13} className="spin"/>Updating</span>}<button type="button" aria-label="Zoom out" disabled={zoom<=.25} onClick={()=>{fitting.current=false;setZoom(n=>Math.max(.25,n-.1));}}><ZoomOut size={16}/></button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Zoom in" disabled={zoom>=1.8} onClick={()=>{fitting.current=false;setZoom(n=>Math.min(1.8,n+.1));}}><ZoomIn size={16}/></button><button type="button" aria-label="Fit document to width" title="Fit to width" disabled={!pdf} onClick={()=>{fitting.current=true;setZoom(fitWidth.current);}}><ScanLine size={16}/></button></div></div>
    {pdf&&originalPages>0&&pdf.numPages!==originalPages&&<p className="native-page-warning">The filled document has {pdf.numPages} pages; the original has {originalPages}. Longer values have changed the page count.</p>}
    {error&&<p role="alert" className="native-preview-error">{error} <button type="button" className="textbutton" onClick={()=>setRetry(n=>n+1)}>Retry preview</button></p>}
    <div ref={scrollRoot} className="recommendation-scroll native-pdf-scroll">{!pdf&&!error&&<div className="native-preview-loading"><LoaderCircle size={20} className="spin"/><p>Rendering the original Word document…</p></div>}{pdf&&Array.from({length:pdf.numPages},(_,index)=><PdfPage key={index} pdf={pdf} pageNumber={index+1} zoom={zoom} selectable={!!onSelection&&!updating} onSelection={onSelection}/>)}</div>
  </section>;
}
