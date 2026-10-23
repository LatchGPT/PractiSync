import { describe,it,expect } from 'vitest';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { buildNativeDocx,openNativeDocx,selectionCandidates,yellowOccurrences } from '../packages/documents/native-docx';
import { recommendationReferenceFields } from '../packages/documents/native-reference';
import { nativeDisplay,newNativeField,resolveNativeValues,validateFieldConfiguration } from '../packages/documents/native-types';

const original=()=>readFile('packages/documents/fixtures/recommendation.docx');
async function simpleDocx(){
  const zip=new JSZip();zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  const p='<w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Before Jane &amp; Doe after</w:t></w:r></w:p>';
  zip.file('word/document.xml',`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p}<w:tbl><w:tr><w:tc>${p}</w:tc></w:tr></w:tbl><w:p><w:r><w:drawing><w:txbxContent>${p}</w:txbxContent></w:drawing></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`);
  for(const part of ['header1','footer1'])zip.file(`word/${part}.xml`,`<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${p}</w:hdr>`);
  zip.file('word/media/logo.bin',Buffer.from([0,255,19,42]));zip.file('word/styles.xml','<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>');
  return zip.generateAsync({type:'nodebuffer'});
}
describe('native DOCX field replacement',()=>{
  it('uses the supplied recommendation with 11 fields, 13 occurrences and exact fonts',async()=>{
    const bytes=await original(),doc=await openNativeDocx(bytes),fields=await recommendationReferenceFields(bytes);
    expect(doc.fonts).toEqual(['Calibri','Times New Roman']);expect(yellowOccurrences(doc.paragraphs)).toHaveLength(13);expect(fields).toHaveLength(11);
    expect(fields.find(f=>f.key==='pronoun')?.type).toBe('dropdown');expect(fields.find(f=>f.key==='year_level')?.type).toBe('dropdown');validateFieldConfiguration(fields);
  });
  it('updates body, table, text box, header and footer while preserving all other ZIP entries',async()=>{
    const bytes=await simpleDocx(),doc=await openNativeDocx(bytes),occurrences=selectionCandidates(doc.paragraphs,'Jane & Doe'),field=newNativeField('name','Name',occurrences);
    expect(occurrences).toHaveLength(5);const output=await buildNativeDocx(bytes,[field],{name:'Sam <Smith> & Co.\nLine 2'},'final');const result=await openNativeDocx(output);
    expect(result.paragraphs.filter(p=>p.text.includes('Sam <Smith> & Co.\nLine 2'))).toHaveLength(5);
    for(const [part,file]of Object.entries(doc.zip.files))if(!file.dir&&!/word\/(document|header1|footer1)\.xml$/.test(part))expect(await result.zip.file(part)!.async('uint8array')).toEqual(await file.async('uint8array'));
    expect(result.parts.get('word/document.xml')).toContain('<w:b/><w:sz w:val="24"/>');expect(result.parts.get('word/document.xml')).toContain('Before ');expect(result.parts.get('word/document.xml')).toContain(' after');
  });
  it('returns identical original bytes for original values in an unhighlighted source',async()=>{
    const bytes=await simpleDocx(),doc=await openNativeDocx(bytes),field=newNativeField('name','Name',selectionCandidates(doc.paragraphs,'Jane & Doe'));
    expect(await buildNativeDocx(bytes,[field],{name:'Jane & Doe'},'final')).toEqual(bytes);
  });
  it('maps selections containing supplementary Unicode characters without splitting them',async()=>{
    const zip=await JSZip.loadAsync(await simpleDocx());zip.file('word/document.xml',(await zip.file('word/document.xml')!.async('string')).replaceAll('Jane &amp; Doe','Jane 🧑 Doe'));
    const source=await zip.generateAsync({type:'nodebuffer'}),doc=await openNativeDocx(source),locations=selectionCandidates(doc.paragraphs,'Jane 🧑 Doe');expect(locations).toHaveLength(3);
    const field=newNativeField('name','Name',locations),filled=await openNativeDocx(await buildNativeDocx(source,[field],{name:'Alex 🧑🏽 Doe'},'final'));expect(filled.paragraphs.filter(p=>p.text.includes('Alex 🧑🏽 Doe'))).toHaveLength(3);
  });
  it('creates single-run tokens, green previews, empty placeholders and clean downloads',async()=>{
    const bytes=await original(),fields=await recommendationReferenceFields(bytes),values=Object.fromEntries(fields.map(f=>[f.key,f.occurrences[0].originalText]));
    for(const mode of ['tokenized','preview','final'] as const){const doc=await openNativeDocx(await buildNativeDocx(bytes,fields,values,mode));const xml=doc.parts.get('word/document.xml')!;
      if(mode==='tokenized'){expect(xml).toContain('<w:t xml:space="preserve">{year_level}</w:t>');expect(doc.paragraphs.filter(p=>p.text.includes('{student_full_name}'))).toHaveLength(2);}
      else if(mode==='preview')expect(xml).toContain('C6EFCE');else{expect(xml).not.toMatch(/<w:highlight|C6EFCE|FFFF00/);expect(doc.paragraphs.some(p=>p.text.includes('Ms. Dela Cruz'))).toBe(true);}
    }
    const empty=await openNativeDocx(await buildNativeDocx(bytes,fields,{},'preview'));expect(empty.paragraphs.some(p=>p.text.includes('[Company address]'))).toBe(true);
    const clean=await openNativeDocx(await buildNativeDocx(bytes,fields,{},'final'));expect(clean.paragraphs.some(p=>p.text.includes('[Company address]'))).toBe(false);
  });
  it('updates repeated names and preserves superscript ordinal formatting',async()=>{
    const bytes=await original(),fields=await recommendationReferenceFields(bytes),values={representative_name:'Ms. Marinella N. San Antonio',student_full_name:'Ms. Andrea Dela Cruz',year_level:'3rd',pronoun:'her'};
    const result=await openNativeDocx(await buildNativeDocx(bytes,fields,values,'final'));const text=result.paragraphs.map(p=>p.text).join('\n');
    expect(text).toContain('Ms. Marinella N. San Antonio');expect(text).toContain('Ms. San Antonio,');expect(text).toContain('Ms. Andrea Dela Cruz');expect(text).toContain('Ms. Dela Cruz');expect(text).toContain('on her');
    const ordinal=result.paragraphs.find(p=>p.text.includes('3rd'))!;expect(ordinal).toBeTruthy();const xml=result.parts.get(ordinal.part)!;expect(xml).toMatch(/<w:vertAlign w:val="superscript"\/>[\s\S]*?<w:t xml:space="preserve">rd<\/w:t>/);
  });
  it('rejects macros and invalid field locations',async()=>{
    const bytes=await simpleDocx(),zip=await JSZip.loadAsync(bytes);zip.file('word/vbaProject.bin','macro');await expect(openNativeDocx(await zip.generateAsync({type:'nodebuffer'}))).rejects.toThrow(/Macros/);
    const doc=await openNativeDocx(bytes),field=newNativeField('name','Name',selectionCandidates(doc.paragraphs,'Jane & Doe'));field.occurrences[0].originalText='Forged';await expect(buildNativeDocx(bytes,[field],{},'final')).rejects.toThrow(/no longer matches/);
  });
  it('applies transforms at render time and validates dropdowns, dates and locked defaults',async()=>{
    const fields=await recommendationReferenceFields(await original()),name=fields.find(f=>f.key==='student_full_name')!;name.transform='uppercase';const values=resolveNativeValues(fields,{student_full_name:'Jamie Reyes'});expect(values.student_full_name).toBe('Jamie Reyes');expect(nativeDisplay(name,values.student_full_name)).toBe('JAMIE REYES');
    const field={...name,validationRegex:'[A-Z ]+',required:true,locked:true,defaultValue:'JAMIE REYES'};expect(resolveNativeValues([field],{student_full_name:'forged'},true).student_full_name).toBe('JAMIE REYES');
    expect(()=>resolveNativeValues([{...field,locked:false}],{student_full_name:'Jamie'},true)).toThrow(/format/);expect(()=>resolveNativeValues([name],{student_full_name:'\u0000'})).toThrow(/valid characters/);
    expect(()=>validateFieldConfiguration([{...field,validationRegex:'(?=unsupported)'}])).toThrow(/unsupported/);
    const year=fields.find(f=>f.key==='year_level')!;expect(()=>resolveNativeValues([year],{year_level:'9th'},true)).toThrow(/Choose/);
    const date=fields[0];expect(()=>resolveNativeValues([date],{letter_date:'2026-02-30'},true)).toThrow(/valid date/);expect(nativeDisplay(date,'2026-10-15')).toBe('October 15, 2026');
  });
});
