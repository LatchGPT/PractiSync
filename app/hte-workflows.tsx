import { useState, type FormEvent } from 'react';
import { Check, Download, FileCheck2, FileClock, FileText, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Action, Row, Snapshot } from '@/packages/validation/contracts';
import type { EvaluationQuestion } from '@/packages/validation/hte';
import DtrPagination from './dtr-pagination';
import { recruitmentCourseIds } from '@/packages/validation/recruitment';

const text = (r: Row | undefined, k: string) => String(r?.[k] ?? '');
const num = (r: Row | undefined, k: string) => Number(r?.[k] ?? 0);
const hours = (n: number) => `${(n / 60).toLocaleString('en-PH', { maximumFractionDigits: 2 })} hours`;
const date = (s: string) => new Date(s).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
const statusLabel = (s: string) => ({ SUBMITTED:'Awaiting review', VERIFIED:'Verified', REVISION_REQUESTED:'Corrections requested', PENDING:'Awaiting approval', APPROVED:'Approved', REJECTED:'Rejected', DRAFT:'Draft', PUBLISHED:'Published', ARCHIVED:'Previous version' }[s] ?? s);
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
 const names: Record<string,string> = { REGISTRATION:'Industry Partner registration', PROFILE:'Company profile changes', JOB_CREATE:'New internship post', JOB_EDIT:'Internship post changes', JOB_CLOSE:'Close internship post' };
 const fieldNames: Record<string,string> = { name:'Company name', industry:'Industry', location:'Location', description:'Description', contactName:'Contact person', email:'Contact email', contactEmail:'Contact email', contactPhone:'Contact phone', contactPosition:'Designation / position', website:'Company website', title:'Position title', courseId:'Primary program', courseIds:'Required programs / courses', skills:'Skills', openings:'Number of interns needed' };
 const requestValue = (key: string, value: unknown) => key === 'courseIds' && Array.isArray(value) ? value.map(id => text(data.courses.find(course => course.id === id),'name') || String(id)).join('\n') : key === 'courseId' ? text(data.courses.find(course => course.id === value),'name') || String(value) : String(value ?? '');
 return <section className="hte-card" id="hte-requests"><div className="hte-section-heading"><div><h2>{admin ? 'Industry Partner approval requests' : 'Your requests'}</h2></div><label className="hte-filter">Status<select value={filter} onChange={e => setFilter(e.target.value)}>{['PENDING','APPROVED','REJECTED','ALL'].map(s => <option key={s} value={s}>{s === 'ALL' ? 'All requests' : statusLabel(s)}</option>)}</select></label></div><Failure error={error}/>
 {requests.length ? <div className="hte-request-list">{requests.map(r => {
  const proposed = JSON.parse(text(r,'payloadJson')) as Record<string,unknown>;
  const current = r.kind === 'PROFILE' ? data.companies.find(c => c.id === r.resourceId) : ['JOB_EDIT','JOB_CLOSE'].includes(text(r,'kind')) ? data.jobs.find(j => j.id === r.resourceId) : undefined;
  return <article key={r.id} className="hte-request"><div className="hte-section-heading"><div><h3>{names[text(r,'kind')]}</h3><p>{text(r,'companyName')} · {text(r,'requesterName')} · {date(text(r,'createdAt'))}</p></div><HteStatus value={text(r,'status')}/></div>
   <details><summary>Review request details</summary>{r.kind === 'JOB_CLOSE' ? <p>Close “{text(current,'title')}” and hide it from the student OJT recruitment board. Existing applications and placements are retained.</p> : <div className="hte-table-scroll"><table className="hte-review-table"><thead><tr><th>Field</th>{current && <th>Current approved value</th>}<th>Requested value</th></tr></thead><tbody>{Object.entries(proposed).map(([k,v]) => <tr key={k}><th>{fieldNames[k] ?? k}</th>{current && <td>{requestValue(k,k === 'courseIds' && current ? recruitmentCourseIds(current) : current?.[k]) || '—'}</td>}<td>{requestValue(k,v)}</td></tr>)}</tbody></table></div>}</details>
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
 return <details className="hte-dtr-copy"><summary>Review submitted DTR · {entries.length} logs · {hours(num(record,'totalMinutes'))}</summary><p className="small muted">Fixed submission version {record.version}. Times use Asia/Manila. Daily narratives are excluded from the Industry Partner copy.</p><div className="hte-table-scroll"><table className="hte-review-table"><thead><tr><th>Date</th><th>Time in</th><th>Time out</th><th>Break</th><th>Hours</th></tr></thead><tbody>{entries.slice((current-1)*size,current*size).map(e => <tr key={e.id}><th>{text(e,'date')}</th><td>{date(text(e,'startsAt'))}</td><td>{date(text(e,'endsAt'))}</td><td>{e.breakMinutes} min</td><td>{hours(num(e,'minutes'))}</td></tr>)}</tbody></table></div><DtrPagination page={current} pageSize={size} totalItems={entries.length} itemLabel="logs" onPageChange={setPage} onPageSizeChange={s => {setSize(s);setPage(1);}}/></details>;
}

export function FinalDtrCard({ data, placement, onRefresh }: { data: Snapshot; placement: Row; onRefresh: () => Promise<void> }) {
 const { busy,error,act } = useHteAction(onRefresh), [note,setNote] = useState('');
 const [attachmentFilename, setAttachmentFilename] = useState('');
 const [attachmentBase64, setAttachmentBase64] = useState('');
 const f = data.finalDtrs?.find(r => r.placementId === placement.id), role = data.user.role;
 const reopening = data.finalDtrReopens?.find(r => r.placementId === placement.id && r.status === 'PENDING');
 const lastReopening = data.finalDtrReopens?.find(r => r.placementId === placement.id);
 const reported = placement.reportedMinutes === undefined ? data.entries.filter(e => e.placementId === placement.id).reduce((s,e) => s + num(e,'minutes'),0) : num(placement,'reportedMinutes');
 const eligible = num(placement,'requiredMinutes') > 0 && reported >= num(placement,'requiredMinutes');
 const canSubmit = role === 'STUDENT' && placement.status === 'ACTIVE' && (!f || f.status === 'REVISION_REQUESTED');
 const isExternal = num(placement, 'isExternal') === 1;

 const handleFileUpload = (file: File) => {
  if (file.size > 4 * 1024 * 1024) {
   toast.error('File exceeds 4 MB maximum limit.');
   return;
  }
  const reader = new FileReader();
  reader.onload = () => {
   setAttachmentFilename(file.name);
   setAttachmentBase64(String(reader.result));
   toast.success(`Attached signed DTR: ${file.name}`);
  };
  reader.readAsDataURL(file);
 };

 const submitDtr = () => {
  if (isExternal && !attachmentBase64) {
   toast.error('Please upload your company-signed DTR or Certificate of Hours before submitting.');
   return;
  }
  void act('finalDtrSubmit', {
   placementId: placement.id,
   version: num(f, 'version'),
   attachmentFilename: attachmentFilename || undefined,
   attachmentBase64: attachmentBase64 || undefined,
  });
 };

 return <section className="hte-final-dtr">
  <div className="hte-section-heading">
   <div>
    <h3>
     <FileCheck2 size={18}/>Final DTR verification
     {isExternal && <span className="chip purple" style={{fontSize:11,fontWeight:600}}>Offline / External Industry Partner</span>}
    </h3>
    <p>{hours(reported)} reported · {hours(num(placement,'requiredMinutes'))} required</p>
   </div>
   {f ? <HteStatus value={text(f,'status')}/> : <span className="chip">Not submitted</span>}
  </div>
  <Failure error={error}/>
  {f ? <>
   <FinalDtrCopy record={f}/>
   {f.attachmentFilename && f.attachmentBase64 && (
    <div className="hte-attachment-card">
     <div className="hte-attachment-left">
      <FileCheck2 size={22} className="hte-attachment-icon" />
      <div className="hte-attachment-info">
       <span className="small muted">Attached signed company document</span>
       <strong>{text(f,'attachmentFilename')}</strong>
       <span className="small muted">{f.verificationMethod === 'SIGNED_DOCUMENT' ? 'Company-signed physical verification' : 'Direct supervisor record'}</span>
      </div>
     </div>
     <a href={text(f,'attachmentBase64')} download={text(f,'attachmentFilename')} className="secondary hte-download-btn" target="_blank" rel="noreferrer">
      <Download size={14}/> Download copy
     </a>
    </div>
   )}
   {f.note && <p className="hte-review-note"><strong>Review note:</strong> {text(f,'note')}</p>}
   {f.reviewedAt && <p className="small muted">Reviewed {date(text(f,'reviewedAt'))}</p>}
  </> : <p className="muted">The student submits the complete DTR once the required hours are reached. {isExternal ? 'Your Class Coordinator verifies the DTR against your signed company timesheet.' : 'The Industry Partner reviews attendance once for the whole internship.'}</p>}

  {canSubmit && <>
   <p className="small muted">
    {eligible
     ? (isExternal
      ? 'Required hours reached. Upload your signed company DTR or Certificate of Hours for Class Coordinator verification.'
      : 'Submitting locks attendance until the Industry Partner verifies it or returns it for correction.')
     : 'Keep recording attendance. Final submission unlocks at the required hours target.'}
   </p>

   <div className="hte-upload-area">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
     <div>
      <strong style={{fontSize:13,color:'var(--rtu-navy)'}}>
       {isExternal ? 'Signed company DTR or Certificate of Hours (Required)' : 'Signed physical DTR attachment (Optional)'}
      </strong>

     </div>
     {attachmentBase64 ? (
      <div className="hte-upload-meta">
       <span>{attachmentFilename}</span>
       <button type="button" className="textbutton" onClick={() => { setAttachmentFilename(''); setAttachmentBase64(''); }} title="Remove file">
        <X size={14}/>
       </button>
      </div>
     ) : (
      <label className="secondary hte-download-btn" style={{cursor:'pointer',margin:0}}>
       <Upload size={14}/> Choose signed file
       <input type="file" accept=".pdf,image/png,image/jpeg" style={{display:'none'}} onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
      </label>
     )}
    </div>
   </div>

   <button className="primary" disabled={busy || !eligible || (isExternal && !attachmentBase64)} onClick={submitDtr}>
    <FileClock size={15}/>{busy ? 'Submitting…' : f ? 'Resubmit complete DTR' : isExternal ? 'Submit complete DTR with signed copy' : 'Submit complete DTR'}
   </button>
  </>}

  {role === 'STUDENT' && f && ['SUBMITTED','VERIFIED'].includes(text(f,'status')) && (
   <p className="small muted">
    <LockKeyhole size={14}/> Attendance is locked. {f.status === 'VERIFIED' ? 'Request reopening below if a correction is needed.' : isExternal ? 'Your Class Coordinator is reviewing your submitted record and signed attachment.' : 'Your Industry Partner is reviewing the submitted record.'}
   </p>
  )}

  {role === 'SUPERVISOR' && f?.status === 'SUBMITTED' && (
   <div className="hte-request-decision">
    <label>Review note <span className="muted">(identify incorrect dates or times when rejecting)</span>
     <textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/>
    </label>

    <div className="hte-actions">
     <button className="primary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'VERIFY',note })}>
      <Check size={15}/>Verify complete DTR
     </button>
     <button className="secondary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'REJECT',note })}>
      Return for correction
     </button>
    </div>
   </div>
  )}

  {role === 'COORDINATOR' && f?.status === 'SUBMITTED' && (
   <div className="hte-request-decision">
    <div className="hte-coordinator-notice">
     <ShieldCheck size={18} className="text-blue-700" style={{flexShrink:0,marginTop:2}} />
     <div>
      <strong>Coordinator Attendance Verification</strong>
      <p className="small muted">
       {isExternal || f.attachmentBase64
        ? 'The student is training at an offline / external host company and uploaded a signed document. Verify the logged attendance against the attached document.'
        : 'Direct coordinator override for final attendance verification.'}
      </p>
     </div>
    </div>
    <label>Coordinator review note <span className="muted">(optional for verification; required when returning for correction)</span>
     <textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Add any verification remarks..." />
    </label>
    <div className="hte-actions">
     <button className="primary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'VERIFY',note })}>
      <Check size={15}/>Verify complete DTR (Coordinator)
     </button>
     <button className="secondary" disabled={busy} onClick={() => void act('finalDtrReview',{ placementId:placement.id,version:num(f,'version'),decision:'REJECT',note })}>
      Return for correction
     </button>
    </div>
   </div>
  )}

  {role === 'STUDENT' && f?.status === 'VERIFIED' && (
   <details><summary>Request a correction</summary>{reopening ? <p className="hte-review-note">Your reopening request is awaiting coordinator approval. Reason: {text(reopening,'reason')}</p> : <><label>What needs correcting?<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></label><p className="small muted">If approved, completion and evaluation review will reopen. Your {isExternal ? 'coordinator' : 'Industry Partner'} must verify the corrected DTR again.</p><button className="secondary" disabled={busy} onClick={() => void act('finalDtrReopen',{ placementId:placement.id,version:num(f,'version'),reason:note })}>Request reopening</button>{lastReopening?.note && <p className="hte-review-note">Previous coordinator decision: {text(lastReopening,'note')}</p>}</>}</details>
  )}

  {role === 'COORDINATOR' && reopening && (
   <div className="hte-request-decision"><h4>Student requested reopening</h4><p>{text(reopening,'reason')}</p><label>Coordinator decision reason<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></label><p className="small muted">Approving unlocks attendance, returns formal completion to pending, and requires renewed verification and evaluation review.</p><div className="hte-actions"><button className="primary" disabled={busy} onClick={() => void act('finalDtrReopenReview',{ requestId:reopening.id,version:num(reopening,'version'),decision:'APPROVE',note })}>Approve reopening</button><button className="secondary" disabled={busy} onClick={() => void act('finalDtrReopenReview',{ requestId:reopening.id,version:num(reopening,'version'),decision:'REJECT',note })}>Decline reopening</button></div></div>
  )}
 </section>;
}

export function FinalDtrWorkspace({ data,onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 return <section className="hte-card"><h2>Final attendance review</h2>{data.placements.length ? data.placements.map(p => <details className="hte-placement" key={p.id} open={data.user.role === 'STUDENT' || Boolean(data.finalDtrReopens?.some(r=>r.placementId===p.id && r.status==='PENDING'))}><summary>{text(p,'studentName')} · {text(p,'companyName')} {num(p,'isExternal') === 1 ? '· (External Industry Partner)' : ''} · {statusLabel(text(data.finalDtrs?.find(f => f.placementId === p.id),'status')) || 'Not submitted'}</summary><FinalDtrCard data={data} placement={p} onRefresh={onRefresh}/></details>) : <p className="hte-empty">An assigned placement is needed before a final DTR can be submitted.</p>}</section>;
}

function TemplateEditor({ template,onRefresh }: { template: Row; onRefresh: () => Promise<void> }) {
 const [title,setTitle] = useState(text(template,'title')), [questions,setQuestions] = useState<EvaluationQuestion[]>(() => JSON.parse(text(template,'questionsJson')));
 const { busy,error,act } = useHteAction(onRefresh);
 const setup = {templateId:template.id,version:num(template,'version'),title,questions:questions.map(q=>({...q,options:q.options.map(o=>o.trim()).filter(Boolean)}))};
 const update = (i: number, patch: Partial<EvaluationQuestion>) => setQuestions(questions.map((q,n) => n === i ? {...q,...patch} : q));
 return <form className="hte-template-editor" onSubmit={e => { e.preventDefault(); void act('hteEvaluationPublish',setup); }}><h3>Prepare the uploaded form</h3><label>Form title<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/></label><a className="textbutton" href={`/api/hte-evaluation-template/${template.id}/file`} target="_blank" rel="noreferrer">View original PDF</a>
  {questions.map((q,i) => <fieldset className="hte-question-editor" key={q.key}><legend>Question {i+1}</legend><label>Question wording<input required maxLength={500} value={q.label} onChange={e => update(i,{label:e.target.value})}/></label><label>Answer type<select value={q.type} onChange={e => update(i,{type:e.target.value as EvaluationQuestion['type']})}><option value="text">Written answer</option><option value="rating">Rating scale</option><option value="select">Single choice</option></select></label>{q.type !== 'text' && <label>Scale labels or choices, one per line<textarea required value={q.options.join('\n')} onChange={e => update(i,{options:e.target.value.split('\n')})}/><span className="small muted">Use the exact school scale; no automatic grade is calculated.</span></label>}<label className="hte-checkbox"><input type="checkbox" checked={q.required} onChange={e => update(i,{required:e.target.checked})}/>Required answer</label><button className="textbutton" type="button" onClick={() => setQuestions(questions.filter((_,n) => n !== i))}>Remove question {i+1}</button></fieldset>)}
  {!questions.length && <p className="hte-empty">No online answer fields yet.</p>}<Failure error={error}/><div className="hte-actions"><button type="button" className="secondary" disabled={busy || questions.length >= 60} onClick={() => setQuestions([...questions,{ key:'q'+crypto.randomUUID().replaceAll('-',''),label:'',type:'text',required:true,options:[] }])}>Add question</button><button type="button" className="secondary" disabled={busy} onClick={() => void act('hteEvaluationDraft',setup)}>Save form setup</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Publish for all courses'}</button></div></form>;
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
 return <section className="hte-card school-evaluation"><div className="hte-section-heading"><div><h2><FileText size={19}/>School evaluation form</h2></div><span className="chip blue">All programs</span></div>
  {published ? <div className="hte-published-form"><HteStatus value="PUBLISHED"/><strong>{text(published,'title')}</strong><a className="textbutton" href={`/api/hte-evaluation-template/${published.id}/file`}>Download school form</a></div> : <div className="hte-form-placeholder"><FileClock size={28}/><div><h3>Waiting for evaluation form</h3></div><span className="chip orange">Awaiting document</span></div>}
  {data.user.role === 'SUPER_ADMIN' && <><label className="hte-upload secondary"><Upload size={15}/>{uploading ? 'Uploading PDF…' : 'Upload evaluation PDF'}<input type="file" accept=".pdf,application/pdf" disabled={uploading} onChange={e => {const file=e.target.files?.[0]; if(file)void upload(file,e.target);}}/></label><Failure error={error}/>{drafts.map(t => <TemplateEditor key={`${t.id}:${t.version}`} template={t} onRefresh={onRefresh}/>)}</>}
 </section>;
}

export function HteEvaluationForm({ data,placement,onRefresh }: { data: Snapshot; placement: Row; onRefresh: () => Promise<void> }) {
 const response = data.hteEvaluationResponses?.find(r => r.placementId === placement.id);
 const template = response ? data.hteEvaluationTemplates?.find(t => t.id === response.templateId) : data.hteEvaluationTemplates?.find(t => t.status === 'PUBLISHED');
 const final = data.finalDtrs?.find(r => r.placementId === placement.id);
 if (!template) return <div className="hte-form-placeholder"><FileClock size={23}/><div><h3>Waiting for evaluation form</h3></div></div>;
 if (!final || final.status !== 'VERIFIED') return <p className="hte-review-note"><LockKeyhole size={15}/> The school evaluation unlocks after the complete DTR is verified.</p>;
 return <EvaluationAnswers key={`${response?.id ?? template.id}:${response?.version ?? 0}:${final.version}`} data={data} placement={placement} template={template} response={response} final={final} onRefresh={onRefresh}/>;
}

function EvaluationAnswers({ data,placement,template,response,final,onRefresh }: { data: Snapshot; placement: Row; template: Row; response?: Row; final: Row; onRefresh: () => Promise<void> }) {
 const questions = JSON.parse(text(template,'questionsJson')) as EvaluationQuestion[];
 const [answers,setAnswers] = useState<Record<string,string>>(() => response ? JSON.parse(text(response,'answersJson')) : {});
 const [note,setNote] = useState('');
 const [evalFilename, setEvalFilename] = useState(text(response, 'attachmentFilename') || '');
 const [evalBase64, setEvalBase64] = useState(text(response, 'attachmentBase64') || '');
 const [scanningPdf, setScanningPdf] = useState(false);
 const [scanSuccess, setScanSuccess] = useState(false);
 const { busy,error,act } = useHteAction(onRefresh);

 const isExternal = num(placement, 'isExternal') === 1;
 const isStudent = data.user.role === 'STUDENT';
 const isCoordinator = data.user.role === 'COORDINATOR';
 const isSupervisor = data.user.role === 'SUPERVISOR';

 const canSupervisorAnswer = isSupervisor && (!response || ['DRAFT','REVISION_REQUESTED'].includes(text(response,'status')));
 const canStudentUpload = isStudent && isExternal && (!response || ['DRAFT','REVISION_REQUESTED'].includes(text(response,'status')));

 const save = (mode: 'DRAFT'|'SUBMIT') => void act('hteEvaluationSave',{ placementId:placement.id,templateId:template.id,finalDtrVersion:num(final,'version'),version:num(response,'version'),mode,answers });

 const handleExternalPdfSelect = async (file: File) => {
  if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 4 * 1024 * 1024) {
   toast.error('Choose a valid evaluation PDF up to 4 MB.');
   return;
  }
  setScanningPdf(true);
  setScanSuccess(false);
  try {
   const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
   });
   setEvalFilename(file.name);
   setEvalBase64(base64);

   const res = await fetch('/api/extract-evaluation-scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64: base64, questions })
   });
   if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error || 'Automated score detection could not parse this file.');
   }
   const extracted = await res.json() as { scores: Record<string, number>; narrativeRecommendation: string };
   const patched = { ...answers };
   for (const [k, score] of Object.entries(extracted.scores || {})) {
    patched[k] = String(score);
   }
   if (extracted.narrativeRecommendation) {
    const textQ = questions.find(q => q.type === 'text');
    if (textQ && !patched[textQ.key]) {
     patched[textQ.key] = extracted.narrativeRecommendation;
    }
   }
   setAnswers(patched);
   setScanSuccess(true);
   toast.success('Scores detected from PDF. Review and confirm answers below.');
  } catch (e) {
   toast.error(e instanceof Error ? e.message : 'Upload failed.');
  } finally {
   setScanningPdf(false);
  }
 };

 const submitExternalEvaluation = (e: FormEvent) => {
  e.preventDefault();
  if (!evalBase64) {
   toast.error('Please upload your signed evaluation PDF first.');
   return;
  }
  void act('externalEvaluationSubmit', {
   placementId: placement.id,
   templateId: template.id,
   finalDtrVersion: num(final, 'version'),
   version: num(response, 'version'),
   answers,
   attachmentFilename: evalFilename,
   attachmentBase64: evalBase64
  });
 };

 return <section className="hte-evaluation-form">
  <div className="hte-section-heading">
   <div>
    <h3>{text(template,'title')} {isExternal && <span className="chip purple" style={{fontSize:11,fontWeight:600}}>Offline / External Track</span>}</h3>
   </div>
   {response && <HteStatus value={text(response,'status')}/>}
  </div>

  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:14}}>
   <a className="secondary hte-download-btn" href={`/api/hte-evaluation-template/${template.id}/file`} target="_blank" rel="noreferrer">
    <Download size={14}/> Download official school evaluation PDF
   </a>
  </div>

  {response?.note && <p className="hte-review-note"><strong>Coordinator note:</strong> {text(response,'note')}</p>}
  <Failure error={error}/>

  {(response?.attachmentFilename || (canStudentUpload && evalFilename)) && (
   <div className="hte-attachment-card">
    <div className="hte-attachment-left">
     <FileText size={22} className="hte-attachment-icon" />
     <div className="hte-attachment-info">
      <span className="small muted">{canStudentUpload ? 'Attached evaluation PDF' : 'Signed school evaluation document'}</span>
      <strong>{evalFilename || text(response, 'attachmentFilename')}</strong>
      <span className="small muted">Uploaded by {text(response, 'submissionChannel') === 'EXTERNAL_UPLOAD' || canStudentUpload ? 'Student (Signed Document)' : 'Direct supervisor submission'}</span>
     </div>
    </div>
    {(evalBase64 || response?.attachmentBase64) && (
     <a href={evalBase64 || text(response, 'attachmentBase64')} download={evalFilename || text(response, 'attachmentFilename')} className="secondary hte-download-btn" target="_blank" rel="noreferrer">
      <Download size={14}/> Download PDF
     </a>
    )}
   </div>
  )}

  {canSupervisorAnswer && (
   <form className="hte-answer-form" onSubmit={(e:FormEvent) => {e.preventDefault();save('SUBMIT');}}>
    {questions.map(q => <label key={q.key}>{q.label}{!q.required && <span className="muted"> (optional)</span>}{q.type === 'text' ? <textarea required={q.required} maxLength={5000} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})}/> : <select required={q.required} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})}><option value="">Choose an answer</option>{q.options.map(o => <option key={o} value={o}>{o}</option>)}</select>}</label>)}
    <div className="hte-actions">
     <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Submit evaluation for review'}</button>
     <button className="secondary" type="button" disabled={busy} onClick={() => save('DRAFT')}>Save draft</button>
    </div>
   </form>
  )}

  {canStudentUpload && (
   <form className="hte-answer-form" onSubmit={submitExternalEvaluation}>
    <div className="hte-flow-step">
     <div className="hte-flow-step-header">
      <span className="hte-step-badge">1</span>
      <span className="hte-flow-step-title">Upload Completed & Signed Evaluation Form</span>
     </div>

     <label className="secondary hte-download-btn" style={{cursor: scanningPdf ? 'wait' : 'pointer', width:'fit-content', marginTop:6}}>
      {scanningPdf ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />}
      {scanningPdf ? 'Scanning PDF & detecting scores…' : evalFilename ? 'Replace evaluation PDF' : 'Upload signed evaluation PDF'}
      <input type="file" accept=".pdf,application/pdf" disabled={scanningPdf} style={{display:'none'}} onChange={e => { const file = e.target.files?.[0]; if (file) void handleExternalPdfSelect(file); }} />
     </label>
    </div>

    {scanningPdf && (
     <div className="hte-scanning-banner">
      <LoaderCircle size={16} className="spin" />
      <span>Analyzing document text and AcroForm fields to detect 1–5 ratings...</span>
     </div>
    )}

    {scanSuccess && (
     <div className="hte-extraction-banner">
      <Sparkles size={16} />
      <span>Ratings automatically detected from your PDF. Review and confirm each score below before submitting.</span>
     </div>
    )}

    <div className="hte-flow-step">
     <div className="hte-flow-step-header">
      <span className="hte-step-badge">2</span>
      <span className="hte-flow-step-title">Review & Confirm Evaluation Ratings</span>
     </div>


     {questions.map(q => (
      <label key={q.key} style={{marginBottom:10}}>
       {q.label}{!q.required && <span className="muted"> (optional)</span>}
       {q.type === 'text' ? (
        <textarea required={q.required} maxLength={5000} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})} placeholder="Supervisor recommendations or comments..." />
       ) : (
        <select required={q.required} value={answers[q.key] ?? ''} onChange={e => setAnswers({...answers,[q.key]:e.target.value})}>
         <option value="">Select rating / answer</option>
         {q.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
       )}
      </label>
     ))}
    </div>

    <div className="hte-actions">
     <button className="primary" disabled={busy || scanningPdf || !evalBase64}>
      {busy ? 'Submitting…' : 'Submit signed evaluation for coordinator review'}
     </button>
    </div>
   </form>
  )}

  {!canSupervisorAnswer && !canStudentUpload && response && (
   <dl className="hte-answer-receipt">
    {questions.map(q => <div key={q.key}><dt>{q.label}</dt><dd>{answers[q.key] || 'No answer'}</dd></div>)}
   </dl>
  )}

  {!canSupervisorAnswer && !canStudentUpload && !response && (
   <p className="muted">{isExternal ? 'Download the official form above, have your supervisor complete and sign it, then upload the PDF here.' : 'The assigned Industry Partner has not submitted this evaluation.'}</p>
  )}

  {isCoordinator && response?.status === 'SUBMITTED' && (
   <div className="hte-request-decision">
    <div className="hte-coordinator-notice">
     <ShieldCheck size={18} className="text-blue-700" style={{flexShrink:0,marginTop:2}} />
     <div>
      <strong>Coordinator Evaluation Review</strong>
      <p className="small muted">
       {response.attachmentBase64
        ? 'The student submitted a signed physical evaluation from their external host company. Check the ratings against the attached PDF.'
        : 'Review the online evaluation submitted by the supervisor.'}
      </p>
     </div>
    </div>
    <label>Coordinator review note <span className="muted">(optional for approval; required when requesting revision)</span>
     <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000} placeholder="Add coordinator comments or approval notes..." />
    </label>
    <div className="hte-actions">
     <button className="primary" disabled={busy} onClick={() => void act('hteEvaluationReview',{ responseId:response.id,version:num(response,'version'),decision:'APPROVED',note })}>
      <Check size={15}/>Approve and release
     </button>
     <button className="secondary" disabled={busy} onClick={() => void act('hteEvaluationReview',{ responseId:response.id,version:num(response,'version'),decision:'REVISION_REQUESTED',note })}>
      Request revision
     </button>
    </div>
   </div>
  )}
 </section>;
}

export function SchoolEvaluationReviews({ data,onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
 const ownPlacement = data.user.role === 'STUDENT' ? data.placements.find(p => p.studentId === data.user.id) : null;
 const placements = data.user.role === 'STUDENT'
   ? (ownPlacement ? [ownPlacement] : [])
   : data.placements.filter(p => data.hteEvaluationResponses?.some(r => r.placementId === p.id));
 return <section className="hte-card"><h2>School evaluation responses</h2>{placements.length ? placements.map(p => <details className="hte-placement" key={p.id} open={data.user.role === 'STUDENT'}><summary>{text(p,'studentName')} · {text(p,'companyName')} {num(p,'isExternal') === 1 ? '· (External Industry Partner)' : ''}</summary><HteEvaluationForm data={data} placement={p} onRefresh={onRefresh}/></details>) : <p className="hte-empty">{data.user.role === 'STUDENT' ? 'Your school evaluation will appear here once ready.' : 'No school evaluations have been submitted yet.'}</p>}</section>;
}
