'use client';

import { useState } from 'react';
import { CheckCircle2, FileCheck2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Row, Snapshot } from '@/packages/validation/contracts';

const number = (row: Row | undefined, key: string) => Number(row?.[key] ?? 0);
const text = (row: Row | undefined, key: string) => String(row?.[key] ?? '');

function CompletionForm({ type, title, intro, ratings, narrative, narrativeLabel, submitted, busy, onSubmit }: {
  type: 'FINAL_SELF_ASSESSMENT' | 'OJT_EXIT_SURVEY';
  title: string;
  intro: string;
  ratings: { key: string; label: string }[];
  narrative: string;
  narrativeLabel: string;
  submitted: boolean;
  busy: boolean;
  onSubmit: (type: 'FINAL_SELF_ASSESSMENT' | 'OJT_EXIT_SURVEY', answers: Record<string, string | number>) => void;
}) {
  if (submitted) return <article className="completion-form submitted"><CheckCircle2 size={18} /><div><strong>{title}</strong><p>Submitted to the university coordinator for review.</p></div><span className="chip green">Submitted</span></article>;
  return <form className="completion-form" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const answers: Record<string, string | number> = {}; for (const rating of ratings) answers[rating.key] = Number(values.get(rating.key)); answers[narrative] = String(values.get(narrative) ?? ''); onSubmit(type, answers); }}>
    <div><h3>{title}</h3><p className="muted">{intro}</p></div><div className="completion-ratings">{ratings.map(rating => <label key={rating.key}>{rating.label}<select name={rating.key} defaultValue="3">{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div><label>{narrativeLabel}<textarea required name={narrative} maxLength={2000} /></label><small>Scale: 1 = lowest, 5 = highest. Responses are visible only to authorized university staff.</small><button className="primary" disabled={busy}><FileCheck2 size={15} />Submit form</button>
  </form>;
}

export default function CompletionForms({ data, onRefresh }: { data: Snapshot; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const placement = data.placements.find(item => item.studentId === data.user.id);
  if (!placement) return null;
  const reported = data.entries.filter(entry => entry.placementId === placement.id).reduce((sum, entry) => sum + number(entry, 'minutes'), 0);
  const target = number(placement, 'requiredMinutes');
  const unlocked = target > 0 && reported >= target;
  const responses = (data.completionResponses ?? []).filter(response => response.placementId === placement.id);
  const submitted = new Set(responses.map(response => text(response, 'formType')));

  async function send(formType: 'FINAL_SELF_ASSESSMENT' | 'OJT_EXIT_SURVEY', answers: Record<string, string | number>) {
    setBusy(true);
    try {
      const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'completionForm', values: { placementId: placement!.id, formType, answers } }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? 'The form could not be submitted.');
      toast.success(result.message ?? 'Form submitted.');
      await onRefresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The form could not be submitted.'); }
    finally { setBusy(false); }
  }

  return <section className="panel completion-forms-card"><header className="panel-head"><div><span className="chip blue">University completion forms · v1</span><h2>End-of-OJT forms</h2><p>These forms open when your reported DTR reaches the placement target. This does not approve formal completion; both forms and coordinator approval are still required.</p></div><strong>{Math.min(100, Math.round(target ? reported / target * 100 : 0))}%</strong></header><div className="panel-body">
    {!unlocked ? <p className="completion-locked">{(reported / 60).toFixed(1)} of {(target / 60).toFixed(1)} reported hours. The forms unlock at the target.</p> : <div className="completion-form-grid"><CompletionForm type="FINAL_SELF_ASSESSMENT" title="Final competency self-assessment" intro="Reflect on the competencies in your OJT framework." ratings={[{ key: 'technicalSkills', label: 'Technical skills' }, { key: 'communication', label: 'Communication' }, { key: 'professionalism', label: 'Professionalism' }, { key: 'problemSolving', label: 'Problem solving' }]} narrative="reflection" narrativeLabel="What competency or skill improved most during your OJT?" submitted={submitted.has('FINAL_SELF_ASSESSMENT')} busy={busy} onSubmit={send} /><CompletionForm type="OJT_EXIT_SURVEY" title="OJT learning and program exit survey" intro="Help the university evaluate learning, curriculum relevance, and university support." ratings={[{ key: 'curriculumRelevance', label: 'Curriculum relevance' }, { key: 'universitySupport', label: 'University support' }, { key: 'workplaceAlignment', label: 'Workplace alignment' }, { key: 'trainingPlanClarity', label: 'Training plan clarity' }]} narrative="feedback" narrativeLabel="What should the university improve in the OJT program?" submitted={submitted.has('OJT_EXIT_SURVEY')} busy={busy} onSubmit={send} /></div>}
    </div>
  </section>;
}
