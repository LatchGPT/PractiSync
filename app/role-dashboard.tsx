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
const date=(input:string)=>new Date(input.length===10?`${input}T00:00:00+08:00`:input).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'Asia/Manila'});
const manilaToday=()=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??'';
 return `${part('year')}-${part('month')}-${part('day')}`;
};
const eventCategories:Record<string,string>={ACADEMIC:'Academic event',HOLIDAY:'University holiday',DEADLINE:'Document deadline',APPOINTMENT:'COE appointment'};
const eventCategory=(type:string)=>eventCategories[type]??type.toLowerCase().replaceAll('_',' ');
const eventDate=(input:string)=>new Date(input.length===10?`${input}T00:00:00+08:00`:input).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Manila'});
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
 return <button className="role-link" onClick={()=>navigate(to)}>{children}<ArrowRight size={15}/></button>;
}
function Empty({children}:{children:React.ReactNode}){return <p className="role-empty">{children}</p>;}
const calendarDayKey=(day:Date)=>`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
function CalendarEventDetails({event}:{event:Row}){
 const start=value(event,'startDate');
 const end=value(event,'endDate');
 const startTime=value(event,'startTime');
 const endTime=value(event,'endTime');
 const times=startTime&&endTime?`${eventTime(startTime)}–${eventTime(endTime)}`:eventTime(startTime||endTime);
 const range=start&&end&&start!==end?`${eventDate(start)} – ${eventDate(end)}`:eventDate(start||end);
 const location=value(event,'location');
 const description=value(event,'description');
 return <article className="role-calendar-event"><strong>{value(event,'title')||'Untitled event'}</strong><span>{eventCategory(value(event,'eventType'))} · {range}{times?` · ${times}`:''}</span>{location&&<span>{location}</span>}{description&&<p>{description}</p>}</article>;
}
function AdminMiniCalendar({events}:{events:Row[]}){
 const today=manilaToday();
 const [month,setMonth]=useState(()=>{const [year,monthNumber]=today.split('-').map(Number);return new Date(year!,monthNumber!-1,1,12);});
 const [selectedDate,setSelectedDate]=useState(today);
 const monthStart=new Date(month.getFullYear(),month.getMonth(),1,12);
 const monthEnd=new Date(month.getFullYear(),month.getMonth()+1,0,12);
 const leadingDays=(monthStart.getDay()+6)%7;
 const cellCount=Math.ceil((leadingDays+monthEnd.getDate())/7)*7;
 const days=Array.from({length:cellCount},(_,index)=>new Date(month.getFullYear(),month.getMonth(),index-leadingDays+1,12));
 const selectedEvents=events.filter(event=>value(event,'status')!=='CANCELLED'&&value(event,'startDate')<=selectedDate&&value(event,'endDate')>=selectedDate);
 const changeMonth=(offset:number)=>{const next=new Date(month.getFullYear(),month.getMonth()+offset,1,12);setMonth(next);setSelectedDate(calendarDayKey(next));};
 const chooseDay=(day:Date)=>{const nextMonth=day.getMonth()!==month.getMonth();setSelectedDate(calendarDayKey(day));if(nextMonth)setMonth(new Date(day.getFullYear(),day.getMonth(),1,12));};
 return <div className="role-mini-calendar">
  <div className="role-mini-calendar-heading"><button type="button" aria-label="Previous month" onClick={()=>changeMonth(-1)}><ChevronLeft size={14}/></button><strong>{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button type="button" aria-label="Next month" onClick={()=>changeMonth(1)}><ChevronRight size={14}/></button></div>
  <div className="role-mini-calendar-weekdays" aria-hidden="true">{['M','T','W','T','F','S','S'].map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}</div>
  <div className="role-mini-calendar-grid">{days.map(day=>{const key=calendarDayKey(day);const eventCount=events.filter(event=>value(event,'status')!=='CANCELLED'&&value(event,'startDate')<=key&&value(event,'endDate')>=key).length;const outside=day.getMonth()!==month.getMonth();const selected=key===selectedDate;return <button type="button" key={key} className={`role-mini-calendar-day${outside?' outside':''}${selected?' selected':''}${key===today?' today':''}`} aria-label={`${eventDate(key)}${eventCount?`, ${eventCount} ${eventCount===1?'event':'events'}`:''}`} aria-pressed={selected} onClick={()=>chooseDay(day)}><span>{day.getDate()}</span>{eventCount>0&&<i aria-hidden="true"/>}</button>;})}</div>
  <section className="role-mini-calendar-events" aria-live="polite"><h3>{eventDate(selectedDate)}</h3>{selectedEvents.length?<div className="role-calendar-details">{selectedEvents.map(event=><CalendarEventDetails key={event.id} event={event}/>)}</div>:<p>No events on this day.</p>}</section>
 </div>;
}

export default function RoleDashboard({data,navigate,onLogAttendance,onViewStudent}:{data:Snapshot;navigate:(page:string)=>void;onLogAttendance:()=>void;onViewStudent?:(studentId:string)=>void}){
 const {user}=data;
 const pendingDocuments=data.documents.filter(document=>document.status==='PENDING');

 if(user.role==='STUDENT'){
  const placement=data.placements.find(row=>row.studentId===user.id&&row.status==='ACTIVE')??data.placements.find(row=>row.studentId===user.id);
  const ownEntries=data.entries.filter(entry=>entry.placementId===placement?.id);
  return <div className="role-dashboard student-dashboard">
   <Card title="Overall required hours"><div className="panel-body"><StudentGoalProgress entries={ownEntries} requiredMinutes={Number(placement?.requiredMinutes??0)} calendarEvents={data.calendarEvents}/></div></Card>
   <div className="role-columns"><div className="role-stack">
    <Card title="Recent attendance" action={<Link to="attendance" navigate={navigate}>View DTR</Link>}>{ownEntries.length?<div className="role-list">{ownEntries.slice(0,4).map(entry=><div className="role-list-row" key={entry.id}><span className="role-symbol soft"><Clock size={17}/></span><div><strong>{date(value(entry,'date'))}</strong><span>{value(entry,'narrative')}</span></div><span className="role-list-end"><strong>{hours(number(entry,'minutes'))}</strong><small>{entry.confirmedVersion===entry.version?'Industry Partner verified':'Self reported'}</small></span></div>)}</div>:<Empty>No attendance entries yet. Your first DTR will appear here.</Empty>}</Card>
    <DocumentReadinessChecklist data={data} navigate={navigate}/>
   </div>
   <div className="role-stack"><Card title="Next steps"><div className="role-actions"><button onClick={onLogAttendance}><Clock size={18}/><span><strong>Log attendance</strong></span><ArrowRight size={16}/></button><button onClick={()=>navigate('documents')}><FileText size={18}/><span><strong>Check documents</strong></span><ArrowRight size={16}/></button><button onClick={()=>navigate('classes')}><BookOpen size={18}/><span><strong>My class</strong></span><ArrowRight size={16}/></button><button onClick={()=>navigate('incidents')}><LifeBuoy size={18}/><span><strong>Contact coordinator</strong></span><ArrowRight size={16}/></button></div></Card><Announcements data={data} navigate={navigate}/></div></div>
  </div>;
 }

 if(user.role==='COORDINATOR'){
  const classes=data.classes.filter(row=>!number(row,'revoked'));
  const cases=data.incidents.filter(row=>row.status!=='RESOLVED');
  const pendingJoinRequests=(data.joinRequests??[]).filter(row=>row.status==='PENDING');
  const pendingApplications=data.applications.filter(row=>row.status==='SUBMITTED');
  const totalReviewItems=pendingDocuments.length+pendingJoinRequests.length+cases.length;
  return <div className="role-dashboard coordinator-dashboard">
   <OverallStudentsProgress data={data} navigate={navigate} onViewStudent={onViewStudent}/>
   <AttendanceVisuals entries={data.entries}/>
   <div className="role-columns">
    <div className="role-stack">
     <Card title="My classes" action={<Link to="classes" navigate={navigate}>Manage classes</Link>}>
      {classes.length?<div className="role-list">{classes.map(cls=>{
       const placements=data.placements.filter(row=>row.classId===cls.id);
       return <button className="role-list-row interactive" key={cls.id} onClick={()=>navigate('classes')}>
        <span className="role-symbol"><BookOpen size={17}/></span>
        <div><strong>{value(cls,'section')}</strong><span>{value(cls,'name')} · {data.courses.find(row=>row.id===cls.courseId)?.name??'Course'}</span></div>
        <span className="role-list-end"><strong>{placements.length}</strong><small>students</small></span>
       </button>;
      })}</div>:<Empty>No classes yet. Create a class to add students to a section.</Empty>}
     </Card>
    </div>
    <div className="role-stack">
     <Card title="Review queue" action={<span className={`chip ${totalReviewItems?'orange':'green'}`}>{totalReviewItems} pending</span>}>
      <div className="role-actions">
       <button onClick={()=>navigate('documents')}><FileText size={18}/><span><strong>Review student documents</strong><small>{pendingDocuments.length} awaiting review</small></span><ArrowRight size={16}/></button>
       {pendingJoinRequests.length>0&&<button onClick={()=>navigate('classes')}><Users size={18}/><span><strong>Review enrollment requests</strong><small>{pendingJoinRequests.length} awaiting review</small></span><ArrowRight size={16}/></button>}
       {pendingApplications.length>0&&<button onClick={()=>navigate('jobs')}><BriefcaseBusiness size={18}/><span><strong>Review student applications</strong><small>{pendingApplications.length} awaiting review</small></span><ArrowRight size={16}/></button>}
       <button onClick={()=>navigate('incidents')}><LifeBuoy size={18}/><span><strong>Student support cases</strong><small>{cases.length} open</small></span><ArrowRight size={16}/></button>
       <button onClick={()=>navigate('announcements')}><Megaphone size={18}/><span><strong>Class announcement</strong><small>Share an update with your students</small></span><ArrowRight size={16}/></button>
      </div>
     </Card>
     <Announcements data={data} navigate={navigate}/>
    </div>
   </div>
  </div>;
 }

 const departments=data.departments;
 return <div className="role-dashboard admin-dashboard">
  <div className="role-columns">
   <div className="role-stack">
    <Card title="Academic structure" action={<Link to="institution" navigate={navigate}>Manage departments and courses</Link>}>
     {departments.length?<div className="role-list">{departments.map(department=>{
      const courseCount=data.courses.filter(course=>course.departmentId===department.id).length;
      return <div className="role-list-row" key={department.id}>
       <span className="role-symbol"><GraduationCap size={17}/></span>
       <div><strong>{value(department,'name')}</strong><span>{value(department,'code')}</span></div>
       <span className="role-list-end"><strong>{courseCount}</strong><small>{courseCount===1?'course':'courses'}</small></span>
      </div>;
     })}</div>:<Empty>No academic departments have been added yet.</Empty>}
    </Card>
    <Card title="Recent activity" action={<Link to="accounts" navigate={navigate}>View accounts</Link>}>
     {data.audit.length?<div className="role-list">{data.audit.slice(0,5).map(event=><div className="role-list-row" key={event.id}>
      <span className="role-symbol soft"><ShieldCheck size={17}/></span>
      <div><strong>{value(event,'action').toLowerCase().replaceAll('_',' ')}</strong><span>{date(value(event,'createdAt'))}</span></div>
     </div>)}</div>:<Empty>No recent account or academic structure updates.</Empty>}
    </Card>
   </div>
   <div className="role-stack">
    <Card title="Administration shortcuts">
     <div className="role-actions">
      <button onClick={()=>navigate('accounts')}><Users size={18}/><span><strong>Accounts and roles</strong><small>Manage university access</small></span><ArrowRight size={16}/></button>
      <button onClick={()=>navigate('institution')}><GraduationCap size={18}/><span><strong>Departments and courses</strong><small>Maintain academic structure</small></span><ArrowRight size={16}/></button>
      <button onClick={()=>navigate('jobs')}><BriefcaseBusiness size={18}/><span><strong>Industry partners</strong><small>Review partners and openings</small></span><ArrowRight size={16}/></button>
      <button onClick={()=>navigate('announcements')}><Megaphone size={18}/><span><strong>University announcements</strong><small>Publish updates across campus</small></span><ArrowRight size={16}/></button>
     </div>
    </Card>
    <Card title="University calendar" className="role-calendar-card"><AdminMiniCalendar events={data.calendarEvents}/></Card>
   </div>
  </div>
 </div>;
}

function Announcements({data,navigate}:{data:Snapshot;navigate:(page:string)=>void}){
 return <Card title="Latest announcements" action={<Link to="announcements" navigate={navigate}>View all</Link>}>{data.announcements.length?<div className="role-list">{data.announcements.slice(0,2).map(item=><div className="role-announcement" key={item.id}><div><span className="role-status positive">{value(item,'audience').toLowerCase()} update</span><time>{date(value(item,'createdAt'))}</time></div><strong>{value(item,'title')}</strong><p>{value(item,'body')}</p></div>)}</div>:<Empty>{data.user.role==='COORDINATOR'?'No announcements yet.':'No announcements for your current access scope.'}</Empty>}</Card>;
}
