'use client';

import {CalendarDays, CheckCircle2, ClipboardList, Clock3, Target, TrendingUp} from 'lucide-react';
import type {Row} from '@/packages/validation/contracts';
import {studentForecastLabel, studentGoal} from './student-goal';

const hours=(minutes:number)=>`${Number((minutes/60).toFixed(1))} hrs`;
const circumference=2*Math.PI*66;

export default function StudentGoalProgress({entries,requiredMinutes,calendarEvents=[]}:{entries:Row[];requiredMinutes:number;calendarEvents?:Row[]}){
 const goal=studentGoal(entries,requiredMinutes,calendarEvents);
 const reportedFraction=goal.target?Math.min(goal.reported,goal.target)/goal.target:0;
 const pendingMinutes=Math.max(0,goal.reported-goal.confirmed);
 const latestEntry=entries.map(entry=>String(entry.date??'')).filter(Boolean).sort((a,b)=>b.localeCompare(a))[0];
 const latestDate=latestEntry?formatLogDate(latestEntry):'No entries yet';
 const forecast=studentForecastLabel(goal.forecast);
 const isCompleted=goal.forecast.status==='completed';
 const awaitingConfirmation=goal.target>0&&goal.remaining===0&&!isCompleted;
 const status=!goal.target?'Target not set':isCompleted?'Target verified':awaitingConfirmation?'Awaiting confirmation':goal.reported===0?'Not started':'In progress';
 const statusTone=!goal.target?'neutral':isCompleted?'reached':goal.reported===0?'neutral':'active';

 return <div className="goal-summary">
  <section className="goal-hero-card" aria-label="Goal progress">
   <div className="goal-card-eyebrow"><span className="goal-eyebrow-dot"/>Goal progress</div>
   <svg viewBox="0 0 180 180" className="goal-donut" role="img" aria-label={`${hours(goal.reported)} reported of ${goal.target?hours(goal.target):'no configured target'}${goal.target?`, ${goal.percent}% of goal`:''}`}>
    <circle cx="90" cy="90" r="66" fill="none" stroke="#e8eef6" strokeWidth="12"/>
    {reportedFraction>0&&<circle cx="90" cy="90" r="66" fill="none" stroke="var(--primary, #124c91)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${reportedFraction*circumference} ${circumference}`} transform="rotate(-90 90 90)"/>}
    <text x="90" y="86" textAnchor="middle" className="goal-donut-value">{goal.target?`${goal.percent}%`:'—'}</text>
    <text x="90" y="110" textAnchor="middle" className="goal-donut-caption">of goal</text>
   </svg>
   <div className="goal-hero-metrics">
    <div className="goal-hero-metric logged"><strong>{hours(goal.reported)}</strong><span>Logged</span></div>
    <div className="goal-hero-metric remaining"><strong>{goal.target?hours(goal.remaining):'—'}</strong><span>Remaining</span></div>
    <div className="goal-hero-metric pending"><strong>{entries.length}</strong><span>DTR entries</span></div>
   </div>
  </section>

  <div className="goal-detail-grid">
   <div className="goal-top-metrics">
    <div className="goal-info-card target-card">
     <div className="goal-info-label"><Target size={15}/> Goal</div>
     <strong>{goal.target?hours(goal.target):'Not set'}</strong>
    </div>
    <div className="goal-info-card days-card">
     <div className="goal-info-label"><CalendarDays size={15}/> Days on record</div>
     <strong>{goal.daysOnRecord}</strong>
    </div>
   </div>

   <section className="goal-activity-card" aria-label="DTR activity summary">
    <div className="goal-section-heading"><div><span className="goal-card-eyebrow">Attendance summary</span><h3>DTR activity</h3></div><ClipboardList size={18}/></div>
    <div className="goal-activity-metrics">
     <div className="goal-activity-metric"><strong>{entries.length}</strong><span>Submitted entries</span></div>
     <div className="goal-activity-metric waiting"><strong>{hours(pendingMinutes)}</strong><span>Hours awaiting final Industry Partner verification</span></div>
     <div className="goal-activity-metric"><strong>{goal.daysOnRecord?hours(goal.averagePerDay):'—'}</strong><span>Reported average per logged day</span></div>
     <div className="goal-activity-metric"><strong>{latestDate}</strong><span>Most recent log</span></div>
    </div>
   </section>

   <div className="goal-bottom-cards">
    <section className={`goal-status-card ${statusTone}`} aria-label="Progress status">
     <span className="goal-card-eyebrow">Status</span>
     <div className="goal-status-value">{goal.remaining===0&&goal.target?<CheckCircle2 size={22}/>:<Clock3 size={22}/>}<strong>{status}</strong></div>
    </section>
    <section className={`goal-forecast-card${isCompleted?' completed':''}`} aria-label="Expected completion">
     <span className="goal-card-eyebrow">{isCompleted?<CheckCircle2 size={14}/>:<TrendingUp size={14}/>} Expected completion</span>
     <strong>{forecast}</strong>
    </section>
   </div>
  </div>

 </div>;
}

function formatLogDate(value:string){
 const [year,month,day]=value.slice(0,10).split('-').map(Number);
 if(!year||!month||!day)return value;
 return new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',year:'numeric'}).format(new Date(year,month-1,day));
}
