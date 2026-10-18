import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { RE2JS } from 're2js';

export const occurrenceSchema = z.object({
  id: z.string().max(100), part: z.string().regex(/^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/),
  paragraph: z.number().int().min(0), start: z.number().int().min(0), end: z.number().int().positive(),
  originalText: z.string().min(1).max(2000), run: z.number().int().min(0).default(0),
  display: z.enum(['value', 'surname']).default('value'), lineBefore:z.boolean().optional(),
  bold:z.enum(['inherit','normal','bold']).optional(),
  prefix:z.string().max(100).optional(),suffix:z.string().max(100).optional(),
});
export const nativeFieldSchema = z.object({
  id: z.string().max(100), key: z.string().regex(/^[a-z][a-z0-9_]{0,59}$/), label: z.string().trim().min(1).max(120),
  helpText: z.string().max(300).default(''), type: z.enum(['text','textarea','date','dropdown','number']),
  required: z.boolean().default(true), defaultValue: z.string().max(2000).default(''), placeholderText: z.string().max(160).default(''),
  maxLength: z.number().int().min(1).max(2000).default(160), transform: z.enum(['none','uppercase','lowercase','titlecase']).default('none'),
  dateFormat: z.enum(['MMMM d, yyyy','MMM d, yyyy','MM/dd/yyyy','dd/MM/yyyy','yyyy-MM-dd']).default('MMMM d, yyyy'),
  options: z.array(z.string().trim().min(1).max(120)).max(50).default([]), validationRegex: z.string().max(160).nullable().default(null),
  locked: z.boolean().default(false), order: z.number().int().min(0).max(100).default(0),
  occurrences: z.array(occurrenceSchema).min(1).max(100),
});
export type NativeField = z.infer<typeof nativeFieldSchema>;
export type Occurrence = z.infer<typeof occurrenceSchema>;
export type NativeBoldMode = 'inherit'|'normal'|'bold';
export function nativeBoldMode(field:NativeField,occurrence:Occurrence):NativeBoldMode {
  return occurrence.bold??(/(?:representative.*name|name.*representative)/i.test(`${field.key} ${field.label}`)?'normal':'inherit');
}
export type NativeValues = Record<string,string>;
export interface NativeVersion { id:string;templateId:string;name:string;version:number;revision:number;status:string;filename:string;sourceId:string;sourceHash:string;fonts:string[];missingFonts:string[];originalPages:number;fields:NativeField[] }
export interface NativeDraft { id:string;versionId:string;values:NativeValues;revision:number;updatedAt:string;templateName:string }
export interface NativeGenerated { id:string;draftId:string|null;format:'pdf'|'docx';createdAt:string;expiresAt:string;templateName:string;expired:boolean }
export const valuesSchema=z.record(z.string().max(60),z.string().max(2000));
export function newNativeField(key:string,label:string,occurrences:Occurrence[],order=0):NativeField {
  const separateRoleTitle=/\b(?:representative|supervisor)\b.*\b(?:position|title)\b|\b(?:position|title)\b.*\b(?:representative|supervisor)\b/i.test(`${key} ${label}`);
  const representativeName=/(?:representative.*name|name.*representative)/i.test(`${key} ${label}`);
  return nativeFieldSchema.parse({id:crypto.randomUUID(),key,label,type:'text',order,occurrences:occurrences.map(occurrence=>({...occurrence,lineBefore:occurrence.lineBefore??separateRoleTitle,...(occurrence.bold===undefined&&representativeName?{bold:'normal' as const}:{})})),placeholderText:`[${label}]`});
}
export function validateFieldConfiguration(fields:NativeField[]) {
  if(!fields.length||fields.length>80)throw new Error('Mark between 1 and 80 fields before publishing.');
  if(new Set(fields.map(f=>f.key)).size!==fields.length)throw new Error('Each field needs a unique key.');
  if(new Set(fields.map(f=>f.id)).size!==fields.length)throw new Error('Each field needs a unique ID.');
  const ranges=new Map<string,Occurrence[]>();
  for(const field of fields){
    if(field.type==='dropdown'&&!field.options.length)throw new Error(`Add dropdown options for ${field.label}.`);
    if(field.locked&&field.required&&!field.defaultValue.trim())throw new Error(`A locked required field needs a default: ${field.label}.`);
    if(field.validationRegex){
      // RE2 uses linear-time matching; administrator rules cannot stall a web request.
      try{RE2JS.compile(field.validationRegex);}catch{throw new Error(`Invalid or unsupported validation pattern for ${field.label}.`);}
    }
    if(field.defaultValue)resolveNativeValues([{...field,required:false}],{[field.key]:field.defaultValue},true);
    for(const occurrence of field.occurrences){
      const key=`${occurrence.part}:${occurrence.paragraph}`;const prior=ranges.get(key)??[];
      if(occurrence.end<=occurrence.start||prior.some(p=>occurrence.start<p.end&&occurrence.end>p.start))throw new Error('Marked fields cannot overlap.');
      prior.push(occurrence);ranges.set(key,prior);
    }
  }
}
export function resolveNativeValues(fields:NativeField[],input:NativeValues,validate=false):NativeValues {
  if(Object.keys(input).some(key=>!fields.some(f=>f.key===key)))throw new Error('These values include a field not available in this template.');
  const result:NativeValues={};
  for(const field of fields){
    const value=field.locked?field.defaultValue:input[field.key]??field.defaultValue;
    if(value.length>field.maxLength||!value.isWellFormed()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\uFFFE\uFFFF]/.test(value))throw new Error(`${field.label} must contain at most ${field.maxLength} valid characters.`);
    if(validate){
      if(field.required&&!value.trim())throw new Error(`Complete ${field.label}.`);
      if(value.trim()){
        if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))throw new Error(`Enter a valid date for ${field.label}.`);
        if(field.type==='number'&&(!/^-?\d+(\.\d+)?$/.test(value)||!Number.isFinite(Number(value))))throw new Error(`Enter a valid number for ${field.label}.`);
        if(field.type==='dropdown'&&!field.options.includes(value))throw new Error(`Choose an option for ${field.label}.`);
        if(field.validationRegex&&!RE2JS.compile(field.validationRegex).matches(value))throw new Error(`Check the format of ${field.label}.`);
      }
    }
    result[field.key]=value; // Preserve the student's raw input; transforms apply only during rendering.
  }
  return result;
}
export function nativeDisplay(field:NativeField,value:string,occurrence?:Occurrence):string {
  if(!value)return '';
  const lineBefore=occurrence?.lineBefore??(field.key==='representative_position');
  if(occurrence&&value===field.occurrences[0].originalText)return (lineBefore?'\n':'')+occurrence.originalText;
  let result=value;
  if(field.type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(value))result=format(parseISO(value),field.dateFormat);
  if(occurrence?.display==='surname'){
    const title=result.match(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Engr\.?)\s+/i)?.[0]??'';
    const names=result.slice(title.length).trim().split(/\s+/);let start=names.length-1;
    while(start>0&&/^(de|del|dela|la|los|las|san|santa|van|von)$/i.test(names[start-1]))start--;
    result=title+names.slice(start).join(' ');
  }
  if(field.transform==='uppercase')result=result.toLocaleUpperCase();
  if(field.transform==='lowercase')result=result.toLocaleLowerCase();
  if(field.transform==='titlecase')result=result.toLocaleLowerCase().replace(/(^|[\s-])\p{L}/gu,s=>s.toLocaleUpperCase());
  return (lineBefore?'\n':'')+(occurrence?.prefix??'')+result+(occurrence?.suffix??'');
}
