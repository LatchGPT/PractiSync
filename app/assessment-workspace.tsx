'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calculator,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Award,
  History,
  Scale,
  Sparkles,
  GraduationCap,
  Lock,
  Eye,
} from 'lucide-react';
import { EmployerFeedbackLedger } from './employer-feedback';
import SelfAssessmentModal from './self-assessment-modal';
import type { Action, Row, Snapshot } from '@/packages/validation/contracts';
import {
  assessmentPeriod,
  cadenceAllows,
  manilaToday,
  type AssessmentCadence,
  type AssessmentKind,
} from '@/packages/domain/assessment-period';
import {
  calculateOutcomeEvaluation,
  DEFAULT_RUBRIC_CONFIG,
} from '@/packages/domain/outcome-evaluation';
import {
  calculateCurriculumAnalytics,
  DEFAULT_PRIVACY_THRESHOLD,
  CURRICULUM_GAP_THRESHOLD,
} from '@/packages/domain/curriculum-analytics';

const dimensions = [
  ['Technical skills', 'technical'],
  ['Problem solving', 'problemSolving'],
  ['Communication', 'communication'],
  ['Professionalism', 'professionalism'],
] as const;

const text = (row: Row, key: string) => String(row[key] ?? '');
const number = (row: Row, key: string) => Number(row[key] ?? 0);
const kindLabel = (kind: string) => (kind === 'WEEKLY' ? 'Weekly' : 'Monthly');
const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
const periodLabel = (row: Row) =>
  `${dateLabel(text(row, 'periodStart'))} – ${dateLabel(text(row, 'periodEnd'))}`;

type Ratings = Record<(typeof dimensions)[number][1], number>;
const defaultRatings = (): Ratings => ({
  technical: 3,
  problemSolving: 3,
  communication: 3,
  professionalism: 3,
});

function PeriodDtr({ entries, start, end }: { entries: Row[]; start: string; end: string }) {
  const periodEntries = entries
    .filter((entry) => text(entry, 'date') >= start && text(entry, 'date') <= end)
    .sort((a, b) => text(a, 'date').localeCompare(text(b, 'date')));
  const reported = periodEntries.reduce((sum, entry) => sum + number(entry, 'minutes'), 0);
  const confirmed = periodEntries
    .filter((entry) => entry.confirmedVersion === entry.version)
    .reduce((sum, entry) => sum + number(entry, 'minutes'), 0);
  return (
    <section className="assessment-context" aria-label="Daily attendance context">
      <h3>Daily training context</h3>

      <div className="assessment-context-totals">
        <strong>{periodEntries.length} entries</strong>
        <span>{(reported / 60).toFixed(1)} reported hours</span>
        <span>{(confirmed / 60).toFixed(1)} confirmed hours</span>
      </div>
      <div className="assessment-narratives">
        {periodEntries.length ? (
          periodEntries.map((entry) => (
            <div key={entry.id}>
              <strong>{dateLabel(text(entry, 'date'))}</strong>
              <p>{text(entry, 'narrative')}</p>
            </div>
          ))
        ) : (
          <p className="small muted">No daily DTR entries are recorded for this period.</p>
        )}
      </div>
    </section>
  );
}

function AssessmentHistory({
  rows,
  scores,
  placements,
  onRevise,
}: {
  rows: Row[];
  scores: Row[];
  placements: Row[];
  onRevise?: (row: Row) => void;
}) {
  return (
    <div className="assessment-history">
      {rows.length ? (
        rows.map((row) => {
          const placement = placements.find((item) => item.id === row.placementId);
          return (
            <article key={row.id} className="assessment-history-row">
              <div>
                <strong>
                  {placement ? text(placement, 'studentName') : 'Student'} ·{' '}
                  {kindLabel(text(row, 'kind'))}
                </strong>
                <span>
                  {periodLabel(row)} · Version {row.version}
                </span>
              </div>
              <div className="assessment-history-scores">
                {dimensions.map(([label]) => (
                  <span key={label}>
                    {label}:{' '}
                    {scores.find(
                      (score) => score.evaluationId === row.id && score.dimension === label
                    )?.score ?? '—'}
                    /5
                  </span>
                ))}
              </div>
              <span
                className={`chip ${
                  row.status === 'APPROVED'
                    ? 'green'
                    : row.status === 'REVISION_REQUESTED'
                      ? 'orange'
                      : 'blue'
                }`}
              >
                {text(row, 'status').replaceAll('_', ' ').toLowerCase()}
              </span>
              {row.reviewNote && (
                <p className="assessment-review-note">Coordinator note: {text(row, 'reviewNote')}</p>
              )}
              {onRevise && row.status === 'REVISION_REQUESTED' && (
                <button className="secondary" onClick={() => onRevise(row)}>
                  Revise this assessment
                </button>
              )}
            </article>
          );
        })
      ) : (
        <p className="small muted">No period assessments yet.</p>
      )}
    </div>
  );
}

export default function AssessmentWorkspace({
  data,
  onAction,
}: {
  data: Snapshot;
  onAction?: (action: Action, values: Record<string, unknown>) => Promise<unknown>;
}) {
  const { user } = data;
  const ownedClasses = data.classes.filter((item) => item.coordinatorId === user.id);
  const ownedCourses = [...new Set(ownedClasses.map((item) => text(item, 'courseId')))];
  const [courseId, setCourseId] = useState(ownedCourses[0] ?? '');
  const [cadenceDraft, setCadenceDraft] = useState<{
    courseId: string;
    value: AssessmentCadence;
  } | null>(null);
  const [requestedKind, setRequestedKind] = useState<AssessmentKind>('WEEKLY');
  const [date, setDate] = useState(manilaToday);
  const [ratingsDraft, setRatingsDraft] = useState<{ key: string; values: Ratings } | null>(null);
  const [reviewId, setReviewId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Tab state: 'outcome' | 'periods' | 'industry'
  const [activeTab, setActiveTab] = useState<'outcome' | 'periods' | 'industry'>('outcome');
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>('');
  const [decisionChoice, setDecisionChoice] = useState<
    'EXEMPLARY' | 'SATISFACTORY' | 'NEEDS_REINFORCEMENT' | 'UNSATISFACTORY'
  >('SATISFACTORY');
  const [decisionRationale, setDecisionRationale] = useState<string>('');

  // Industry Feedback & Curriculum Gap Analytics State
  const [analyticsCourse, setAnalyticsCourse] = useState<string>('ALL');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>('ALL');
  const [analyticsCompany, setAnalyticsCompany] = useState<string>('ALL');
  const [analyticsPrivacyThreshold, setAnalyticsPrivacyThreshold] = useState<number>(DEFAULT_PRIVACY_THRESHOLD);

  const [showSelfAssessmentModal, setShowSelfAssessmentModal] = useState<boolean>(false);
  const placement = data.placements.find((item) => item.studentId === user.id);
  const selectedCourse =
    user.role === 'STUDENT'
      ? text(placement ?? data.courses[0], 'courseId') || user.courseId || ''
      : courseId;
  const schedule = data.assessmentSchedules.find((item) => item.courseId === selectedCourse);
  const cadence =
    cadenceDraft?.courseId === selectedCourse
      ? cadenceDraft.value
      : (schedule?.cadence as AssessmentCadence) ?? 'WEEKLY';
  const assessments = data.evaluations.filter((item) =>
    ['WEEKLY', 'MONTHLY'].includes(text(item, 'kind'))
  );
  const studentAssessments = assessments.filter((item) => item.placementId === placement?.id);
  const allowedKinds = (['WEEKLY', 'MONTHLY'] as const).filter(
    (value) =>
      (schedule && cadenceAllows(schedule.cadence as AssessmentCadence, value)) ||
      studentAssessments.some((item) => item.kind === value && item.status === 'REVISION_REQUESTED')
  );
  const kind = allowedKinds.includes(requestedKind) ? requestedKind : allowedKinds[0] ?? 'WEEKLY';
  let period: { start: string; end: string } | null = null;
  try {
    period = assessmentPeriod(kind, date);
  } catch {
    /* Invalid date is handled in the form. */
  }
  const existing = studentAssessments.find(
    (item) => item.kind === kind && item.periodStart === period?.start
  );
  const assessmentKey = existing
    ? `${existing.id}:${existing.version}`
    : `${kind}:${period?.start ?? date}`;
  const storedRatings = existing
    ? (Object.fromEntries(
        dimensions.map(([label, key]) => [
          key,
          Number(
            data.scores.find(
              (score) => score.evaluationId === existing.id && score.dimension === label
            )?.score ?? 3
          ),
        ])
      ) as Ratings)
    : defaultRatings();
  const ratings = ratingsDraft?.key === assessmentKey ? ratingsDraft.values : storedRatings;

  const visiblePlacements =
    user.role === 'STUDENT'
      ? data.placements.filter((item) => item.id === placement?.id)
      : data.placements.filter((item) => !courseId || item.courseId === courseId);
  const visible = assessments
    .filter((item) => visiblePlacements.some((p) => p.id === item.placementId))
    .sort(
      (a, b) =>
        text(b, 'periodStart').localeCompare(text(a, 'periodStart')) ||
        text(b, 'createdAt').localeCompare(text(a, 'createdAt'))
    );
  const legacy = data.evaluations.filter(
    (item) =>
      ['BASELINE', 'FINAL'].includes(text(item, 'kind')) &&
      visiblePlacements.some((p) => p.id === item.placementId)
  );
  const selectedReview =
    visible.find((item) => item.id === reviewId && item.status === 'SUBMITTED') ??
    visible.find((item) => item.status === 'SUBMITTED');
  const reviewPlacement = visiblePlacements.find((item) => item.id === selectedReview?.placementId);
  const trend = (() => {
    const groups = new Map<string, { label: string; start: string; total: number; count: number }>();
    for (const item of visible.filter((row) => row.status === 'APPROVED')) {
      const key = `${item.kind}-${item.periodStart}`;
      const values = data.scores
        .filter((score) => score.evaluationId === item.id)
        .map((score) => number(score, 'score'));
      if (!values.length) continue;
      const group =
        groups.get(key) ?? {
          label: `${item.kind === 'WEEKLY' ? 'W' : 'M'} ${dateLabel(text(item, 'periodStart'))}`,
          start: text(item, 'periodStart'),
          total: 0,
          count: 0,
        };
      group.total += values.reduce((sum, value) => sum + value, 0) / values.length;
      group.count++;
      groups.set(key, group);
    }
    return [...groups.values()]
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(-12)
      .map((group) => ({
        label: group.label,
        score: Number((group.total / group.count).toFixed(2)),
      }));
  })();

  // Outcome Evaluation Target Placement
  const currentOutcomePlacement =
    user.role === 'STUDENT'
      ? placement
      : visiblePlacements.find((p) => p.id === selectedPlacementId) ?? visiblePlacements[0];

  const outcome = currentOutcomePlacement
    ? calculateOutcomeEvaluation(
        String(currentOutcomePlacement.id),
        data.evaluations,
        data.scores,
        DEFAULT_RUBRIC_CONFIG
      )
    : null;

  const placementDecisions = currentOutcomePlacement
    ? (data.outcomeDecisions ?? []).filter(
        (d) => d.placementId === currentOutcomePlacement.id
      )
    : [];

  async function run(action: Action, values: Record<string, string | number>) {
    setBusy(true);
    try {
      if (onAction) await onAction(action, values);
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordDecision() {
    if (!currentOutcomePlacement || !decisionRationale.trim()) return;
    await run('outcomeDecision', {
      placementId: currentOutcomePlacement.id,
      decision: decisionChoice,
      rationale: decisionRationale.trim(),
    });
    setDecisionRationale('');
  }

  // Eligible placements for industry feedback
  const allCohortPeriods = Array.from(
    new Set(
      data.placements
        .map((p) => text(p, 'period'))
        .concat((data.industryFeedback ?? []).map((f) => text(f, 'academicPeriod')))
        .filter(Boolean)
    )
  );

  const curriculumAnalytics = calculateCurriculumAnalytics(
    data.placements,
    data.industryFeedback ?? [],
    {
      courseId: analyticsCourse,
      academicPeriod: analyticsPeriod,
      companyId: analyticsCompany,
      privacyThreshold: analyticsPrivacyThreshold,
    }
  );


  return (
    <div className="assessment-workspace">
      {/* Workspace Sub-Navigation Tabs */}
      <div className="outcome-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'outcome'}
          className={`outcome-tab-btn ${activeTab === 'outcome' ? 'active' : ''}`}
          onClick={() => setActiveTab('outcome')}
        >
          <Scale size={16} />
          <span>Outcome Framework &amp; Competency Mapping</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'periods'}
          className={`outcome-tab-btn ${activeTab === 'periods' ? 'active' : ''}`}
          onClick={() => setActiveTab('periods')}
        >
          <Calculator size={16} />
          <span>Period Assessments & Reviews</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'industry'}
          className={`outcome-tab-btn ${activeTab === 'industry' ? 'active' : ''}`}
          onClick={() => setActiveTab('industry')}
        >
          <GraduationCap size={16} />
          <span>Industry Supervisor Competency Evaluations</span>
        </button>
      </div>

      {activeTab === 'outcome' && (
        <div className="outcome-evaluation-section">
          {/* Decision Support Disclaimer Notice (Coordinators and Administrators only) */}
          {user.role !== 'STUDENT' && (
            <div className="notice outcome-disclaimer-notice" role="alert">
              <ShieldAlert size={18} className="disclaimer-icon" />
              <div>
                <strong>Decision Support Only:</strong> Calculated outcome results are derived using
                deterministic rubric dimensions and published thresholds. They assist academic evaluation,
                but <em>never</em> automatically certify OJT completion, approve a grade, or replace a
                coordinator’s formal academic decision.
              </div>
            </div>
          )}

          {/* Student Placement Selector for Coordinator */}
          {user.role === 'COORDINATOR' && visiblePlacements.length > 0 && (
            <section className="panel outcome-picker-panel">
              <div className="panel-body outcome-picker-body">
                <label className="outcome-picker-label">
                  <strong>Student Training Placement:</strong>
                  <select
                    value={currentOutcomePlacement?.id ?? ''}
                    onChange={(e) => setSelectedPlacementId(e.target.value)}
                    className="outcome-student-select"
                  >
                    {visiblePlacements.map((p) => (
                      <option key={p.id} value={p.id}>
                        {text(p, 'studentName')} · {text(p, 'courseCode')} ({text(p, 'section') || 'Section'}) — {text(p, 'companyName')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          )}

          {/* Baseline Self-Assessment Gating & Status Banner */}
          {currentOutcomePlacement && (() => {
            const baselineEval = data.evaluations.find(
              (e) => e.placementId === currentOutcomePlacement.id && e.kind === 'BASELINE'
            );
            if (!baselineEval) {
              return (
                <div className="notice" role="alert" style={{ background: '#fffcf6', borderColor: '#f7e0b1', color: '#966914', marginBottom: 16 }}>
                  <ShieldAlert size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <strong>HTE Evaluation Gate: Baseline Self-Assessment Pending.</strong>{' '}
                      {user.role === 'STUDENT'
                        ? 'You have not yet submitted your baseline Self-Assessment Competency Report. Host company evaluations cannot begin until this report is recorded in Weekly Reports.'
                        : `Student ${text(currentOutcomePlacement, 'studentName')} has not yet submitted their baseline Self-Assessment Competency Report. Company evaluation remains gated until the student records their perceived skill baseline.`}
                    </div>
                    {user.role === 'STUDENT' && (
                      <button
                        type="button"
                        className="primary"
                        style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={() => setShowSelfAssessmentModal(true)}
                      >
                        <Sparkles size={13} />
                        <span>Complete self-assessment</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            if (user.role === 'STUDENT') {
              return null;
            }
            return (
              <div className="notice" role="status" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', marginBottom: 16 }}>
                <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <strong>Student Competency Baseline Established:</strong>{' '}
                    Baseline self-assessment (v{Number(baselineEval.version ?? 1)}) submitted on{' '}
                    {dateLabel(text(baselineEval, 'createdAt').slice(0, 10))}. Evaluators compare self-perception with observed workplace performance.
                  </div>
                </div>
              </div>
            );
          })()}

          {outcome && currentOutcomePlacement ? (
            <>
              {/* Overall Outcome Attainment Hero Card */}
              <section className="panel outcome-hero-panel">
                <div className="panel-head">
                  <div>
                    <h2>Rubric Outcome Attainment</h2>
                  </div>
                  <span
                    className={`chip outcome-hero-badge ${
                      outcome.attainmentStatus === 'ACHIEVED'
                        ? 'green'
                        : outcome.attainmentStatus === 'DEVELOPING'
                          ? 'orange'
                          : outcome.attainmentStatus === 'GAP'
                            ? 'red'
                            : 'blue'
                    }`}
                  >
                    {outcome.attainmentStatus === 'ACHIEVED'
                      ? 'Outcome Attained (≥ 3.50)'
                      : outcome.attainmentStatus === 'DEVELOPING'
                        ? 'Developing Competency (2.50–3.49)'
                        : outcome.attainmentStatus === 'GAP'
                          ? 'Competency Gap (< 2.50)'
                          : 'Insufficient Evidence'}
                  </span>
                </div>
                <div className="panel-body outcome-hero-body">
                  <div className="outcome-score-display">
                    <div className="outcome-score-stat">
                      <span className="outcome-score-number">
                        {outcome.weightedScore !== null
                          ? `${outcome.weightedScore.toFixed(2)}`
                          : '—'}
                      </span>
                      <span className="outcome-score-scale">/ {outcome.scaleMax}.0</span>
                    </div>
                    <span className="outcome-score-label">Weighted Rubric Score</span>
                  </div>

                  <div className="outcome-evidence-status-card">
                    <div className="outcome-evidence-status-header">
                      {outcome.evidenceStatus === 'COMPLETE' ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-600" />
                      )}
                      <strong>Evidence Completeness Status:</strong>
                      <span
                        className={`chip small-chip ${
                          outcome.evidenceStatus === 'COMPLETE' ? 'green' : 'orange'
                        }`}
                      >
                        {outcome.evidenceStatus}
                      </span>
                    </div>
                    <p className="outcome-evidence-message">{outcome.evidenceMessage}</p>
                    <div className="outcome-meta-pills">
                      <span>{outcome.totalApprovedEvaluations} Coordinator-Approved Evaluations</span>
                      <span>4 Required Rubric Dimensions</span>
                      <span>Zero Inferred / AI Scores</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Transparent Mathematical Derivation Box */}
              <section className="panel outcome-derivation-panel">
                <div className="panel-head">
                  <div>
                    <h2>Transparent Calculation &amp; Formula</h2>
                  </div>
                </div>
                <div className="panel-body outcome-derivation-body">
                  <div className="formula-block">
                    <span className="formula-label">Configured Rubric Formula:</span>
                    <code className="formula-code">{outcome.formula}</code>
                  </div>
                  {outcome.formulaApplied && (
                    <div className="formula-block applied-block">
                      <span className="formula-label">Applied Mathematical Derivation:</span>
                      <code className="formula-code applied-code">{outcome.formulaApplied}</code>
                    </div>
                  )}
                  <div className="formula-evaluator-sources">
                    <strong>Included Evaluator Sources:</strong>
                    <div className="sources-pills">
                      {Array.from(
                        new Set(outcome.dimensions.flatMap((d) => d.evaluatorSources))
                      ).length ? (
                        Array.from(
                          new Set(outcome.dimensions.flatMap((d) => d.evaluatorSources))
                        ).map((src) => (
                          <span key={src} className="chip">
                            {src}
                          </span>
                        ))
                      ) : (
                        <span className="small muted">No approved evaluator observations yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Categorized Outcomes (Achieved, Developing, Gaps) */}
              <section className="outcome-categories-grid">
                <div className="outcome-category-card achieved-card">
                  <div className="category-header">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <h3>Achieved Outcomes (≥ 3.50)</h3>
                  </div>
                  <div className="category-list">
                    {outcome.achievedOutcomes.length ? (
                      outcome.achievedOutcomes.map((name) => (
                        <div key={name} className="outcome-dim-chip green">
                          <span>{name}</span>
                          <strong>
                            {outcome.dimensions.find((d) => d.name === name)?.averageScore?.toFixed(2)}/5
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="small muted">No dimensions currently meet the 3.50 threshold.</p>
                    )}
                  </div>
                </div>

                <div className="outcome-category-card developing-card">
                  <div className="category-header">
                    <Sparkles size={18} className="text-amber-500" />
                    <h3>Developing Outcomes (2.50–3.49)</h3>
                  </div>
                  <div className="category-list">
                    {outcome.developingOutcomes.length ? (
                      outcome.developingOutcomes.map((name) => (
                        <div key={name} className="outcome-dim-chip orange">
                          <span>{name}</span>
                          <strong>
                            {outcome.dimensions.find((d) => d.name === name)?.averageScore?.toFixed(2)}/5
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="small muted">No dimensions in the developing range.</p>
                    )}
                  </div>
                </div>

                <div className="outcome-category-card gap-card">
                  <div className="category-header">
                    <AlertTriangle size={18} className="text-rose-500" />
                    <h3>Competency Gaps (&lt; 2.50)</h3>
                  </div>
                  <div className="category-list">
                    {outcome.gapOutcomes.length ? (
                      outcome.gapOutcomes.map((name) => (
                        <div key={name} className="outcome-dim-chip red">
                          <span>{name}</span>
                          <strong>
                            {outcome.dimensions.find((d) => d.name === name)?.averageScore?.toFixed(2)}/5
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="small muted">No competency gaps detected.</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Rubric Dimension Breakdown Table */}
              <section className="panel outcome-table-panel">
                <div className="panel-head">
                  <div>
                    <h2>Dimension Details &amp; Weights</h2>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="outcome-dimensions-table-wrap">
                    <table className="outcome-dimensions-table">
                      <thead>
                        <tr>
                          <th>RUBRIC DIMENSION</th>
                          <th>WEIGHT</th>
                          <th>AVERAGE SCORE</th>
                          <th>EVALUATION OBSERVATIONS</th>
                          <th>ATTAINMENT STATUS</th>
                          <th>EVALUATOR SOURCES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outcome.dimensions.map((dim) => (
                          <tr key={dim.key}>
                            <td>
                              <strong>{dim.name}</strong>
                            </td>
                            <td>
                              <span className="weight-badge">{dim.weightPercent}%</span>
                            </td>
                            <td>
                              <strong>
                                {dim.averageScore !== null
                                  ? `${dim.averageScore.toFixed(2)} / 5.0`
                                  : '—'}
                              </strong>
                            </td>
                            <td>
                              {dim.sampleCount > 0 ? (
                                <span>{dim.sampleCount} approved evaluation{dim.sampleCount === 1 ? '' : 's'}</span>
                              ) : (
                                <span className="small muted text-rose-500 font-semibold">Missing (0)</span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`chip ${
                                  dim.status === 'ACHIEVED'
                                    ? 'green'
                                    : dim.status === 'DEVELOPING'
                                      ? 'orange'
                                      : dim.status === 'GAP'
                                        ? 'red'
                                        : 'gray'
                                }`}
                              >
                                {dim.status.replace(/_/g, ' ').toLowerCase()}
                              </span>
                            </td>
                            <td>
                              <span className="small muted">
                                {dim.evaluatorSources.length
                                  ? dim.evaluatorSources.join(', ')
                                  : 'None'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Coordinator Decision Recording Panel */}
              {user.role === 'COORDINATOR' && (
                <section className="panel outcome-decision-form-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Record Human Academic Decision</h2>
                    </div>
                  </div>
                  <div className="panel-body outcome-decision-form-body">
                    <div className="decision-form-grid">
                      <label className="decision-field">
                        <strong>Academic Evaluation Decision:</strong>
                        <select
                          value={decisionChoice}
                          onChange={(e) =>
                            setDecisionChoice(
                              e.target.value as
                                | 'EXEMPLARY'
                                | 'SATISFACTORY'
                                | 'NEEDS_REINFORCEMENT'
                                | 'UNSATISFACTORY'
                            )
                          }
                          className="decision-select"
                        >
                          <option value="EXEMPLARY">Exemplary — Exceeds Competency Standards</option>
                          <option value="SATISFACTORY">Satisfactory — Meets Competency Standards</option>
                          <option value="NEEDS_REINFORCEMENT">Needs Reinforcement — Developing</option>
                          <option value="UNSATISFACTORY">Unsatisfactory — Below Standards</option>
                        </select>
                      </label>

                      <label className="decision-field">
                        <strong>Evaluation Rationale &amp; Academic Notes:</strong>
                        <textarea
                          value={decisionRationale}
                          onChange={(e) => setDecisionRationale(e.target.value)}
                          placeholder="Provide detailed justification for your formal evaluation decision (minimum 5 characters)..."
                          rows={4}
                          maxLength={2000}
                          className="decision-textarea"
                        />
                        <span className="small muted">
                          {decisionRationale.length}/2000 characters
                        </span>
                      </label>

                      <div className="decision-actions">
                        <button
                          type="button"
                          className="primary"
                          disabled={busy || decisionRationale.trim().length < 5}
                          onClick={handleRecordDecision}
                        >
                          <Award size={15} />
                          <span>Record Academic Decision</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Academic Decision History Timeline */}
              <section className="panel outcome-history-panel">
                <div className="panel-head">
                  <div>
                    <h2>Academic Decision History</h2>
                  </div>
                  <History size={18} className="muted-icon" />
                </div>
                <div className="panel-body">
                  {placementDecisions.length ? (
                    <div className="decision-history-list">
                      {placementDecisions.map((dec) => (
                        <article key={dec.id} className="decision-history-card">
                          <div className="decision-history-top">
                            <div>
                              <span
                                className={`chip ${
                                  dec.decision === 'EXEMPLARY' || dec.decision === 'SATISFACTORY'
                                    ? 'green'
                                    : dec.decision === 'NEEDS_REINFORCEMENT'
                                      ? 'orange'
                                      : 'red'
                                }`}
                              >
                                {String(dec.decision).replace(/_/g, ' ')}
                              </span>
                              <strong className="decision-actor">
                                Recorded by {text(dec, 'coordinatorName') || 'Coordinator'}
                              </strong>
                            </div>
                            <span className="small muted">
                              {dateLabel(text(dec, 'createdAt').slice(0, 10))}
                            </span>
                          </div>

                          <p className="decision-rationale-text">{text(dec, 'rationale')}</p>

                          <div className="decision-snapshot-meta">
                            <span>
                              Snapshotted Rubric Score:{' '}
                              <strong>
                                {dec.calculatedScore !== null
                                  ? `${Number(dec.calculatedScore).toFixed(2)}/5.0`
                                  : 'Insufficient'}
                              </strong>
                            </span>
                            <span>
                              Calculated Status:{' '}
                              <strong>{text(dec, 'calculatedStatus').replace(/_/g, ' ')}</strong>
                            </span>
                            <span>Rubric Version: v{dec.rubricVersion ?? 1}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="small muted">
                      No formal academic decisions have been recorded for this placement yet.
                    </p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <div className="empty">
              <Scale size={28} />
              <p>No active placement found to evaluate.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'periods' && (
        <div className="period-assessments-section">
          <div className="notice">
            <span>
              Period competency assessments use the fictional 1–5 rubric. Weekly and monthly periods
              follow Philippine calendar dates. Older baseline/final records remain in history.
            </span>
          </div>

          {user.role === 'COORDINATOR' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Course assessment schedule</h2>
                </div>
              </div>
              <div className="panel-body assessment-controls">
                <label>
                  Course
                  <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                    {ownedCourses.map((id) => (
                      <option key={id} value={id}>
                        {data.courses.find((item) => item.id === id)?.name ?? id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cadence
                  <select
                    value={cadence}
                    onChange={(event) =>
                      setCadenceDraft({
                        courseId: selectedCourse,
                        value: event.target.value as AssessmentCadence,
                      })
                    }
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="BOTH">Weekly and monthly</option>
                  </select>
                </label>
                <button
                  className="primary"
                  disabled={busy || !courseId || cadence === schedule?.cadence}
                  onClick={() =>
                    run('assessmentSchedule', {
                      courseId,
                      cadence,
                      version: Number(schedule?.version ?? 0),
                    })
                  }
                >
                  Save schedule
                </button>
              </div>
            </section>
          )}

          {user.role === 'STUDENT' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>My competency assessment</h2>
                </div>
              </div>
              <div className="panel-body">
                {placement && schedule ? (
                  <div className="assessment-compose">
                    <div className="assessment-form">
                      <div className="assessment-controls">
                        <label>
                          Assessment type
                          <select
                            value={kind}
                            onChange={(event) => setRequestedKind(event.target.value as AssessmentKind)}
                          >
                            {allowedKinds.map((value) => (
                              <option key={value} value={value}>
                                {kindLabel(value)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Date in assessment period
                          <input
                            type="date"
                            min={text(placement, 'startsAt')}
                            max={
                              manilaToday() < text(placement, 'endsAt')
                                ? manilaToday()
                                : text(placement, 'endsAt')
                            }
                            value={date}
                            onChange={(event) => setDate(event.target.value)}
                          />
                        </label>
                      </div>
                      {period && (
                        <p className="small muted">
                          Period: {dateLabel(period.start)} – {dateLabel(period.end)} ·{' '}
                          {existing
                            ? `Status: ${text(existing, 'status').replaceAll('_', ' ').toLowerCase()}`
                            : 'Not submitted'}
                        </p>
                      )}
                      {existing?.reviewNote && (
                        <div className="notice">Coordinator feedback: {text(existing, 'reviewNote')}</div>
                      )}
                      {dimensions.map(([label, key]) => (
                        <label className="assessment-rating" key={key}>
                          {label}
                          <select
                            value={ratings[key]}
                            disabled={!!existing && existing.status !== 'REVISION_REQUESTED'}
                            onChange={(event) =>
                              setRatingsDraft({
                                key: assessmentKey,
                                values: { ...ratings, [key]: Number(event.target.value) },
                              })
                            }
                          >
                            {[1, 2, 3, 4, 5].map((value) => (
                              <option key={value} value={value}>
                                {value} / 5
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                      <button
                        className="primary"
                        disabled={
                          busy ||
                          !period ||
                          !date ||
                          date < text(placement, 'startsAt') ||
                          date > text(placement, 'endsAt') ||
                          date > manilaToday() ||
                          (!!existing && existing.status !== 'REVISION_REQUESTED')
                        }
                        onClick={() =>
                          run('evaluation', {
                            placementId: placement.id,
                            kind,
                            date,
                            ...(existing ? { version: number(existing, 'version') } : {}),
                            ...ratings,
                          })
                        }
                      >
                        {existing?.status === 'REVISION_REQUESTED'
                          ? 'Resubmit assessment'
                          : 'Submit assessment'}
                      </button>
                    </div>
                    {period && (
                      <PeriodDtr
                        entries={data.entries.filter((item) => item.placementId === placement.id)}
                        start={period.start}
                        end={period.end}
                      />
                    )}
                  </div>
                ) : (
                  <p className="small muted">
                    Your coordinator needs to configure a course schedule before assessments can be
                    submitted.
                  </p>
                )}
              </div>
            </section>
          )}

          {user.role === 'COORDINATOR' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Assessments awaiting review</h2>
                </div>
                <span className="chip orange">
                  {visible.filter((item) => item.status === 'SUBMITTED').length} pending
                </span>
              </div>
              <div className="panel-body">
                {selectedReview && reviewPlacement ? (
                  <div className="assessment-compose">
                    <div className="assessment-form">
                      <label>
                        Student and period
                        <select
                          value={selectedReview.id}
                          onChange={(event) => {
                            setReviewId(event.target.value);
                            setReviewNote('');
                          }}
                        >
                          {visible
                            .filter((item) => item.status === 'SUBMITTED')
                            .map((item) => (
                              <option value={item.id} key={item.id}>
                                {text(
                                  visiblePlacements.find((p) => p.id === item.placementId) ?? item,
                                  'studentName'
                                )}{' '}
                                · {kindLabel(text(item, 'kind'))} · {periodLabel(item)}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="assessment-review-ratings">
                        {dimensions.map(([label]) => (
                          <div key={label}>
                            <span>{label}</span>
                            <strong>
                              {data.scores.find(
                                (score) =>
                                  score.evaluationId === selectedReview.id &&
                                  score.dimension === label
                              )?.score ?? '—'}{' '}
                              / 5
                            </strong>
                          </div>
                        ))}
                      </div>
                      <label>
                        Revision note
                        <textarea
                          value={reviewNote}
                          onChange={(event) => setReviewNote(event.target.value)}
                          placeholder="Explain changes needed if requesting revision"
                          maxLength={1000}
                        />
                      </label>
                      <div className="assessment-actions">
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() =>
                            run('evaluationReview', {
                              evaluationId: selectedReview.id,
                              decision: 'APPROVED',
                              note: reviewNote,
                            })
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="secondary"
                          disabled={busy || !reviewNote.trim()}
                          onClick={() =>
                            run('evaluationReview', {
                              evaluationId: selectedReview.id,
                              decision: 'REVISION_REQUESTED',
                              note: reviewNote,
                            })
                          }
                        >
                          Request revision
                        </button>
                      </div>
                    </div>
                    <PeriodDtr
                      entries={data.entries.filter((item) => item.placementId === reviewPlacement.id)}
                      start={text(selectedReview, 'periodStart')}
                      end={text(selectedReview, 'periodEnd')}
                    />
                  </div>
                ) : (
                  <p className="small muted">No assessments are awaiting review for this course.</p>
                )}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Approved assessment trend</h2>
              </div>
            </div>
            <div className="panel-body">
              {trend.length ? (
                <div className="assessment-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid stroke="#e6edf7" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Average score"
                        stroke="#124c91"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="small muted">Approved period assessments will appear here.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Period assessment history</h2>
              </div>
            </div>
            <div className="panel-body">
              <AssessmentHistory
                rows={visible}
                scores={data.scores}
                placements={visiblePlacements}
                onRevise={
                  user.role === 'STUDENT' && placement
                    ? (row) => {
                        setRequestedKind(text(row, 'kind') as AssessmentKind);
                        setDate(
                          text(row, 'periodStart') < text(placement, 'startsAt')
                            ? text(placement, 'startsAt')
                            : text(row, 'periodStart')
                        );
                      }
                    : undefined
                }
              />
            </div>
          </section>

          {legacy.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Earlier assessment records</h2>
                </div>
              </div>
              <div className="panel-body">
                <div className="assessment-legacy">
                  {legacy.map((item) => (
                    <span key={item.id}>
                      {text(
                        visiblePlacements.find((p) => p.id === item.placementId) ?? item,
                        'studentName'
                      )}{' '}
                      · {text(item, 'kind').toLowerCase()} ·{' '}
                      {dateLabel(text(item, 'createdAt').slice(0, 10))}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'industry' && (
        <div className="industry-analytics-section">
          {/* Header & Main Actions */}
          <div className="industry-section-header">
            <div>
              <h2>Industry Supervisor Competency Evaluations</h2>

            </div>

          </div>

          <EmployerFeedbackLedger data={data} onAction={onAction}/>
          {/* Student Reviews Strict Separation Notice */}
          <div className="notice industry-separation-notice" role="alert">
            <ShieldAlert size={18} className="disclaimer-icon" />
            <div>
              <strong>Strict Workflow Separation:</strong> Student reviews of companies (student → company)
              are maintained in an independent workflow and strictly excluded from employer feedback metrics.
              Analytics include only verified direct submissions, using the latest eligible response per placement. Legacy and invalidated responses remain visible to authorized reviewers and are excluded.
            </div>
          </div>

          {/* Filter Bar & Privacy Controls */}
          <section className="panel industry-controls-panel">
            <div className="panel-body industry-controls-body">
              <div className="industry-filter-grid">
                <label>
                  <span>Academic Course</span>
                  <select
                    value={analyticsCourse}
                    onChange={(e) => setAnalyticsCourse(e.target.value)}
                  >
                    <option value="ALL">All Enrolled Courses</option>
                    {data.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {text(c, 'code')} — {text(c, 'name')}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Cohort Period</span>
                  <select
                    value={analyticsPeriod}
                    onChange={(e) => setAnalyticsPeriod(e.target.value)}
                  >
                    <option value="ALL">All Cohort Periods</option>
                    {allCohortPeriods.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Host Company</span>
                  <select
                    value={analyticsCompany}
                    onChange={(e) => setAnalyticsCompany(e.target.value)}
                  >
                    <option value="ALL">All Host Companies</option>
                    {data.companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {text(comp, 'name')} {comp.status === 'APPROVED' ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Privacy Protection Threshold</span>
                  <select
                    value={analyticsPrivacyThreshold}
                    onChange={(e) => setAnalyticsPrivacyThreshold(Number(e.target.value))}
                  >
                    <option value={1}>1 evaluation (Development mode)</option>
                    <option value={2}>2 evaluations</option>
                    <option value={3}>3 evaluations (Standard default)</option>
                    <option value={5}>5 evaluations (Strict privacy)</option>
                    <option value={10}>10 evaluations (Institutional research)</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          {/* Sample Disclosures Bar */}
          <div className="industry-disclosures-grid">
            <div className="industry-kpi-card">
              <span className="kpi-label">Cohort Size</span>
              <strong className="kpi-value">{curriculumAnalytics.cohortSize}</strong>
              <span className="kpi-sub">Total student placements</span>
            </div>
            <div className="industry-kpi-card">
              <span className="kpi-label">Feedback Received</span>
              <strong className="kpi-value">{curriculumAnalytics.feedbackCount}</strong>
              <span className="kpi-sub">Supervisor evaluations</span>
            </div>
            <div className="industry-kpi-card">
              <span className="kpi-label">Missing Responses</span>
              <strong className="kpi-value">{curriculumAnalytics.missingCount}</strong>
              <span className="kpi-sub">Placements pending evaluation</span>
            </div>
            <div className="industry-kpi-card">
              <span className="kpi-label">Response Rate</span>
              <strong className="kpi-value">{curriculumAnalytics.responseRatePercent}%</strong>
              <span className="kpi-sub">Of eligible cohort</span>
            </div>
            <div className="industry-kpi-card">
              <span className="kpi-label">Scale &amp; Framework</span>
              <strong className="kpi-value">1 – 5 Likert</strong>
              <span className="kpi-sub">Framework v{curriculumAnalytics.frameworkVersion}.0</span>
            </div>
          </div>

          {/* Privacy Suppression Guard */}
          {curriculumAnalytics.isPrivacySuppressed ? (
            <div className="industry-privacy-suppressed-panel">
              <div className="privacy-suppressed-content">
                <Lock size={36} className="text-amber-600" />
                <h3>Aggregate Metrics Suppressed for Privacy</h3>

                <div className="privacy-rules-box">
                  <span>
                    Privacy Rule: Threshold is set to {curriculumAnalytics.privacyThreshold} evaluations. Current sample has {curriculumAnalytics.feedbackCount}.
                  </span>
                  <p className="small muted">
                    To safeguard student confidentiality, aggregate scores and qualitative feedback
                    remain hidden until sufficient supervisor responses are collected.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Small Sample Warning Notice */}
              {curriculumAnalytics.isSmallSample && (
                <div className="notice industry-small-sample-notice" role="alert">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <div>
                    <strong>Preliminary Sample Notice:</strong> {curriculumAnalytics.smallSampleNotice}
                  </div>
                </div>
              )}

              {/* Overall Readiness & 4 Dimensions Grid */}
              <section className="panel industry-metrics-panel">
                <div className="panel-head">
                  <div>
                    <h2>Preparedness &amp; Alignment Dimensions</h2>
                  </div>
                  {curriculumAnalytics.overallIndex !== null && (
                    <div className="overall-index-badge">
                      <span className="small muted">Composite Index</span>
                      <strong>{curriculumAnalytics.overallIndex.toFixed(2)} / 5.00</strong>
                    </div>
                  )}
                </div>
                <div className="panel-body">
                  <div className="dimensions-grid">
                    {curriculumAnalytics.dimensions.map((dim) => {
                      const score = dim.averageScore ?? 0;
                      const pct = Math.min(100, Math.max(0, (score / 5) * 100));
                      return (
                        <div key={dim.key} className={`dimension-card ${dim.isGap ? 'has-gap' : ''}`}>
                          <div className="dimension-card-top">
                            <h4>{dim.label}</h4>
                            <span className={`chip ${dim.isGap ? 'orange' : 'green'}`}>
                              {dim.isGap ? 'Gap Flagged' : 'Satisfactory'}
                            </span>
                          </div>
                          <div className="dimension-score-row">
                            <span className="dimension-score-big">
                              {dim.averageScore !== null ? dim.averageScore.toFixed(2) : '—'}
                            </span>
                            <span className="dimension-score-max">/ 5.00</span>
                          </div>
                          <div className="dimension-progress-bar">
                            <div
                              className={`dimension-progress-fill ${dim.isGap ? 'gap-fill' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="dimension-card-footer">
                            <span className="small muted">{dim.sampleCount} evaluations recorded</span>
                            <span className="small muted">
                              Threshold: {CURRICULUM_GAP_THRESHOLD.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Recurring Curriculum & Skill Gaps */}
              <section className="panel industry-gaps-panel">
                <div className="panel-head">
                  <div>
                    <h2>Recurring Curriculum &amp; Skill Gaps</h2>
                  </div>
                </div>
                <div className="panel-body">
                  {curriculumAnalytics.curriculumGaps.length > 0 ? (
                    <div className="gaps-list-grid">
                      {curriculumAnalytics.curriculumGaps.map((gap, idx) => (
                        <div
                          key={`${gap.topic}-${idx}`}
                          className={`gap-item-card ${gap.category === 'TECHNICAL' ? 'tech-gap' : gap.category === 'SOFT_SKILL' ? 'soft-gap' : 'dim-gap'}`}
                        >
                          <div className="gap-item-header">
                            <span
                              className={`chip ${
                                gap.category === 'TECHNICAL'
                                  ? 'blue'
                                  : gap.category === 'SOFT_SKILL'
                                    ? 'purple'
                                    : 'orange'
                              }`}
                            >
                              {gap.category === 'TECHNICAL'
                                ? 'Technical Competency'
                                : gap.category === 'SOFT_SKILL'
                                  ? 'Workplace Soft Skill'
                                  : 'Institutional Dimension'}
                            </span>
                            <span className="gap-percentage-badge">{gap.percentage}% of cohort</span>
                          </div>
                          <strong className="gap-topic-title">{gap.topic}</strong>
                          <p className="small muted gap-basis-text">
                            Mentioned in {gap.sampleBasis}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-gaps-message">
                      <CheckCircle2 size={24} className="text-emerald-600" />
                      <p>No recurring curriculum or skill gaps were flagged in this sample.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Qualitative Recommendations from Supervisors */}
              <section className="panel industry-recommendations-panel">
                <div className="panel-head">
                  <div>
                    <h2>Supervisor Curriculum Recommendations</h2>
                  </div>
                </div>
                <div className="panel-body">
                  {curriculumAnalytics.qualitativeRecommendations.length > 0 ? (
                    <div className="recommendations-list">
                      {curriculumAnalytics.qualitativeRecommendations.map((rec) => (
                        <article key={rec.id} className="recommendation-card">
                          <div className="recommendation-top">
                            <div>
                              <strong>{rec.companyName}</strong>
                              <span className="recommendation-meta">
                                · {rec.supervisorName} · {rec.courseCode} · {rec.academicPeriod}
                              </span>
                            </div>
                            <span className="small muted">
                              {dateLabel(rec.createdAt.slice(0, 10))}
                            </span>
                          </div>
                          <p className="recommendation-text">{rec.recommendations}</p>
                          <div className="recommendation-ratings-bar">
                            <span>Readiness: <strong>{rec.workplaceReadiness}/5</strong></span>
                            <span>Relevance: <strong>{rec.competencyRelevance}/5</strong></span>
                            <span>Curriculum Alignment: <strong>{rec.curriculumAlignment}/5</strong></span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="small muted">No qualitative recommendations submitted for this filter.</p>
                  )}
                </div>
              </section>


            </>
          )}


        </div>
      )}

      {showSelfAssessmentModal && currentOutcomePlacement && (
        <SelfAssessmentModal
          placement={currentOutcomePlacement}
          data={data}
          isLocked={
            !!data.evaluations.find(
              (e) => e.placementId === currentOutcomePlacement.id && e.kind === 'FINAL'
            )
          }
          onClose={() => setShowSelfAssessmentModal(false)}
          onSubmit={async (scores, version) => {
            if (!onAction) return false;
            await onAction('studentSelfAssessment', {
              placementId: currentOutcomePlacement.id,
              scores,
              version,
            });
            return true;
          }}
        />
      )}
    </div>
  );
}
