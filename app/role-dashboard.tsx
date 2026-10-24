'use client';

import {ArrowRight,BookOpen,BriefcaseBusiness,ChevronLeft,ChevronRight,Clock,FileText,GraduationCap,LifeBuoy,Megaphone,ShieldCheck,Users} from 'lucide-react';
import {useState} from 'react';
import type {Row,Snapshot} from '@/packages/validation/contracts';
import AttendanceVisuals from './attendance-visuals';
import StudentGoalProgress from './student-goal-progress';
import OverallStudentsProgress from './overall-students-progress';
import DocumentReadinessChecklist from './document-readiness-checklist';

const value=(row:Row,key:string)=>String(row[key]??'');
const number=(row:Row,key:string)=>Number(row[key]??0);
const hours=(minutes:number)=>`${Number((minutes/60).toFixed(1))} hrs`;
const date=(input:string)=>{
 if(!input)return '—';
 const d=new Date(input.length===10?`${input}T00:00:00+08:00`:input);
 return Number.isNaN(d.getTime())?input:d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'Asia/Manila'});
};
const manilaToday=()=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??'';
 return `${part('year')}-${part('month')}-${part('day')}`;
};
const eventCategories:Record<string,string>={ACADEMIC:'Academic event',HOLIDAY:'University holiday',DEADLINE:'Document deadline',APPOINTMENT:'COE appointment'};
const eventCategory=(type:string)=>eventCategories[type]??type.toLowerCase().replaceAll('_',' ');
const eventDate=(input:string)=>{
 if(!input)return '';
 const d=new Date(input.length===10?`${input}T00:00:00+08:00`:input);
 return Number.isNaN(d.getTime())?input:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Manila'});
};
const eventTime=(input:string)=>{
 if(!input)return '';
 const [hour,minute]=input.split(':').map(Number);
 if(!Number.isInteger(hour)||!Number.isInteger(minute))return input;
 return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;
};


function Card({title,children,action,className}:{title:string;children:React.ReactNode;action?:React.ReactNode;className?:string}){
 return <section className={`role-card ${className??''}`}><div className="role-card-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}
function Link({to,children,navigate}:{to:string;children:React.ReactNode;navigate:(page:string)=>void}){
 return <button type="button" className="role-link" onClick={()=>navigate(to)}>{children}<ArrowRight size={15}/></button>;
}
function Empty({children}:{children:React.ReactNode}){return <p className="role-empty">{children}</p>;}
const calendarDayKey=(day:Date)=>`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
function CalendarEventDetails({event}:{event:Row}){
 const start=value(event,'startDate');
 const end=value(event,'endDate')||start;
 const startTime=value(event,'startTime');
 const endTime=value(event,'endTime');
 const times=startTime&&endTime?`${eventTime(startTime)}–${eventTime(endTime)}`:eventTime(startTime||endTime);
 const range=start&&end&&start!==end?`${eventDate(start)} – ${eventDate(end)}`:eventDate(start);
 const location=value(event,'location');
 const description=value(event,'description');
 const meta=[eventCategory(value(event,'eventType')),range,times].filter(Boolean).join(' · ');
 return <article className="role-calendar-event"><strong>{value(event,'title')||'Untitled event'}</strong><span>{meta}</span>{location&&<span>{location}</span>}{description&&<p>{description}</p>}</article>;
}
const isEventOnDate=(event:Row,targetKey:string)=>{
 if(value(event,'status')==='CANCELLED')return false;
 const start=value(event,'startDate');
 if(!start)return false;
 const end=value(event,'endDate')||start;
 return start<=targetKey&&end>=targetKey;
};
function AdminMiniCalendar({events=[]}:{events?:Row[]}){
 const today=manilaToday();
 const [month,setMonth]=useState(()=>{const [year,monthNumber]=today.split('-').map(Number);return new Date(year!,monthNumber!-1,1,12);});
 const [selectedDate,setSelectedDate]=useState(today);
 const monthStart=new Date(month.getFullYear(),month.getMonth(),1,12);
 const monthEnd=new Date(month.getFullYear(),month.getMonth()+1,0,12);
 const leadingDays=(monthStart.getDay()+6)%7;
 const cellCount=Math.ceil((leadingDays+monthEnd.getDate())/7)*7;
 const days=Array.from({length:cellCount},(_,index)=>new Date(month.getFullYear(),month.getMonth(),index-leadingDays+1,12));
 const safeEvents=events??[];
 const selectedEvents=safeEvents.filter(event=>isEventOnDate(event,selectedDate));
 const changeMonth=(offset:number)=>{const next=new Date(month.getFullYear(),month.getMonth()+offset,1,12);setMonth(next);setSelectedDate(calendarDayKey(next));};
 const chooseDay=(day:Date)=>{const nextMonth=day.getMonth()!==month.getMonth();setSelectedDate(calendarDayKey(day));if(nextMonth)setMonth(new Date(day.getFullYear(),day.getMonth(),1,12));};
 return <div className="role-mini-calendar">
  <div className="role-mini-calendar-heading"><button type="button" aria-label="Previous month" onClick={()=>changeMonth(-1)}><ChevronLeft size={14}/></button><strong>{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button type="button" aria-label="Next month" onClick={()=>changeMonth(1)}><ChevronRight size={14}/></button></div>
  <div className="role-mini-calendar-weekdays" aria-hidden="true">{['M','T','W','T','F','S','S'].map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div>
  <div className="role-mini-calendar-grid">{days.map(day=>{const key=calendarDayKey(day);const eventCount=safeEvents.filter(event=>isEventOnDate(event,key)).length;const outside=day.getMonth()!==month.getMonth();const selected=key===selectedDate;return <button type="button" key={key} className={`role-mini-calendar-day${outside?' outside':''}${selected?' selected':''}${key===today?' today':''}`} aria-label={`${eventDate(key)}${eventCount?`, ${eventCount} ${eventCount===1?'event':'events'}`:''}`} aria-pressed={selected} onClick={()=>chooseDay(day)}><span>{day.getDate()}</span>{eventCount>0&&<i aria-hidden="true"/>}</button>;})}</div>
  <section className="role-mini-calendar-events" aria-live="polite"><h3>{eventDate(selectedDate)}</h3>{selectedEvents.length?<div className="role-calendar-details">{selectedEvents.map(event=><CalendarEventDetails key={event.id} event={event}/>)}</div>:<p>No events on this day.</p>}</section>
 </div>;
}

export default function RoleDashboard({data,navigate,onLogAttendance,onViewStudent}:{data:Snapshot;navigate:(page:string)=>void;onLogAttendance:()=>void;onViewStudent?:(studentId:string)=>void}){
 const {user}=data;
 const reported=(placementId?:string)=>data.entries.filter(entry=>!placementId||entry.placementId===placementId).reduce((sum,entry)=>sum+number(entry,'minutes'),0);
 const confirmed=(placementId?:string)=>data.entries.filter(entry=>(!placementId||entry.placementId===placementId)&&entry.confirmedVersion===entry.version).reduce((sum,entry)=>sum+number(entry,'minutes'),0);
 const active=data.placements.filter(placement=>placement.status==='ACTIVE');
 const pendingDocuments=data.documents.filter(document=>document.status==='PENDING');

 if(user.role==='STUDENT'){
  const placement=data.placements.find(row=>row.studentId===user.id&&row.status==='ACTIVE')??data.placements.find(row=>row.studentId===user.id);
  const ownEntries=data.entries.filter(entry=>entry.placementId===placement?.id).sort((a,b)=>value(b,'date').localeCompare(value(a,'date'))||String(b.createdAt??'').localeCompare(String(a.createdAt??'')));
  return <div className="role-dashboard student-dashboard">
   <Card title="Overall Required Hours"><div className="panel-body"><StudentGoalProgress entries={ownEntries} requiredMinutes={Number(placement?.requiredMinutes??0)} calendarEvents={data.calendarEvents}/></div></Card>
   <div className="role-columns"><div className="role-stack">
    <Card title="Recent Attendance" action={<Link to="attendance" navigate={navigate}>View DTR</Link>}>{ownEntries.length?<div className="role-list">{ownEntries.slice(0,4).map(entry=><div className="role-list-row" key={entry.id}><span className="role-symbol soft"><Clock size={17}/></span><div><strong>{date(value(entry,'date'))}</strong><span>{value(entry,'narrative')}</span></div><span className="role-list-end"><strong>{hours(number(entry,'minutes'))}</strong><small>{entry.confirmedVersion===entry.version?'Industry Partner verified':'Self reported'}</small></span></div>)}</div>:<Empty>No attendance entries yet. Your first DTR will appear here.</Empty>}</Card>
    <DocumentReadinessChecklist data={data} navigate={navigate}/>
   </div>
   <div className="role-stack"><Card title="Next Steps"><div className="role-actions"><button type="button" onClick={onLogAttendance}><Clock size={18}/><span><strong>Log attendance</strong></span><ArrowRight size={16}/></button><button type="button" onClick={()=>navigate('documents')}><FileText size={18}/><span><strong>Check documents</strong></span><ArrowRight size={16}/></button><button type="button" onClick={()=>navigate('classes')}><BookOpen size={18}/><span><strong>My class</strong></span><ArrowRight size={16}/></button><button type="button" onClick={()=>navigate('incidents')}><LifeBuoy size={18}/><span><strong>Contact coordinator</strong></span><ArrowRight size={16}/></button></div></Card><Announcements data={data} navigate={navigate}/></div></div>
  </div>;
 }

 if(user.role==='COORDINATOR'){
  const classes=data.classes.filter(row=>!number(row,'revoked'));
  const cases=data.incidents.filter(row=>row.status!=='RESOLVED');

  const pendingJoinRequests=(data.joinRequests??[]).filter(row=>row.status==='PENDING');
  const pendingApplications=data.applications.filter(row=>row.status==='SUBMITTED');
  const totalReviewItems=pendingDocuments.length+pendingJoinRequests.length+cases.length;
  return <div className="role-dashboard coordinator-dashboard"><OverallStudentsProgress data={data} navigate={navigate} onViewStudent={onViewStudent}/><AttendanceVisuals entries={data.entries}/><div className="role-columns"><div className="role-stack"><Card title="My classes" action={<Link to="classes" navigate={navigate}>Manage classes</Link>}>{classes.length?<div className="role-list">{classes.map(cls=>{const placements=data.placements.filter(row=>row.classId===cls.id);return <button type="button" className="role-list-row interactive" key={cls.id} onClick={()=>navigate('classes')}><span className="role-symbol"><BookOpen size={17}/></span><div><strong>{value(cls,'section')}</strong><span>{value(cls,'name')} · {data.courses.find(row=>row.id===cls.courseId)?.name??'Course'}</span></div><span className="role-list-end"><strong>{placements.length}</strong><small>placements in view</small></span></button>;})}</div>:<Empty>No classes yet. Create a class to invite eligible students.</Empty>}</Card><Card title="Student progress">{active.length?<div className="role-list">{active.slice(0,5).map(row=>{const unconf=data.finalDtrs?.some(f=>f.placementId===row.id&&f.status==='SUBMITTED')?1:0;return <div className="role-list-row" key={row.id}><span className="role-symbol soft"><GraduationCap size={17}/></span><div><strong>{value(row,'studentName')}</strong><span>{value(row,'section')} · {value(row,'companyName')}</span></div><span className="role-list-end"><strong>{hours(reported(row.id))}</strong><small>{hours(confirmed(row.id))} confirmed{unconf>0?` · ${unconf} pending`:''}</small></span></div>;})}</div>:<Empty>No active placements in your classes.</Empty>}</Card></div><div className="role-stack"><Card title="Review queue" action={<span className="chip orange">{totalReviewItems} pending</span>}><div className="role-actions"><button type="button" onClick={()=>navigate('documents')}><FileText size={18}/><span><strong>{pendingDocuments.length} internship documents pending review</strong></span><ArrowRight size={16}/></button>{pendingJoinRequests.length>0&&<button type="button" onClick={()=>navigate('classes')}><Users size={18}/><span><strong>{pendingJoinRequests.length} class enrollment join requests</strong></span><ArrowRight size={16}/></button>}{pendingApplications.length>0&&<button type="button" onClick={()=>navigate('jobs')}><BriefcaseBusiness size={18}/><span><strong>{pendingApplications.length} student job applications</strong></span><ArrowRight size={16}/></button>}<button type="button" onClick={()=>navigate('incidents')}><LifeBuoy size={18}/><span><strong>{cases.length} open student support cases</strong></span><ArrowRight size={16}/></button><button type="button" onClick={()=>navigate('announcements')}><Megaphone size={18}/><span><strong>Class announcement</strong></span><ArrowRight size={16}/></button></div></Card><Announcements data={data} navigate={navigate}/></div></div></div>;
 }

 const departments=data.departments;
 return <div className="role-dashboard admin-dashboard"><div className="role-columns"><div className="role-stack"><Card title="Curriculum Management" action={<Link to="institution" navigate={navigate}>Manage curriculum</Link>}>{departments.length?<div className="role-list">{departments.map(department=><div className="role-list-row" key={department.id}><span className="role-symbol"><GraduationCap size={17}/></span><div><strong>{value(department,'name')}</strong><span>{value(department,'code')}</span></div><span className="role-list-end"><strong>{data.courses.filter(course=>course.departmentId===department.id).length}</strong><small>courses</small></span></div>)}</div>:<Empty>No departments configured.</Empty>}</Card><Card title="Recent account activity" action={<Link to="accounts" navigate={navigate}>Accounts & roles</Link>}>{data.audit.length?<div className="role-list">{data.audit.slice(0,5).map(event=><div className="role-list-row" key={event.id}><span className="role-symbol soft"><ShieldCheck size={17}/></span><div><strong>{value(event,'action').toLowerCase().replaceAll('_',' ')}</strong><span>{date(value(event,'createdAt'))}</span></div></div>)}</div>:<Empty>Account and structure changes will appear here after they are made.</Empty>}</Card></div><div className="role-stack"><Card title="University office"><div className="role-actions"><button type="button" onClick={()=>navigate('accounts')}><Users size={18}/><span><strong>Accounts and roles</strong></span><ArrowRight size={16}/></button><button type="button" onClick={()=>navigate('institution')}><GraduationCap size={18}/><span><strong>Departments and courses</strong></span><ArrowRight size={16}/></button><button type="button" onClick={()=>navigate('jobs')}><BriefcaseBusiness size={18}/><span><strong>Internship partners</strong></span><ArrowRight size={16}/></button><button type="button" onClick={()=>navigate('announcements')}><Megaphone size={18}/><span><strong>University announcements</strong></span><ArrowRight size={16}/></button></div></Card><Card title="Calendar" className="role-calendar-card"><AdminMiniCalendar events={data.calendarEvents}/></Card></div></div></div>;
}

function Announcements({data,navigate}:{data:Snapshot;navigate:(page:string)=>void}){
 const title=data.user.role==='STUDENT'?'Latest Announcements':'Latest announcements';
 return <Card title={title} action={<Link to="announcements" navigate={navigate}>View all</Link>}>{data.announcements.length?<div className="role-list">{data.announcements.slice(0,2).map(item=><div className="role-announcement" key={item.id}><div><span className="role-status positive">{value(item,'audience').toLowerCase()} update</span><time>{date(value(item,'createdAt'))}</time></div><strong>{value(item,'title')}</strong><p>{value(item,'body')}</p></div>)}</div>:<Empty>No announcements for your current access scope.</Empty>}</Card>;
}
