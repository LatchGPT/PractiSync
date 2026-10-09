import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  Info,
  CalendarDays,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Snapshot, Row, Identity } from '../packages/validation/contracts';
import {
  getAvailablePeriods,
  parseIsoWeek,
  parseMonth,
  formatPeriodLabel,
  type PeriodInfo,
} from '../packages/domain/assessment-periods';

const DIMENSIONS = [
  { key: 'technical', label: 'Technical skills', description: 'Domain-specific competency, problem execution, tooling proficiency' },
  { key: 'communication', label: 'Communication', description: 'Reporting, team collaboration, active listening, asking questions' },
  { key: 'professionalism', label: 'Professionalism', description: 'Punctuality, accountability, ethical conduct, workplace etiquette' },
  { key: 'problemSolving', label: 'Problem solving', description: 'Critical thinking, debugging, adaptability, finding solutions' },
] as const;

const RATING_LEVELS = [
  { score: 1, label: 'Beginning', desc: 'Needs direct supervision' },
  { score: 2, label: 'Developing', desc: 'Growing with guidance' },
  { score: 3, label: 'Competent', desc: 'Meets workplace standard' },
  { score: 4, label: 'Proficient', desc: 'Consistent & independent' },
  { score: 5, label: 'Exemplary', desc: 'Exceeds expectations' },
];

function s(r: Row | null | undefined, k: string): string {
  return r ? String(r[k] ?? '') : '';
}
function n(r: Row | null | undefined, k: string): number {
  return r ? Number(r[k] ?? 0) : 0;
}
function fmtDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
  } catch {
    return iso;
  }
}
function hours(mins: number) {
  return (mins / 60).toFixed(1);
}

// ============================================================================
// 1. Student Self-Assessment Dialog (Weekly / Monthly)
// ============================================================================
export interface AssessmentModalProps {
  data: Snapshot;
  user: Identity;
  onClose: () => void;
  onSaved: () => Promise<void>;
  prefillEvaluation?: Row | null;
  act: (action: string, payload: unknown) => Promise<{ id?: string; message: string }>;
}

export function AssessmentModal({
  data,
  user,
  onClose,
  onSaved,
  prefillEvaluation,
  act,
}: AssessmentModalProps) {
  const isStudent = user.role === 'STUDENT';
  const placements = isStudent
    ? data.placements.filter((p) => p.studentId === user.id)
    : data.placements;

  const [selectedPlacementId, setSelectedPlacementId] = useState<string>(
    prefillEvaluation?.placementId ? String(prefillEvaluation.placementId) : (placements[0]?.id ?? '')
  );

  const placement = placements.find((p) => p.id === selectedPlacementId) ?? placements[0];
  const course = data.courses.find((c) => c.id === placement?.courseId);
  const courseCadence = (course?.assessmentCadence as 'WEEKLY' | 'MONTHLY' | 'BOTH') || 'BOTH';

  // Determine initial kind
  const initialKind: 'WEEKLY' | 'MONTHLY' = useMemo(() => {
    if (prefillEvaluation?.kind === 'WEEKLY' || prefillEvaluation?.kind === 'MONTHLY') {
      return prefillEvaluation.kind;
    }
    if (courseCadence === 'MONTHLY') return 'MONTHLY';
    return 'WEEKLY';
  }, [prefillEvaluation, courseCadence]);

  const [kind, setKind] = useState<'WEEKLY' | 'MONTHLY'>(initialKind);

  // Available periods for this placement and kind
  const availablePeriods = useMemo(() => {
    if (!placement) return [];
    return getAvailablePeriods({
      kind,
      startsAt: s(placement, 'startsAt') || '2026-08-01',
      endsAt: s(placement, 'endsAt') || '2026-12-20',
    });
  }, [placement, kind]);

  // Selected period
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    if (prefillEvaluation?.period) return String(prefillEvaluation.period);
    // Prefer most recent or revision-requested period
    return availablePeriods[availablePeriods.length - 1]?.id ?? '';
  });

  // Keep period selection valid when kind changes
  React.useEffect(() => {
    if (!availablePeriods.some((p) => p.id === selectedPeriodId)) {
      setSelectedPeriodId(availablePeriods[availablePeriods.length - 1]?.id ?? '');
    }
  }, [availablePeriods, selectedPeriodId]);

  // Existing evaluation for selected placement, kind, and period
  const existingEvaluation = useMemo(() => {
    if (!placement || !selectedPeriodId) return null;
    return (
      data.evaluations.find(
        (e) =>
          e.placementId === placement.id &&
          e.kind === kind &&
          e.period === selectedPeriodId
      ) ?? null
    );
  }, [data.evaluations, placement, kind, selectedPeriodId]);

  const isRevision = existingEvaluation?.status === 'REVISION_REQUESTED';
  const isAlreadyApproved = existingEvaluation?.status === 'APPROVED';
  const isPendingReview = existingEvaluation?.status === 'SUBMITTED';

  // Scores state: technical, communication, professionalism, problemSolving
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {
      technical: 4,
      communication: 4,
      professionalism: 5,
      problemSolving: 4,
    };
    if (prefillEvaluation) {
      const evScores = data.scores.filter((sc) => sc.evaluationId === prefillEvaluation.id);
      for (const sc of evScores) {
        const dim = s(sc, 'dimension');
        if (dim.includes('Technical')) initial.technical = n(sc, 'score');
        if (dim.includes('Communication')) initial.communication = n(sc, 'score');
        if (dim.includes('Professionalism')) initial.professionalism = n(sc, 'score');
        if (dim.includes('Problem')) initial.problemSolving = n(sc, 'score');
      }
    }
    return initial;
  });

  // If existing evaluation has scores, load them
  React.useEffect(() => {
    if (existingEvaluation) {
      const evScores = data.scores.filter((sc) => sc.evaluationId === existingEvaluation.id);
      if (evScores.length > 0) {
        const updated: Record<string, number> = { ...scores };
        for (const sc of evScores) {
          const dim = s(sc, 'dimension');
          if (dim.includes('Technical')) updated.technical = n(sc, 'score');
          if (dim.includes('Communication')) updated.communication = n(sc, 'score');
          if (dim.includes('Professionalism')) updated.professionalism = n(sc, 'score');
          if (dim.includes('Problem')) updated.problemSolving = n(sc, 'score');
        }
        setScores(updated);
      }
    }
  }, [existingEvaluation?.id]);

  // Read-only Period DTR Daily Narratives Context
  const periodInfo = useMemo(() => {
    if (!selectedPeriodId) return null;
    return kind === 'WEEKLY' ? parseIsoWeek(selectedPeriodId) : parseMonth(selectedPeriodId);
  }, [kind, selectedPeriodId]);

  const periodEntries = useMemo(() => {
    if (!placement || !periodInfo) return [];
    return data.entries.filter(
      (e) =>
        e.placementId === placement.id &&
        s(e, 'date') >= periodInfo.startDate &&
        s(e, 'date') <= periodInfo.endDate
    );
  }, [data.entries, placement, periodInfo]);

  const periodMinutes = useMemo(() => {
    return periodEntries.reduce((acc, e) => acc + n(e, 'minutes'), 0);
  }, [periodEntries]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placement) {
      toast.error('No placement selected.');
      return;
    }
    if (!selectedPeriodId) {
      toast.error('Please choose a valid assessment period.');
      return;
    }
    if (isAlreadyApproved || isPendingReview) {
      toast.error(`An assessment for this period is already ${existingEvaluation?.status}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await act('evaluation', {
        placementId: placement.id,
        kind,
        period: selectedPeriodId,
        technical: scores.technical,
        communication: scores.communication,
        professionalism: scores.professionalism,
        problemSolving: scores.problemSolving,
      });
      toast.success(res.message || 'Assessment successfully submitted.');
      await onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[920px] p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`chip ${kind === 'WEEKLY' ? 'blue' : 'purple'}`}>
              {kind === 'WEEKLY' ? 'Weekly Self-Assessment' : 'Monthly Progress Assessment'}
            </span>
            {isRevision && <span className="chip orange">Revision Resubmission</span>}
          </div>
          <DialogTitle className="text-xl font-bold text-[#143e74]">
            {isRevision
              ? 'Revise Competency Self-Assessment'
              : 'Competency Self-Assessment'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5e7795]">
            Review your daily training narratives for this period and rate your workplace growth (1–5 scale).
          </DialogDescription>
        </DialogHeader>

        {isRevision && existingEvaluation?.reason && (
          <div className="revision-callout-banner">
            <AlertCircle size={18} className="icon" />
            <div>
              <strong>Coordinator Revision Request:</strong>
              <p>"{existingEvaluation.reason}"</p>
              <small style={{ color: '#8c600b', display: 'block', marginTop: 4 }}>
                Please adjust your self-evaluation ratings below and resubmit for coordinator review.
              </small>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Top selection controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#f8fbff] border border-[#dce8f6] rounded-xl mb-4">
            {!isStudent && (
              <div>
                <label className="block text-xs font-semibold text-[#184478] mb-1.5">
                  Student Placement
                </label>
                <select
                  value={selectedPlacementId}
                  onChange={(e) => setSelectedPlacementId(e.target.value)}
                  className="w-full text-xs font-medium border border-[#cfdeee] rounded-lg p-2.5 bg-white text-[#183b6d]"
                >
                  {placements.map((p) => (
                    <option key={p.id} value={p.id}>
                      {s(p, 'studentName')} · {s(p, 'section')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#184478] mb-1.5">
                Assessment Cadence
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={courseCadence === 'MONTHLY'}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                    kind === 'WEEKLY'
                      ? 'bg-[#1c528f] text-white border-[#1c528f] shadow-sm'
                      : 'bg-white text-[#4f6b8c] border-[#d4e2f2] hover:bg-[#f1f6fc]'
                  } ${courseCadence === 'MONTHLY' ? 'opacity-40 cursor-not-allowed' : ''}`}
                  onClick={() => setKind('WEEKLY')}
                >
                  Weekly (Mon–Sun)
                </button>
                <button
                  type="button"
                  disabled={courseCadence === 'WEEKLY'}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                    kind === 'MONTHLY'
                      ? 'bg-[#1c528f] text-white border-[#1c528f] shadow-sm'
                      : 'bg-white text-[#4f6b8c] border-[#d4e2f2] hover:bg-[#f1f6fc]'
                  } ${courseCadence === 'WEEKLY' ? 'opacity-40 cursor-not-allowed' : ''}`}
                  onClick={() => setKind('MONTHLY')}
                >
                  Monthly (Calendar)
                </button>
              </div>
              {courseCadence !== 'BOTH' && (
                <p className="text-[10.5px] text-[#7188a3] mt-1">
                  Course configured for {courseCadence.toLowerCase()} only.
                </p>
              )}
            </div>

            <div className={!isStudent ? '' : 'md:col-span-2'}>
              <label className="block text-xs font-semibold text-[#184478] mb-1.5">
                Target Period (Philippine Time UTC+8)
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full text-xs font-medium border border-[#cfdeee] rounded-lg p-2.5 bg-white text-[#183b6d]"
              >
                {availablePeriods.map((p) => {
                  const ev = data.evaluations.find(
                    (e) => e.placementId === placement?.id && e.kind === kind && e.period === p.id
                  );
                  const suffix = ev
                    ? ev.status === 'APPROVED'
                      ? ' [Approved ✓]'
                      : ev.status === 'REVISION_REQUESTED'
                      ? ' [Revision Requested ⚠️]'
                      : ' [Submitted ⏳]'
                    : p.isCurrent
                    ? ' [Current Period]'
                    : '';
                  return (
                    <option key={p.id} value={p.id}>
                      {p.label}
                      {suffix}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Two-column layout: Left Rubric Scoring, Right DTR Context */}
          <div className="assessment-dialog-layout">
            {/* Left: Rubric Dimensions */}
            <div className="assessment-form-pane">
              <div className="flex items-center justify-between pb-2 border-b border-[#e5edf5]">
                <h3 className="text-sm font-bold text-[#143e74]">
                  Rubric Assessment (1–5 Scale)
                </h3>
                <span className="text-xs text-[#5e7795]">
                  Average:{' '}
                  <strong className="text-[#1c528f]">
                    {(
                      Object.values(scores).reduce((a, b) => a + b, 0) /
                      Object.values(scores).length
                    ).toFixed(2)}{' '}
                    / 5.0
                  </strong>
                </span>
              </div>

              {DIMENSIONS.map((dim) => {
                const currentScore = scores[dim.key] ?? 3;
                return (
                  <div key={dim.key} className="assessment-dimension-card">
                    <div className="assessment-dimension-head">
                      <div>
                        <div className="assessment-dimension-title">{dim.label}</div>
                        <p className="text-[11px] text-[#637d9b] mt-0.5">{dim.description}</p>
                      </div>
                      <span className="assessment-score-badge">
                        {currentScore} / 5 ·{' '}
                        {RATING_LEVELS.find((l) => l.score === currentScore)?.label}
                      </span>
                    </div>

                    <div className="assessment-rating-buttons">
                      {RATING_LEVELS.map((lvl) => (
                        <button
                          key={lvl.score}
                          type="button"
                          className={`rating-score-btn ${currentScore === lvl.score ? 'active' : ''}`}
                          onClick={() => setScores({ ...scores, [dim.key]: lvl.score })}
                        >
                          <span className="rating-num">{lvl.score}</span>
                          <span className="rating-desc">{lvl.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Period DTR Daily Narratives Context */}
            <div className="assessment-context-pane">
              <div className="assessment-context-header">
                <h4>
                  <FileText size={16} />
                  Logged DTR Activity
                </h4>
                <p>
                  Daily entries submitted for {periodInfo ? periodInfo.label : 'this period'} (Read-only context)
                </p>
                <div className="assessment-context-stats">
                  <span className="assessment-stat-pill">
                    <CalendarDays size={12} />
                    {periodEntries.length} logged shifts
                  </span>
                  <span className="assessment-stat-pill">
                    <Clock size={12} />
                    {hours(periodMinutes)} total hours
                  </span>
                </div>
              </div>

              {periodEntries.length > 0 ? (
                <div className="assessment-dtr-list">
                  {periodEntries.map((entry) => (
                    <div key={entry.id} className="assessment-dtr-item">
                      <div className="assessment-dtr-item-top">
                        <span className="assessment-dtr-date">{fmtDate(s(entry, 'date'))}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="assessment-dtr-hours">
                            {hours(n(entry, 'minutes'))} hrs
                          </span>
                          {entry.confirmedVersion === entry.version && (
                            <span className="chip green text-[10px] py-0 px-1.5">Confirmed</span>
                          )}
                        </div>
                      </div>
                      <p className="assessment-dtr-narrative">
                        "{s(entry, 'narrative') || 'No daily narrative text recorded.'}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#748ca8] text-xs">
                  <Clock size={28} className="mx-auto mb-2 opacity-50 text-[#859ebc]" />
                  <p className="font-semibold text-[#486382]">No shifts logged in this period</p>
                  <p className="text-[11px] text-[#7890ad] mt-1 max-w-[240px] mx-auto">
                    You can still record your reflection and self-assessment scores.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Modal action bar */}
          <div className="flex justify-between items-center gap-3 pt-5 mt-5 border-t border-[#e2edf8]">
            <div>
              {isAlreadyApproved && (
                <span className="text-xs font-semibold text-[#166534] flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> This period is already approved and closed.
                </span>
              )}
              {isPendingReview && (
                <span className="text-xs font-semibold text-[#9a6712] flex items-center gap-1.5">
                  <Clock size={14} /> Already submitted and currently awaiting coordinator review.
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="secondary"
                disabled={submitting}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
                disabled={submitting || isAlreadyApproved || isPendingReview}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="spin" /> Submitting...
                  </span>
                ) : isRevision ? (
                  <span className="flex items-center gap-1.5">
                    <RotateCcw size={14} /> Resubmit Self-Assessment
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Check size={14} /> Submit Self-Assessment
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. Coordinator Review Assessment Dialog (Approve / Request Revision)
// ============================================================================
export interface ReviewAssessmentModalProps {
  data: Snapshot;
  evaluation: Row;
  onClose: () => void;
  onSaved: () => Promise<void>;
  act: (action: string, payload: unknown) => Promise<{ id?: string; message: string }>;
}

export function ReviewAssessmentModal({
  data,
  evaluation,
  onClose,
  onSaved,
  act,
}: ReviewAssessmentModalProps) {
  const placement = data.placements.find((p) => p.id === evaluation.placementId);
  const student = data.users.find((u) => u.id === placement?.studentId);
  const evaluationScores = data.scores.filter((s) => s.evaluationId === evaluation.id);

  const kind = s(evaluation, 'kind');
  const period = s(evaluation, 'period');
  const periodLabel = formatPeriodLabel(kind, period);

  // Period DTR entries for context
  const periodInfo = useMemo(() => {
    if (!period) return null;
    return kind === 'WEEKLY' ? parseIsoWeek(period) : parseMonth(period);
  }, [kind, period]);

  const periodEntries = useMemo(() => {
    if (!placement || !periodInfo) return [];
    return data.entries.filter(
      (e) =>
        e.placementId === placement.id &&
        s(e, 'date') >= periodInfo.startDate &&
        s(e, 'date') <= periodInfo.endDate
    );
  }, [data.entries, placement, periodInfo]);

  const avgScore = useMemo(() => {
    if (!evaluationScores.length) return 0;
    return evaluationScores.reduce((acc, sc) => acc + n(sc, 'score'), 0) / evaluationScores.length;
  }, [evaluationScores]);

  const [mode, setMode] = useState<'VIEW' | 'REQUEST_REVISION'>('VIEW');
  const [reason, setReason] = useState<string>(s(evaluation, 'reason') || '');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await act('evaluationReview', {
        evaluationId: evaluation.id,
        status: 'APPROVED',
      });
      toast.success(res.message || 'Assessment approved.');
      await onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason or instructions for revision.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await act('evaluationReview', {
        evaluationId: evaluation.id,
        status: 'REVISION_REQUESTED',
        reason: reason.trim(),
      });
      toast.success(res.message || 'Revision requested from student.');
      await onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[840px] p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`chip ${kind === 'WEEKLY' ? 'blue' : 'purple'}`}>
              {kind} Assessment
            </span>
            <span className={`chip ${evaluation.status === 'APPROVED' ? 'green' : evaluation.status === 'REVISION_REQUESTED' ? 'red' : 'orange'}`}>
              {s(evaluation, 'status')}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-[#143e74]">
            Review Student Self-Assessment
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5e7795]">
            Submitted by <strong>{s(placement, 'studentName') || 'Student'}</strong> · {s(placement, 'section') || '—'} · {periodLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {/* Left: Rubric Evaluation Scores */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center p-3 bg-[#f8fbff] border border-[#dce8f6] rounded-xl">
              <div>
                <span className="text-[11px] font-semibold text-[#647f9f]">Overall Rating</span>
                <div className="text-lg font-bold text-[#143e74]">
                  {avgScore.toFixed(2)} <span className="text-xs text-[#708aa8]">/ 5.0</span>
                </div>
              </div>
              <span className="chip blue font-bold">
                {avgScore >= 4.5 ? 'Exemplary' : avgScore >= 3.5 ? 'Proficient' : avgScore >= 2.5 ? 'Competent' : 'Developing'}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {['Technical skills', 'Communication', 'Professionalism', 'Problem solving'].map((dim) => {
                const scoreRow = evaluationScores.find((sc) => sc.dimension === dim);
                const val = scoreRow ? n(scoreRow, 'score') : 0;
                return (
                  <div key={dim} className="p-3 bg-white border border-[#dce6f2] rounded-lg">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-[#184478]">{dim}</span>
                      <strong className="text-xs text-[#1c528f]">{val} / 5</strong>
                    </div>
                    <div className="h-2 w-full bg-[#eef3f9] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1c528f] rounded-full"
                        style={{ width: `${(val / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Context DTR Daily Narratives */}
          <div className="bg-[#f8fafc] border border-[#e1ebf6] rounded-xl p-4 max-h-[380px] overflow-y-auto">
            <div className="border-b border-[#e5edf5] pb-2 mb-3">
              <h4 className="text-xs font-bold text-[#143e74] flex items-center gap-1.5">
                <FileText size={14} />
                Student DTR Narratives ({periodLabel})
              </h4>
              <p className="text-[11px] text-[#607997] mt-0.5">
                {periodEntries.length} logged shifts in this period
              </p>
            </div>

            {periodEntries.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {periodEntries.map((e) => (
                  <div key={e.id} className="p-2.5 bg-white border border-[#e2ecf5] rounded-md text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-[#1c4478]">{fmtDate(s(e, 'date'))}</strong>
                      <span className="text-[11px] text-[#124c91] font-semibold bg-[#edf4fc] px-1.5 py-0.5 rounded">
                        {hours(n(e, 'minutes'))} hrs
                      </span>
                    </div>
                    <p className="text-[#3d526d] text-[11.5px] leading-relaxed">
                      "{s(e, 'narrative')}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-xs text-[#7b92ad]">
                No DTR entries logged in this period.
              </p>
            )}
          </div>
        </div>

        {/* Revision request input */}
        {mode === 'REQUEST_REVISION' && (
          <div className="mt-4 p-4 bg-[#fdf9ee] border border-[#f5ddab] rounded-xl">
            <label className="block text-xs font-bold text-[#8c600b] mb-1.5">
              Revision Reason & Feedback for Student
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why a revision is requested (e.g., please provide more detail regarding problem-solving challenges encountered this week)..."
              className="w-full text-xs border border-[#e8ce97] rounded-lg p-2.5 bg-white text-[#183b6d]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="secondary text-xs"
                onClick={() => setMode('VIEW')}
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="button"
                className="primary text-xs"
                style={{ background: '#b27715', borderColor: '#9e670e' }}
                onClick={handleRequestRevision}
                disabled={submitting || !reason.trim()}
              >
                {submitting ? 'Submitting...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        )}

        {/* Modal actions */}
        <div className="flex justify-between items-center gap-3 pt-4 mt-4 border-t border-[#e2edf8]">
          <button type="button" className="secondary text-xs" onClick={onClose} disabled={submitting}>
            Close
          </button>

          {mode === 'VIEW' && (
            <div className="flex gap-2">
              <button
                type="button"
                className="secondary text-xs text-[#a36b13] border-[#f0d49a] hover:bg-[#fefaf0]"
                onClick={() => setMode('REQUEST_REVISION')}
                disabled={submitting}
              >
                <RotateCcw size={13} className="mr-1 inline" /> Request Revision
              </button>
              <button
                type="button"
                className="primary text-xs"
                onClick={handleApprove}
                disabled={submitting}
              >
                <Check size={13} className="mr-1 inline" /> Approve Assessment
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 3. Coordinator Course Assessment Cadence Configuration Dialog
// ============================================================================
export interface CadenceConfigModalProps {
  course: Row;
  onClose: () => void;
  onSaved: () => Promise<void>;
  act: (action: string, payload: unknown) => Promise<{ id?: string; message: string }>;
}

export function CadenceConfigModal({
  course,
  onClose,
  onSaved,
  act,
}: CadenceConfigModalProps) {
  const [cadence, setCadence] = useState<'BOTH' | 'WEEKLY' | 'MONTHLY'>(
    (course.assessmentCadence as 'BOTH' | 'WEEKLY' | 'MONTHLY') || 'BOTH'
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await act('courseAssessmentCadence', {
        courseId: course.id,
        cadence,
      });
      toast.success(res.message || 'Course assessment frequency updated.');
      await onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update cadence.');
    } finally {
      setSubmitting(false);
    }
  };

  const options = [
    {
      value: 'BOTH',
      title: 'Both Weekly & Monthly (Recommended)',
      desc: 'Students submit calendar week (Mon–Sun) self-assessments and monthly milestone reflections.',
    },
    {
      value: 'WEEKLY',
      title: 'Weekly Only',
      desc: 'Students submit only calendar week (Monday through Sunday) assessments.',
    },
    {
      value: 'MONTHLY',
      title: 'Monthly Only',
      desc: 'Students submit only calendar month progress self-assessments.',
    },
  ] as const;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-[540px] p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#143e74]">
            Configure Assessment Frequency
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5e7795]">
            Set the evaluation cadence required for students in{' '}
            <strong>{s(course, 'name')} ({s(course, 'code')})</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-3">
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                cadence === opt.value
                  ? 'border-[#1c528f] bg-[#f0f6fd] shadow-sm'
                  : 'border-[#dce6f2] bg-white hover:bg-[#fbfdff]'
              }`}
            >
              <input
                type="radio"
                name="cadence"
                value={opt.value}
                checked={cadence === opt.value}
                onChange={() => setCadence(opt.value)}
                className="mt-1 accent-[#1c528f]"
              />
              <div className="flex-1">
                <strong className="text-xs font-bold text-[#143e74] block">
                  {opt.title}
                </strong>
                <p className="text-[11.5px] text-[#607997] mt-0.5 leading-relaxed">
                  {opt.desc}
                </p>
              </div>
            </label>
          ))}

          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-[#e2edf8]">
            <button type="button" className="secondary text-xs" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary text-xs" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Cadence'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
