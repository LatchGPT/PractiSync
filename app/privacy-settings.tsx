'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { ConsentHistoryPage } from '@/packages/privacy/history';
import type { ConsentStatus } from '@/packages/validation/consent';
import { consentPath } from '@/packages/privacy/paths';
import { refreshConsentSession } from './consent/session';
import styles from './privacy-settings.module.css';

const choice:Record<ConsentStatus,string>={ACCEPTED:'Accepted',DECLINED:'Declined',WITHDRAWN:'Withdrawn'};
const formatDate=(value:string)=>new Date(value).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Manila'});
async function requestHistory(cursor:string|null,signal?:AbortSignal):Promise<ConsentHistoryPage> {
 const response=await fetch('/api/consent/history'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{cache:'no-store',signal});
 if(response.status===401){window.location.replace('/login?redirect='+encodeURIComponent('/settings/privacy'));throw new Error('Sign in again to view your privacy choices.');}
 const body=await response.json() as ConsentHistoryPage&{error?:string};
 if(!response.ok)throw new Error(body.error??'Your privacy history could not load. Try again.');
 if(body.state.required){window.location.replace(consentPath('/settings/privacy'));throw new Error('Review the current Privacy Notice before continuing.');}
 return body;
}

export default function PrivacySettings({initial}:{initial?:ConsentHistoryPage}) {
 const [page,setPage]=useState<ConsentHistoryPage|null>(initial??null),[error,setError]=useState('');
 const [loading,setLoading]=useState(!initial),[loadingMore,setLoadingMore]=useState(false),[open,setOpen]=useState(false),[withdrawing,setWithdrawing]=useState(false),[withdrawalError,setWithdrawalError]=useState('');
 const errorRef=useRef<HTMLParagraphElement>(null);
 const redirectToGate=()=>window.location.replace(consentPath('/settings/privacy'));
 useEffect(()=>{
  if(initial)return;
  const controller=new AbortController();
  void requestHistory(null,controller.signal).then(data=>{if(!controller.signal.aborted)setPage(data);})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof TypeError?'Check your connection and try loading your privacy history again.':e instanceof Error?e.message:'Your privacy history could not load.');})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[initial]);
 async function load(more=false){
  if(more)setLoadingMore(true);else setLoading(true);
  setError('');
  try{
   const data=await requestHistory(more?page?.nextCursor??null:null);
   setPage(previous=>more&&previous?{...data,history:[...previous.history,...data.history.filter(entry=>!previous.history.some(old=>old.id===entry.id))]}:data);
  }catch(e){setError(e instanceof TypeError?'Check your connection and try loading your privacy history again.':e instanceof Error?e.message:'Your privacy history could not load.');}
  finally{setLoading(false);setLoadingMore(false);}
 }
 async function withdraw(){
  if(!page)return;
  setWithdrawing(true);setWithdrawalError('');
  try{
   const response=await fetch('/api/consent',{method:'POST',headers:{'Content-Type':'application/json','If-Match':`"${page.state.policy.version}"`},body:JSON.stringify({action:'WITHDRAW',language:page.state.language??'en'})});
   const result=await response.json() as {error?:string;code?:string};
   if(response.status===401){window.location.replace('/login?redirect='+encodeURIComponent('/settings/privacy'));return;}
   if(result.code==='CONSENT_POLICY_CHANGED'){redirectToGate();return;}
   if(!response.ok)throw new Error(result.error??'Your consent could not be withdrawn. Try again.');
   try{await refreshConsentSession();}catch{/* The saved withdrawal is authoritative even when session refresh fails. */}
   redirectToGate();
  }catch(e){
   setWithdrawalError(e instanceof TypeError?'We could not confirm your withdrawal. Check your connection and try again.':e instanceof Error?e.message:'Your consent could not be withdrawn. Try again.');
   setWithdrawing(false);requestAnimationFrame(()=>errorRef.current?.focus());
  }
 }
 return <section className={styles.panel} aria-label="Privacy settings" aria-busy={loading||loadingMore}>
  <header className={styles.heading}><h2>Privacy</h2><p>Review your consent to the PractiSync Privacy Notice and your previous choices.</p></header>
  {loading&&!page&&<p role="status">Loading privacy history…</p>}
  {error&&<div className={styles.error} role="alert"><p>{error}</p><Button type="button" variant="outline" disabled={loading||loadingMore} onClick={()=>void load(!!page)}>Try again</Button></div>}
  {page&&<>
   <dl className={styles.summary}>
    <div><dt>Current status</dt><dd><span className={styles.status}>{page.state.status?choice[page.state.status]:'No consent recorded'}</span></dd></div>
    <div><dt>Policy version</dt><dd>{page.state.policy.version}</dd></div>
    <div><dt>Accepted on</dt><dd>{page.acceptedAt?<time dateTime={page.acceptedAt}>{formatDate(page.acceptedAt)}</time>:'Not accepted'}</dd></div>
    <div><dt>Policy effective date</dt><dd>{new Date(page.state.policy.effectiveAt).toLocaleDateString('en-PH',{dateStyle:'long',timeZone:'Asia/Manila'})}</dd></div>
   </dl>
   <p className={styles.policyLink}><a href={'/privacy?language='+(page.state.language??'en')} target="_blank" rel="noopener noreferrer">Read the current Privacy Notice (opens in a new tab)</a></p>
   <section className={styles.history} aria-labelledby="privacy-history-heading"><h3 id="privacy-history-heading">Consent history</h3><p className={styles.muted}>Newest first. All dates and times are in Philippine time.</p>
    {page.history.length?<ol>{page.history.map(entry=><li key={entry.id}><div className={styles.historyMain}><strong>{choice[entry.status]}</strong><time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time></div><p>Policy {entry.policy.version} · {entry.language==='fil'?'Filipino':'English'}</p></li>)}</ol>:<p>No privacy choices have been recorded for this account.</p>}
    {page.nextCursor&&<Button type="button" variant="outline" disabled={loadingMore||loading} onClick={()=>void load(true)}>{loadingMore?'Loading earlier choices…':'Load earlier choices'}</Button>}
   </section>
   <section className={styles.withdrawal} aria-labelledby="privacy-withdraw-heading"><h3 id="privacy-withdraw-heading">Withdraw consent</h3><p>Withdrawing means you can no longer use PractiSync. You will return to the consent page, where you can agree again at any time.</p>
    <AlertDialog open={open} onOpenChange={value=>{if(!withdrawing){setOpen(value);setWithdrawalError('');}}}>
     <AlertDialogTrigger asChild><Button type="button" variant="outline" className={styles.withdrawButton} disabled={loading||loadingMore||withdrawing||page.state.status!=='ACCEPTED'}>Withdraw consent</Button></AlertDialogTrigger>
     <AlertDialogContent className={styles.dialog} onEscapeKeyDown={event=>{if(withdrawing)event.preventDefault();}}>
      <AlertDialogHeader><AlertDialogTitle>Withdraw consent?</AlertDialogTitle><AlertDialogDescription>You will no longer be able to use PractiSync. You will return to the consent page and can agree again at any time. Withdrawing does not automatically delete your records or consent history.</AlertDialogDescription></AlertDialogHeader>
      {withdrawalError&&<p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{withdrawalError}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={withdrawing}>Cancel</AlertDialogCancel><AlertDialogAction className={styles.confirmButton} disabled={withdrawing} onClick={event=>{event.preventDefault();void withdraw();}}>{withdrawing?'Withdrawing…':'Withdraw consent'}</AlertDialogAction></AlertDialogFooter>
     </AlertDialogContent>
    </AlertDialog>
   </section>
  </>}
 </section>;
}
