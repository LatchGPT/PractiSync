'use client';

import { useState } from 'react';
import { CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { RtuSeal } from '@/components/rtu-seal';

const dimensions = ['Technical skills', 'Communication', 'Professionalism', 'Problem solving'] as const;
type EvaluationContext = { studentName: string; companyName: string; courseCode: string; period: string; expiresAt: string; rubric: string[] };
type Rating = { score: number; evidence: string };

export default function GuestEvaluationForm({ token }: { token: string }) {
  const [context, setContext] = useState<EvaluationContext | null>(null);
  const [ratings, setRatings] = useState<Record<(typeof dimensions)[number], Rating>>({
    'Technical skills': { score: 3, evidence: '' }, Communication: { score: 3, evidence: '' }, Professionalism: { score: 3, evidence: '' }, 'Problem solving': { score: 3, evidence: '' },
  });
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`/api/guest-evaluation/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode }) });
      const body = await response.json() as { context?: EvaluationContext; error?: string };
      if (!response.ok || !body.context) throw new Error(body.error ?? 'This evaluation link is unavailable.');
      setContext(body.context);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'This evaluation link is unavailable.'); }
    finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`/api/guest-evaluation/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode, scores: ratings }) });
      const body = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'The evaluation could not be submitted.');
      setDone(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The evaluation could not be submitted.'); }
    finally { setBusy(false); }
  }

  return <main className="guest-evaluation-page"><section className="guest-evaluation-card"><div className="brand"><span className="brand-icon"><RtuSeal /></span><span>RTU PractiSync<span style={{ color: '#d7aa3e' }}>.</span></span></div>{done ? <div className="guest-done"><CheckCircle2 size={42} /><h1>Evaluation submitted</h1><p>Your responses were sent to the university coordinator for review. The student cannot see them until they are reviewed.</p></div> : <>
    <span className="chip blue"><ShieldCheck size={13} />One-time Industry Partner evaluation</span><h1>Final competency evaluation</h1>
    {context && <div className="guest-context"><strong>{context.studentName}</strong><span>{context.companyName} · {context.courseCode}</span><span>{context.period}</span><small>Expires {new Date(context.expiresAt).toLocaleString()}</small></div>}
    {error && <div className="alert" role="alert">{error}</div>}
    {!context ? <form className="guest-form" onSubmit={unlock}><label>Separate access code<input required inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={accessCode} onChange={event => setAccessCode(event.target.value)} /></label><button className="primary" disabled={busy}>{busy && <LoaderCircle size={15} className="spin" />}Open evaluation</button></form> : <form className="guest-form" onSubmit={submit}>{dimensions.map(dimension => <fieldset key={dimension}><legend>{dimension}</legend><label>Rating<select value={ratings[dimension].score} onChange={event => setRatings(current => ({ ...current, [dimension]: { ...current[dimension], score: Number(event.target.value) } }))}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label><label>Brief evidence from the placement<textarea required maxLength={1000} value={ratings[dimension].evidence} onChange={event => setRatings(current => ({ ...current, [dimension]: { ...current[dimension], evidence: event.target.value } }))} /></label></fieldset>)}<button className="primary" disabled={busy}>{busy && <LoaderCircle size={15} className="spin" />}Submit for university review</button></form>}
  </>}</section></main>;
}
