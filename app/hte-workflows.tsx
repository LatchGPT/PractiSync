'use client';

import { useState, type FormEvent } from 'react';
import { Check, FileCheck2, FileClock, FileText, LockKeyhole, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Action, Row, Snapshot } from '@/packages/validation/contracts';
import type { EvaluationQuestion } from '@/packages/validation/hte';
import DtrPagination from './dtr-pagination';

const text = (r: Row | undefined, k: string) => String(r?.[k] ?? '');
const num = (r: Row | undefined, k: string) => Number(r?.[k] ?? 0);
const hours = (n: number) => `${(n / 60).toLocaleString('en-PH', { maximumFractionDigits: 2 })} hours`;
const date = (s: string) => new Date(s).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
const statusLabel = (s: string) => ({ SUBMITTED:'Awaiting HTE review', VERIFIED:'HTE verified', REVISION_REQUESTED:'Corrections requested', PENDING:'Awaiting approval', APPROVED:'Approved', REJECTED:'Rejected', DRAFT:'Draft', PUBLISHED:'Published', ARCHIVED:'Previous version' }[s] ?? s);
export const HteStatus = ({ value }: { value: string }) => <span className={`chip ${['VERIFIED','APPROVED','PUBLISHED'].includes(value) ? 'green' : ['REJECTED','REVISION_REQUESTED'].includes(value) ? 'red' : 'orange'}`}>{statusLabel(value)}</span>;

export function useHteAction(refresh: () => Promise<void>) {
 const router = useRouter();
 const [busy, setBusy] = useState(false), [error, setError] = useState('');
 async function act(action: Action, values: Record<string, unknown>) {
  if (busy) return false;
  setBusy(true); setError('');
  try {
   const response = await fetch('/api/action', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action, values }) });
   if (response.status === 401) { router.replace('/login'); return false; }
   const result = await response.json() as { message?: string; error?: string };
   if (!response.ok) throw new Error(result.error || 'Could not save. Your input is preserved; try again.');
   toast.success(result.message || 'Saved.'); await refresh(); return true;
  } catch(e) { setError(e instanceof Error ? e.message : 'Could not save. Your input is preserved; try again.'); return false; }
  finally { setBusy(false); }
 }
 return { busy, error, act };
}
const Failure = ({ error }: { error: string }) => error ? <p className="hte-error" role="alert">{error}</p> : null;

export function HteRequestQueue({ data, onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 const { busy, error, act } = useHteAction(onRefresh);
 const [filter, setFilter] = useState(data.user.role === 'SUPER_ADMIN' ? 'PENDING' : 'ALL'), [notes, setNotes] = useState<Record<string,string>>({});
 const admin = data.user.role === 'SUPER_ADMIN';
 const requests = (data.hteRequests ?? []).filter(r => filter === 'ALL' || r.status === filter);
 const names: Record<string,string> = { REGISTRATION:'HTE registration', PROFILE:'Company profile changes', JOB_CREATE:'New internship post', JOB_EDIT:'Internship post changes', JOB_CLOSE:'Close internship post' };
 const fieldNames: Record<string,string> = { name:'Company name', industry:'Industry', location:'Location', description:'Description', contactName:'Contact person', email:'Contact email', title:'Position title', courseId:'Course', skills:'Skills', openings:'Openings' };
 return <section className="hte-card" id="hte-requests"><div className="hte-section-heading"><div><h2>{admin ? 'HTE approval requests' : 'Your requests'}</h2><p className="muted">{admin ? 'Review partner registration and business changes before they take effect.' : 'Track Super Admin decisions. Rejected requests include the reason for correction.'}</p></div><label className="hte-filter">Status<select value={filter} onChange={e => setFilter(e.target.value)}>{['PENDING','APPROVED','REJECTED','ALL'].map(s => <option key={s} value={s}>{s === 'ALL' ? 'All requests' : statusLabel(s)}</option>)}</select></label></div><Failure error={error}/>
 {requests.length ? <div className="hte-request-list">{requests.map(r => {
  const proposed = JSON.parse(text(r,'payloadJson')) as Record<string,string | number>;
  const current = r.kind === 'PROFILE' ? data.companies.find(c => c.id === r.resourceId) : ['JOB_EDIT','JOB_CLOSE'].includes(text(r,'kind')) ? data.jobs.find(j => j.id === r.resourceId) : undefined;
  return <article key={r.id} className="hte-request"><div className="hte-section-heading"><div><h3>{names[text(r,'kind')]}</h3><p>{text(r,'companyName')} · {text(r,'requesterName')} · {date(text(r,'createdAt'))}</p></div><HteStatus value={text(r,'status')}/></div>
   <details><summary>Review request details</summary>{r.kind === 'JOB_CLOSE' ? <p>Close “{text(current,'title')}” and hide it from the student internship board. Existing applications and placements are retained.</p> : <div className="hte-table-scroll"><table className="hte-review-table"><thead><tr><th>Field</th>{current && <th>Current approved value</th>}<th>Requested value</th></tr></thead><tbody>{Object.entries(proposed).map(([k,v]) => <tr key={k}><th>{fieldNames[k] ?? k}</th>{current && <td>{text(current,k) || '—'}</td>}<td>{k === 'courseId' ? text(data.courses.find(c => c.id === v),'name') || String(v) : String(v)}</td></tr>)}</tbody></table></div>}</details>
   {text(r,'note') && <p className="hte-review-note"><strong>Super Admin note:</strong> {text(r,'note')}</p>}
   {admin && r.status === 'PENDING' && <div className="hte-request-decision"><label>Decision note <span className="muted">(required when rejecting)</span><textarea maxLength={2000} value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes,[r.id]:e.target.value })}/></label><div className="hte-actions"><button className="primary" disabled={busy} onClick={() => void act('hteRequestReview',{ requestId:r.id,version:num(r,'version'),decision:'APPROVE',note:notes[r.id] ?? '' })}><Check size={15}/>Approve request</button><button className="secondary" disabled={busy} onClick={() => void act('hteRequestReview',{ requestId:r.id,version:num(r,'version'),decision:'REJECT',note:notes[r.id] ?? '' })}>Reject with reason</button></div></div>}
  </article>;
 })}</div> : <p className="hte-empty">{!data.hteRequests?.length ? 'No approval requests yet. New requests and their decisions will appear here.' : filter === 'PENDING' ? 'No requests are waiting for approval.' : 'No requests match this status.'}</p>}
 </section>;
}

function FinalDtrCopy({ record }: { record: Row }) {
 const [page,setPage] = useState(1), [size,setSize] = useState(10);
 const entries = JSON.parse(text(record,'snapshotJson')) as Row[];
 const current = Math.min(page,Math.max(1,Math.ceil(entries.length / size)));
 return <details className="hte-dtr-copy"><summary>Review submitted DTR · {entries.length} logs · {hours(num(record,'totalMinutes'))}</summary><p className="small muted">Fixed submission version {record.version}. Times use Asia/Manila. Daily narratives are excluded from the HTE copy.</p><div className="hte-table-scroll"><table className="hte-review-table"><thead><tr><th>Date</th><th>Time in</th><th>Time out</th><th>Break</th><th>Hours</th></tr></thead><tbody>{entries.slice((current-1)*size,current*size).map(e => <tr key={e.id}><th>{text(e,'date')}</th><td>{date(text(e,'startsAt'))}</td><td>{date(text(e,'endsAt'))}</td><td>{e.breakMinutes} min</td><td>{hours(num(e,'minutes'))}</td></tr>)}</tbody></table></div><DtrPagination page={current} pageSize={size} totalItems={entries.length} itemLabel="logs" onPageChange={setPage} onPageSizeChange={s => {setSize(s);setPage(1);}}/></details>;
}

export function FinalDtrCard({ data, placement, onRefresh }: { data: Snapshot; placement: Row; onRefresh: () => Promise<void> }) {
 const { busy,error,act } = useHteAction(onRefresh), [note,setNote] = useState('');
 const f = data.finalDtrs?.find(r => r.placementId === placement.id), role = data.user.role;
 const reopening = data.finalDtrReopens?.find(r => r.placementId === placement.id && r.status === 'PENDING');
 const lastReopening = data.finalDtrReopens?.find(r => r.placementId === placement.id);
 const reported = placement.reportedMinutes === undefined ? data.entries.filter(e => e.placementId === placement.id).reduce((s,e) => s + num(e,'minutes'),0) : num(placement,'reportedMinutes');
 const eligible = num(placement,'requiredMinutes') > 0 && reported >= num(placement,'requiredMinutes');
 const canSubmit = role === 'STUDENT' && placement.status === 'ACTIVE' && (!f || f.status === 'REVISION_REQUESTED');
 return <section className="hte-final-dtr"><div className="hte-section-heading"><div><h3><FileCheck2 size={18}/>Final DTR verification</h3><p>{hours(reported)} reported · {hours(num(placement,'requiredMinutes'))} required</p></div>{f ? <HteStatus value={text(f,'status')}/> : <span className="chip">Not submitted</span>}</div><Failure error={error}/>
  {f ? <><FinalDtrCopy record={f}/>{f.note && <p className="hte-review-note"><strong>Review note:</strong> {text(f,'note')}</p>}{f.reviewedAt && <p className="small muted">Reviewed {date(text(f,'reviewedAt'))}</p>}</> : <p className="muted">The student submits the complete DTR once the required hours are reached. The HTE reviews attendance once for the whole internship.</p>}
  {canSubmit && <><p className="small muted">{eligible ? 'Submitting locks attendance until the HTE verifies it or returns it for correction.' : 'Keep recording attendance. Final submission unlocks at the required hours target.'}</p><button className="primary" disabled={busy || !eligible} onClick={() => void act('finalDtrSubmit',{ placementId:placement.id,version:num(f,'version') })}><FileClock size={15}/>{busy ? 'Submitting…' : f ? 'Resubmit complete DTR' : 'Submit complete DTR'}</button></>}
  {role === 'STUDENT' && f && ['SUBMITTED','VERIFIED'].includes(text(f,'status')) && <p className="small muted"><LockKeyhole size={14}/> Attendance is locked. {f.status === 'VERIFIED' ? 'Request reopening below if a correction is needed.' : 'Your HTE is reviewing the submitted record.'}</p>}
  {role === 'SUPERVISOR' && f?.status === 'SUBMITTED' && <div className="hte-request-decision"><label>Review note <span className="muted">(identify incorrect dates or times when rejecting)</span><textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></label><p className="small muted">Verify only after reviewing the entire submitted attendance record against your company records.</p><div className="hte-actions"><button className="primary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'VERIFY',note })}><Check size={15}/>Verify complete DTR</button><button className="secondary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'REJECT',note })}>Return for correction</button></div></div>}
  {role === 'STUDENT' && f?.status === 'VERIFIED' && <details><summary>Request a correction</summary>{reopening ? <p className="hte-review-note">Your reopening request is awaiting coordinator approval. Reason: {text(reopening,'reason')}</p> : <><label>What needs correcting?<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></label><p className="small muted">If approved, completion and evaluation review will reopen. Your HTE must verify the corrected DTR again.</p><button className="secondary" disabled={busy} onClick={() => void act('finalDtrReopen',{ placementId:placement.id,version:num(f,'version'),reason:note })}>Request reopening</button>{lastReopening?.note && <p className="hte-review-note">Previous coordinator decision: {text(lastReopening,'note')}</p>}</>}</details>}
  {role === 'COORDINATOR' && reopening && <div className="hte-request-decision"><h4>Student requested reopening</h4><p>{text(reopening,'reason')}</p><label>Coordinator decision reason<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></label><p className="small muted">Approving unlocks attendance, returns formal completion to pending, and requires renewed HTE verification and evaluation review.</p><div className="hte-actions"><button className="primary" disabled={busy} onClick={() => void act('finalDtrReopenReview',{ requestId:reopening.id,version:num(reopening,'version'),decision:'APPROVE',note })}>Approve reopening</button><button className="secondary" disabled={busy} onClick={() => void act('finalDtrReopenReview',{ requestId:reopening.id,version:num(reopening,'version'),decision:'REJECT',note })}>Decline reopening</button></div></div>}
 </section>;
}

export function FinalDtrWorkspace({ data,onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 return <section className="hte-card"><h2>Final attendance review</h2><p className="muted">Daily logs count as reported attendance. One HTE verification covers the complete internship DTR.</p>{data.placements.length ? data.placements.map(p => <details className="hte-placement" key={p.id} open={data.user.role === 'STUDENT' || Boolean(data.finalDtrReopens?.some(r=>r.placementId===p.id && r.status==='PENDING'))}><summary>{text(p,'studentName')} · {text(p,'companyName')} · {statusLabel(text(data.finalDtrs?.find(f => f.placementId === p.id),'status')) || 'Not submitted'}</summary><FinalDtrCard data={data} placement={p} onRefresh={onRefresh}/></details>) : <p className="hte-empty">An assigned placement is needed before a final DTR can be submitted.</p>}</section>;
}

function TemplateEditor({ template,onRefresh }: { template: Row; onRefresh: () => Promise<void> }) {
 const [title,setTitle] = useState(text(template,'title')), [questions,setQuestions] = useState<EvaluationQuestion[]>(() => JSON.parse(text(template,'questionsJson')));
 const { busy,error,act } = useHteAction(onRefresh);
 const setup = {templateId:template.id,version:num(template,'version'),title,questions:questions.map(q=>({...q,options:q.options.map(o=>o.trim()).filter(Boolean)}))};
 const update = (i: number, patch: Partial<EvaluationQuestion>) => setQuestions(questions.map((q,n) => n === i ? {...q,...patch} : q));
 return <form className="hte-template-editor" onSubmit={e => { e.preventDefault(); void act('hteEvaluationPublish',setup); }}><h3>Prepare the uploaded form</h3><p className="muted">Copy the school’s questions and exact rating labels from the document. Fillable PDF fields appear below automatically. No questions or scores are invented.</p><label>Form title<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/></label><a className="textbutton" href={`/api/hte-evaluation-template/${template.id}/file`} target="_blank" rel="noreferrer">View original PDF</a>
  {questions.map((q,i) => <fieldset className="hte-question-editor" key={q.key}><legend>Question {i+1}</legend><label>Question wording<input required maxLength={500} value={q.label} onChange={e => update(i,{label:e.target.value})}/></label><label>Answer type<select value={q.type} onChange={e => update(i,{type:e.target.value as EvaluationQuestion['type']})}><option value="text">Written answer</option><option value="rating">Rating scale</option><option value="select">Single choice</option></select></label>{q.type !== 'text' && <label>Scale labels or choices, one per line<textarea required value={q.options.join('\n')} onChange={e => update(i,{options:e.target.value.split('\n')})}/><span className="small muted">Use the exact school scale; no automatic grade is calculated.</span></label>}<label className="hte-checkbox"><input type="checkbox" checked={q.required} onChange={e => update(i,{required:e.target.checked})}/>Required answer</label><button className="textbutton" type="button" onClick={() => setQuestions(questions.filter((_,n) => n !== i))}>Remove question {i+1}</button></fieldset>)}
  {!questions.length && <p className="hte-empty">No online answer fields yet. Add the questions from the uploaded document before publishing.</p>}<Failure error={error}/><div className="hte-actions"><button type="button" className="secondary" disabled={busy || questions.length >= 60} onClick={() => setQuestions([...questions,{ key:'q'+crypto.randomUUID().replaceAll('-',''),label:'',type:'text',required:true,options:[] }])}>Add question</button><button type="button" className="secondary" disabled={busy} onClick={() => void act('hteEvaluationDraft',setup)}>Save form setup</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Publish for all courses'}</button></div></form>;
}

export function SchoolEvaluationLibrary({ data,onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 const [uploading,setUploading] = useState(false), [error,setError] = useState('');
 const published = data.hteEvaluationTemplates?.find(t => t.status === 'PUBLISHED'), drafts = data.hteEvaluationTemplates?.filter(t => t.status === 'DRAFT') ?? [];
 async function upload(file: File, input: HTMLInputElement) {
  setError(''); if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 4 * 1024 * 1024) { setError('Choose a PDF file up to 4 MB.'); return; }
  setUploading(true);
  try { const r = await fetch('/api/hte-evaluation-template',{ method:'POST',headers:{ 'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(file.name) },body:file }); const result = await r.json() as {error?:string;message?:string}; if (!r.ok) throw new Error(result.error || 'Could not save. Try again.'); await onRefresh(); input.value=''; toast.success(result.message || 'PDF uploaded.'); }
  catch(e) { setError(e instanceof Error ? e.message : 'Upload failed. Try again.'); }
  finally { setUploading(false); }
 }
 return <section className="hte-card school-evaluation"><div className="hte-section-heading"><div><h2><FileText size={19}/>School evaluation form</h2><p className="muted">One university-wide form for every course and program.</p></div><span className="chip blue">All programs</span></div>
  {published ? <div className="hte-published-form"><HteStatus value="PUBLISHED"/><strong>{text(published,'title')}</strong><a className="textbutton" href={`/api/hte-evaluation-template/${published.id}/file`}>Download school form</a></div> : <div className="hte-form-placeholder"><FileClock size={28}/><div><h3>Waiting for evaluation form</h3><p>Super Admin will upload and publish the school document here. Online answers become available once its questions are ready.</p></div><span className="chip orange">Awaiting document</span></div>}
  {data.user.role === 'SUPER_ADMIN' && <><label className="hte-upload secondary"><Upload size={15}/>{uploading ? 'Uploading PDF…' : 'Upload evaluation PDF'}<input type="file" accept=".pdf,application/pdf" disabled={uploading} onChange={e => {const file=e.target.files?.[0]; if(file)void upload(file,e.target);}}/></label><p className="small muted">PDF, up to 4 MB. Uploads remain drafts until the answer fields are checked and published. Replacing the form preserves earlier responses.</p><Failure error={error}/>{drafts.map(t => <TemplateEditor key={`${t.id}:${t.version}`} template={t} onRefresh={onRefresh}/>)}</>}
 </section>;
}

export function HteEvaluationForm({ data,placement,onRefresh }: { data: Snapshot; placement: Row; onRefresh: () => Promise<void> }) {
 const response = data.hteEvaluationResponses?.find(r => r.placementId === placement.id);
 const template = response ? data.hteEvaluationTemplates?.find(t => t.id === response.templateId) : data.hteEvaluationTemplates?.find(t => t.status === 'PUBLISHED');
 const final = data.finalDtrs?.find(r => r.placementId === placement.id);
 if (!template) return <div className="hte-form-placeholder"><FileClock size={23}/><div><h3>Waiting for evaluation form</h3><p>Super Admin has not published the school’s form yet. It will apply to all courses and programs.</p></div></div>;
 if (!final || final.status !== 'VERIFIED') return <p className="hte-review-note"><LockKeyhole size={15}/> The school evaluation unlocks after the complete DTR is verified.</p>;
 return <EvaluationAnswers key={`${response?.id ?? template.id}:${response?.version ?? 0}:${final.version}`} data={data} placement={placement} template={template} response={response} final={final} onRefresh={onRefresh}/>;
}
function EvaluationAnswers({ data,placement,template,response,final,onRefresh }: { data: Snapshot; placement: Row; template: Row; response?: Row; final: Row; onRefresh: () => Promise<void> }) {
 const questions = JSON.parse(text(template,'questionsJson')) as EvaluationQuestion[];
 const [answers,setAnswers] = useState<Record<string,string>>(() => response ? JSON.parse(text(response,'answersJson')) : {}), [note,setNote] = useState('');
 const { busy,error,act } = useHteAction(onRefresh);
 const canAnswer = data.user.role === 'SUPERVISOR' && (!response || ['DRAFT','REVISION_REQUESTED'].includes(text(response,'status')));
 const save = (mode: 'DRAFT'|'SUBMIT') => void act('hteEvaluationSave',{ placementId:placement.id,templateId:template.id,finalDtrVersion:num(final,'version'),version:num(response,'version'),mode,answers });
 return <section className="hte-evaluation-form"><div className="hte-section-heading"><h3>{text(template,'title')}</h3>{response && <HteStatus value={text(response,'status')}/>}</div><a className="textbutton" href={`/api/hte-evaluation-template/${template.id}/file`}>Download original school document</a>{response?.note && <p className="hte-review-note">Coordinator note: {text(response,'note')}</p>}<Failure error={error}/>
  {canAnswer ? <form className="hte-answer-form" onSubmit={(e:FormEvent) => {e.preventDefault();save('SUBMIT');}}>{questions.map(q => <label key={q.key}>{q.label}{!q.required && <span className="muted"> (optional)</span>}{q.type === 'text' ? <textarea required={q.required} maxLength={5000} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})}/> : <select required={q.required} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})}><option value="">Choose an answer</option>{q.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}</label>)}<div className="hte-actions"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Submit evaluation for review'}</button><button className="secondary" type="button" disabled={busy} onClick={() => save('DRAFT')}>Save draft</button></div></form> : response ? <dl className="hte-answer-receipt">{questions.map(q => <div key={q.key}><dt>{q.label}</dt><dd>{answers[q.key] || 'No answer'}</dd></div>)}</dl> : <p className="muted">The assigned HTE has not submitted this evaluation.</p>}
  {data.user.role === 'COORDINATOR' && response?.status === 'SUBMITTED' && <div className="hte-request-decision"><label>Coordinator review note<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000}/></label><div className="hte-actions"><button className="primary" disabled={busy} onClick={() => void act('hteEvaluationReview',{ responseId:response.id,version:num(response,'version'),decision:'APPROVED',note })}>Approve and release</button><button className="secondary" disabled={busy} onClick={() => void act('hteEvaluationReview',{ responseId:response.id,version:num(response,'version'),decision:'REVISION_REQUESTED',note })}>Request revision</button></div></div>}
 </section>;
}

export function SchoolEvaluationReviews({ data,onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 const placements = data.placements.filter(p => data.hteEvaluationResponses?.some(r => r.placementId === p.id));
 return <section className="hte-card"><h2>School evaluation responses</h2>{placements.length ? placements.map(p => <details className="hte-placement" key={p.id}><summary>{text(p,'studentName')} · {text(p,'companyName')}</summary><HteEvaluationForm data={data} placement={p} onRefresh={onRefresh}/></details>) : <p className="hte-empty">{data.user.role === 'STUDENT' ? 'Your school evaluation will appear here after coordinator review.' : 'No school evaluations have been submitted yet.'}</p>}</section>;
}
