'use client';
import { useState } from 'react';
import type { Action,Snapshot } from '@/packages/validation/contracts';
const time=(value:string|number|null|undefined)=>value?new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'}).format(new Date(String(value))):'Not checked yet';
export function ReminderPreference({data,onAction}:{data:Snapshot;onAction:(action:Action,values:Record<string,string|number>)=>Promise<unknown>}){
 const [busy,setBusy]=useState(false);
 return <section className="panel reminder-panel"><h2>Document deadline reminders</h2><label className="reminder-preference"><input type="checkbox" checked={data.deadlineRemindersEnabled!==false} disabled={busy} onChange={async e=>{setBusy(true);try{await onAction('reminderPreference',{enabled:e.target.checked?1:0});}finally{setBusy(false);}}}/><span>{busy?'Saving preference…':'Receive in-app deadline reminders'}</span></label></section>;
}
export function ReminderJobs({data,onAction}:{data:Snapshot;onAction:(action:Action,values:Record<string,string|number>)=>Promise<unknown>}){
 const [busy,setBusy]=useState('');
 if(!['COORDINATOR','SUPER_ADMIN'].includes(data.user.role))return null;
 return <section className="panel reminder-panel"><h2>Scheduled document reminders</h2><p className="muted">Last worker check: {time(data.workflowWorker?.checkedAt)}{!data.workflowWorker&&'. Start the workflow worker to deliver scheduled reminders.'}</p>{data.reminderJobs?.length?<div className="reminder-job-list">{data.reminderJobs.slice(0,12).map(job=><article key={job.id}><div><strong>{String(job.title)}</strong><p>{time(job.dueAt)} Manila · {job.leadDays} day{job.leadDays===1?'':'s'} before</p>{job.lastError&&<p className="hte-error">{String(job.lastError)}</p>}</div><span className={`chip ${job.status==='DISPATCHED'?'green':job.status==='FAILED'?'red':'blue'}`}>{String(job.status).toLowerCase().replaceAll('_',' ')}</span>{job.status==='FAILED'&&<button className="secondary" disabled={!!busy} onClick={async()=>{setBusy(job.id);try{await onAction('retryDeadlineReminder',{slotId:job.id});}finally{setBusy('');}}}>{busy===job.id?'Queuing…':'Retry'}</button>}</article>)}</div>:<p className="hte-empty">No reminder times are scheduled.</p>}</section>;
}
