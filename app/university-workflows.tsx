'use client';

import { useMemo, useState } from 'react';
import { Check, Clipboard, FileCheck2, Link2, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import {SchoolEvaluationReviews} from './hte-workflows';
import type { Action, Row, Snapshot } from '@/packages/validation/contracts';

const text = (row: Row | undefined, key: string) => String(row?.[key] ?? '');

async function send(action: Action, values: Record<string, string | number>) {
  const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, values }) });
  const result = await response.json() as { error?: string; message?: string; id?: string; url?: string; accessCode?: string; expiresAt?: string };
  if (!response.ok) throw new Error(result.error ?? 'The request could not be completed.');
  return result;
}

export function UniversityWorkflowPanel({ data, onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
  const [busyId, setBusyId] = useState('');
  const [applicationClasses, setApplicationClasses] = useState<Record<string, string>>({});
  const [evaluationNotes, setEvaluationNotes] = useState<Record<string, string>>({});
  const [starts, setStarts] = useState('2026-08-01');
  const [ends, setEnds] = useState('2026-12-20');
  const [host, setHost] = useState({ studentId: '', classId: '', companyName: '', industry: '', location: '', description: '', supervisorName: '', supervisorEmail: '', startsAt: '2026-08-01', endsAt: '2026-12-20' });
  const [newLink, setNewLink] = useState<{ url: string; accessCode: string; expiresAt: string } | null>(null);
  const students = useMemo(() => data.users.filter(user => user.role === 'STUDENT'), [data.users]);

  async function run(id: string, action: Action, values: Record<string, string | number>) {
    setBusyId(id);
    try {
      const result = await send(action, values);
      toast.success(result.message ?? 'Saved.');
      if (action === 'guestEvaluationLink' && result.url && result.accessCode && result.expiresAt) setNewLink({ url: new URL(result.url, location.origin).href, accessCode: result.accessCode, expiresAt: result.expiresAt });
      await onRefresh();
      return result;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The request could not be completed.'); return null; }
    finally { setBusyId(''); }
  }

  const pendingCompanies = data.companies.filter(company => company.status === 'PENDING' && !data.hteRequests?.some(r=>r.resourceId===company.id && r.status==='PENDING'));
  const coordinatorCourses = new Set(data.classes.map(item => text(item, 'courseId')));
  const pendingPosts = data.jobs.filter(job => job.status === 'DRAFT' && !data.hteRequests?.some(r=>r.resourceId===job.id && r.status==='PENDING') && (data.user.role !== 'COORDINATOR' || coordinatorCourses.has(text(job, 'courseId'))));
  const selectedApplications = data.applications.filter(application => application.status === 'SHORTLISTED');
  const plannedPlacements = data.placements.filter(placement => text(placement, 'status') === 'PLANNED');
  const privateHosts = data.privateHosts ?? [];
  const activePlacements = data.placements.filter(placement => ['ACTIVE', 'COMPLETED'].includes(text(placement, 'status')));
  const pendingFinalEvaluations = data.evaluations.filter(evaluation => evaluation.kind === 'FINAL' && evaluation.status === 'SUBMITTED' && (evaluation.evaluatorRole === 'SUPERVISOR' || String(evaluation.evaluatorId ?? '').startsWith('guest:')));

  return <section className="university-workflows">
    {data.user.role === 'SUPER_ADMIN' && <section className="hte-card"><h2><Building2Icon />Company profiles awaiting verification</h2>{pendingCompanies.length ? pendingCompanies.map(company => <article className="workflow-row" key={company.id}><div><strong>{text(company, 'name')}</strong><p>{text(company, 'industry')} · {text(company, 'location')}</p><p>{text(company, 'description')}</p></div><div className="hte-actions"><button className="primary" disabled={!!busyId} onClick={() => void run(company.id, 'companyVerification', { companyId: company.id, decision: 'APPROVE' })}><Check size={14} />Verify</button><button className="secondary" disabled={!!busyId} onClick={() => void run(company.id, 'companyVerification', { companyId: company.id, decision: 'REJECT' })}><X size={14} />Decline</button></div></article>) : <p className="muted">No company profiles are waiting for verification.</p>}</section>}

    {data.user.role === 'SUPER_ADMIN' && <section className="hte-card"><h2><FileCheck2 size={18} />Internship posts awaiting approval</h2>{pendingPosts.length ? pendingPosts.map(job => <article className="workflow-row" key={job.id}><div><strong>{text(job, 'title')}</strong><p>{text(job, 'companyName')} · {text(job, 'courseId')} · {text(job, 'location')}</p><p>{text(job, 'description')}</p></div><div className="hte-actions"><button className="primary" disabled={!!busyId} onClick={() => void run(job.id, 'jobReview', { jobId: job.id, decision: 'APPROVE' })}><Check size={14} />Approve post</button><button className="secondary" disabled={!!busyId} onClick={() => void run(job.id, 'jobReview', { jobId: job.id, decision: 'REJECT', note: 'Please revise this post and resubmit.' })}><X size={14} />Decline</button></div></article>) : <p className="muted">No posts are waiting for approval.</p>}</section>}

    {data.user.role === 'COORDINATOR' && <><SchoolEvaluationReviews data={data} onRefresh={onRefresh}/>
      <section className="hte-card"><h2><ShieldCheck size={18} />HTE selections awaiting university confirmation</h2>{selectedApplications.length ? selectedApplications.map(application => {
        const courseId = text(application, 'courseId') || text(data.jobs.find(job => job.id === application.jobId), 'courseId');
        const classes = data.classes.filter(item => item.courseId === courseId);
        const classId = applicationClasses[application.id] || classes[0]?.id || '';
        return <article className="workflow-row" key={application.id}><div><strong>{text(application, 'studentName')} · {text(application, 'title')}</strong><p>HTE-selected candidate. The placement is not active until the university confirms dates and class.</p><label>Class<select value={classId} onChange={event => setApplicationClasses(current => ({ ...current, [application.id]: event.target.value }))}>{classes.map(item => <option key={item.id} value={item.id}>{text(item, 'section')}</option>)}</select></label><div className="workflow-dates"><label>Start<input type="date" value={starts} onChange={event => setStarts(event.target.value)} /></label><label>End<input type="date" value={ends} onChange={event => setEnds(event.target.value)} /></label></div></div><button className="primary" disabled={!!busyId || !classes.length} onClick={() => void run(application.id, 'confirmPlacement', { applicationId: application.id, classId, startsAt: starts, endsAt: ends })}><Check size={14} />Confirm placement</button></article>;
      }) : <p className="muted">No HTE selections are waiting for university confirmation.</p>}</section>

      <section className="hte-card"><h2><ShieldCheck size={18} />Placements ready to start</h2><p className="muted">A coordinator activates a placement on or after its start date. Students can submit DTR after activation.</p>{plannedPlacements.length ? plannedPlacements.map(placement => { const startsAt = text(placement, 'startsAt').slice(0, 10); const canActivate = startsAt <= new Date().toISOString().slice(0, 10); return <article className="workflow-row" key={placement.id}><div><strong>{text(placement, 'studentName')} · {text(placement, 'companyName')}</strong><p>{text(placement, 'courseCode')} · Starts {startsAt} · Ends {text(placement, 'endsAt').slice(0, 10)}</p></div>{canActivate ? <button className="primary" disabled={!!busyId} onClick={() => void run(placement.id, 'activatePlacement', { placementId: placement.id })}><Check size={14} />Activate placement</button> : <span className="small muted">Activation opens on the start date.</span>}</article>; }) : <p className="muted">No planned placements are waiting to start.</p>}</section>

      <section className="hte-card"><h2><Link2 size={18} />Evaluation access for an HTE without a profile</h2><p className="muted">For an off-platform placement, keep the host record private and issue a one-time link. Send its access code through a separate channel.</p>
        <form className="hte-form" onSubmit={event => { event.preventDefault(); void run('private-host', 'privateHost', host).then(result => { if (result) setHost({ ...host, companyName: '', industry: '', location: '', description: '', supervisorName: '', supervisorEmail: '' }); }); }}>
          <label>Student<select required value={host.studentId} onChange={event => setHost({ ...host, studentId: event.target.value })}><option value="">Choose a student</option>{students.map(student => <option key={student.id} value={student.id}>{text(student, 'name')}</option>)}</select></label><label>Class<select required value={host.classId} onChange={event => setHost({ ...host, classId: event.target.value })}><option value="">Choose your class</option>{data.classes.map(item => <option key={item.id} value={item.id}>{text(item, 'section')}</option>)}</select></label>
          <label>Company name<input required value={host.companyName} onChange={event => setHost({ ...host, companyName: event.target.value })} /></label><label>Industry<input required value={host.industry} onChange={event => setHost({ ...host, industry: event.target.value })} /></label><label>Location<input required value={host.location} onChange={event => setHost({ ...host, location: event.target.value })} /></label><label>Supervisor name<input required value={host.supervisorName} onChange={event => setHost({ ...host, supervisorName: event.target.value })} /></label><label>Supervisor email<input required type="email" value={host.supervisorEmail} onChange={event => setHost({ ...host, supervisorEmail: event.target.value })} /></label><label>Placement start<input required type="date" value={host.startsAt} onChange={event => setHost({ ...host, startsAt: event.target.value })} /></label><label>Placement end<input required type="date" value={host.endsAt} onChange={event => setHost({ ...host, endsAt: event.target.value })} /></label><label className="hte-full">Private host description<input required value={host.description} onChange={event => setHost({ ...host, description: event.target.value })} /></label><button className="primary" disabled={!!busyId}>Create private host record</button>
        </form>
        <div className="hte-list">{privateHosts.length ? privateHosts.map(item => <article key={item.id}><div><strong>{text(item, 'studentName')} · {text(item, 'companyName')}</strong><p>{text(item, 'courseCode')} · {text(item, 'period')} · {text(item, 'status')}</p><p>Private HTE contact: {text(item, 'supervisorName')} · {text(item, 'supervisorEmail')}</p></div></article>) : <p className="muted">No private host contacts are recorded for your classes.</p>}</div>
      </section>

      <section className="hte-card"><h2><Link2 size={18} />Guest evaluation links</h2>{newLink && <div className="guest-link-receipt"><strong>Copy these now—the access code will not be shown again.</strong><p>Link: <a href={newLink.url}>{newLink.url}</a></p><p>Separate access code: <code>{newLink.accessCode}</code></p><small>Expires {new Date(newLink.expiresAt).toLocaleString()}</small><button className="secondary" onClick={async () => { await navigator.clipboard.writeText(newLink.url); toast.success('Evaluation link copied.'); }}><Clipboard size={14} />Copy link</button></div>}
        {activePlacements.length ? activePlacements.map(placement => <article className="workflow-row" key={placement.id}><div><strong>{text(placement, 'studentName')}</strong><p>{text(placement, 'companyName')} · {text(placement, 'courseCode')} · {text(placement, 'period')}</p></div><button className="secondary" disabled={!!busyId} onClick={() => void run(placement.id, 'guestEvaluationLink', { placementId: placement.id, expiresInDays: 7 })}>Issue 7-day link</button></article>) : <p className="muted">No placements are available in your coordinator scope.</p>}
        {(data.guestEvaluationLinks ?? []).filter(link => !link.usedAt && !link.revokedAt).map(link => <article className="workflow-row" key={link.id}><div><strong>{text(link, 'studentName')}</strong><p>Active link expires {new Date(text(link, 'expiresAt')).toLocaleString()}</p></div><button className="secondary" disabled={!!busyId} onClick={() => void run(link.id, 'revokeGuestEvaluationLink', { linkId: link.id })}>Revoke</button></article>)}
      </section>

      <section className="hte-card"><h2><ShieldCheck size={18} />Final HTE evaluations awaiting review</h2>{pendingFinalEvaluations.length ? pendingFinalEvaluations.map(evaluation => { const placement = data.placements.find(item => item.id === evaluation.placementId); const guestHost = privateHosts.find(item => item.placementId === evaluation.placementId); const evaluatorName = text(evaluation, 'evaluatorName') || text(guestHost, 'supervisorName') || 'Guest HTE evaluator'; return <article className="workflow-row" key={evaluation.id}><div><strong>{text(placement, 'studentName')} · Final HTE rubric</strong><p>{text(placement, 'companyName')} · {evaluatorName} · Version {text(evaluation, 'frameworkVersion')}</p>{data.scores.filter(score => score.evaluationId === evaluation.id).map(score => <p key={score.id}>{text(score, 'dimension')}: {text(score, 'score')}/5 · {text(score, 'evidenceNote')}</p>)}<label>Coordinator note<textarea value={evaluationNotes[evaluation.id] ?? ''} onChange={event => setEvaluationNotes(current => ({ ...current, [evaluation.id]: event.target.value }))} maxLength={1000} /></label></div><div className="hte-actions"><button className="primary" disabled={!!busyId} onClick={() => void run(evaluation.id, 'evaluationReview', { evaluationId: evaluation.id, decision: 'APPROVED' })}><Check size={14} />Approve and release</button><button className="secondary" disabled={!!busyId || !evaluationNotes[evaluation.id]?.trim()} onClick={() => void run(evaluation.id, 'evaluationReview', { evaluationId: evaluation.id, decision: 'REVISION_REQUESTED', note: evaluationNotes[evaluation.id] })}>Request revision</button></div></article>; }) : <p className="muted">No final HTE evaluations are waiting for review.</p>}</section>

      <section className="hte-card"><h2><FileCheck2 size={18} />Completion forms awaiting review</h2>{data.placements.filter(placement => (data.completionResponses ?? []).some(response => response.placementId === placement.id && ['FINAL_SELF_ASSESSMENT', 'OJT_EXIT_SURVEY'].includes(text(response, 'formType')))).map(placement => {
        const responses = (data.completionResponses ?? []).filter(response => response.placementId === placement.id && ['FINAL_SELF_ASSESSMENT', 'OJT_EXIT_SURVEY'].includes(text(response, 'formType')));
        const finalDtr = data.finalDtrs?.find(f=>f.placementId===placement.id && f.status==='VERIFIED');
        const hteApproved = finalDtr && data.hteEvaluationResponses?.some(r=>r.placementId===placement.id && r.finalDtrVersion===finalDtr.version && r.status==='APPROVED');
        const allForms = Boolean(hteApproved) && ['FINAL_SELF_ASSESSMENT', 'OJT_EXIT_SURVEY'].every(type => responses.some(response => response.formType === type && ['SUBMITTED', 'APPROVED'].includes(text(response, 'status'))));
        const received = responses.filter(response => ['SUBMITTED', 'APPROVED'].includes(text(response, 'status'))).length;
        return <article className="workflow-row" key={placement.id}><div><strong>{text(placement, 'studentName')} · {received}/2 forms received</strong>{responses.map(response => <details key={response.id}><summary>{text(response, 'formType').replaceAll('_', ' ')} · {text(response, 'status')}</summary><pre>{JSON.stringify(JSON.parse(text(response, 'responseJson') || '{}'), null, 2)}</pre>{text(response, 'reviewNote') && <p>{text(response, 'reviewNote')}</p>}</details>)}</div><div className="hte-actions"><button className="primary" disabled={!!busyId || !allForms} onClick={() => void run(placement.id, 'completionDecision', { placementId: placement.id, decision: 'APPROVE' })}><Check size={14} />Approve completion</button>{!allForms && <span className="small muted">Both student forms, verified final DTR, and an approved school HTE evaluation are required.</span>}</div></article>;
      })}{!data.placements.some(placement => (data.completionResponses ?? []).some(response => response.placementId === placement.id && ['FINAL_SELF_ASSESSMENT', 'OJT_EXIT_SURVEY'].includes(text(response, 'formType')))) && <p className="muted">No student completion forms have been submitted yet.</p>}</section>
    </>}
  </section>;
}

function Building2Icon() { return <ShieldCheck size={18}/>; }
