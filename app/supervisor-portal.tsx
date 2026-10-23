'use client';

import { EmployerFeedbackForm } from './employer-feedback';
import JobEditor from './recruitment-editor';
import ApplicantContact from './applicant-contact';
import { useState } from 'react';
import { BriefcaseBusiness, Building2, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { RtuSeal } from '@/components/rtu-seal';
import { authSubmit } from './login-client';
import { FinalDtrCard, HteEvaluationForm, HteRequestQueue, HteStatus, SchoolEvaluationLibrary, useHteAction } from './hte-workflows';
import type { Row, Snapshot } from '@/packages/validation/contracts';
import Link from 'next/link';

const text = (r: Row | undefined, k: string) => String(r?.[k] ?? '');
const num = (r: Row | undefined, k: string) => Number(r?.[k] ?? 0);
function CompanyProfile({ company, onRefresh }: { company?: Row; onRefresh: () => Promise<void> }) {
 const [values,setValues] = useState(() => ({ name:text(company,'name'), industry:text(company,'industry'), location:text(company,'location'), description:text(company,'description'), contactName:text(company,'contactName'), contactEmail:text(company,'contactEmail'), contactPhone:text(company,'contactPhone'), contactPosition:text(company,'contactPosition'), website:text(company,'website') }));
 const { busy,error,act } = useHteAction(onRefresh);
 const fields = [{name:'name',label:'Company name',max:160},{name:'industry',label:'Industry',max:120},{name:'location',label:'Office address',max:240},{name:'contactName',label:'Contact person',max:120},{name:'contactPosition',label:'Designation / position',max:120},{name:'contactEmail',label:'Contact email',type:'email',max:254},{name:'contactPhone',label:'Contact phone',type:'tel',max:40},{name:'website',label:'Company website (optional)',type:'url',max:500}] as const;
 return <form className="hte-form" onSubmit={event => {event.preventDefault();void act(company?.status === 'APPROVED' ? 'hteProfileChange' : 'companyProfile',{...values,...(company?.status === 'APPROVED' ? {version:num(company,'version')} : {})});}}>
 {fields.map(field => <label key={field.name}>{field.label}<input required={field.name !== 'website'} type={'type' in field ? field.type : 'text'} maxLength={field.max} value={values[field.name]} onChange={event => setValues({...values,[field.name]:event.target.value})}/></label>)}
 <label className="hte-full">Company description<textarea required maxLength={2000} value={values.description} onChange={event => setValues({...values,description:event.target.value})}/></label>
 {error && <p className="hte-error hte-full" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for Super Admin approval'}</button></form>;
}

export default function SupervisorPortal({ data,onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 const router = useRouter();
 const company = data.companies.find(c => c.id === data.user.companyId);
 const verified = company?.status === 'APPROVED' && num(company,'canPost') === 1;
 const { busy,error,act } = useHteAction(onRefresh);
 async function signOut() { try {await authSubmit('signout',{},'/');router.replace('/login');}catch(e){toast.error(e instanceof Error ? e.message : 'Sign out failed.');} }
 return <main className="hte-portal hte-workspace"><header className="hte-header"><div className="brand"><span className="brand-icon"><RtuSeal /></span><span>PractiSync.</span></div><div className="hte-account"><span>{data.user.name} · Industry Partner Supervisor</span><button className="secondary" onClick={() => void onRefresh().catch(() => toast.error('Refresh failed. Try again.'))} disabled={busy}><RefreshCw size={15}/>Refresh</button><button className="secondary" onClick={() => void signOut()}><LogOut size={15}/>Sign out</button></div></header>
 <section className="hte-intro"><span className="chip blue"><ShieldCheck size={13}/>{verified ? 'Approved partner access' : 'Partner approval required'}</span><h1>{text(company,'name') || 'Your Industry Partner account'}</h1>{company && <HteStatus value={text(company,'status')}/>}</section>
 <nav className="hte-portal-nav" aria-label="Industry Partner sections"><a href="#hte-requests">Requests</a>{verified && <><a href="#hte-interns">Assigned interns</a><a href="#hte-posts">Intern recruitment</a><a href="#hte-applicants">Applicants</a></>}<a href="#hte-account">Account</a><Link href="/settings/privacy">Settings · Privacy</Link></nav>
 {error && <p className="hte-error" role="alert">{error}</p>}
 {(!company || company.status === 'REJECTED') && <section className="hte-card"><h2><Building2 size={18}/>{company ? 'Correct your registration details' : 'Submit your company details'}</h2><CompanyProfile key={`${company?.id}:${company?.version}`} company={company} onRefresh={onRefresh}/></section>}
 <HteRequestQueue data={data} onRefresh={onRefresh}/>
 {verified && <>
 <section className="hte-card" id="hte-interns"><h2><Users size={18}/>Assigned interns</h2>{data.placements.length ? data.placements.map(p => <details className="hte-placement" data-placement-id={p.id} key={p.id}><summary>{text(p,'studentName')} · {text(p,'courseCode')} · {text(p,'period')}</summary><FinalDtrCard data={data} placement={p} onRefresh={onRefresh}/><HteEvaluationForm data={data} placement={p} onRefresh={onRefresh}/><EmployerFeedbackForm data={data} placement={p} onRefresh={onRefresh}/></details>) : <p className="hte-empty">No students are assigned to your account yet.</p>}</section>
 <SchoolEvaluationLibrary data={data} onRefresh={onRefresh}/>
 <section className="hte-card" id="hte-posts"><div className="hte-section-heading"><div><h2><BriefcaseBusiness size={18}/>Intern recruitment</h2></div></div><details><summary>Create an OJT opportunity</summary><JobEditor data={data} onRefresh={onRefresh}/></details>
 {data.jobs.length ? data.jobs.map(job => { const pending = data.hteRequests?.some(r => r.resourceId === job.id && r.status === 'PENDING');return <article className="hte-request" key={job.id}><div className="hte-section-heading"><div><h3>{text(job,'title')}</h3><p>{text(job,'location')} · {job.openings} openings</p></div><HteStatus value={pending ? 'PENDING' : text(job,'status')}/></div>{pending ? <p className="small muted">A request for this post is awaiting Super Admin approval.</p> : <><details><summary>{job.status === 'ARCHIVED' ? 'Revise and request publication' : 'Request post changes'}</summary><JobEditor key={`${job.id}:${job.version}`} data={data} job={job} onRefresh={onRefresh}/></details>{job.status === 'PUBLISHED' && <button className="secondary" disabled={busy} onClick={() => void act('hteJobClose',{jobId:job.id,version:num(job,'version')})}>Request closure</button>}</>}</article>;}) : <p className="hte-empty">No posts yet.</p>}</section>
 <section className="hte-card" id="hte-applicants"><h2>Applicants</h2>{data.applications.length ? data.applications.map(a => <article className="hte-request" key={a.id}><div className="hte-section-heading"><div><h3>{text(a,'studentName')}</h3><p>{text(a,'title')}</p><ApplicantContact application={a}/></div><span className="chip">{text(a,'status').toLowerCase().replaceAll('_',' ')}</span></div><details><summary>Read application</summary><p>{text(a,'coverLetter')}</p></details>{a.status === 'SUBMITTED' && <div className="hte-actions"><button className="primary" disabled={busy} onClick={() => void act('selectApplication',{applicationId:a.id,decision:'SHORTLISTED'})}>Select for placement review</button><button className="secondary" disabled={busy} onClick={() => void act('selectApplication',{applicationId:a.id,decision:'REJECTED'})}>Decline application</button></div>}</article>) : <p className="hte-empty">No applications yet.</p>}</section>
 <section className="hte-card"><h2>Company profile</h2>{data.hteRequests?.some(r => r.resourceId === company?.id && r.status === 'PENDING') ? <p className="hte-review-note">Profile changes are awaiting Super Admin approval.</p> : <details><summary>Request profile changes</summary><CompanyProfile key={`${company?.id}:${company?.version}`} company={company} onRefresh={onRefresh}/></details>}</section>
 <section className="hte-card"><h2>Student feedback</h2>{data.reviews.length ? <>{data.reviews.map(r => <article className="hte-request" key={r.id}><strong>{r.rating}/5</strong><p>{text(r,'body')}</p></article>)}</> : <p className="hte-empty">Feedback is hidden until the privacy threshold is met.</p>}</section>
 </>}
 <section className="hte-card" id="hte-account"><h2>Sign-in details</h2>{data.user.isDemo ? null : <details><summary>Change name and password</summary><form className="hte-form" onSubmit={e => {e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));void act('hteCredentials',values).then(ok => {if(ok)router.replace('/login');});}}><label className="hte-full">Full name<input name="name" defaultValue={data.user.name} maxLength={120} autoComplete="name" required/></label><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label>New password<input name="newPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/></label><button className="primary" disabled={busy}>Update sign-in details</button></form></details>}</section>
 </main>;
}
