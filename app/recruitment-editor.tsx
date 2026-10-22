'use client';

import { useRef, useState } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import type { Row, Snapshot } from '@/packages/validation/contracts';
import { recruitmentCourseIds } from '@/packages/validation/recruitment';
import { useHteAction } from './hte-workflows';

const text = (row: Row | undefined, key: string) => String(row?.[key] ?? '');

export default function RecruitmentPostEditor({ data, job, onRefresh, onSaved }: { data: Snapshot; job?: Row; onRefresh: () => Promise<void>; onSaved?: () => void }) {
 const companies = data.companies.filter(company => company.status === 'APPROVED' && Number(company.canPost) === 1);
 const courses = data.courses.filter(course => data.user.role !== 'COORDINATOR' || data.classes.some(cls => cls.courseId === course.id));
 const [values, setValues] = useState(() => ({ title:text(job,'title'), description:text(job,'description'), location:text(job,'location'), skills:text(job,'skills'), openings:String(job?.openings ?? 1), companyId:data.user.companyId ?? companies[0]?.id ?? '' }));
 const [courseIds, setCourseIds] = useState<string[]>(() => job ? recruitmentCourseIds(job) : []);
 const [programError, setProgramError] = useState('');
 const group = useRef<HTMLFieldSetElement>(null);
 const { busy, error, act } = useHteAction(onRefresh);
 return <form className="hte-form recruitment-post-form" onSubmit={event => {
  event.preventDefault();
  if (!courseIds.length) { setProgramError('Select at least one required program or course.'); group.current?.focus(); return; }
  void act(job ? 'hteJobChange' : 'job', { ...values, courseId:courseIds[0], courseIds, openings:Number(values.openings), ...(job ? { jobId:job.id, version:Number(job.version) } : {}) }).then(ok => {
   if (!ok) return;
   if (!job) { setValues(current => ({ ...current, title:'', description:'', location:'', skills:'', openings:'1' })); setCourseIds([]); }
   onSaved?.();
  });
 }}>
  {data.user.role !== 'SUPERVISOR' && <label className="hte-full">Industry Partner<select required value={values.companyId} onChange={event => setValues({ ...values, companyId:event.target.value })}><option value="">Choose an approved partner</option>{companies.map(company => <option key={company.id} value={company.id}>{text(company,'name')}</option>)}</select></label>}
  <label>Position title<input required maxLength={160} value={values.title} onChange={event => setValues({ ...values, title:event.target.value })}/></label>
  <label>Number of interns needed<input required type="number" min={1} max={1000} step={1} value={values.openings} onChange={event => setValues({ ...values, openings:event.target.value })}/></label>
  <fieldset className="recruitment-programs hte-full" ref={group} tabIndex={-1} aria-describedby={programError ? 'recruitment-program-error' : undefined}><legend>Required programs / courses</legend><p className="small muted">Select every program eligible to apply.</p><div>{courses.map(course => <label className="hte-checkbox" key={course.id}><input type="checkbox" checked={courseIds.includes(course.id)} onChange={event => { setCourseIds(current => event.target.checked ? [...current, course.id] : current.filter(id => id !== course.id)); setProgramError(''); }}/><span>{text(course,'code')} · {text(course,'name')}</span></label>)}</div>{!courses.length && <p className="muted">No programs are available. University staff must configure a program first.</p>}{programError && <p className="hte-error" role="alert" id="recruitment-program-error">{programError}</p>}</fieldset>
  <label className="hte-full">Location / work arrangement<input required maxLength={160} value={values.location} placeholder="City and on-site, hybrid, or remote…" onChange={event => setValues({ ...values, location:event.target.value })}/></label>
  <label className="hte-full">Required skills<input required maxLength={400} value={values.skills} placeholder="Separate skills with commas…" onChange={event => setValues({ ...values, skills:event.target.value })}/></label>
  <label className="hte-full">Responsibilities and requirements<textarea required maxLength={8000} value={values.description} onChange={event => setValues({ ...values, description:event.target.value })}/></label>
  {error && <p className="hte-error hte-full" role="alert">{error}</p>}
  <p className="small muted hte-full">Students see the approved version. New posts, edits, and closures require approval.</p>
  <button className="primary" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin"/> : <Send size={15}/>} {busy ? 'Submitting…' : job ? 'Request post changes' : 'Submit post for approval'}</button>
 </form>;
}
