import type { ReactNode } from 'react';

// A deliberately small markdown renderer: React escapes content; raw HTML is never interpreted.
function inline(text:string):ReactNode[] {
 return text.split(/(\[[^\]]+\]\(https:\/\/[^\s)]+\))/g).map((part,index)=>{
  const link=/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/.exec(part);
  return link?<a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>:part;
 });
}
export default function PrivacyNotice({body}:{body:string}) {
 const content=(text:string)=>{
  const lines=text.split('\n'),firstBullet=lines.findIndex(line=>line.startsWith('- '));
  if(firstBullet<0)return <p>{inline(text)}</p>;
  return <>{firstBullet>0&&<p>{inline(lines.slice(0,firstBullet).join('\n'))}</p>}<ul>{lines.slice(firstBullet).map((line,index)=><li key={index}>{inline(line.replace(/^- /,''))}</li>)}</ul></>;
 };
 return <div className="privacy-notice">{body.split(/\n\s*\n/).map((block,index)=>{
  if(block.startsWith('## ')){
   const [heading,...rest]=block.split('\n');
   return <section key={index}><h2>{heading.slice(3)}</h2>{rest.length>0&&content(rest.join('\n'))}</section>;
  }
  if(block.split('\n').every(line=>line.startsWith('- ')))return <ul key={index}>{block.split('\n').map((line,i)=><li key={i}>{inline(line.slice(2))}</li>)}</ul>;
  return <div key={index}>{content(block)}</div>;
 })}</div>;
}
