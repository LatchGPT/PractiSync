'use client';

import {useState} from 'react';
import {CalendarDays, CheckCircle2, Clock, Info, TrendingUp} from 'lucide-react';
import type {Row} from '@/packages/validation/contracts';
import {studentGoal} from './student-goal';

const hours=(minutes:number)=>`${Number((minutes/60).toFixed(1))} hrs`;
const circumference=2*Math.PI*66;
const confirmedCircumference=2*Math.PI*48;

export default function StudentGoalProgress({entries,requiredMinutes}:{entries:Row[];requiredMinutes:number}){
 const [hovered,setHovered]=useState<'reported'|'confirmed'|null>(null);
 const goal=studentGoal(entries,requiredMinutes);
 const confirmedFraction=goal.target?Math.min(goal.confirmed,goal.target)/goal.target:0;
 const reportedFraction=goal.target?Math.min(goal.reported,goal.target)/goal.target:0;
 const forecast=!goal.target?'Required hours not configured':goal.remaining===0?'Hours target reached':goal.daysOnRecord<3?'Available after 3 logged days':goal.predictedDays?`About ${goal.predictedDays} more logged days`:'Log attendance to estimate';

 return <div className="goal-summary">
  {/* Left Column: Visual Donut Chart & Ring Legend */}
  <div className="goal-donut-section">
   <svg viewBox="0 0 180 180" className={`goal-donut ${hovered?'has-hover':''}`} role="img" aria-label={`${hours(goal.reported)} reported of ${goal.target?hours(goal.target):'no configured target'}; ${hours(goal.confirmed)} coordinator confirmed`}>
    {/* Outer Ring: Self-Reported */}
    <g
     className={`goal-ring-group ring-reported ${hovered==='reported'?'is-active':''}`}
     onMouseEnter={()=>setHovered('reported')}
     onMouseLeave={()=>setHovered(null)}
     tabIndex={0}
     role="button"
     aria-label={`Outer Ring: ${hours(goal.reported)} self-reported (${goal.target?Math.round(reportedFraction*100):0}% of goal)`}
    >
     <circle cx="90" cy="90" r="66" fill="none" stroke="#e6edf7" strokeWidth="19" className="ring-track"/>
     {reportedFraction>0&&<circle cx="90" cy="90" r="66" fill="none" stroke="#124c91" strokeWidth="19" strokeLinecap="round" strokeDasharray={`${reportedFraction*circumference} ${circumference}`} transform="rotate(-90 90 90)" className="ring-fill"/>}
     <title>{`Outer Ring · Self-Reported: ${hours(goal.reported)} of ${goal.target?hours(goal.target):'—'} (${goal.target?Math.round(reportedFraction*100):0}%). Total training time submitted from your DTR entries.`}</title>
    </g>

    {/* Inner Ring: Coordinator-Confirmed */}
    <g
     className={`goal-ring-group ring-confirmed ${hovered==='confirmed'?'is-active':''}`}
     onMouseEnter={()=>setHovered('confirmed')}
     onMouseLeave={()=>setHovered(null)}
     tabIndex={0}
     role="button"
     aria-label={`Inner Ring: ${hours(goal.confirmed)} coordinator-confirmed (${goal.target?Math.round(confirmedFraction*100):0}% of goal)`}
    >
     <circle cx="90" cy="90" r="48" fill="none" stroke="transparent" strokeWidth="15"/>
     <circle cx="90" cy="90" r="48" fill="none" stroke="#f4eddb" strokeWidth="5" className="ring-track"/>
     {confirmedFraction>0&&<circle cx="90" cy="90" r="48" fill="none" stroke="#d7aa3e" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${confirmedFraction*confirmedCircumference} ${confirmedCircumference}`} transform="rotate(-90 90 90)" className="ring-fill"/>}
     <title>{`Inner Ring · Confirmed: ${hours(goal.confirmed)} of ${goal.target?hours(goal.target):'—'} (${goal.target?Math.round(confirmedFraction*100):0}%). Hours officially verified and endorsed by your coordinator.`}</title>
    </g>

    {/* Center Text */}
    <text x="90" y={hovered?'82':'85'} textAnchor="middle" className={`goal-donut-value ${hovered?`is-${hovered}`:''}`}>
     {hovered==='reported'?(goal.target?`${Math.round(reportedFraction*100)}%`:hours(goal.reported)):hovered==='confirmed'?(goal.target?`${Math.round(confirmedFraction*100)}%`:hours(goal.confirmed)):(goal.target?`${goal.percent}%`:'—')}
    </text>
    <text x="90" y={hovered?'106':'108'} textAnchor="middle" className={`goal-donut-caption ${hovered?`is-${hovered}`:''}`}>
     {hovered==='reported'?'Self-Reported':hovered==='confirmed'?'Coordinator-Confirmed':'of required hours'}
    </text>
   </svg>

   {/* Compact Legend Pills directly under Donut */}
   <div className="goal-donut-legend">
    <button
     type="button"
     className={`legend-pill reported ${hovered==='reported'?'active':''}`}
     onMouseEnter={()=>setHovered('reported')}
     onMouseLeave={()=>setHovered(null)}
     onClick={()=>setHovered(h=>(h==='reported'?null:'reported'))}
     aria-pressed={hovered==='reported'}
     title="Inspect Self-Reported hours (Outer Ring)"
    >
     <i className="legend-indicator reported"/>
     <span>Outer: Reported</span>
    </button>
    <button
     type="button"
     className={`legend-pill confirmed ${hovered==='confirmed'?'active':''}`}
     onMouseEnter={()=>setHovered('confirmed')}
     onMouseLeave={()=>setHovered(null)}
     onClick={()=>setHovered(h=>(h==='confirmed'?null:'confirmed'))}
     aria-pressed={hovered==='confirmed'}
     title="Inspect Coordinator-Confirmed hours (Inner Ring)"
    >
     <i className="legend-indicator confirmed"/>
     <span>Inner: Confirmed</span>
    </button>
   </div>
  </div>

  {/* Right Column: Context Focus Banner + 3 Polished Metric Tiles */}
  <div className="goal-content-section">
   {/* Real-time Focus Callout Banner */}
   <div className={`goal-focus-banner ${hovered?`is-${hovered}`:'is-default'}`} role="status" aria-live="polite">
    {hovered==='reported'?(
     <div className="banner-inner">
      <div className="banner-left">
       <span className="banner-badge reported"><i className="dot"/>Outer Ring · Self-Reported Hours</span>
       <p className="banner-desc">Total time submitted through your Daily Training Records. {hours(Math.max(0,goal.reported-goal.confirmed))} currently awaiting coordinator confirmation.</p>
      </div>
      <div className="banner-right">
       <strong className="banner-stat">{hours(goal.reported)}</strong>
       <span className="banner-sub">{goal.target?`${Math.round(reportedFraction*100)}% of requirement`:'Logged hours'}</span>
      </div>
     </div>
    ):hovered==='confirmed'?(
     <div className="banner-inner">
      <div className="banner-left">
       <span className="banner-badge confirmed"><i className="dot"/>Inner Ring · Coordinator-Confirmed Hours</span>
       <p className="banner-desc">Hours officially reviewed, verified, and endorsed by your practicum coordinator.</p>
      </div>
      <div className="banner-right">
       <strong className="banner-stat">{hours(goal.confirmed)}</strong>
       <span className="banner-sub">{goal.target?`${Math.round(confirmedFraction*100)}% verified`:'Confirmed hours'}</span>
      </div>
     </div>
    ):(
     <div className="banner-inner">
      <div className="banner-left">
       <span className="banner-badge default">Training Hours Progress</span>
       <p className="banner-desc">Hover over or click either ring to inspect self-reported vs. coordinator-confirmed time breakdown.</p>
      </div>
      <div className="banner-right">
       <strong className="banner-stat">{hours(goal.reported)} <small>/ {goal.target?hours(goal.target):'480.0 hrs'}</small></strong>
       <span className="banner-sub">{goal.target?`${goal.percent}% completed`:'Target unconfigured'}</span>
      </div>
     </div>
    )}
   </div>

   {/* 3 Metric Tiles Grid */}
   <div className="goal-metric-cards">
    <div className="goal-metric-card">
     <div className="metric-header">
      <Clock size={14} className="metric-icon blue"/>
      <span>Attendance summary</span>
     </div>
     <strong className="metric-val">{hours(goal.reported)} reported</strong>
     <div className="metric-pills">
      <span className="metric-pill confirmed"><CheckCircle2 size={10}/> {hours(goal.confirmed)} confirmed</span>
      <span className="metric-pill pending">{hours(Math.max(0,goal.reported-goal.confirmed))} awaiting</span>
     </div>
    </div>

    <div className="goal-metric-card">
     <div className="metric-header">
      <TrendingUp size={14} className="metric-icon gold"/>
      <span>Predicted completion</span>
     </div>
     <strong className="metric-val">{forecast}</strong>
     <small className="metric-desc">
      {goal.predictedDays?`At your average of ${hours(goal.averagePerDay)} per logged day.`:'Prediction uses your average reported hours per logged day.'}
     </small>
    </div>

    <div className="goal-metric-card">
     <div className="metric-header">
      <CalendarDays size={14} className="metric-icon green"/>
      <span>Days on record</span>
     </div>
     <strong className="metric-val">{goal.daysOnRecord} {goal.daysOnRecord===1?'day':'days'}</strong>
     <small className="metric-desc">Distinct dates with a submitted DTR</small>
    </div>
   </div>
  </div>

  {/* Footer Info Disclaimer */}
  <div className="goal-footer-bar">
   <Info size={13} className="footer-icon"/>
   <p className="goal-disclaimer-text">
    {goal.target?`${hours(goal.remaining)} remain against the fictional hours target. `:'A required-hours target is needed for progress. '}
    Hours progress and the estimate do not certify formal completion.
   </p>
  </div>
 </div>;
}
