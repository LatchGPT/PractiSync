'use client';

import { useState } from 'react';
import { BriefcaseBusiness, Building2, Clock3, LogOut, RefreshCw, Send, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { authSubmit } from './login-client';
import DtrPagination from './dtr-pagination';
import type { Row, Snapshot } from '@/packages/validation/contracts';

const text = (row: Row | undefined, key: string) => String(row?.[key] ?? '');
const numeric = (row: Row | undefined, key: string) => Number(row?.[key] ?? 0);
const badge = (value: string) => <span className={`chip ${['APPROVED', 'PUBLISHED', 'ACCEPTED'].includes(value) ? 'green' : ['PENDING', 'DRAFT', 'SUBMITTED'].includes(value) ? 'orange' : 'blue'}`}>{value.toLowerCase().replaceAll('_', ' ')}</span>;

function RubricField({ name, label }: { name: string; label: string }) {
  return <fieldset className="hte-rubric-field"><legend>{label}</legend><label>Rating<select name={`${name}Score`} defaultValue="3">{[1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score} / 5</option>)}</select></label><label>Evidence<textarea required name={`${name}Evidence`} maxLength={1000} /></label></fieldset>;
}

function DtrEntryHistory({ entries, onConfirm }: { entries: Row[]; onConfirm: (entry: Row) => void }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = entries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <>
    <ul className="hte-times">{pageEntries.map(entry => <li key={entry.id}>{text(entry, 'date')} · {text(entry, 'startsAt')}–{text(entry, 'endsAt')} · {numeric(entry, 'minutes')} minutes · {entry.confirmedVersion === entry.version ? 'Confirmed' : 'Reported'}{entry.confirmedVersion !== entry.version && <button type="button" className="textbutton" onClick={() => onConfirm(entry)}>Confirm time only</button>}</li>)}</ul>
    {entries.length === 0 && <p className="small muted">No DTR logs are recorded for this placement yet.</p>}
    <DtrPagination page={currentPage} pageSize={pageSize} totalItems={entries.length} itemLabel="DTRs" onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
  </>;
}
export default function SupervisorPortal({ data, onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
  const company = data.companies.find(item => item.id === data.user.companyId);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(() => ({ name: text(company, 'name'), industry: text(company, 'industry'), location: text(company, 'location'), description: text(company, 'description') }));
  const [post, setPost] = useState({ title: '', description: '', location: '', courseId: '', skills: '', openings: '1' });

  async function act(action: string, values: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, values }) });
      if (response.status === 401) { location.replace('/login?redirect=' + encodeURIComponent(location.pathname + location.search)); return false; }
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? 'The request could not be completed.');
      toast.success(result.message ?? 'Saved.');
      await onRefresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The request could not be completed.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await authSubmit('signout', {}, '/');
      location.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign out failed.');
    }
  }

  const canPost = Boolean(company && company.status === 'APPROVED' && numeric(company, 'canPost') === 1);
  return <main className="hte-portal">
    <header className="hte-header"><div className="brand"><span className="brand-icon">PS</span><span>PractiSync<span style={{ color: '#d7aa3e' }}>.</span></span></div><div className="hte-account"><span>{data.user.name} · HTE Supervisor</span><button className="secondary" onClick={() => void onRefresh()} disabled={busy}><RefreshCw size={15} />Refresh</button><button className="secondary" onClick={() => void signOut()}><LogOut size={15} />Sign out</button></div></header>
    <section className="hte-intro"><span className="chip blue"><ShieldCheck size={13} />Limited external partner access</span><h1>{company ? text(company, 'name') : 'Company profile'}</h1><p>This workspace provides access only to your company’s approved posts, applicants, assigned placements, time-only DTR confirmations, and privacy-protected student feedback.</p></section>

    {(!company || company.status === 'REJECTED') && <section className="hte-card"><h2>{company ? 'Revise your company profile' : 'Create your company profile'}</h2><p className="muted">The university must verify the profile before your account can post or view assigned placement records.</p><form className="hte-form" onSubmit={event => { event.preventDefault(); void act('companyProfile', profile).then(ok => { if (ok) setProfile({ name: '', industry: '', location: '', description: '' }); }); }}>
      <label>Company name<input required maxLength={160} value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} /></label><label>Industry<input required maxLength={120} value={profile.industry} onChange={event => setProfile({ ...profile, industry: event.target.value })} /></label><label>Location<input required maxLength={240} value={profile.location} onChange={event => setProfile({ ...profile, location: event.target.value })} /></label><label>Company description<textarea required maxLength={2000} value={profile.description} onChange={event => setProfile({ ...profile, description: event.target.value })} /></label><button className="primary" disabled={busy}><Building2 size={15} />Submit for verification</button>
    </form></section>}

    {company && company.status === 'PENDING' && <section className="hte-notice"><Building2 size={18} /><div><strong>University verification pending</strong><p>Your company profile is not public and posting remains unavailable until the university verifies it.</p></div>{badge(text(company, 'status'))}</section>}

    {company && <>
      {canPost && <section className="hte-card"><h2>Create an internship post</h2><p className="muted">The university reviews every post before students can see it.</p><form className="hte-form" onSubmit={event => { event.preventDefault(); void act('job', { ...post, openings: Number(post.openings) }).then(ok => { if (ok) setPost({ title: '', description: '', location: '', courseId: '', skills: '', openings: '1' }); }); }}>
        <label>Position title<input required maxLength={160} value={post.title} onChange={event => setPost({ ...post, title: event.target.value })} /></label><label>Target course<select required value={post.courseId} onChange={event => setPost({ ...post, courseId: event.target.value })}><option value="">Choose a course</option>{data.courses.map(course => <option key={course.id} value={course.id}>{text(course, 'code')} · {text(course, 'name')}</option>)}</select></label><label>Location<input required maxLength={160} value={post.location} onChange={event => setPost({ ...post, location: event.target.value })} /></label><label>Openings<input required type="number" min="1" max="1000" value={post.openings} onChange={event => setPost({ ...post, openings: event.target.value })} /></label><label>Skills<input required maxLength={400} value={post.skills} onChange={event => setPost({ ...post, skills: event.target.value })} placeholder="Comma-separated" /></label><label className="hte-full">Description<textarea required maxLength={8000} value={post.description} onChange={event => setPost({ ...post, description: event.target.value })} /></label><button className="primary" disabled={busy}><Send size={15} />Submit post for review</button>
      </form></section>}

      <div className="hte-grid">
        <section className="hte-card"><h2><BriefcaseBusiness size={18} />Your internship posts</h2>{data.jobs.length ? <div className="hte-list">{data.jobs.map(job => <article key={job.id}><div><strong>{text(job, 'title')}</strong><p>{text(job, 'location')} · {job.openings} openings</p></div>{badge(text(job, 'status'))}</article>)}</div> : <p className="muted">No posts yet.</p>}</section>
        <section className="hte-card"><h2><Users size={18} />Applicants to your posts</h2>{data.applications.length ? <div className="hte-list">{data.applications.map(application => <article key={application.id}><div><strong>{text(application, 'studentName')}</strong><p>{text(application, 'title')} · Submitted {new Date(text(application, 'createdAt')).toLocaleDateString()}</p><details><summary>View application</summary><p>{text(application, 'coverLetter')}</p></details></div><div className="hte-actions">{badge(text(application, 'status'))}{application.status === 'SUBMITTED' && <><button className="primary" disabled={busy} onClick={() => void act('selectApplication', { applicationId: application.id, decision: 'SHORTLISTED' })}>Select</button><button className="secondary" disabled={busy} onClick={() => void act('selectApplication', { applicationId: application.id, decision: 'REJECTED' })}>Decline</button></>}</div></article>)}</div> : <p className="muted">There are no applications for your company’s posts.</p>}</section>
        <section className="hte-card"><h2><Clock3 size={18} />Assigned placements and time</h2>{data.placements.length ? <div className="hte-list">{data.placements.map(placement => { const ownEvaluation = data.evaluations.find(item => item.placementId === placement.id); return <article key={placement.id}><div><strong>{text(placement, 'studentName')}</strong><p>{text(placement, 'courseCode')} · {text(placement, 'period')}</p><DtrEntryHistory entries={data.entries.filter(entry => entry.placementId === placement.id)} onConfirm={entry => void act('confirm', { entryId: entry.id, version: numeric(entry, 'version') })} />{ownEvaluation && ownEvaluation.status !== 'REVISION_REQUESTED' ? <p className="hte-evaluation-receipt">Your final evaluation is {text(ownEvaluation, 'status').toLowerCase().replaceAll('_', ' ')}.{ownEvaluation.reviewNote ? ` Coordinator note: ${text(ownEvaluation, 'reviewNote')}` : ''}</p> : <details className="hte-evaluation-form"><summary>{ownEvaluation ? 'Revise requested evaluation' : 'Submit final competency evaluation'}</summary><form className="hte-form" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const scores = { technicalSkills: { score: Number(values.get('technicalSkillsScore')), evidence: String(values.get('technicalSkillsEvidence') ?? '') }, communication: { score: Number(values.get('communicationScore')), evidence: String(values.get('communicationEvidence') ?? '') }, professionalism: { score: Number(values.get('professionalismScore')), evidence: String(values.get('professionalismEvidence') ?? '') }, problemSolving: { score: Number(values.get('problemSolvingScore')), evidence: String(values.get('problemSolvingEvidence') ?? '') } }; void act('industryFinalEvaluation', { placementId: placement.id, scores }); }}><RubricField name="technicalSkills" label="Technical skills" /><RubricField name="communication" label="Communication" /><RubricField name="professionalism" label="Professionalism" /><RubricField name="problemSolving" label="Problem solving" /><button className="primary" disabled={busy}>Submit for university review</button></form></details>}</div>{badge(text(placement, 'status'))}</article>; })}</div> : <p className="muted">No active placements are assigned to your account.</p>}</section>
        <section className="hte-card"><h2><ShieldCheck size={18} />Student feedback about your company</h2>{data.reviews.length ? <><p className="muted">Anonymous comments are shown only after at least five distinct placements in the same academic period have approved reviews.</p><div className="hte-list">{data.reviews.map(review => <article key={review.id}><div><strong>{numeric(review, 'rating')}/5</strong><p>{text(review, 'body')}</p></div></article>)}</div></> : <p className="muted">Feedback is hidden until the privacy threshold is met. University staff can review identified responses.</p>}</section>
      </div>
    </>}
  </main>;
}
