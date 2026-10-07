'use client';

import type {LucideIcon} from 'lucide-react';
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock,
  Compass,
  FileCheck2,
  GraduationCap,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type {Snapshot} from '@/packages/validation/contracts';

interface MilestoneStepperProps {
  data: Snapshot;
  navigate: (page: string) => void;
}

type StepStatus = 'completed' | 'current' | 'upcoming';

interface Step {
  id: string;
  phase: string;
  title: string;
  status: StepStatus;
  badgeLabel: string;
  kpiValue: string;
  kpiSubLabel: string;
  detail: string;
  to: string;
  icon: LucideIcon;
  progressPercent?: number;
}

const hours = (minutes: number) => `${Number((minutes / 60).toFixed(1))} hrs`;

export default function PracticumMilestoneStepper({
  data,
  navigate,
}: MilestoneStepperProps) {
  const {user} = data;
  const role = user.role;

  let steps: Step[] = [];
  let currentPhaseLabel = '';

  if (role === 'STUDENT') {
    const placement =
      data.placements.find(p => p.studentId === user.id && p.status === 'ACTIVE') ??
      data.placements.find(p => p.studentId === user.id);

    const ownEntries = data.entries.filter(e => e.placementId === placement?.id);
    const reportedMinutes = ownEntries.reduce(
      (sum, e) => sum + Number(e.minutes ?? 0),
      0
    );
    const confirmedMinutes = ownEntries
      .filter(e => e.confirmedVersion === e.version)
      .reduce((sum, e) => sum + Number(e.minutes ?? 0), 0);

    const targetMinutes = Number(placement?.requiredMinutes ?? 0);
    const percent =
      targetMinutes > 0
        ? Math.min(100, Math.round((reportedMinutes / targetMinutes) * 100))
        : 0;

    const documents = placement
      ? data.documents.filter(d => d.placementId === placement.id)
      : [];
    const approvedDocs = documents.filter(d => d.status === 'APPROVED');
    const pendingDocs = documents.filter(d => d.status !== 'APPROVED');

    const evaluations = placement
      ? data.evaluations.filter(e => e.placementId === placement.id)
      : [];

    const completion = placement
      ? data.completion.find(c => c.placementId === placement.id)
      : undefined;

    const daysOnRecord = new Set(ownEntries.map(e => e.date)).size;

    // Step 1: Pre-Deployment & Prerequisite Clearances
    const step1Complete =
      Boolean(placement) &&
      (documents.length === 0 || approvedDocs.length >= documents.length);
    const step1Status: StepStatus = step1Complete
      ? 'completed'
      : 'current';

    // Step 2: Active Training & DTR Hours
    const step2Complete = percent >= 100;
    const step2Status: StepStatus = step2Complete
      ? 'completed'
      : step1Complete || reportedMinutes > 0
      ? 'current'
      : 'upcoming';

    // Step 3: Midterm & Skills Evaluation
    const step3Complete = evaluations.length >= 2;
    const step3Status: StepStatus = step3Complete
      ? 'completed'
      : step2Complete || evaluations.length > 0 || percent >= 45
      ? 'current'
      : 'upcoming';

    // Step 4: Final Clearance & Portfolio
    const step4Complete = completion?.status === 'APPROVED';
    const step4Status: StepStatus = step4Complete
      ? 'completed'
      : step2Complete && step3Complete
      ? 'current'
      : 'upcoming';

    steps = [
      {
        id: 'docs',
        phase: 'PHASE 01',
        title: 'Pre-Deployment',
        status: step1Status,
        badgeLabel: step1Complete ? 'Completed' : 'In Progress',
        kpiValue: `${approvedDocs.length} / ${documents.length || 1}`,
        kpiSubLabel: 'Prerequisite Clearances',
        detail:
          pendingDocs.length > 0
            ? `${pendingDocs.length} record${pendingDocs.length > 1 ? 's' : ''} awaiting approval`
            : 'All required clearances approved',
        to: 'documents',
        icon: FileCheck2,
      },
      {
        id: 'hours',
        phase: 'PHASE 02',
        title: 'Active Training',
        status: step2Status,
        badgeLabel: step2Complete ? 'Goal Met' : 'Active Phase',
        kpiValue: hours(reportedMinutes),
        kpiSubLabel: targetMinutes > 0 ? `${percent}% of ${hours(targetMinutes)} goal` : 'Hours on record',
        detail: `${hours(confirmedMinutes)} confirmed · ${hours(Math.max(0, reportedMinutes - confirmedMinutes))} pending`,
        to: 'attendance',
        icon: Clock,
        progressPercent: percent,
      },
      {
        id: 'eval',
        phase: 'PHASE 03',
        title: 'Skills Appraisal',
        status: step3Status,
        badgeLabel: step3Complete ? 'Completed' : evaluations.length > 0 ? 'In Review' : 'Upcoming',
        kpiValue: evaluations.length > 0 ? `${evaluations.length} Rubric${evaluations.length > 1 ? 's' : ''}` : 'Pending',
        kpiSubLabel: 'Coordinator Competency Review',
        detail:
          evaluations.length > 0
            ? `${evaluations.map(e => e.kind).join(' & ')} evaluation on record`
            : 'Scheduled after midterm hours',
        to: 'competencies',
        icon: Award,
      },
      {
        id: 'clearance',
        phase: 'PHASE 04',
        title: 'Final Clearance',
        status: step4Status,
        badgeLabel: step4Complete ? 'Cleared' : step2Complete ? 'Ready' : 'Upcoming',
        kpiValue: step4Complete ? 'Cleared' : `${daysOnRecord} Days`,
        kpiSubLabel: step4Complete ? 'Formal completion approved' : 'Submitted DTR days on record',
        detail: step4Complete
          ? 'Institutional endorsement granted'
          : percent >= 100
          ? 'Eligible for final exit clearance'
          : `${hours(Math.max(0, targetMinutes - reportedMinutes))} remaining to clearance`,
        to: 'portfolio',
        icon: GraduationCap,
      },
    ];

    currentPhaseLabel =
      step4Complete
        ? 'Stage 4 of 4 · Practicum Cleared'
        : step4Status === 'current'
        ? 'Stage 4 of 4 · Final Sign-Off'
        : step3Status === 'current'
        ? 'Stage 3 of 4 · Skills Appraisal'
        : 'Stage 2 of 4 · Active Training';
  } else if (role === 'COORDINATOR') {
    const classes = data.classes.filter(c => !Number(c.revoked));
    const activePlacements = data.placements.filter(p => p.status === 'ACTIVE');
    const pendingDocuments = data.documents.filter(d => d.status === 'PENDING');
    const approvedDocs = data.documents.filter(d => d.status === 'APPROVED');
    const openCases = data.incidents.filter(i => i.status !== 'RESOLVED');

    steps = [
      {
        id: 'coor-docs',
        phase: 'STAGE 01',
        title: 'Document Clearances',
        status: pendingDocuments.length === 0 ? 'completed' : 'current',
        badgeLabel: pendingDocuments.length === 0 ? 'All Cleared' : `${pendingDocuments.length} To Review`,
        kpiValue: `${approvedDocs.length} / ${data.documents.length}`,
        kpiSubLabel: 'Approved Submissions',
        detail: `${pendingDocuments.length} pending review queue`,
        to: 'documents',
        icon: FileCheck2,
      },
      {
        id: 'coor-classes',
        phase: 'STAGE 02',
        title: 'Active Internships',
        status: 'current',
        badgeLabel: `${classes.length} Sections`,
        kpiValue: `${activePlacements.length} Interns`,
        kpiSubLabel: 'Across Verified Placements',
        detail: `${classes.length} coordinator-led class spaces`,
        to: 'classes',
        icon: Users,
      },
      {
        id: 'coor-evals',
        phase: 'STAGE 03',
        title: 'Competency Reviews',
        status: 'current',
        badgeLabel: 'Active Framework',
        kpiValue: `${data.evaluations.length} Assessments`,
        kpiSubLabel: 'Submitted Mentor Rubrics',
        detail: 'Rubric comparisons across sections',
        to: 'competencies',
        icon: Award,
      },
      {
        id: 'coor-support',
        phase: 'STAGE 04',
        title: 'Student Support & Exit',
        status: openCases.length === 0 ? 'completed' : 'current',
        badgeLabel: openCases.length === 0 ? 'No Tickets' : 'Action Needed',
        kpiValue: `${openCases.length} Cases`,
        kpiSubLabel: 'Private SOS / Support Reports',
        detail: openCases.length === 0 ? 'All support cases resolved' : 'Requires coordinator response',
        to: 'incidents',
        icon: LifeBuoy,
      },
    ];

    currentPhaseLabel = 'Cohort Monitoring Matrix';
  } else {
    // Super Admin view
    const disabledUsers = data.users.filter(u => u.status === 'DISABLED').length;
    const activePlacements = data.placements.filter(p => p.status === 'ACTIVE');

    steps = [
      {
        id: 'adm-accounts',
        phase: 'SYSTEM 01',
        title: 'Accounts & Access',
        status: 'completed',
        badgeLabel: 'Synced',
        kpiValue: `${data.users.length} Users`,
        kpiSubLabel: `${disabledUsers} disabled accounts`,
        detail: 'Provision sample accounts and manage roles',
        to: 'accounts',
        icon: ShieldCheck,
      },
      {
        id: 'adm-academics',
        phase: 'SYSTEM 02',
        title: 'University Structure',
        status: 'completed',
        badgeLabel: 'Academic',
        kpiValue: `${data.departments.length} Depts`,
        kpiSubLabel: `${data.courses.length} accredited courses`,
        detail: 'Rizal Technological University departments & curricula',
        to: 'institution',
        icon: GraduationCap,
      },
      {
        id: 'adm-classes',
        phase: 'SYSTEM 03',
        title: 'Sections & Cohorts',
        status: 'current',
        badgeLabel: 'Active Sections',
        kpiValue: `${data.classes.length} Classes`,
        kpiSubLabel: 'Coordinator-led spaces',
        detail: 'Enrollment codes & student memberships',
        to: 'classes',
        icon: BookOpen,
      },
      {
        id: 'adm-placements',
        phase: 'SYSTEM 04',
        title: 'Active Placements',
        status: 'current',
        badgeLabel: 'Fieldwork',
        kpiValue: `${activePlacements.length} Placements`,
        kpiSubLabel: 'Institutional records in view',
        detail: `${data.companies.length} verified partner establishments`,
        to: 'attendance',
        icon: BriefcaseBusiness,
      },
    ];

    currentPhaseLabel = 'Institutional Operations Matrix';
  }

  return (
    <section className="practicum-stepper-card" aria-label="Unified OJT Lifecycle & Metrics">
      <div className="stepper-header">
        <div className="stepper-header-left">
          <div className="stepper-eyebrow">
            <Compass size={13} className="stepper-eyebrow-icon" />
            <span>PRACTICUM LIFECYCLE &amp; KEY METRICS</span>
          </div>
          <h2 className="stepper-title">OJT Progression Overview</h2>
        </div>

        <div className="stepper-badge">
          <Sparkles size={12} className="stepper-badge-icon" />
          <span>{currentPhaseLabel}</span>
        </div>
      </div>

      <div className="stepper-track">
        {steps.map(step => {
          const Icon = step.icon;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <div
              key={step.id}
              className={`stepper-step step-${step.status}`}
              onClick={() => navigate(step.to)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(step.to);
                }
              }}
              title={`Click to open ${step.title}`}
            >
              {/* Card Top: Node icon + Phase label + Status badge */}
              <div className="step-card-top">
                <div className="step-node">
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <Icon size={14} />
                  )}
                </div>
                <div className="step-meta">
                  <span className="step-phase">{step.phase}</span>
                  <strong className="step-title">{step.title}</strong>
                </div>
                <span className={`step-chip chip-${step.status}`}>
                  {step.badgeLabel}
                </span>
              </div>

              {/* Card Middle: Big KPI Value & Sub-label */}
              <div className="step-kpi-wrap">
                <div className="step-kpi-val">{step.kpiValue}</div>
                <div className="step-kpi-sub">{step.kpiSubLabel}</div>
              </div>

              {/* Progress bar if present (e.g. for training hours) */}
              {typeof step.progressPercent === 'number' && (
                <div className="step-progress-bar" title={`${step.progressPercent}% target logged`}>
                  <div
                    className="step-progress-fill"
                    style={{width: `${step.progressPercent}%`} as React.CSSProperties}
                  />
                </div>
              )}

              {/* Card Bottom: Secondary detail + navigation prompt */}
              <div className="step-card-bottom">
                <span className="step-detail">{step.detail}</span>
                <span className="step-action-hint">
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
