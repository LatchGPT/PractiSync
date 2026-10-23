'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { ConsentState, PrivacyPolicy } from '@/packages/privacy/consent';
import type { ConsentLanguage } from '@/packages/validation/consent';
import { authSubmit } from '@/app/login-client';
import { refreshConsentSession } from './session';
import PrivacyNotice from './notice';

const acknowledgement=z.object({acknowledged:z.boolean().refine(value=>value,'Please acknowledge the Privacy Notice.')});
const languageKey='practisync-privacy-language';
const subscribe=(listener:()=>void)=>{window.addEventListener('storage',listener);window.addEventListener('privacy-language',listener);return()=>{window.removeEventListener('storage',listener);window.removeEventListener('privacy-language',listener);};};
const storedLanguage=():ConsentLanguage=>{try{return localStorage.getItem(languageKey)==='fil'?'fil':'en';}catch{return 'en';}};
const copy={
 en:{intro:'Your data. Your choice.',summary:'RTU uses your account, student and training information, login logs, and uploaded documents to manage OJT and keep PractiSync secure. External host-company supervisors can see the information needed for students assigned to them. Read the notice before choosing.',notice:'Full Privacy Notice',policy:'Open the standalone privacy policy',ack:'I have read and understood the Privacy Notice and agree to the processing of my personal data',accept:'Accept and continue',decline:'Decline',declined:"You can't use PractiSync without agreeing to the Privacy Notice",help:'Your choice is saved. You can review the notice and agree at any time.',review:'Review and give consent',signout:'Sign out',pending:'Saving your choice…',disabled:'Check the acknowledgement to enable Accept.',accepted:'You have agreed to this Privacy Notice.',continuing:'Refreshing your session…',continue:'Continue to workspace',error:'We could not complete this request. Check your connection and try again.',changed:'The Privacy Notice changed. Reload this page and review the new version before choosing.',reload:'Reload notice'},
 fil:{intro:'Iyong datos. Iyong pasya.',summary:'Ginagamit ng RTU ang impormasyon ng iyong account, pag-aaral at pagsasanay, mga tala ng pag-sign in, at mga upload upang pamahalaan ang OJT at panatilihing ligtas ang PractiSync. Makikita ng mga supervisor ng host company na nasa labas ng RTU ang kailangang impormasyon ng mga estudyanteng nakatalaga sa kanila. Basahin ang abiso bago magpasya.',notice:'Buong Abiso sa Pagkapribado',policy:'Buksan ang hiwalay na patakaran sa pagkapribado',ack:'Nabasa at naunawaan ko ang Abiso sa Pagkapribado at sumasang-ayon ako sa pagproseso ng aking personal na datos',accept:'Sumang-ayon at magpatuloy',decline:'Tumanggi',declined:'Hindi mo magagamit ang PractiSync kung hindi ka sumasang-ayon sa Abiso sa Pagkapribado',help:'Naitala ang iyong pasya. Maaari mong basahin muli ang abiso at sumang-ayon anumang oras.',review:'Basahin muli at magbigay ng pahintulot',signout:'Mag-sign out',pending:'Itinatala ang iyong pasya…',disabled:'Lagyan ng tsek ang pagkilala upang makapagpatuloy.',accepted:'Sumang-ayon ka na sa Abisong ito sa Pagkapribado.',continuing:'Nire-refresh ang iyong session…',continue:'Magpatuloy sa workspace',error:'Hindi makumpleto ang kahilingan. Suriin ang koneksiyon at subukan muli.',changed:'Nagbago ang Abiso sa Pagkapribado. I-reload ang pahina at basahin ang bagong bersiyon bago magpasya.',reload:'I-reload ang abiso'},
};

export default function ConsentForm({policy,state,returnTo}:{policy:PrivacyPolicy;state:ConsentState;returnTo:string}) {
 const savedLanguage=useSyncExternalStore(subscribe,storedLanguage,()=>state.language??'en');
 const [override,setOverride]=useState<ConsentLanguage|null>(null),language=override??savedLanguage,t=copy[language];
 const [declined,setDeclined]=useState(state.status==='DECLINED'||state.status==='WITHDRAWN');
 const [accepted,setAccepted]=useState(!state.required),[busy,setBusy]=useState(false),[error,setError]=useState(''),[stale,setStale]=useState(false);
 const feedback=useRef<HTMLDivElement>(null),checkbox=useRef<HTMLButtonElement>(null),started=useRef(false);
 const {control,handleSubmit,reset}=useForm<z.infer<typeof acknowledgement>>({resolver:zodResolver(acknowledgement),defaultValues:{acknowledged:false}});
 const checked=useWatch({control,name:'acknowledged'});
 const chooseLanguage=(value:ConsentLanguage)=>{setOverride(value);reset({acknowledged:false});try{localStorage.setItem(languageKey,value);window.dispatchEvent(new Event('privacy-language'));}catch{/* The selected language still works without browser storage. */}};
 const continueToWorkspace=useCallback(async()=>{
  setBusy(true);setError('');
  try{const session=await refreshConsentSession();if(session.consentVersion!==policy.version){setStale(true);throw new Error(t.changed);}window.location.replace(returnTo);}
  catch(e){setError(e instanceof TypeError?t.error:e instanceof Error?e.message:t.error);setBusy(false);requestAnimationFrame(()=>feedback.current?.focus());}
 },[policy.version,returnTo,t.changed,t.error]);
 useEffect(()=>{if(accepted&&!started.current){started.current=true;void continueToWorkspace();}},[accepted,continueToWorkspace]);
 async function decide(action:'ACCEPT'|'DECLINE') {
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/consent',{method:'POST',headers:{'Content-Type':'application/json','If-Match':`"${policy.version}"`},body:JSON.stringify({action,language})});
   const result=await response.json() as {error?:string;code?:string};
   if(response.status===401){window.location.replace('/login?redirect='+encodeURIComponent(window.location.pathname+window.location.search));return;}
   if(result.code==='CONSENT_POLICY_CHANGED')setStale(true);
   if(!response.ok)throw new Error(result.code==='CONSENT_POLICY_CHANGED'?t.changed:result.error??t.error);
   reset({acknowledged:false});
   if(action==='DECLINE'){setDeclined(true);setBusy(false);requestAnimationFrame(()=>feedback.current?.focus());}
   else {started.current=true;setAccepted(true);await continueToWorkspace();}
  }catch(e){setError(e instanceof TypeError?t.error:e instanceof Error?e.message:t.error);setBusy(false);requestAnimationFrame(()=>feedback.current?.focus());}
 }
 async function signOut(){setBusy(true);setError('');try{await authSubmit('signout',{});window.location.replace('/login');}catch(e){setError(e instanceof TypeError?t.error:e instanceof Error?e.message:t.error);setBusy(false);}}
 return <main className="privacy-page" lang={language}><div className="privacy-gate">
  <header className="privacy-brand"><ShieldCheck aria-hidden="true"/><span>PractiSync <small>Rizal Technological University</small></span></header>
  <div className="privacy-heading"><h1>{language==='fil'?policy.titleFil:policy.titleEn}</h1><p>{t.intro}</p></div>
  <fieldset className="privacy-language" disabled={busy}><legend>Language / Wika</legend>{(['en','fil'] as const).map(value=><Button key={value} type="button" variant={language===value?'default':'outline'} aria-pressed={language===value} onClick={()=>chooseLanguage(value)}>{value==='en'?'English':'Filipino'}</Button>)}</fieldset>
  <p className="privacy-summary">{t.summary}</p>
  <div className="privacy-policy-meta"><span>{language==='fil'?'Bersiyon':'Version'} {policy.version} · {new Date(policy.effectiveAt).toLocaleDateString(language==='fil'?'fil-PH':'en-PH',{dateStyle:'long',timeZone:'Asia/Manila'})}</span><a href={'/privacy?language='+language} target="_blank" rel="noopener noreferrer">{t.policy}</a></div>
  <section className="privacy-scroll" tabIndex={0} aria-label={t.notice}><PrivacyNotice body={language==='fil'?policy.bodyFil:policy.bodyEn}/></section>
  <div ref={feedback} tabIndex={-1} className="privacy-feedback" role={error?'alert':'status'} aria-live="polite">{error&&<p>{error}</p>}{stale&&<Button variant="outline" onClick={()=>window.location.reload()}>{t.reload}</Button>}{accepted&&<p>{t.accepted}</p>}{declined&&!accepted&&<><h2>{t.declined}</h2><p>{t.help}</p></>}</div>
  {accepted?<Button disabled={busy||stale} onClick={()=>void continueToWorkspace()}>{busy?t.continuing:t.continue}</Button>:declined?<Button disabled={busy||stale} onClick={()=>{setDeclined(false);reset({acknowledged:false});requestAnimationFrame(()=>checkbox.current?.focus());}}>{t.review}</Button>:<form onSubmit={event=>{void handleSubmit(()=>decide('ACCEPT'))(event);}}>
   <div className="privacy-ack"><Controller name="acknowledged" control={control} render={({field})=><Checkbox id="privacy-acknowledgement" ref={checkbox} checked={field.value} onCheckedChange={value=>field.onChange(value===true)} onBlur={field.onBlur} disabled={busy||stale} aria-describedby={!checked?'privacy-disabled':undefined}/>}/><Label htmlFor="privacy-acknowledgement">{t.ack}</Label></div>
   {!checked&&<p id="privacy-disabled" className="privacy-hint">{t.disabled}</p>}
   <div className="privacy-actions"><Button type="submit" disabled={!checked||busy||stale}>{busy?t.pending:t.accept}</Button><Button type="button" variant="outline" disabled={busy||stale} onClick={()=>void decide('DECLINE')}>{t.decline}</Button></div>
  </form>}
  <Button className="privacy-signout" type="button" variant="link" disabled={busy} onClick={()=>void signOut()}>{t.signout}</Button>
 </div></main>;
}
