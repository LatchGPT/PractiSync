'use client';
import { useState } from 'react';
import type { Action,Row,Snapshot } from '@/packages/validation/contracts';
export function AccountInvitation({account,configured,onAction}:{account:Row;configured:boolean;onAction:(action:Action,values:Record<string,string|number>)=>Promise<unknown>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(Number(account.isDemo)||account.status==='DISABLED')return null;
 return <div className="account-invitation"><button className="textbutton" disabled={!configured||busy} onClick={async()=>{setBusy(true);setError('');try{await onAction('inviteAccount',{userId:account.id});}catch(e){setError(e instanceof Error?e.message:'Invitation could not be queued. Try again.');}finally{setBusy(false);}}}>{busy?'Queuing…':'Send activation / invitation'}</button>{!configured&&<small className="muted">Account email is not configured</small>}{error&&<small role="alert" className="hte-error">{error}</small>}</div>;
}
export function AccountEmailQueue({data,onAction}:{data:Snapshot;onAction:(action:Action,values:Record<string,string|number>)=>Promise<unknown>}){
 const [busy,setBusy]=useState('');
 if(data.user.role!=='SUPER_ADMIN')return null;
 return <section className="panel reminder-panel"><h2>Account email delivery</h2>{data.accountMailJobs?.length?<div className="reminder-job-list">{data.accountMailJobs.map(job=><article key={job.id}><div><strong>{String(job.status).toLowerCase()}</strong><p>{Number(job.attempts)} failed attempts</p>{job.lastError&&<p>{String(job.lastError)}</p>}</div>{job.status==='FAILED'&&<button className="secondary" disabled={!!busy||!data.accountAccess?.email} onClick={async()=>{setBusy(job.id);try{await onAction('retryAccountEmail',{jobId:job.id});}finally{setBusy('');}}}>{busy===job.id?'Queuing…':'Retry email'}</button>}</article>)}</div>:<p className="hte-empty">No account emails have been queued. {data.accountAccess?.email?'The workflow worker delivers queued messages.':'Account email is not configured.'}</p>}</section>;
}
