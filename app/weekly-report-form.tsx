'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Send, X } from 'lucide-react';
import type { Row } from '@/packages/validation/contracts';
import { weeklyReportFields, weeklyCompetencyQuestions } from '@/packages/domain/weekly-report';
import type { WeeklyReportDetails } from '@/packages/validation/weekly-report';

function evidence(row?: Row): Record<string, unknown> {
  try { return JSON.parse(String(row?.evidenceJson || '{}')) || {}; } catch { return {}; }
}
const emptyDetails = (): WeeklyReportDetails => ({ workPerformed: '', competenciesApplied: '', learningGained: '', challengesAndSupport: '', nextWeekPlan: '' });

export function WeeklyReportContent({ row }: { row: Row }) {
  const saved = evidence(row);
  const details = saved.reportDetails as WeeklyReportDetails | undefined;
  if (!details) return <p className="weekly-report-paragraph">{typeof saved.reportText === 'string' ? saved.reportText : ''}</p>;
  return <div className="weekly-written-content">
    {weeklyReportFields.map(([key, label]) => <section key={key}><h4>{label}</h4><p className="weekly-report-paragraph">{details[key]}</p></section>)}
    {Boolean(saved.competencyRatings) && Array.isArray(saved.competencyQuestions) && <section><h4>Competency Self-Ratings</h4><ol className="weekly-saved-ratings">{(saved.competencyQuestions as {key: string; question: string}[]).map(question => <li key={question.key}><span>{question.question}</span><strong>{String((saved.competencyRatings as Record<string,number>)[question.key] ?? '—')} / 5</strong></li>)}</ol></section>}
    {details.image && /^data:image\/(png|jpeg);base64,/.test(details.image.dataUrl) && <figure className="weekly-evidence-preview"><img src={details.image.dataUrl} alt="Image evidence attached to the weekly report"/><figcaption>{details.image.name}</figcaption></figure>}
  </div>;
}

export default function WeeklyReportForm({ existing, course, courseId, courseCode, busy, canSubmit, scores, onSubmit }: {
  existing?: Row; course: string; courseId?: string; courseCode?: string; busy: boolean; canSubmit: boolean; scores: Row[];
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const saved = evidence(existing);
  const [details, setDetails] = useState<WeeklyReportDetails>(() => ({ ...emptyDetails(), ...(saved.reportDetails as Partial<WeeklyReportDetails> || {}), ...(!saved.reportDetails && typeof saved.reportText === 'string' ? { workPerformed: saved.reportText } : {}) }));
  const locked = Boolean(existing && existing.status !== 'REVISION_REQUESTED');
  const currentQuestions = weeklyCompetencyQuestions(course, courseId, courseCode);
  const questions = locked && Array.isArray(saved.competencyQuestions) && saved.competencyQuestions.length ? saved.competencyQuestions as typeof currentQuestions : currentQuestions;
  const savedRatings = saved.competencyRatings as Record<string, number> | undefined;
  const [ratings, setRatings] = useState<Record<string, number>>(() => Object.fromEntries(questions.map(q => [q.key, Number(savedRatings?.[q.key] ?? (['technical','problemSolving','communication','professionalism'].includes(q.key) ? scores.find(score => score.evaluationId === existing?.id && score.dimension === q.dimension)?.score : 0) ?? 0)])));
  const [step, setStep] = useState<'report' | 'competencies'>('report');
  const [error, setError] = useState('');
  const [readingImage, setReadingImage] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const writingComplete = weeklyReportFields.every(([key]) => details[key].trim());
  const ratingsComplete = questions.every(q => ratings[q.key] >= 1 && ratings[q.key] <= 5);

  function go(next: typeof step) { setStep(next); setError(''); requestAnimationFrame(() => heading.current?.focus()); }
  async function selectImage(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 1024 * 1024 || file.size === 0) { setError('Choose a PNG or JPG image up to 1 MB.'); return; }
    setReadingImage(true); setError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read the image. Try again.')); reader.readAsDataURL(file); });
      setDetails(current => ({ ...current, image: { name: file.name.slice(0, 180), dataUrl } }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read the image.'); }
    finally { setReadingImage(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  return <form className="weekly-structured-form" onSubmit={async event => {
    event.preventDefault();
    if (step === 'report') { if (writingComplete) go('competencies'); return; }
    if (!writingComplete || !ratingsComplete || !canSubmit || locked || busy || readingImage) return;
    setError('');
    try { await onSubmit({ reportDetails: details, competencyRatings: ratings }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not submit your report. Your entries are still here.'); }
  }}>
    <div className="weekly-form-steps" aria-label="Report steps"><span aria-current={step === 'report' ? 'step' : undefined}>1. Weekly Report</span><span aria-current={step === 'competencies' ? 'step' : undefined}>2. Competency Check</span></div>
    <h3 ref={heading} tabIndex={-1}>{step === 'report' ? 'Weekly Report' : 'Competency Self-Assessment'}</h3>
    {step === 'report' ? <>
      <div className="weekly-writing-grid">{weeklyReportFields.map(([key, label]) => <label className="weekly-paragraph-field" key={key}>
        <span>{label} <span aria-hidden="true">*</span></span>
        <textarea required maxLength={4000} rows={4} value={details[key]} disabled={busy || locked} onChange={event => setDetails(current => ({ ...current, [key]: event.target.value }))}/>
      </label>)}</div>
      <section className="weekly-image-field" aria-label="Image evidence">
        <div><h4>Image Evidence <span className="muted">(Optional)</span></h4><p className="small muted">PNG or JPG · Up to 1 MB</p></div>
        {details.image ? <figure className="weekly-evidence-preview"><img src={details.image.dataUrl} alt="Selected image evidence"/><figcaption>{details.image.name}</figcaption>{!locked && <button type="button" className="secondary" disabled={busy || readingImage} onClick={() => setDetails(current => ({ ...current, image: undefined }))}><X size={15}/>Remove Image</button>}</figure> : !locked && <label className="secondary weekly-image-upload"><ImagePlus size={16}/>{readingImage ? 'Reading Image…' : 'Add Image'}<input ref={fileInput} type="file" accept="image/png,image/jpeg" disabled={busy || readingImage} onChange={event => void selectImage(event.target.files?.[0])}/></label>}
      </section>
    </> : <>
      <div className="weekly-competency-intro"><strong>{course || 'Course Competencies'}</strong><p>Rate how well you applied each skill this week. Answer all {questions.length} questions.</p><span>1 Needs Support · 2 Needs Improvement · 3 Developing · 4 Proficient · 5 Confident</span></div>
      <div className="weekly-competency-questions">{questions.map((question, index) => <fieldset className="weekly-rating-field" key={question.key} disabled={busy || locked}>
        <legend><strong>{index + 1}. {question.dimension}</strong><span>{question.question}</span></legend>
        <div className="weekly-rating-options">{[1, 2, 3, 4, 5].map(value => <label key={value}><input required type="radio" name={`weekly-rating-${question.key}`} value={value} checked={ratings[question.key] === value} onChange={() => setRatings(current => ({ ...current, [question.key]: value }))}/><span>{value}</span></label>)}</div>
      </fieldset>)}</div>
    </>}
    {error && <p role="alert" className="weekly-form-error">{error}</p>}
    <footer className="weekly-form-actions">
      {step === 'competencies' && <button type="button" className="secondary" disabled={busy} onClick={() => go('report')}><ArrowLeft size={15}/>Back to Report</button>}
      {step === 'report' ? <button type="submit" className="primary" disabled={busy || readingImage || (!locked && !writingComplete)}>Continue to Competency Check<ArrowRight size={15}/></button> : <button type="submit" className="primary" disabled={busy || readingImage || locked || !canSubmit || !writingComplete || !ratingsComplete}><Send size={15}/>{busy ? 'Submitting…' : locked ? 'Report Submitted' : existing ? 'Resubmit Report' : 'Submit Weekly Report'}</button>}
    </footer>
    {!canSubmit && !locked && <p className="small muted">Choose a current or past reporting date within your placement to submit.</p>}
  </form>;
}
