'use client';

import {CalendarDays, CheckCircle2, ClipboardList, Clock3, Info, Target, TrendingUp} from 'lucide-react';
import type {Row} from '@/packages/validation/contracts';
import {studentGoal} from './student-goal';

const hours=(minutes:number)=>`${Number((minutes/60).toFixed(1))} hrs`;
const circumference=2*Math.PI*66;

export default function StudentGoalProgress({entries,requiredMinutes}:{entries:Row[];requiredMinutes:number}){
 const goal=studentGoal(entries,requiredMinutes);
 const reportedFraction=goal.target?Math.min(goal.reported,goal.target)/goal.target:0;
 const pendingMinutes=Math.max(0,goal.reported-goal.confirmed);
 const latestEntry=entries.map(entry=>String(entry.date??'')).filter(Boolean).sort((a,b)=>b.localeCompare(a))[0];
 const latestDate=latestEntry?formatLogDate(latestEntry):'No entries yet';
 const forecast=!goal.target?'Set a required-hours target to see an estimate':goal.remaining===0?'Hours target reached':goal.daysOnRecord<3?'Available after 3 logged days':goal.predictedDays?`About ${goal.predictedDays} more logged days`:'Log attendance to estimate';
 const forecastDetail=!goal.target?'A required-hours target is needed before an estimate is available.':goal.predictedDays?`Based on your average of ${hours(goal.averagePerDay)} per logged day.`:goal.remaining===0?'Reported hours have reached the configured target.':'Log more attendance to estimate remaining days.';
 const status=!goal.target?'Target not set':goal.remaining===0?'Target reached':goal.reported===0?'Not started':'In progress';
 const statusTone=!goal.target?'neutral':goal.remaining===0?'reached':goal.reported===0?'neutral':'active';

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
     <span>Required total</span>
    </div>
    <div className="goal-info-card days-card">
     <div className="goal-info-label"><CalendarDays size={15}/> Days on record</div>
     <strong>{goal.daysOnRecord}</strong>
     <span>Distinct days with a DTR</span>
    </div>
   </div>

   <section className="goal-activity-card" aria-label="DTR activity summary">
    <div className="goal-section-heading"><div><span className="goal-card-eyebrow">Attendance summary</span><h3>DTR activity</h3></div><ClipboardList size={18}/></div>
    <div className="goal-activity-metrics">
     <div className="goal-activity-metric"><strong>{entries.length}</strong><span>Submitted entries</span></div>
     <div className="goal-activity-metric waiting"><strong>{hours(pendingMinutes)}</strong><span>Awaiting final Industry Partner verification</span></div>
     <div className="goal-activity-metric"><strong>{goal.daysOnRecord?hours(goal.averagePerDay):'—'}</strong><span>Average per logged day</span></div>
     <div className="goal-activity-metric"><strong>{latestDate}</strong><span>Most recent log</span></div>
    </div>
    <div className="goal-activity-foot"><span>{entries.length && !pendingMinutes ? 'Complete DTR verified by the Industry Partner' : 'One final Industry Partner verification covers your complete DTR'}</span><span>{goal.target?`${goal.percent}% of required hours reported`:'Set a target to track progress'}</span></div>
   </section>

   <div className="goal-bottom-cards">
    <section className={`goal-status-card ${statusTone}`} aria-label="Progress status">
     <span className="goal-card-eyebrow">Status</span>
     <div className="goal-status-value">{goal.remaining===0&&goal.target?<CheckCircle2 size={22}/>:<Clock3 size={22}/>}<strong>{status}</strong></div>
     <p>{goal.remaining===0&&goal.target?'Your reported hours have reached the target.':goal.target?'Keep logging DTR entries to build your hours progress.':'A required-hours target is needed to track progress.'}</p>
    </section>
    <section className="goal-forecast-card" aria-label="Predicted completion">
     <span className="goal-card-eyebrow"><TrendingUp size={14}/> Predicted completion</span>
     <strong>{forecast}</strong>
     <p>{forecastDetail}</p>
    </section>
   </div>
  </div>

  <div className="goal-footer-bar">
   <Info size={14} className="footer-icon"/>
   <p className="goal-disclaimer-text">Hours progress and estimates do not certify formal completion.</p>
  </div>
 </div>;
}

function formatLogDate(value:string){
 const [year,month,day]=value.slice(0,10).split('-').map(Number);
 if(!year||!month||!day)return value;
 return new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',year:'numeric'}).format(new Date(year,month-1,day));
}
