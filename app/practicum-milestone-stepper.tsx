'use client';

import {useEffect, useRef, useState} from 'react';
import type {LucideIcon} from 'lucide-react';
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
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
import {Popover, PopoverTrigger, PopoverContent} from '@/components/ui/popover';
import type {Snapshot} from '@/packages/validation/contracts';
import {studentForecastDetail, studentForecastLabel, studentGoal} from './student-goal';

interface MilestoneStepperProps {
  data: Snapshot;
  navigate: (page: string) => void;
}

type StepStatus = 'completed' | 'current' | 'upcoming' | 'clear' | 'attention' | 'empty';

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
  metrics?: {label: string; value: string}[];
}

const hours = (minutes: number) => `${Number((minutes / 60).toFixed(1))} hrs`;
const formatLogDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day
    ? new Intl.DateTimeFormat('en-PH', {month: 'short', day: 'numeric', year: 'numeric'}).format(
        new Date(year, month - 1, day)
      )
    : value;
};

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
    const targetMinutes = Number(placement?.requiredMinutes ?? 0);
    const goal = studentGoal(ownEntries, targetMinutes, data.calendarEvents);
    const reportedMinutes = goal.reported;
    const percent = goal.percent;

    const documents = placement
      ? data.documents.filter(d => d.placementId === placement.id)
      : [];
    const approvedDocs = documents.filter(d => d.status === 'APPROVED');
    const pendingDocs = documents.filter(d => d.status === 'PENDING');
    const rejectedDocs = documents.filter(d => d.status === 'REJECTED');

    const evaluations = placement
      ? data.evaluations.filter(e => e.placementId === placement.id && (e.kind === 'WEEKLY' || e.kind === 'MONTHLY'))
      : [];
    const approvedEvaluations = evaluations.filter(e => e.status === 'APPROVED');

    const completion = placement
      ? data.completion.find(c => c.placementId === placement.id)
      : undefined;

    const daysOnRecord = goal.daysOnRecord;
    const pendingEntries = ownEntries.filter(e => e.confirmedVersion !== e.version);
    const pendingMinutes = pendingEntries.reduce((sum, e) => sum + Math.max(0, Number(e.minutes) || 0), 0);
    const latestLogValue = ownEntries.map(e => String(e.date ?? '')).filter(Boolean).sort().at(-1);
    const latestLog = latestLogValue ? formatLogDate(latestLogValue) : 'No entries yet';
    // Step 1: Pre-Deployment & Prerequisite Clearances
    const step1Complete =
      Boolean(placement) &&
      documents.length > 0 && approvedDocs.length === documents.length;
    const step1Status: StepStatus = step1Complete
      ? 'completed'
      : placement ? 'current' : 'empty';

    // Step 2: Active Training & DTR Hours
    const step2Complete = targetMinutes > 0 && goal.verifiedRemaining === 0;
    const step2Status: StepStatus = step2Complete
      ? 'completed'
      : step1Complete || reportedMinutes > 0
      ? 'current'
      : 'upcoming';

    // Step 3: Period competency assessment
    const step3Complete = approvedEvaluations.length > 0;
    const step3Status: StepStatus = step3Complete
      ? 'completed'
      : evaluations.length > 0 ? 'current' : 'upcoming';

    // Step 4: Final Clearance & Portfolio
    const step4Complete = completion?.status === 'APPROVED';
    const step4Status: StepStatus = step4Complete
      ? 'completed'
      : step1Complete && step2Complete && step3Complete
      ? 'current'
      : 'upcoming';

    steps = [
      {
        id: 'docs',
        phase: 'PHASE 01',
        title: 'Pre-Deployment',
        status: step1Status,
        badgeLabel: step1Complete ? 'Completed' : placement ? 'Needs clearance' : 'Awaiting placement',
        kpiValue: `${approvedDocs.length} / ${documents.length}`,
        kpiSubLabel: 'Prerequisite Clearances',
        detail:
          !placement
            ? 'A placement must be assigned before required clearances are available.'
            : documents.length === 0
            ? 'No clearance records yet; this phase is not complete.'
            : pendingDocs.length || rejectedDocs.length
            ? `${pendingDocs.length} awaiting review · ${rejectedDocs.length} need correction`
            : 'All recorded clearances are approved.',
        to: 'documents',
        icon: FileCheck2,
        metrics: [
          {label: 'Approved', value: String(approvedDocs.length)},
          {label: 'Awaiting review', value: String(pendingDocs.length)},
          {label: 'Need correction', value: String(rejectedDocs.length)},
          {label: 'Total records', value: String(documents.length)},
        ],
      },
      {
        id: 'hours',
        phase: 'PHASE 02',
        title: 'Active Training',
        status: step2Status,
        badgeLabel: step2Complete ? 'Hours verified' : targetMinutes > 0 ? 'In progress' : 'Target not set',
        kpiValue: hours(reportedMinutes),
        kpiSubLabel: targetMinutes > 0 ? `${percent}% of ${hours(targetMinutes)} goal` : 'Hours on record',
        detail: 'Reported hours count toward the target. Hours alone do not certify academic completion.',
        to: 'attendance',
        icon: Clock,
        progressPercent: percent,
        metrics: [
          {label: 'Reported', value: hours(goal.reported)},
          {label: 'Required', value: goal.target ? hours(goal.target) : 'Not set'},
          {label: 'Remaining', value: goal.target ? hours(goal.remaining) : '—'},
          {label: 'Expected completion', value: studentForecastLabel(goal.forecast)},
          {label: 'Estimate basis', value: studentForecastDetail(goal.forecast)},
          {label: 'Awaiting final Industry Partner verification', value: `${hours(pendingMinutes)} · ${pendingEntries.length} DTRs`},
          {label: 'Submitted DTRs', value: String(ownEntries.length)},
          {label: 'Days on record', value: String(daysOnRecord)},
          {label: 'Reported average per day', value: daysOnRecord ? hours(goal.averagePerDay) : '—'},
          {label: 'Latest log', value: latestLog},
        ],
      },
      {
        id: 'eval',
        phase: 'PHASE 03',
        title: 'Skills Appraisal',
        status: step3Status,
        badgeLabel: step3Complete ? 'Completed' : evaluations.length > 0 ? 'In Review' : 'Upcoming',
        kpiValue: evaluations.length > 0 ? `${evaluations.length} Rubric${evaluations.length > 1 ? 's' : ''}` : 'Pending',
        kpiSubLabel: 'Weekly / Monthly Review',
        detail:
          evaluations.length > 0
            ? `${approvedEvaluations.length} approved · ${evaluations.length - approvedEvaluations.length} awaiting review or revision`
            : 'Choose a period in Competency Insights',
        to: 'competencies',
        icon: Award,
        metrics: [
          {label: 'Approved', value: String(approvedEvaluations.length)},
          {label: 'Awaiting review or revision', value: String(evaluations.length - approvedEvaluations.length)},
          {label: 'Total appraisals', value: String(evaluations.length)},
        ],
      },
      {
        id: 'clearance',
        phase: 'PHASE 04',
        title: 'Final Clearance',
        status: step4Status,
        badgeLabel: step4Complete ? 'Cleared' : step4Status === 'current' ? 'Awaiting approval' : 'Not cleared',
        kpiValue: step4Complete ? 'Cleared' : 'Not cleared',
        kpiSubLabel: 'Formal completion record',
        detail: step4Complete
          ? 'Formal completion is recorded as approved.'
          : 'Only an approved formal completion record clears this phase. Hours alone are not sufficient.',
        to: 'portfolio',
        icon: GraduationCap,
        metrics: [
          {label: 'Formal record', value: String(completion?.status ?? 'Not recorded').replaceAll('_', ' ')},
        ],
      },
    ];

    currentPhaseLabel =
      step4Complete
        ? 'Stage 4 of 4 · Practicum Cleared'
        : step4Status === 'current'
        ? 'Stage 4 of 4 · Final Sign-Off'
        : step3Status === 'current'
        ? 'Stage 3 of 4 · Skills Appraisal'
        : !step1Complete
        ? 'Next milestone · Pre-Deployment'
        : 'Stage 2 of 4 · Active Training';
  } else if (role === 'COORDINATOR') {
    const classes = data.classes.filter(c => !Number(c.revoked));
    const activePlacements = data.placements.filter(p => p.status === 'ACTIVE');
    const pendingDocuments = data.documents.filter(d => d.status === 'PENDING');
    const approvedDocs = data.documents.filter(d => d.status === 'APPROVED');
    const openCases = data.incidents.filter(i => i.status !== 'RESOLVED');
    const periodReviews = data.evaluations.filter(e => e.kind === 'WEEKLY' || e.kind === 'MONTHLY');
    const submittedReviews = periodReviews.filter(e => e.status === 'SUBMITTED');
    const confirmedMinutes = data.entries.filter(e => e.confirmedVersion === e.version)
      .reduce((sum, e) => sum + Math.max(0, Number(e.minutes) || 0), 0);
    const reportedMinutes = data.entries.reduce((sum, e) => sum + Math.max(0, Number(e.minutes) || 0), 0);
    const dtrsToConfirm = (data.finalDtrReopens ?? []).filter(r => r.status === 'PENDING').length;
    const averageProgress = data.placements.length
      ? Math.round(data.placements.reduce((sum, placement) => {
          const entries = data.entries.filter(entry => entry.placementId === placement.id);
          const progress = studentGoal(entries, Math.max(0, Number(placement.requiredMinutes) || 0)).percent;
          return sum + Math.min(100, progress);
        }, 0) / data.placements.length)
      : 0;

    steps = [
      {
        id: 'coor-docs',
        phase: 'STAGE 01',
        title: 'Document Clearances',
        status: pendingDocuments.length ? 'attention' : data.documents.length ? 'clear' : 'empty',
        badgeLabel: pendingDocuments.length ? 'Needs review' : data.documents.length ? 'Queue clear' : 'No records',
        kpiValue: `${approvedDocs.length} / ${data.documents.length}`,
        kpiSubLabel: 'Approved Submissions',
        detail: `${pendingDocuments.length} pending review queue`,
        to: 'documents',
        icon: FileCheck2,
        metrics: [
          {label: 'Approved', value: String(approvedDocs.length)},
          {label: 'Awaiting review', value: String(pendingDocuments.length)},
          {label: 'Total submissions', value: String(data.documents.length)},
        ],
      },
      {
        id: 'coor-classes',
        phase: 'STAGE 02',
        title: 'Active Internships',
        status: activePlacements.length ? 'current' : 'empty',
        badgeLabel: activePlacements.length ? 'Active' : 'No placements',
        kpiValue: `${activePlacements.length} Interns`,
        kpiSubLabel: 'Across Verified Placements',
        detail: `${classes.length} coordinator-led class spaces`,
        to: 'classes',
        icon: Users,
        metrics: [
          {label: 'Students in roster', value: String(data.placements.length)},
          {label: 'Active placements', value: String(activePlacements.length)},
          {label: 'Class spaces', value: String(classes.length)},
          {label: 'Average reported progress', value: `${averageProgress}%`},
          {label: 'Reported hours · all records', value: hours(reportedMinutes)},
          {label: 'Confirmed hours · all records', value: hours(confirmedMinutes)},
          {label: 'DTR reopening requests', value: String(dtrsToConfirm)},
        ],
      },
      {
        id: 'coor-evals',
        phase: 'STAGE 03',
        title: 'Competency Reviews',
        status: submittedReviews.length ? 'attention' : periodReviews.length ? 'clear' : 'empty',
        badgeLabel: submittedReviews.length ? 'Needs review' : periodReviews.length ? 'Queue clear' : 'No appraisals',
        kpiValue: `${periodReviews.length} Assessments`,
        kpiSubLabel: 'Weekly / Monthly Rubrics',
        detail: 'Student self-assessments for coordinator review',
        to: 'competencies',
        icon: Award,
        metrics: [
          {label: 'Awaiting review', value: String(submittedReviews.length)},
          {label: 'Approved', value: String(periodReviews.filter(e => e.status === 'APPROVED').length)},
          {label: 'Total appraisals', value: String(periodReviews.length)},
        ],
      },
      {
        id: 'coor-support',
        phase: 'STAGE 04',
        title: 'Student Support & Exit',
        status: openCases.length ? 'attention' : 'clear',
        badgeLabel: openCases.length ? 'Needs attention' : 'Queue clear',
        kpiValue: `${openCases.length} Cases`,
        kpiSubLabel: 'Private SOS / Support Reports',
        detail: openCases.length === 0 ? 'No student support cases are currently open' : 'Requires coordinator response',
        to: 'incidents',
        icon: LifeBuoy,
        metrics: [{label: 'Open support cases', value: String(openCases.length)}],
      },
    ];

    currentPhaseLabel = 'Cohort Monitoring Matrix';
  } else {
    // Super Admin view
    const studentAccounts = data.studentAccountSummary ?? [];
    const studentCount = studentAccounts.reduce((total, course) => total + Number(course.total ?? 0), 0);
    const disabledStudents = studentAccounts.reduce((total, course) => total + Number(course.disabled ?? 0), 0);
    const officeAccounts = data.users.filter(user => user.role !== 'STUDENT');
    const totalAccounts = officeAccounts.length + studentCount;
    const disabledUsers = officeAccounts.filter(user => user.status === 'DISABLED').length + disabledStudents;
    const pendingCompanies = data.companies.filter(company => company.status === 'PENDING');
    const verifiedCompanies = data.companies.filter(company => company.status === 'APPROVED');
    const pendingPosts = data.jobs.filter(job => job.status === 'DRAFT');
    const publishedPosts = data.jobs.filter(job => job.status === 'PUBLISHED');

    steps = [
      {
        id: 'adm-accounts',
        phase: 'SYSTEM 01',
        title: 'Accounts & Access',
        status: totalAccounts ? 'current' : 'empty',
        badgeLabel: totalAccounts ? 'Active' : 'No accounts',
        kpiValue: `${totalAccounts} Accounts`,
        kpiSubLabel: `${disabledUsers} disabled accounts`,
        detail: 'Provision sample accounts and manage roles',
        to: 'accounts',
        icon: ShieldCheck,
        metrics: [
          {label: 'Accounts', value: String(totalAccounts)},
          {label: 'Students', value: String(studentCount)},
          {label: 'Office & staff', value: String(officeAccounts.length)},
          {label: 'Disabled', value: String(disabledUsers)},
        ],
      },
      {
        id: 'adm-academics',
        phase: 'SYSTEM 02',
        title: 'University Structure',
        status: data.departments.length || data.courses.length ? 'current' : 'empty',
        badgeLabel: data.departments.length || data.courses.length ? 'Active' : 'No structure',
        kpiValue: `${data.departments.length} Depts`,
        kpiSubLabel: `${data.courses.length} accredited courses`,
        detail: 'Rizal Technological University departments & curricula',
        to: 'institution',
        icon: GraduationCap,
        metrics: [
          {label: 'Departments', value: String(data.departments.length)},
          {label: 'Courses', value: String(data.courses.length)},
        ],
      },
      {
        id: 'adm-partners',
        phase: 'SYSTEM 03',
        title: 'Training Partners',
        status: pendingCompanies.length ? 'attention' : data.companies.length ? 'clear' : 'empty',
        badgeLabel: pendingCompanies.length ? 'Needs verification' : data.companies.length ? 'Up to date' : 'No partners',
        kpiValue: `${data.companies.length} Partners`,
        kpiSubLabel: `${pendingCompanies.length} awaiting verification`,
        detail: 'Verify organizations that want to host students',
        to: 'jobs',
        icon: BriefcaseBusiness,
        metrics: [
          {label: 'Awaiting verification', value: String(pendingCompanies.length)},
          {label: 'Verified partners', value: String(verifiedCompanies.length)},
          {label: 'Total profiles', value: String(data.companies.length)},
        ],
      },
      {
        id: 'adm-posts',
        phase: 'SYSTEM 04',
        title: 'Internship Approvals',
        status: pendingPosts.length ? 'attention' : data.jobs.length ? 'clear' : 'empty',
        badgeLabel: pendingPosts.length ? 'Needs review' : data.jobs.length ? 'Queue clear' : 'No postings',
        kpiValue: `${pendingPosts.length} Pending`,
        kpiSubLabel: `${publishedPosts.length} published openings`,
        detail: 'Review internship posts before they appear to students',
        to: 'jobs',
        icon: ShieldCheck,
        metrics: [
          {label: 'Awaiting approval', value: String(pendingPosts.length)},
          {label: 'Published openings', value: String(publishedPosts.length)},
          {label: 'Total posts', value: String(data.jobs.length)},
        ],
      },
    ];

    currentPhaseLabel = 'University Office Overview';
  }

  const [active, setActive] = useState<{id: string; pinned: boolean} | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStudent = role === 'STUDENT';
  const completedCount = isStudent ? steps.filter(step => step.status === 'completed').length : 0;
  let completedPrefix = 0;
  while (isStudent && steps[completedPrefix]?.status === 'completed') completedPrefix++;
  const nextStep = isStudent ? steps.find(step => step.status !== 'completed') : undefined;

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const preview = (id: string) => {
    cancelClose();
    setActive(current => current?.pinned && current.id === id ? current : {id, pinned: false});
  };
  const scheduleClose = (id: string) => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setActive(current => current?.id === id && !current.pinned ? null : current);
    }, 180);
  };
  const togglePinned = (id: string) => {
    cancelClose();
    setActive(current => current?.id === id && current.pinned ? null : {id, pinned: true});
  };

  return (
    <section className="practicum-stepper-card" aria-label="Practicum lifecycle and key metrics">
      <div className="stepper-header">
        <div className="stepper-header-left">
          <div className="stepper-eyebrow">
            <Compass size={13} className="stepper-eyebrow-icon" />
            <span>PRACTICUM LIFECYCLE &amp; KEY METRICS</span>
          </div>
          <h2 className="stepper-title">{isStudent ? 'Your practicum phases' : 'Areas in your practicum workspace'}</h2>
          <p className="stepper-subtitle">
            {isStudent
              ? nextStep ? `Next milestone: ${nextStep.title}` : 'Formal clearance recorded'
              : 'Select an area to see its current details.'}
          </p>
        </div>
        <div className="stepper-badge">
          <Sparkles size={12} className="stepper-badge-icon" />
          <span>{isStudent ? `${completedCount} of 4 milestones recorded` : currentPhaseLabel}</span>
        </div>
      </div>

      <div className="phase-track" role="list" aria-label={isStudent ? 'Student practicum phases' : 'Practicum operations areas'}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isOpen = active?.id === step.id;
          return (
            <div
              role="listitem"
              key={step.id}
              className={`phase-item phase-${step.status}${isStudent && index < completedPrefix - 1 ? ' phase-connector-complete' : ''}`}
            >
              <Popover
                open={isOpen}
                onOpenChange={open => {
                  if (!open) setActive(current => current?.id === step.id ? null : current);
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    id={`phase-trigger-${step.id}`}
                    type="button"
                    className="phase-trigger"
                    aria-label={`${step.phase}, ${step.title}, ${step.badgeLabel}. Press Enter for details.`}
                    aria-expanded={isOpen}
                    aria-controls={`phase-detail-${step.id}`}
                    onPointerEnter={event => {if (event.pointerType !== 'touch') preview(step.id);}}
                    onPointerLeave={event => {if (event.pointerType !== 'touch') scheduleClose(step.id);}}
                    onFocus={() => preview(step.id)}
                    onBlur={() => scheduleClose(step.id)}
                    onClick={event => {
                      event.preventDefault();
                      togglePinned(step.id);
                      if (event.detail === 0) {
                        requestAnimationFrame(() => document.getElementById(`phase-link-${step.id}`)?.focus());
                      }
                    }}
                    onKeyDown={event => {if (event.key === 'Escape') setActive(null);}}
                  >
                    <span className="phase-node" aria-hidden="true">
                      {isStudent
                        ? step.status === 'completed' ? <Check size={20} strokeWidth={3} /> : <span>{index + 1}</span>
                        : <span className="phase-state-dot" />}
                    </span>
                    <span className="phase-text">
                      <span className="phase-number">{step.phase}</span>
                      <strong className="phase-title">{step.title}</strong>
                      <span className="phase-status">{step.badgeLabel}</span>
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  id={`phase-detail-${step.id}`}
                  className="phase-detail-card"
                  side="bottom"
                  align="center"
                  sideOffset={12}
                  collisionPadding={12}
                  onOpenAutoFocus={event => event.preventDefault()}
                  onCloseAutoFocus={event => event.preventDefault()}
                  onPointerEnter={cancelClose}
                  onPointerLeave={() => scheduleClose(step.id)}
                  onPointerDownOutside={event => {
                    const target = event.target;
                    if (target instanceof Element && target.closest('.phase-trigger')) event.preventDefault();
                  }}
                  onEscapeKeyDown={() => {
                    setActive(null);
                    requestAnimationFrame(() => document.getElementById(`phase-trigger-${step.id}`)?.focus());
                  }}
                  onFocus={cancelClose}
                  onBlur={() => scheduleClose(step.id)}
                >
                  <div className="phase-detail-header">
                    <span className={`phase-detail-icon phase-${step.status}`}><Icon size={17} /></span>
                    <div><span>{step.phase}</span><h3>{step.title}</h3></div>
                    <span className={`phase-detail-status phase-${step.status}`}>{step.badgeLabel}</span>
                  </div>
                  <p className="phase-detail-description">{step.detail}</p>
                  <dl className="phase-detail-metrics">
                    {(step.metrics ?? [
                      {label: step.kpiSubLabel, value: step.kpiValue},
                    ]).map(metric => (
                      <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>
                    ))}
                  </dl>
                  <button
                    id={`phase-link-${step.id}`}
                    type="button"
                    className="phase-detail-link"
                    onClick={() => {setActive(null); navigate(step.to);}}
                  >
                    Open {step.title}<ArrowRight size={15} />
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          );
        })}
      </div>
      {isStudent && <p className="phase-disclaimer">Hours progress and estimates do not certify formal completion.</p>}
    </section>
  );
}
