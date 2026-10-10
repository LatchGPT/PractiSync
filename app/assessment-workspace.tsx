'use client';

import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Action, Row, Snapshot } from '@/packages/validation/contracts';
import { assessmentPeriod, cadenceAllows, manilaToday, type AssessmentCadence, type AssessmentKind } from '@/packages/domain/assessment-period';

const dimensions = [
  ['Technical skills', 'technical'],
  ['Communication', 'communication'],
  ['Professionalism', 'professionalism'],
  ['Problem solving', 'problemSolving'],
] as const;
const text = (row: Row, key: string) => String(row[key] ?? '');
const number = (row: Row, key: string) => Number(row[key] ?? 0);
const kindLabel = (kind: string) => kind === 'WEEKLY' ? 'Weekly' : 'Monthly';
const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const periodLabel = (row: Row) => `${dateLabel(text(row, 'periodStart'))} – ${dateLabel(text(row, 'periodEnd'))}`;
type Ratings = Record<(typeof dimensions)[number][1], number>;
const defaultRatings = (): Ratings => ({ technical: 3, communication: 3, professionalism: 3, problemSolving: 3 });

function PeriodDtr({ entries, start, end }: { entries: Row[]; start: string; end: string }) {
  const periodEntries = entries.filter(entry => text(entry, 'date') >= start && text(entry, 'date') <= end).sort((a, b) => text(a, 'date').localeCompare(text(b, 'date')));
  const reported = periodEntries.reduce((sum, entry) => sum + number(entry, 'minutes'), 0);
  const confirmed = periodEntries.filter(entry => entry.confirmedVersion === entry.version).reduce((sum, entry) => sum + number(entry, 'minutes'), 0);
  return <section className="assessment-context" aria-label="Daily attendance context">
    <h3>Daily training context</h3>
    <p className="small muted">Read-only DTR records for {dateLabel(start)} – {dateLabel(end)}. These do not set competency scores.</p>
    <div className="assessment-context-totals"><strong>{periodEntries.length} entries</strong><span>{(reported / 60).toFixed(1)} reported hours</span><span>{(confirmed / 60).toFixed(1)} confirmed hours</span></div>
    <div className="assessment-narratives">{periodEntries.length ? periodEntries.map(entry => <div key={entry.id}><strong>{dateLabel(text(entry, 'date'))}</strong><p>{text(entry, 'narrative')}</p></div>) : <p className="small muted">No daily DTR entries are recorded for this period.</p>}</div>
  </section>;
}

function AssessmentHistory({ rows, scores, placements, onRevise }: { rows: Row[]; scores: Row[]; placements: Row[]; onRevise?: (row: Row) => void }) {
  return <div className="assessment-history">{rows.length ? rows.map(row => {
    const placement = placements.find(item => item.id === row.placementId);
    return <article key={row.id} className="assessment-history-row">
      <div><strong>{placement ? text(placement, 'studentName') : 'Student'} · {kindLabel(text(row, 'kind'))}</strong><span>{periodLabel(row)} · Version {row.version}</span></div>
      <div className="assessment-history-scores">{dimensions.map(([label]) => <span key={label}>{label}: {scores.find(score => score.evaluationId === row.id && score.dimension === label)?.score ?? '—'}/5</span>)}</div>
      <span className={`chip ${row.status === 'APPROVED' ? 'green' : row.status === 'REVISION_REQUESTED' ? 'orange' : 'blue'}`}>{text(row, 'status').replaceAll('_', ' ').toLowerCase()}</span>
      {row.reviewNote && <p className="assessment-review-note">Coordinator note: {text(row, 'reviewNote')}</p>}
      {onRevise && row.status === 'REVISION_REQUESTED' && <button className="secondary" onClick={() => onRevise(row)}>Revise this assessment</button>}
    </article>;
  }) : <p className="small muted">No period assessments yet.</p>}</div>;
}

export default function AssessmentWorkspace({ data, onAction }: { data: Snapshot; onAction: (action: Action, values: Record<string, string | number>) => Promise<void> }) {
  const { user } = data;
  const ownedClasses = data.classes.filter(item => item.coordinatorId === user.id);
  const ownedCourses = [...new Set(ownedClasses.map(item => text(item, 'courseId')))];
  const [courseId, setCourseId] = useState(ownedCourses[0] ?? '');
  const [cadenceDraft, setCadenceDraft] = useState<{ courseId: string; value: AssessmentCadence } | null>(null);
  const [requestedKind, setRequestedKind] = useState<AssessmentKind>('WEEKLY');
  const [date, setDate] = useState(manilaToday);
  const [ratingsDraft, setRatingsDraft] = useState<{ key: string; values: Ratings } | null>(null);
  const [reviewId, setReviewId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);

  const placement = data.placements.find(item => item.studentId === user.id);
  const selectedCourse = user.role === 'STUDENT' ? text(placement ?? data.courses[0], 'courseId') || user.courseId || '' : courseId;
  const schedule = data.assessmentSchedules.find(item => item.courseId === selectedCourse);
  const cadence = cadenceDraft?.courseId === selectedCourse ? cadenceDraft.value : (schedule?.cadence as AssessmentCadence) ?? 'WEEKLY';
  const assessments = data.evaluations.filter(item => ['WEEKLY', 'MONTHLY'].includes(text(item, 'kind')));
  const studentAssessments = assessments.filter(item => item.placementId === placement?.id);
  const allowedKinds = (['WEEKLY', 'MONTHLY'] as const).filter(value => (schedule && cadenceAllows(schedule.cadence as AssessmentCadence, value)) || studentAssessments.some(item => item.kind === value && item.status === 'REVISION_REQUESTED'));
  const kind = allowedKinds.includes(requestedKind) ? requestedKind : allowedKinds[0] ?? 'WEEKLY';
  let period: { start: string; end: string } | null = null;
  try { period = assessmentPeriod(kind, date); } catch { /* Invalid date is handled in the form. */ }
  const existing = studentAssessments.find(item => item.kind === kind && item.periodStart === period?.start);
  const assessmentKey = existing ? `${existing.id}:${existing.version}` : `${kind}:${period?.start ?? date}`;
  const storedRatings = existing ? Object.fromEntries(dimensions.map(([label, key]) => [key, Number(data.scores.find(score => score.evaluationId === existing.id && score.dimension === label)?.score ?? 3)])) as Ratings : defaultRatings();
  const ratings = ratingsDraft?.key === assessmentKey ? ratingsDraft.values : storedRatings;

  const visiblePlacements = user.role === 'STUDENT' ? data.placements.filter(item => item.id === placement?.id) : data.placements.filter(item => !courseId || item.courseId === courseId);
  const visible = assessments.filter(item => visiblePlacements.some(p => p.id === item.placementId)).sort((a, b) => text(b, 'periodStart').localeCompare(text(a, 'periodStart')) || text(b, 'createdAt').localeCompare(text(a, 'createdAt')));
  const legacy = data.evaluations.filter(item => ['BASELINE', 'FINAL'].includes(text(item, 'kind')) && visiblePlacements.some(p => p.id === item.placementId));
  const selectedReview = visible.find(item => item.id === reviewId && item.status === 'SUBMITTED') ?? visible.find(item => item.status === 'SUBMITTED');
  const reviewPlacement = visiblePlacements.find(item => item.id === selectedReview?.placementId);
  const trend = (() => {
    const groups = new Map<string, { label: string; start: string; total: number; count: number }>();
    for (const item of visible.filter(row => row.status === 'APPROVED')) {
      const key = `${item.kind}-${item.periodStart}`;
      const values = data.scores.filter(score => score.evaluationId === item.id).map(score => number(score, 'score'));
      if (!values.length) continue;
      const group = groups.get(key) ?? { label: `${item.kind === 'WEEKLY' ? 'W' : 'M'} ${dateLabel(text(item, 'periodStart'))}`, start: text(item, 'periodStart'), total: 0, count: 0 };
      group.total += values.reduce((sum, value) => sum + value, 0) / values.length;
      group.count++;
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.start.localeCompare(b.start)).slice(-12).map(group => ({ label: group.label, score: Number((group.total / group.count).toFixed(2)) }));
  })();

  async function run(action: Action, values: Record<string, string | number>) {
    setBusy(true);
    try { await onAction(action, values); } finally { setBusy(false); }
  }

  return <div className="assessment-workspace">
    <div className="notice"><span>Period competency assessments use the fictional 1–5 rubric. Weekly and monthly periods follow Philippine calendar dates. Older baseline/final records remain in history.</span></div>
    {user.role === 'COORDINATOR' && <section className="panel"><div className="panel-head"><div><h2>Course assessment schedule</h2><p>Choose weekly, monthly, or both for students in this course.</p></div></div><div className="panel-body assessment-controls">
      <label>Course<select value={courseId} onChange={event => setCourseId(event.target.value)}>{ownedCourses.map(id => <option key={id} value={id}>{data.courses.find(item => item.id === id)?.name ?? id}</option>)}</select></label>
      <label>Cadence<select value={cadence} onChange={event => setCadenceDraft({ courseId: selectedCourse, value: event.target.value as AssessmentCadence })}><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="BOTH">Weekly and monthly</option></select></label>
      <button className="primary" disabled={busy || !courseId || cadence === schedule?.cadence} onClick={() => run('assessmentSchedule', { courseId, cadence, version: Number(schedule?.version ?? 0) })}>Save schedule</button>
    </div></section>}
    {user.role === 'STUDENT' && <section className="panel"><div className="panel-head"><div><h2>My competency assessment</h2><p>{schedule ? `${schedule.cadence === 'BOTH' ? 'Weekly and monthly' : kindLabel(text(schedule, 'cadence'))} assessments are enabled for your course.` : 'Your coordinator has not configured an assessment schedule.'}</p></div></div><div className="panel-body">
      {placement && schedule ? <div className="assessment-compose"><div className="assessment-form">
        <div className="assessment-controls"><label>Assessment type<select value={kind} onChange={event => setRequestedKind(event.target.value as AssessmentKind)}>{allowedKinds.map(value => <option key={value} value={value}>{kindLabel(value)}</option>)}</select></label><label>Date in assessment period<input type="date" min={text(placement, 'startsAt')} max={manilaToday() < text(placement, 'endsAt') ? manilaToday() : text(placement, 'endsAt')} value={date} onChange={event => setDate(event.target.value)} /></label></div>
        {period && <p className="small muted">Period: {dateLabel(period.start)} – {dateLabel(period.end)} · {existing ? `Status: ${text(existing, 'status').replaceAll('_', ' ').toLowerCase()}` : 'Not submitted'}</p>}
        {existing?.reviewNote && <div className="notice">Coordinator feedback: {text(existing, 'reviewNote')}</div>}
        {dimensions.map(([label, key]) => <label className="assessment-rating" key={key}>{label}<select value={ratings[key]} disabled={!!existing && existing.status !== 'REVISION_REQUESTED'} onChange={event => setRatingsDraft({ key: assessmentKey, values: { ...ratings, [key]: Number(event.target.value) } })}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}
        <button className="primary" disabled={busy || !period || !date || date < text(placement, 'startsAt') || date > text(placement, 'endsAt') || date > manilaToday() || (!!existing && existing.status !== 'REVISION_REQUESTED')} onClick={() => run('evaluation', { placementId: placement.id, kind, date, ...(existing ? { version: number(existing, 'version') } : {}), ...ratings })}>{existing?.status === 'REVISION_REQUESTED' ? 'Resubmit assessment' : 'Submit assessment'}</button>
      </div>{period && <PeriodDtr entries={data.entries.filter(item => item.placementId === placement.id)} start={period.start} end={period.end} />}</div> : <p className="small muted">Your coordinator needs to configure a course schedule before assessments can be submitted.</p>}
    </div></section>}
    {user.role === 'COORDINATOR' && <section className="panel"><div className="panel-head"><div><h2>Assessments awaiting review</h2><p>Approve student self-ratings or request a revision with a reason.</p></div><span className="chip orange">{visible.filter(item => item.status === 'SUBMITTED').length} pending</span></div><div className="panel-body">
      {selectedReview && reviewPlacement ? <div className="assessment-compose"><div className="assessment-form"><label>Student and period<select value={selectedReview.id} onChange={event => { setReviewId(event.target.value); setReviewNote(''); }}>{visible.filter(item => item.status === 'SUBMITTED').map(item => <option value={item.id} key={item.id}>{text(visiblePlacements.find(p => p.id === item.placementId) ?? item, 'studentName')} · {kindLabel(text(item, 'kind'))} · {periodLabel(item)}</option>)}</select></label><div className="assessment-review-ratings">{dimensions.map(([label]) => <div key={label}><span>{label}</span><strong>{data.scores.find(score => score.evaluationId === selectedReview.id && score.dimension === label)?.score ?? '—'} / 5</strong></div>)}</div><label>Revision note<textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder="Explain changes needed if requesting revision" maxLength={1000} /></label><div className="assessment-actions"><button className="primary" disabled={busy} onClick={() => run('evaluationReview', { evaluationId: selectedReview.id, decision: 'APPROVED', note: reviewNote })}>Approve</button><button className="secondary" disabled={busy || !reviewNote.trim()} onClick={() => run('evaluationReview', { evaluationId: selectedReview.id, decision: 'REVISION_REQUESTED', note: reviewNote })}>Request revision</button></div></div><PeriodDtr entries={data.entries.filter(item => item.placementId === reviewPlacement.id)} start={text(selectedReview, 'periodStart')} end={text(selectedReview, 'periodEnd')} /></div> : <p className="small muted">No assessments are awaiting review for this course.</p>}
    </div></section>}
    <section className="panel"><div className="panel-head"><div><h2>Approved assessment trend</h2><p>Average of submitted rubric scores, grouped by period. Only coordinator-approved assessments are included.</p></div></div><div className="panel-body">{trend.length ? <div className="assessment-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}><CartesianGrid stroke="#e6edf7" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis domain={[0, 5]} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="score" name="Average score" stroke="#124c91" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div> : <p className="small muted">Approved period assessments will appear here.</p>}</div></section>
    <section className="panel"><div className="panel-head"><div><h2>Period assessment history</h2><p>Weekly and monthly submissions, including review feedback.</p></div></div><div className="panel-body"><AssessmentHistory rows={visible} scores={data.scores} placements={visiblePlacements} onRevise={user.role === 'STUDENT' && placement ? row => { setRequestedKind(text(row, 'kind') as AssessmentKind); setDate(text(row, 'periodStart') < text(placement, 'startsAt') ? text(placement, 'startsAt') : text(row, 'periodStart')); } : undefined} /></div></section>
    {legacy.length > 0 && <section className="panel"><div className="panel-head"><div><h2>Earlier assessment records</h2><p>Baseline and final records created before the weekly/monthly workflow. They remain read-only.</p></div></div><div className="panel-body"><div className="assessment-legacy">{legacy.map(item => <span key={item.id}>{text(visiblePlacements.find(p => p.id === item.placementId) ?? item, 'studentName')} · {text(item, 'kind').toLowerCase()} · {dateLabel(text(item, 'createdAt').slice(0, 10))}</span>)}</div></div></section>}
  </div>;
}
