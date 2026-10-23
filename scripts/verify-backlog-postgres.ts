import assert from 'node:assert/strict';
import {digestClassCode} from '../packages/domain/class-codes';
import { one,list,insert,seed,statement } from '../packages/db/demo';
import { prisma } from '../packages/db/client';
import { mutate } from '../packages/domain/actions';
import { snapshot } from '../packages/domain/read';
import { runDeadlineReminders } from '../packages/domain/reminders';
import { latestEmployerEvidence } from '../packages/domain/feedback-evidence';
import { nativeVersion } from '../packages/documents/native-repository';
import type { Identity } from '../packages/validation/contracts';

if(!new URL(process.env.DATABASE_URL??'').pathname.includes('backlog_verification_')||process.env.DEPLOYMENT_MODE!=='demo')throw new Error('Use a dedicated fictional backlog_verification database. This script never targets the persistent demo.');
await seed();
const prefix='verify-'+crypto.randomUUID().slice(0,8),tenantB=prefix+'-university';
const actor=async(id:string)=>await one('SELECT * FROM users WHERE id=?',id) as unknown as Identity;
const a={admin:await actor('demo-admin'),coordinator:await actor('demo-coordinator'),student:await actor('demo-student'),supervisor:await actor('demo-supervisor')};
async function clone(table:string,sourceId:string,id:string,tenantId:string,changes:Record<string,string|number|null>={}){
 const row=await one(`SELECT * FROM ${table} WHERE id=?`,sourceId);assert.ok(row,sourceId);
 const values=Object.fromEntries(Object.entries({...row,...changes,tenantId}).filter(([key])=>key!=='id').map(([key,value])=>[key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()),value]));
 await insert(table,values,id).run();return id;
}
try{
 await prisma.tenant.create({data:{id:tenantB,name:'Fictional isolation university B',mode:'DEMO',timezone:'Asia/Manila',allowedGoogleDomains:[]}});
 const dept=await clone('departments','dept-it',prefix+'-dept',tenantB);
 const course=await clone('courses','course-it',prefix+'-course',tenantB,{departmentId:dept,code:prefix.toUpperCase()});
 const company=await clone('companies','company-northstar',prefix+'-company',tenantB);
 const student=await clone('users','demo-student',prefix+'-student',tenantB,{username:prefix+'.student',email:prefix+'.student@rtu.edu.ph',isDemo:0,courseId:course,companyId:null});
 const coordinator=await clone('users','demo-coordinator',prefix+'-coordinator',tenantB,{username:prefix+'.coordinator',email:prefix+'.coordinator@rtu.edu.ph',isDemo:0});
 const supervisor=await clone('users','demo-supervisor',prefix+'-supervisor',tenantB,{username:prefix+'.supervisor',email:prefix+'.supervisor@example.invalid',isDemo:0,companyId:company});
 const cls=await clone('classes','class-it',prefix+'-class',tenantB,{courseId:course,coordinatorId:coordinator,codeHash:await digestClassCode(prefix),codeLabel:prefix.toUpperCase(),classRepId:null,viceClassRepId:null});
 await insert('enrollments',{tenant_id:tenantB,class_id:cls,student_id:student,active:1}).run();
 const placement=await clone('placements','placement-1',prefix+'-placement',tenantB,{studentId:student,classId:cls,companyId:company,courseId:course});
 await insert('assignments',{tenant_id:tenantB,placement_id:placement,supervisor_id:supervisor,active:1}).run();
 const b={student:await actor(student),coordinator:await actor(coordinator),supervisor:await actor(supervisor)};
 const feedback={placementId:placement,version:0,workplaceReadiness:4,competencyRelevance:4,supervisionSupport:4,curriculumAlignment:4,recommendations:'Fictional PostgreSQL employer evidence.'};
 await assert.rejects(()=>mutate(a.coordinator,'industryFeedback',feedback));
 await assert.rejects(()=>mutate(a.supervisor,'industryFeedback',feedback));
 const submitted=await mutate(b.supervisor,'industryFeedback',{...feedback,tenantId:a.admin.tenantId,evaluatorId:a.admin.id});
 const record=await one('SELECT * FROM industry_feedback WHERE id=?',submitted.id!);assert.equal(record?.tenantId,tenantB);assert.equal(record?.evaluatorId,supervisor);
 await assert.rejects(()=>mutate(b.supervisor,'industryFeedback',feedback));
 await assert.rejects(()=>insert('entries',{tenant_id:a.admin.tenantId,placement_id:placement,date:'2026-10-01',narrative:'Cross-university negative fixture.'}).run());
 for(const user of [a.admin,a.coordinator,a.student,a.supervisor]){
  const data=await snapshot(user);assert.ok(!data.placements.some(p=>p.tenantId===tenantB));assert.ok(!data.industryFeedback.some(f=>f.tenantId===tenantB));JSON.stringify(data);
 }
 assert.ok((await snapshot(b.coordinator)).industryFeedback.some(f=>f.id===record!.id));
 assert.ok((await list('SELECT * FROM audit WHERE resource_id=?',record!.id)).every(r=>r.tenantId===tenantB));
 await statement('UPDATE assignments SET active=0 WHERE tenant_id=? AND placement_id=?',tenantB,placement).run();
 await assert.rejects(()=>mutate(b.supervisor,'industryFeedback',{...feedback,version:1}));
 assert.equal((await snapshot(b.supervisor)).placements.length,0);
 const p=(await one('SELECT * FROM placements WHERE id=?',placement))!;assert.equal(latestEmployerEvidence([p],[record!]).length,1);
 await insert('native_document_sources',{tenant_id:tenantB,created_by:coordinator,filename:'fictional-source.docx',sha256:'fictional-metadata-fixture',content_base64:'ZmljdGlvbmFs',fonts_json:'[]',scanned_at:new Date().toISOString()},prefix+'-source').run();
 await insert('native_document_templates',{tenant_id:tenantB,created_by:coordinator,name:'Fictional B template',status:'ACTIVE'},prefix+'-template').run();
 await insert('native_document_versions',{tenant_id:tenantB,template_id:prefix+'-template',source_id:prefix+'-source',version:1,revision:1,status:'PUBLISHED',fields_json:'[]'},prefix+'-version').run();
 assert.equal((await nativeVersion(tenantB,prefix+'-version')).id,prefix+'-version');
 await assert.rejects(()=>nativeVersion(a.admin.tenantId,prefix+'-version'));
 // Legitimate cross-program coordinator/HTE authority stays class/assignment-based.
 const crossClass=await clone('classes','class-it',prefix+'-cross-class',a.admin.tenantId,{courseId:'course-business',coordinatorId:a.coordinator.id,codeHash:await digestClassCode(prefix+'X'),codeLabel:prefix.toUpperCase()+'X',classRepId:null,viceClassRepId:null});
 const crossStudent=await clone('users','demo-student',prefix+'-cross-student',a.admin.tenantId,{username:prefix+'.cross',email:prefix+'.cross@rtu.edu.ph',courseId:'course-business',isDemo:0});
 const crossPlacement=await clone('placements','placement-1',prefix+'-cross-placement',a.admin.tenantId,{classId:crossClass,courseId:'course-business',studentId:crossStudent});
 await insert('assignments',{placement_id:crossPlacement,supervisor_id:a.supervisor.id,active:1}).run();
 assert.ok((await snapshot(a.coordinator)).placements.some(p=>p.id===crossPlacement));
 await mutate(a.supervisor,'industryFeedback',{...feedback,placementId:crossPlacement});
 // Persistent schedules and worker execution on PostgreSQL, with an explicit controlled clock.
 const event=await mutate(b.coordinator,'calendarEvent',{eventType:'DEADLINE',title:'Fictional B deadline',startDate:'2026-12-01',endDate:'2026-12-10',audience:'CLASS',classId:cls,remindersEnabled:1});
 await runDeadlineReminders(a.admin.tenantId,new Date('2026-12-07T01:00:00Z'));
 assert.equal((await list("SELECT * FROM notifications WHERE tenant_id=? AND resource_id=? AND resource_type='deadline_reminder'",tenantB,event.id!)).length,0);
 assert.equal(await runDeadlineReminders(tenantB,new Date('2026-12-07T01:00:00Z')),1);
 assert.equal(await runDeadlineReminders(tenantB,new Date('2026-12-07T01:00:00Z')),0);
 await statement('UPDATE enrollments SET active=0 WHERE tenant_id=? AND student_id=?',tenantB,student).run();
 assert.equal((await snapshot(b.student)).notifications.filter(n=>n.resourceType==='deadline_reminder').length,0);
 assert.equal(await runDeadlineReminders(tenantB,new Date('2026-12-09T01:00:00Z')),0);
 console.log(JSON.stringify({database:'dedicated fictional PostgreSQL',tenantB,checks:['two-university scope','four-role scoped reads','forged payload identity ignored','composite ownership constraint','stale duplicate denial','revoked assignment access','retained verified history','legitimate cross-program assignment','tenant-correct audit','persistent controlled-time reminders','repeat-run deduplication','recipient revocation and inbox visibility'],status:'passed'},null,2));
}finally{await prisma.$disconnect();}
