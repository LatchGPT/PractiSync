'use client';

import type {Row} from '@/packages/validation/contracts';
import {studentGoal} from './student-goal';

const hours=(minutes:number)=>`${Number((minutes/60).toFixed(1))} hrs`;
const circumference=2*Math.PI*66;
const confirmedCircumference=2*Math.PI*48;

export default function StudentGoalProgress({entries,requiredMinutes}:{entries:Row[];requiredMinutes:number}){
 const goal=studentGoal(entries,requiredMinutes);
 const confirmedFraction=goal.target?Math.min(goal.confirmed,goal.target)/goal.target:0;
 const reportedFraction=goal.target?Math.min(goal.reported,goal.target)/goal.target:0;
 const forecast=!goal.target?'Required hours not configured':goal.remaining===0?'Hours target reached':goal.daysOnRecord<3?'Available after 3 logged days':goal.predictedDays?`About ${goal.predictedDays} more logged days`:'Log attendance to estimate';
 return <div className="goal-summary">
  <div className="goal-donut-wrap"><svg viewBox="0 0 180 180" className="goal-donut" role="img" aria-label={`${hours(goal.reported)} reported of ${goal.target?hours(goal.target):'no configured target'}; ${hours(goal.confirmed)} company confirmed`}>
   <circle cx="90" cy="90" r="66" fill="none" stroke="#e6edf7" strokeWidth="19"/>
   {reportedFraction>0&&<circle cx="90" cy="90" r="66" fill="none" stroke="#124c91" strokeWidth="19" strokeLinecap="round" strokeDasharray={`${reportedFraction*circumference} ${circumference}`} transform="rotate(-90 90 90)"/>}
   <circle cx="90" cy="90" r="48" fill="none" stroke="#f4eddb" strokeWidth="5"/>
   {confirmedFraction>0&&<circle cx="90" cy="90" r="48" fill="none" stroke="#d7aa3e" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${confirmedFraction*confirmedCircumference} ${confirmedCircumference}`} transform="rotate(-90 90 90)"/>}
   <text x="90" y="85" textAnchor="middle" className="goal-donut-value">{goal.target?`${goal.percent}%`:'—'}</text>
   <text x="90" y="108" textAnchor="middle" className="goal-donut-caption">of required hours</text>
  </svg><div className="goal-donut-hours"><strong>{hours(goal.reported)}</strong><span>of {goal.target?hours(goal.target):'unconfigured target'}</span></div></div>
  <div className="goal-summary-details">
   <div className="goal-detail"><span>Attendance summary</span><strong>{hours(goal.reported)} reported</strong><small>{hours(goal.confirmed)} company confirmed · {hours(goal.reported-goal.confirmed)} awaiting confirmation</small></div>
   <div className="goal-detail"><span>Predicted completion</span><strong>{forecast}</strong><small>{goal.predictedDays?`At your average of ${hours(goal.averagePerDay)} per logged day. No work schedule is assumed.`:'Prediction uses your average reported hours per logged day.'}</small></div>
   <div className="goal-detail"><span>Days on record</span><strong>{goal.daysOnRecord} {goal.daysOnRecord===1?'day':'days'}</strong><small>Distinct dates with a submitted DTR</small></div>
  </div>
  <p className="goal-disclaimer">{goal.target?`${hours(goal.remaining)} remain against the fictional hours target. `:'A required-hours target is needed for progress. '}Hours progress and the estimate do not certify formal completion.</p>
 </div>;
}
