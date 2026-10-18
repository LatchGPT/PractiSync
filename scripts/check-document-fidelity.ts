/** Real LibreOffice + Poppler acceptance test. No application database or queue needed. */
import { readFile,mkdir,writeFile,readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join,resolve } from 'node:path';
import JSZip from 'jszip';
import { PNG } from 'pngjs';
import { buildNativeDocx,openNativeDocx } from '../packages/documents/native-docx';
import { recommendationReferenceFields } from '../packages/documents/native-reference';
import { availableDocumentFonts,convertDocx } from '../packages/documents/native-infrastructure';

const directory=resolve('.local/document-fidelity');await mkdir(directory,{recursive:true});
const fixtures=[{name:'recommendation',path:'packages/documents/fixtures/recommendation.docx',fields:recommendationReferenceFields}];
for(const fixture of fixtures){
  const original=await readFile(fixture.path),source=await openNativeDocx(original),fields=await fixture.fields(original),installed=await availableDocumentFonts();
  const missing=source.fonts.filter(font=>!installed.some(name=>font.toLowerCase()===name.toLowerCase()));if(missing.length)throw new Error(`Install exact fonts before fidelity testing: ${missing.join(', ')}`);
  // Yellow in the supplied sample is an authoring annotation. The download requirement
  // intentionally removes it. Independently remove only those annotations for comparison.
  const baseline=await JSZip.loadAsync(original);for(const [part,xml]of source.parts)if(/^word\/(document|header\d+|footer\d+)\.xml$/.test(part))baseline.file(part,xml.replace(/<w:highlight\b[^>]*w:val="yellow"[^>]*\/>/gi,'').replace(/<w:shd\b[^>]*w:fill="FFFF00"[^>]*\/>/gi,''));
  const values=Object.fromEntries(fields.map(field=>[field.key,field.occurrences[0].originalText]));
  const output=await buildNativeDocx(original,fields,values,'final',true),preview=await buildNativeDocx(original,fields,values,'preview',true);
  const results=await Promise.all([convertDocx(await baseline.generateAsync({type:'nodebuffer'})),convertDocx(output),convertDocx(preview)]);
  if(results.some(result=>result.pageCount!==results[0].pageCount))throw new Error('The preview or final build changed the source page count.');
  const binary=process.env.PDFTOPPM_PATH||'pdftoppm';
  for(const [index,name]of ['baseline','final','preview'].entries()){const file=join(directory,`${fixture.name}-${name}.pdf`);await writeFile(file,results[index].bytes);execFileSync(binary,['-png','-r','144',file,join(directory,`${fixture.name}-${name}`)],{stdio:'pipe'});}
  let differing=0,pixels=0,green=0,yellow=0,previewGreen=0;
  for(const file of (await readdir(directory)).filter(name=>name.startsWith(`${fixture.name}-baseline-`)&&name.endsWith('.png'))){
    const a=PNG.sync.read(await readFile(join(directory,file))),b=PNG.sync.read(await readFile(join(directory,file.replace('-baseline-','-final-')))),p=PNG.sync.read(await readFile(join(directory,file.replace('-baseline-','-preview-'))));
    if(a.width!==b.width||a.height!==b.height)throw new Error('PDF page dimensions changed.');pixels+=a.width*a.height;
    for(let offset=0;offset<a.data.length;offset+=4){if([0,1,2].some(channel=>Math.abs(a.data[offset+channel]-b.data[offset+channel])>2))differing++;const[r,g,bl]=b.data.subarray(offset,offset+3);if(r===198&&g===239&&bl===206)green++;if(r===255&&g===255&&bl===0)yellow++;const[pr,pg,pb]=p.data.subarray(offset,offset+3);if(pr===198&&pg===239&&pb===206)previewGreen++;}
  }
  const ratio=differing/pixels;console.log(`${fixture.name}: ${results[0].pageCount} page(s), ${(ratio*100).toFixed(6)}% differing pixels; final green=${green}, yellow=${yellow}; preview green=${previewGreen}`);
  if(ratio>0.0001||green||yellow||!previewGreen)throw new Error('Document fidelity or highlight isolation failed.');
  await writeFile(join(directory,`${fixture.name}-identity.docx`),output);
}
