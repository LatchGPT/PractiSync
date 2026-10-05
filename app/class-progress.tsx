'use client';

import {ArrowLeft,ArrowRight,BookOpen,FileText,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardTitle,CardDescription} from '@/components/ui/card';
import {Progress} from '@/components/ui/progress';
import {Badge} from '@/components/ui/badge';
import type {Row,Snapshot} from '@/packages/validation/contracts';

const requiredTypes=3;
const value=(row:Row,key:string)=>String(row[key]??'');
const number=(row:Row,key:string)=>Number(row[key]??0);
const studentProgress=(placement:Row,data:Snapshot)=>{
 const entries=data.entries.filter(entry=>entry.placementId===placement.id);
 const reported=entries.reduce((sum,entry)=>sum+number(entry,'minutes'),0);
 const confirmed=entries.filter(entry=>entry.confirmedVersion===entry.version).reduce((sum,entry)=>sum+number(entry,'minutes'),0);
 const target=number(placement,'requiredMinutes');
 const documents=data.documents.filter(document=>document.placementId===placement.id);
 return {reported,confirmed,target,percent:target?Math.min(100,Math.round(reported/target*100)):0,documents,approved:documents.filter(document=>document.status==='APPROVED').length};
};

export function CoordinatorClassCards({data,navigate}:{data:Snapshot;navigate:(page:string)=>void}){
 const classes=data.classes.filter(row=>!number(row,'revoked'));
 return <section className="class-progress-section"><div className="class-progress-heading"><h2>Progress by class</h2><p>Open a class to review each student and their document submissions.</p></div><div className="class-progress-grid">{classes.map(cls=>{
  const placements=data.placements.filter(row=>row.classId===cls.id);
  const percent=placements.length?Math.round(placements.reduce((sum,row)=>sum+studentProgress(row,data).percent,0)/placements.length):0;
  const approved=placements.reduce((sum,row)=>sum+studentProgress(row,data).approved,0);
  return <Card key={cls.id} className="class-progress-card"><CardHeader><div className="class-progress-title"><span className="role-symbol"><BookOpen size={18}/></span><Badge variant="outline">{value(cls,'section')}</Badge></div><CardTitle>{value(cls,'name')}</CardTitle><CardDescription>{placements.length} {placements.length===1?'student':'students'} in this class</CardDescription></CardHeader><CardContent><div className="class-progress-line"><span>Average required hours</span><strong>{percent}%</strong></div><Progress value={percent}/><p><FileText size={14}/>{approved} of {placements.length*requiredTypes} required documents approved</p><Button variant="outline" onClick={()=>navigate('class/'+cls.id)}>View class progress <ArrowRight size={15}/></Button></CardContent></Card>;
 })}</div></section>;
}

export function ClassDetail({data,classId,onBack,onPortfolio}:{data:Snapshot;classId:string;onBack:()=>void;onPortfolio:(placement:Row)=>void}){
 const cls=data.classes.find(row=>row.id===classId);
 if(!cls)return <Card className="class-detail"><CardContent><p>This class is outside your access scope.</p><Button variant="outline" onClick={onBack}>Back to classes</Button></CardContent></Card>;
 const placements=data.placements.filter(row=>row.classId===classId);
 return <div className="class-detail"><Button variant="ghost" onClick={onBack}><ArrowLeft size={16}/>Back to classes</Button><div className="class-detail-heading"><div><span className="eyebrow">{value(cls,'section')}</span><h2>{value(cls,'name')}</h2><p>{placements.length} students · {value(cls,'period')}</p></div><span className="class-detail-count"><Users size={17}/>{placements.length} enrolled</span></div><div className="class-student-grid">{placements.map(row=>{
  const progress=studentProgress(row,data);
  return <Card key={row.id} className="class-student-card"><CardHeader><CardTitle>{value(row,'studentName')}</CardTitle><CardDescription>{value(row,'companyName')} · {value(row,'courseCode')}</CardDescription></CardHeader><CardContent><div className="class-progress-line"><span>Reported hours</span><strong>{progress.percent}%</strong></div><Progress value={progress.percent}/><p>{Number((progress.reported/60).toFixed(1))} of {progress.target?Number((progress.target/60).toFixed(1)):'unconfigured'} hours · {Number((progress.confirmed/60).toFixed(1))} confirmed</p><div className="class-progress-line"><span>Required documents approved</span><strong>{progress.approved}/{requiredTypes}</strong></div><Progress value={progress.approved/requiredTypes*100}/><div className="class-document-list">{progress.documents.map(document=><div key={document.id}><span>{value(document,'name')}</span><Badge variant="outline">{value(document,'status').toLowerCase()}</Badge></div>)}</div><Button variant="outline" onClick={()=>onPortfolio(row)}>Download training record</Button></CardContent></Card>;
 })}</div>{!placements.length&&<p className="small muted">No training placements are recorded for this class yet.</p>}</div>;
}
