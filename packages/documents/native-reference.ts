import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { one } from '../db/demo';
import { scanDocx } from './native-infrastructure';
import { openNativeDocx,yellowOccurrences } from './native-docx';
import { createNativeTemplate,saveNativeFields } from './native-repository';
import { newNativeField,type NativeField,type Occurrence } from './native-types';
import type { Identity } from '../validation/contracts';

export async function recommendationReferenceFields(bytes:Uint8Array):Promise<NativeField[]>{
  const source=await openNativeDocx(bytes),marked=yellowOccurrences(source.paragraphs);
  const find=(pattern:RegExp)=>{const found=marked.find(o=>pattern.test(o.originalText));if(!found)throw new Error(`Missing reference field ${pattern}`);return found;};
  const fields:NativeField[]=[];
  const add=(key:string,label:string,occurrences:Occurrence[],patch:Partial<NativeField>={})=>{const field={...newNativeField(key,label,occurrences,fields.length),...patch};fields.push(field);};
  add('letter_date','Letter date',[find(/\(Date\)/)],{type:'date',maxLength:40});
  add('representative_name','Company representative name',[find(/Name of Company Representative/),{...find(/Last name of the representative/),display:'surname',suffix:','}],{helpText:'Include the title, for example Ms. Marinella N. San Antonio. The greeting uses the same name.'});
  add('representative_position','Representative position',[{...find(/Position of the Representative/),lineBefore:true}],{helpText:'Appears on a new line below the company representative name.'});
  add('company_name','Company / organization',[find(/\(Company\)/)],{defaultValue:'Northstar Digital'});
  add('company_address','Company address',[find(/Address of the Company/)],{type:'textarea',maxLength:500});
  add('student_full_name','Student full name',[find(/Name of the student/),{...find(/^Ms\. Dela Cruz$/),display:'surname'}],{helpText:'Use the name on your school records. All mentions update together.'});
  add('pronoun','Pronoun',[{...find(/^on her$/),prefix:'on '}],{type:'dropdown',options:['his','her','their'],defaultValue:'their',maxLength:40});
  add('year_level','Year level',[find(/^4th$/)],{type:'dropdown',options:['1st','2nd','3rd','4th','5th'],defaultValue:'4th',maxLength:40});
  add('college','College',[find(/^Arts and Sciences$/)]);
  add('major','Major',[find(/^Psychology$/)]);
  add('required_hours','Required training hours',[find(/^300$/)],{type:'number',defaultValue:'480',maxLength:10});
  return fields;
}
export async function installRecommendationReference(){
  const userRow=await one("SELECT * FROM users WHERE role='SUPER_ADMIN' ORDER BY created_at LIMIT 1");if(!userRow)throw new Error('Seed the application accounts first.');
  const user={id:userRow.id,tenantId:String(userRow.tenantId),role:'SUPER_ADMIN'} as Identity;
  const existing=await one("SELECT id FROM native_document_templates WHERE tenant_id=? AND name='Recommendation letter'",user.tenantId);if(existing){console.log('Native recommendation template is already installed.');return;}
  const bytes=await readFile(join(process.cwd(),'packages/documents/fixtures/recommendation.docx'));await scanDocx(bytes);
  const version=await createNativeTemplate(user,'Sample Recommendation Letter.docx',bytes,await recommendationReferenceFields(bytes),'Recommendation letter');
  const {renderNativePdf}=await import('./native-queue');await renderNativePdf(user.tenantId,version,{},'raw');await saveNativeFields(user,version,version.fields,true);
  console.log(`Original recommendation DOCX installed as immutable version ${version.version}.`);
}
