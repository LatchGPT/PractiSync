'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  FolderOpen,
  CheckCircle2,
  Clock,
  FileText,
  FileCheck2,
  AlertCircle,
  Building2,
  Users,
  X,
  Eye,
  UploadCloud,
  FileBox,
  Check,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Lock,
  GraduationCap,
  ShieldCheck,
  Download,
  AlertTriangle,
  CalendarDays,
  Award,
  Layers,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import type { Snapshot, Identity, Role, Row, Action } from '@/packages/validation/contracts';
import { toast } from 'sonner';
import styles from './student-portfolio.module.css';
import SelfAssessmentModal from './self-assessment-modal';

export type RequirementPhase = 'PRE_OJT' | 'POST_OJT';
export type RequirementStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED';

export interface PortfolioDocumentRequirement {
  id: string;
  code: string;
  name: string;
  phase: RequirementPhase;
  phaseLabel: string;
  description: string;
  status: RequirementStatus;
  mandatory: boolean;
  filename?: string;
  submissionDate?: string;
  dueDate: string;
  isOverdue: boolean;
  version: number;
  reviewReason?: string | null;
  reviewerName?: string;
  fileSize?: string;
  formatAccepted: string;
}

export type AssessmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEWED';

export interface PortfolioAssessmentItem {
  id: string;
  code: string;
  name: string;
  stage: string;
  description: string;
  status: AssessmentStatus;
  statusLabel: string;
  dueDate: string;
  isOverdue: boolean;
  submittedDate?: string;
  version?: number;
  scores?: { label: string; score: number; maxScore: number }[];
  feedback?: string;
  evaluator?: string;
  actionKind: 'self_assessment' | 'completion_form' | 'view_only';
  actionLabel: string;
}

interface StudentPortfolioViewProps {
  data: Snapshot;
  user: Identity;
  role: Role;
  ownPlacement?: Row | null;
  onExportPdf?: (targetPlacement?: Row) => Promise<void> | void;
  isExporting?: boolean;
  onViewStudent?: (studentId: string) => void;
  onNavigate?: (page: string) => void;
  onAction?: (action: Action, values: Record<string, unknown>) => Promise<unknown>;
}

export default function StudentPortfolioView({
  data,
  user,
  role,
  ownPlacement,
  onExportPdf,
  isExporting = false,
  onViewStudent,
  onNavigate,
  onAction,
}: StudentPortfolioViewProps) {
  const [showSelfAssessmentModal, setShowSelfAssessmentModal] = useState(false);

  // Sub-navigation tab: 'overview' | 'documents' | 'assessments'
  const [activeTrackerTab, setActiveTrackerTab] = useState<'overview' | 'documents' | 'assessments'>('overview');

  // Privacy & Access Control:
  // For STUDENT role, strictly lock to user's own identity.
  // Coordinators and Super Admins may switch students to review class records.
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    role === 'STUDENT' ? user.id : String(data.placements[0]?.studentId ?? user.id)
  );

  // Active Placement Resolution
  const activePlacement = useMemo(() => {
    if (role === 'STUDENT') {
      return ownPlacement ?? data.placements.find(p => p.studentId === user.id) ?? data.placements[0];
    }
    return (
      data.placements.find(p => p.studentId === selectedStudentId) ??
      ownPlacement ??
      data.placements[0]
    );
  }, [role, selectedStudentId, ownPlacement, data.placements, user.id]);

  // Target Student Metadata
  const targetStudentName = String(activePlacement?.studentName ?? user.name);
  const targetSection = String(activePlacement?.section ?? 'BSIT 4-1');
  const targetCompany = String(activePlacement?.companyName ?? 'Host Training Establishment');

  const targetCourseName = useMemo(() => {
    const courseName = (
      data.courses?.find(c => c.id === activePlacement?.courseId)?.name ??
      'Bachelor of Science in Information Technology'
    );
    return courseName.replace(/^BS\s+/, 'Bachelor of Science in ');
  }, [data.courses, activePlacement]);

  const yearAndBlock = useMemo(() => {
    const m = targetSection.match(/(?:^|\s)(\d+)(?:-([A-Za-z0-9]+))?/);
    if (!m) return `4th Year · Section ${targetSection}`;
    const yr = parseInt(m[1], 10);
    const sfx = yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : `${yr}th`;
    const block = m[2] ? `Block ${m[2]}` : `Section ${targetSection}`;
    return `${sfx} Year · ${block}`;
  }, [targetSection]);

  const studentInitials = useMemo(() => {
    return (
      targetStudentName
        .split(' ')
        .filter(Boolean)
        .map(p => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'ST'
    );
  }, [targetStudentName]);

  // Database Documents
  const studentDocuments = useMemo(() => {
    return data.documents.filter(d => d.placementId === activePlacement?.id);
  }, [data.documents, activePlacement]);

  // Evaluations & Completion
  const studentEvaluations = useMemo(() => {
    return data.evaluations.filter(e => e.placementId === activePlacement?.id);
  }, [data.evaluations, activePlacement]);

  const studentCompletion = useMemo(() => {
    return data.completion.find(c => c.placementId === activePlacement?.id);
  }, [data.completion, activePlacement]);

  // Self-Assessment Baseline
  const baselineEvaluation = useMemo(() => {
    return studentEvaluations.find(e => e.kind === 'BASELINE');
  }, [studentEvaluations]);

  const hteEvaluation = useMemo(() => {
    return studentEvaluations.find(e => e.kind === 'FINAL');
  }, [studentEvaluations]);

  const cadenceEvaluations = useMemo(() => {
    return studentEvaluations.filter(e => e.kind === 'WEEKLY' || e.kind === 'MONTHLY');
  }, [studentEvaluations]);

  const baselineScores = useMemo(() => {
    if (!baselineEvaluation) return [];
    return data.scores.filter(s => s.evaluationId === baselineEvaluation.id);
  }, [data.scores, baselineEvaluation]);

  const assessmentSchedule = useMemo(() => {
    return data.assessmentSchedules?.find(s => s.courseId === activePlacement?.courseId);
  }, [data.assessmentSchedules, activePlacement]);

  // Local overrides for student submissions
  const [customOverrides, setCustomOverrides] = useState<
    Record<string, { status: RequirementStatus; filename: string; submissionDate: string; reason?: string }>
  >({});

  // Document stage filter
  const [selectedPhase, setSelectedPhase] = useState<string>('ALL');

  // Modals state
  const [inspectDoc, setInspectDoc] = useState<PortfolioDocumentRequirement | null>(null);
  const [uploadDoc, setUploadDoc] = useState<PortfolioDocumentRequirement | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Calendar Deadlines (for items due soon or overdue)
  const activeDeadlines = useMemo(() => {
    return (data.calendarEvents ?? [])
      .filter(e => String(e.eventType) === 'DEADLINE' && String(e.status) !== 'CANCELLED')
      .map(e => ({
        id: String(e.id),
        title: String(e.title),
        date: String(e.endDate || e.startDate),
        description: String(e.description ?? ''),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.calendarEvents]);

  // =========================================================
  // 1. Exact 6 Practicum Documents (Grouped by OJT Stage)
  // Stage 1: Pre-Deployment (4)
  // Stage 2: After OJT (2)
  // =========================================================
  const requirementsList = useMemo<PortfolioDocumentRequirement[]>(() => {
    const findDoc = (keywords: string[]) => {
      return studentDocuments.find(d => {
        const docName = String(d.name ?? '').toLowerCase();
        return keywords.some(k => docName.includes(k.toLowerCase()));
      });
    };

    const moaDoc = findDoc(['agreement', 'moa', 'recommendation']);
    const consentDoc = findDoc(['consent', 'parent', 'guardian']);
    const medicalDoc = findDoc(['medical', 'health', 'clinic']);
    const regDoc = findDoc(['registration', 'information sheet', 'cor', 'enrollment']);

    const list: PortfolioDocumentRequirement[] = [
      // 1. Pre-Deployment: Recommendation Form MOA
      {
        id: 'doc-moa',
        code: 'PRE-01',
        name: 'Recommendation Form MOA',
        phase: 'PRE_OJT',
        phaseLabel: 'Pre-Deployment',
        description:
          'Official RTU Recommendation Form and Memorandum of Agreement (MOA) between Rizal Technological University, the Host Training Establishment (HTE), and the student.',
        status:
          customOverrides['doc-moa']?.status ??
          (moaDoc?.status as RequirementStatus) ??
          'APPROVED',
        mandatory: true,
        dueDate: 'Aug 15, 2026',
        isOverdue: false,
        version: Number(moaDoc?.version ?? 1),
        filename:
          customOverrides['doc-moa']?.filename ??
          (moaDoc?.filename ? String(moaDoc.filename) : 'Recommendation_Form_MOA_Signed.pdf'),
        submissionDate: customOverrides['doc-moa']?.submissionDate ?? 'Aug 04, 2026',
        reviewReason:
          customOverrides['doc-moa']?.reason ??
          (moaDoc?.reason ? String(moaDoc.reason) : 'Verified and endorsed by Practicum Coordinator.'),
        reviewerName: 'Assigned Practicum Coordinator',
        fileSize: '1.8 MB',
        formatAccepted: 'PDF (.pdf)',
      },

      // 2. Pre-Deployment: COE Form: Parent's Consent
      {
        id: 'doc-consent',
        code: 'PRE-02',
        name: "COE Form: Parent's Consent",
        phase: 'PRE_OJT',
        phaseLabel: 'Pre-Deployment',
        description:
          "College of Engineering (COE) official Parental / Guardian Consent and Liability Waiver authorizing the student's practicum deployment.",
        status:
          customOverrides['doc-consent']?.status ??
          (consentDoc?.status as RequirementStatus) ??
          'PENDING',
        mandatory: true,
        dueDate: 'Aug 15, 2026',
        isOverdue: false,
        version: Number(consentDoc?.version ?? 1),
        filename:
          customOverrides['doc-consent']?.filename ??
          (consentDoc?.filename ? String(consentDoc.filename) : 'COE_Form_Parents_Consent_Signed.pdf'),
        submissionDate: customOverrides['doc-consent']?.submissionDate ?? 'Aug 10, 2026',
        reviewReason:
          customOverrides['doc-consent']?.reason ??
          (consentDoc?.reason ? String(consentDoc.reason) : 'Submitted on time. Pending final coordinator signature and verification.'),
        reviewerName: 'Assigned Practicum Coordinator',
        fileSize: '950 KB',
        formatAccepted: 'PDF (.pdf)',
      },

      // 3. Pre-Deployment: Medical Clearance
      {
        id: 'doc-medical',
        code: 'PRE-03',
        name: 'Medical Clearance',
        phase: 'PRE_OJT',
        phaseLabel: 'Pre-Deployment',
        description:
          'Fit-to-work health examination certificate issued by an accredited clinic / university medical office confirming student readiness for workplace training.',
        status:
          customOverrides['doc-medical']?.status ??
          (medicalDoc?.status as RequirementStatus) ??
          'APPROVED',
        mandatory: true,
        dueDate: 'Aug 15, 2026',
        isOverdue: false,
        version: Number(medicalDoc?.version ?? 1),
        filename:
          customOverrides['doc-medical']?.filename ??
          (medicalDoc?.filename ? String(medicalDoc.filename) : 'Medical_Clearance_Certificate.pdf'),
        submissionDate: customOverrides['doc-medical']?.submissionDate ?? 'Aug 08, 2026',
        reviewReason:
          customOverrides['doc-medical']?.reason ??
          (medicalDoc?.reason ? String(medicalDoc.reason) : 'Validated by RTU Clinic & Practicum Coordinator.'),
        reviewerName: 'RTU Clinic / Coordinator',
        fileSize: '1.4 MB',
        formatAccepted: 'PDF (.pdf), Image (.jpg, .png)',
      },

      // 4. Pre-Deployment: Registration
      {
        id: 'doc-registration',
        code: 'PRE-04',
        name: 'Certificate of Registration (COR)',
        phase: 'PRE_OJT',
        phaseLabel: 'Pre-Deployment',
        description:
          'Official Certificate of Registration (COR) / Enrollment Assessment Form verifying official semester enrollment in Practicum / OJT course.',
        status:
          customOverrides['doc-registration']?.status ??
          (regDoc?.status as RequirementStatus) ??
          (studentDocuments.some(d => d.status === 'REJECTED') ? 'REJECTED' : 'APPROVED'),
        mandatory: true,
        dueDate: 'Aug 15, 2026',
        isOverdue: true, // Past due date with rejected status
        version: Number(regDoc?.version ?? 1),
        filename:
          customOverrides['doc-registration']?.filename ??
          (regDoc?.filename ? String(regDoc.filename) : 'Certificate_of_Registration_COR.pdf'),
        submissionDate: customOverrides['doc-registration']?.submissionDate ?? 'Aug 12, 2026',
        reviewReason:
          customOverrides['doc-registration']?.reason ??
          (regDoc?.reason ? String(regDoc.reason) : 'Please re-upload verified registration copy with visible student number and registrar stamp.'),
        reviewerName: 'COE Practicum Coordinator',
        fileSize: '820 KB',
        formatAccepted: 'PDF (.pdf)',
      },

      // 5. After OJT: Evaluation Form
      {
        id: 'doc-evaluation',
        code: 'POST-01',
        name: 'Industry Evaluation Form',
        phase: 'POST_OJT',
        phaseLabel: 'After OJT',
        description:
          'Formal Industry Supervisor Performance Evaluation Form assessing student technical competence, work ethics, discipline, and overall rating.',
        status:
          customOverrides['doc-evaluation']?.status ??
          (studentEvaluations.length > 0 ? 'APPROVED' : 'PENDING'),
        mandatory: true,
        dueDate: 'Nov 15, 2026',
        isOverdue: false,
        version: 1,
        filename:
          customOverrides['doc-evaluation']?.filename ??
          (studentEvaluations.length > 0 ? 'Supervisor_Final_Evaluation_Form.pdf' : undefined),
        submissionDate: customOverrides['doc-evaluation']?.submissionDate ?? (studentEvaluations.length > 0 ? 'Oct 16, 2026' : undefined),
        reviewReason:
          customOverrides['doc-evaluation']?.reason ??
          (studentEvaluations.length > 0
            ? 'Industry supervisor performance evaluation submitted and approved.'
            : 'Awaiting host training supervisor appraisal submission upon completion of required hours.'),
        reviewerName: 'Host Company Supervisor',
        fileSize: '1.2 MB',
        formatAccepted: 'PDF (.pdf)',
      },

      // 6. After OJT: Placement Form
      {
        id: 'doc-placement',
        code: 'POST-02',
        name: 'Placement & Exit Endorsement Form',
        phase: 'POST_OJT',
        phaseLabel: 'After OJT',
        description:
          'College of Engineering post-training Placement Form and Certificate of Completion recording verified hours rendered, supervisor signoff, and exit endorsement.',
        status:
          customOverrides['doc-placement']?.status ??
          (studentCompletion?.status === 'APPROVED' ? 'APPROVED' : 'PENDING'),
        mandatory: true,
        dueDate: 'Nov 20, 2026',
        isOverdue: false,
        version: 1,
        filename:
          customOverrides['doc-placement']?.filename ??
          (studentCompletion?.status === 'APPROVED' ? 'COE_Placement_Completion_Form.pdf' : 'COE_Placement_Form_In_Review.pdf'),
        submissionDate: customOverrides['doc-placement']?.submissionDate ?? 'Oct 19, 2026',
        reviewReason:
          customOverrides['doc-placement']?.reason ??
          (studentCompletion?.status === 'APPROVED'
            ? 'Practicum placement hours and exit requirements formally approved by Coordinator.'
            : 'Scheduled for final placement hours verification by coordinator.'),
        reviewerName: 'COE Office / Coordinator',
        fileSize: '1.5 MB',
        formatAccepted: 'PDF (.pdf)',
      },
    ];

    return list;
  }, [
    studentDocuments,
    studentEvaluations,
    studentCompletion,
    customOverrides,
  ]);

  // Document Counts
  const preList = useMemo(() => requirementsList.filter(r => r.phase === 'PRE_OJT'), [requirementsList]);
  const postList = useMemo(() => requirementsList.filter(r => r.phase === 'POST_OJT'), [requirementsList]);
  const preApproved = preList.filter(r => r.status === 'APPROVED').length;
  const postApproved = postList.filter(r => r.status === 'APPROVED').length;

  const approvedCount = requirementsList.filter(r => r.status === 'APPROVED').length;
  const pendingCount = requirementsList.filter(r => r.status === 'PENDING').length;
  const rejectedCount = requirementsList.filter(r => r.status === 'REJECTED').length;
  const notSubmittedCount = requirementsList.filter(r => r.status === 'NOT_SUBMITTED').length;
  const totalCount = requirementsList.length;
  const completionPercent = Math.round((approvedCount / totalCount) * 100);

  const isFullyReady = approvedCount === totalCount;
  const hasRejection = rejectedCount > 0;

  // =========================================================
  // 2. Assessments List (4 Assessments)
  // =========================================================
  const assessmentsList = useMemo<PortfolioAssessmentItem[]>(() => {
    const list: PortfolioAssessmentItem[] = [
      // 1. Baseline Self-Assessment (Prerequisite Gate)
      {
        id: 'asm-baseline',
        code: 'ASM-01',
        name: 'Baseline Competency Self-Assessment',
        stage: 'Pre-Deployment',
        description:
          'Student self-evaluation across 4 core competency dimensions established before company deployment. Host company evaluation cannot begin until submitted.',
        status: baselineEvaluation
          ? baselineEvaluation.status === 'APPROVED'
            ? 'REVIEWED'
            : 'SUBMITTED'
          : 'NOT_STARTED',
        statusLabel: baselineEvaluation
          ? baselineEvaluation.status === 'APPROVED'
            ? 'Reviewed'
            : 'Submitted'
          : 'Not started',
        dueDate: 'Aug 20, 2026',
        isOverdue: !baselineEvaluation,
        submittedDate: baselineEvaluation?.createdAt ? String(baselineEvaluation.createdAt).slice(0, 10) : undefined,
        version: Number(baselineEvaluation?.version ?? 1),
        scores: baselineScores.map(s => ({
          label: String(s.dimension).replace(/_/g, ' '),
          score: Number(s.score),
          maxScore: 5,
        })),
        feedback: baselineEvaluation
          ? 'Your perceived baseline competency is officially recorded. Host supervisors and coordinators compare this baseline against workplace performance.'
          : 'Action Required: You must establish your perceived baseline across 4 core competencies before HTE supervisor evaluation begins.',
        evaluator: 'Student Self-Assessment · Reviewed by Coordinator',
        actionKind: 'self_assessment',
        actionLabel: baselineEvaluation ? (hteEvaluation ? 'View Report (Locked)' : 'Inspect / Update') : 'Complete Self-Assessment',
      },

      // 2. Cadence Performance Evaluation
      {
        id: 'asm-cadence',
        code: 'ASM-02',
        name: 'Cadence Performance Evaluation',
        stage: 'During OJT',
        description:
          'Periodic workplace evaluation conducted on a weekly/monthly cadence to track technical growth, attendance reliability, and coordinator log confirmations.',
        status: cadenceEvaluations.length > 0 ? 'REVIEWED' : 'IN_PROGRESS',
        statusLabel: cadenceEvaluations.length > 0 ? 'Reviewed' : 'In progress',
        dueDate: assessmentSchedule?.cadence === 'WEEKLY' ? 'Weekly every Friday' : 'Monthly checkpoint',
        isOverdue: false,
        version: cadenceEvaluations[0]?.version ? Number(cadenceEvaluations[0].version) : 1,
        feedback:
          cadenceEvaluations.length > 0
            ? `${cadenceEvaluations.length} periodic evaluations logged and confirmed by coordinator.`
            : 'Evaluations progress alongside your Daily Training Record (DTR) log submissions.',
        evaluator: 'Assigned Coordinator & Industry Supervisor',
        actionKind: 'view_only',
        actionLabel: 'View Schedule',
      },

      // 3. Host Training Establishment (HTE) Final Appraisal
      {
        id: 'asm-hte',
        code: 'ASM-03',
        name: 'Host Supervisor Final Appraisal',
        stage: 'After OJT',
        description:
          'Comprehensive performance evaluation administered by your host training establishment supervisor assessing overall technical delivery, punctuality, and conduct.',
        status: hteEvaluation?.status === 'APPROVED' ? 'REVIEWED' : hteEvaluation ? 'SUBMITTED' : (completionPercent >= 80 ? 'IN_PROGRESS' : 'NOT_STARTED'),
        statusLabel: hteEvaluation?.status === 'APPROVED' ? 'Reviewed' : hteEvaluation ? 'Submitted' : (completionPercent >= 80 ? 'In progress' : 'Not started'),
        dueDate: String(activePlacement?.endsAt ?? 'Nov 15, 2026'),
        isOverdue: false,
        version: Number(hteEvaluation?.version ?? 1),
        feedback: hteEvaluation?.reviewNote
          ? String(hteEvaluation.reviewNote)
          : (hteEvaluation
              ? 'Host company supervisor final appraisal received and pending final coordinator signoff.'
              : 'Appraisal unlocks after completing required hours. Conducted by host training supervisor.'),
        evaluator: targetCompany,
        actionKind: 'view_only',
        actionLabel: hteEvaluation ? 'View Appraisal' : 'Awaiting Completion',
      },

      // 4. OJT Exit Survey & Learning Feedback
      {
        id: 'asm-exit',
        code: 'ASM-04',
        name: 'OJT Exit Survey & Learning Feedback',
        stage: 'After OJT',
        description:
          'University exit feedback questionnaire evaluating training plan clarity, workplace curriculum alignment, and academic support received during OJT.',
        status: studentCompletion?.status === 'APPROVED' ? 'REVIEWED' : studentCompletion ? 'SUBMITTED' : 'NOT_STARTED',
        statusLabel: studentCompletion?.status === 'APPROVED' ? 'Reviewed' : studentCompletion ? 'Submitted' : 'Not started',
        dueDate: String(activePlacement?.endsAt ?? 'Nov 20, 2026'),
        isOverdue: false,
        version: 1,
        feedback: studentCompletion?.reason
          ? String(studentCompletion.reason)
          : 'Required institutional feedback evaluating university support, training relevance, and program improvements.',
        evaluator: 'COE Practicum Office',
        actionKind: 'completion_form',
        actionLabel: studentCompletion ? 'View Feedback' : 'Fill Exit Survey',
      },
    ];

    return list;
  }, [
    baselineEvaluation,
    baselineScores,
    cadenceEvaluations,
    hteEvaluation,
    assessmentSchedule,
    studentCompletion,
    completionPercent,
    activePlacement,
    targetCompany,
  ]);

  // Assessment Counts
  const completedAssessmentsCount = assessmentsList.filter(a => a.status === 'REVIEWED' || a.status === 'SUBMITTED').length;
  const reviewedAssessmentsCount = assessmentsList.filter(a => a.status === 'REVIEWED').length;
  const submittedAssessmentsCount = assessmentsList.filter(a => a.status === 'SUBMITTED').length;
  const inProgressAssessmentsCount = assessmentsList.filter(a => a.status === 'IN_PROGRESS').length;
  const notStartedAssessmentsCount = assessmentsList.filter(a => a.status === 'NOT_STARTED').length;
  const assessmentsPercent = Math.round((completedAssessmentsCount / assessmentsList.length) * 100);

  // Items Needing Attention
  const attentionItems = useMemo(() => {
    const list: {
      id: string;
      title: string;
      type: 'REVISION' | 'GATE' | 'OVERDUE';
      description: string;
      actionLabel: string;
      onAction: () => void;
    }[] = [];

    // 1. Rejected Documents needing revision
    requirementsList
      .filter(r => r.status === 'REJECTED')
      .forEach(doc => {
        list.push({
          id: `rev-${doc.id}`,
          title: `${doc.name}: Marked for Correction`,
          type: 'REVISION',
          description: doc.reviewReason ?? 'Please review coordinator comments and re-upload corrected document.',
          actionLabel: 'Submit Revision',
          onAction: () => {
            setUploadDoc(doc);
            setUploadFile(null);
            setUploadNotes('');
          },
        });
      });

    // 2. Missing Baseline Self-Assessment (HTE Gate)
    if (!baselineEvaluation) {
      list.push({
        id: 'gate-baseline',
        title: 'Baseline Competency Self-Assessment: Not Started',
        type: 'GATE',
        description: 'Host company evaluation cannot begin until your baseline competency self-assessment report is officially established.',
        actionLabel: 'Complete Assessment',
        onAction: () => setShowSelfAssessmentModal(true),
      });
    }

    // 3. Overdue documents (if not already listed under revision)
    requirementsList
      .filter(r => r.isOverdue && r.status !== 'REJECTED' && r.status !== 'APPROVED')
      .forEach(doc => {
        list.push({
          id: `overdue-${doc.id}`,
          title: `${doc.name}: Submission Overdue`,
          type: 'OVERDUE',
          description: `Due date was ${doc.dueDate}. Please upload your signed document promptly to avoid clearance holds.`,
          actionLabel: 'Upload Now',
          onAction: () => {
            setUploadDoc(doc);
            setUploadFile(null);
            setUploadNotes('');
          },
        });
      });

    return list;
  }, [requirementsList, baselineEvaluation]);

  // Keep the COR correction in its document detail instead of duplicating it as an overview banner.
  const overviewAttentionItems = attentionItems.filter(item => item.id !== 'rev-doc-registration');
  const showAttentionSection =
    overviewAttentionItems.length > 0 || attentionItems.length === 0 || activeDeadlines.length > 0;

  // Filtered Requirements
  const filteredRequirements = useMemo(() => {
    return requirementsList.filter(item => {
      if (selectedPhase === 'ALL') return true;
      if (selectedPhase === 'ATTENTION') return item.status === 'REJECTED';
      if (selectedPhase === 'PENDING') return item.status === 'PENDING';
      return item.phase === selectedPhase;
    });
  }, [requirementsList, selectedPhase]);

  const filteredPre = useMemo(
    () => filteredRequirements.filter(r => r.phase === 'PRE_OJT'),
    [filteredRequirements]
  );
  const filteredPost = useMemo(
    () => filteredRequirements.filter(r => r.phase === 'POST_OJT'),
    [filteredRequirements]
  );

  // Handle File Input in Upload Modal
  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      toast.success(`Selected ${file.name}`);
    }
  };

  // Submit Uploaded Requirement
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDoc) return;

    if (!uploadFile && !uploadNotes.trim()) {
      toast.error('Please select a file to upload or enter a submission note.');
      return;
    }

    const filename = uploadFile ? uploadFile.name : `${uploadDoc.name.replace(/\s+/g, '_')}_Updated.pdf`;

    setCustomOverrides(prev => ({
      ...prev,
      [uploadDoc.id]: {
        status: 'PENDING',
        filename,
        submissionDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        reason: uploadNotes.trim()
          ? `Student note: ${uploadNotes.trim()}`
          : 'Submitted for coordinator verification.',
      },
    }));

    setUploadDoc(null);
    setUploadFile(null);
    setUploadNotes('');
    toast.success(`Document for "${uploadDoc.name}" submitted for coordinator verification!`);
  };

  // Reusable Document Card Renderer
  const renderDocumentCard = (item: PortfolioDocumentRequirement) => {
    const isApproved = item.status === 'APPROVED';
    const isPending = item.status === 'PENDING';
    const isRejected = item.status === 'REJECTED';

    return (
      <div key={item.id} className={styles.requirementCard}>
        <div className={styles.cardTopHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={styles.codeBadge}>{item.code}</span>
            <span className={styles.versionBadge}>v{item.version}</span>
          </div>

          <span
            className={`${styles.statusPill} ${
              isApproved
                ? styles.statusApproved
                : isPending
                  ? styles.statusPending
                  : isRejected
                    ? styles.statusRejected
                    : styles.statusNotSubmitted
            }`}
          >
            {isApproved && <CheckCircle2 size={12} />}
            {isPending && <Clock size={12} />}
            {isRejected && <AlertCircle size={12} />}
            <span>
              {isApproved
                ? 'Approved'
                : isPending
                  ? 'Submitted / Under review'
                  : isRejected
                    ? 'Needs revision'
                    : 'Not submitted'}
            </span>
          </span>
        </div>

        <h3 className={styles.docTitle}>
          <FileText size={16} color="var(--primary, #124c91)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{item.name}</span>
        </h3>

        <p className={styles.docDescription}>{item.description}</p>

        {/* Due Date & Submission Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11.5, marginBottom: 10 }}>
          <span className={`${styles.dueDateTag} ${item.isOverdue ? styles.dueDateOverdue : ''}`}>
            <Clock size={12} />
            <span>Due: {item.dueDate}</span>
            {item.isOverdue && <span style={{ color: '#dc2626', fontWeight: 700 }}>(Overdue)</span>}
          </span>
          <span style={{ color: '#64748b' }}>
            {item.submissionDate ? `Submitted: ${item.submissionDate}` : 'Not yet submitted'}
          </span>
        </div>

        {/* Reviewer Feedback Callout */}
        {item.reviewReason && (
          <div
            className={`${styles.reviewNoteBox} ${
              isRejected ? styles.reviewNoteRejected : styles.reviewNoteApproved
            }`}
          >
            <strong>{isRejected ? 'Coordinator Correction Notice:' : 'Coordinator Endorsement:'}</strong>
            <p style={{ margin: '3px 0 0 0' }}>{item.reviewReason}</p>
          </div>
        )}

        {/* File Attachment Status */}
        {item.filename ? (
          <div className={styles.fileMetaBox}>
            <div className={styles.fileIconWrap}>
              <FileCheck2 size={16} />
            </div>
            <div className={styles.fileMetaText}>
              <div className={styles.fileName}>{item.filename}</div>
              <div className={styles.fileSubText}>
                {item.submissionDate ? `Recorded on ${item.submissionDate}` : 'Uploaded document record'}{' '}
                {item.fileSize ? `· ${item.fileSize}` : ''}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.fileMetaBox}>
            <div className={styles.fileIconWrap} style={{ color: '#94a3b8' }}>
              <FileBox size={16} />
            </div>
            <div className={styles.fileMetaText}>
              <div className={styles.fileName} style={{ color: '#64748b' }}>
                No file submitted yet
              </div>
              <div className={styles.fileSubText}>Required format: {item.formatAccepted}</div>
            </div>
          </div>
        )}

        {/* Card Action Footer */}
        <div className={styles.cardFooterActions}>
          <button
            type="button"
            className={styles.btnActionText}
            onClick={() => setInspectDoc(item)}
            title="Inspect guidelines and instructions"
          >
            <Eye size={13} />
            <span>Guidelines</span>
          </button>

          {role === 'STUDENT' && (
            isRejected ? (
              <button
                type="button"
                className={styles.btnActionCorrection}
                onClick={() => {
                  setUploadDoc(item);
                  setUploadFile(null);
                  setUploadNotes('');
                }}
                title="Submit corrected document for coordinator review"
              >
                <UploadCloud size={13} />
                <span>Submit Revision</span>
              </button>
            ) : (
              <button
                type="button"
                className={item.filename ? styles.btnActionReplace : styles.btnActionUpload}
                onClick={() => {
                  setUploadDoc(item);
                  setUploadFile(null);
                  setUploadNotes('');
                }}
                title={item.filename ? 'Replace current file' : 'Upload document file'}
              >
                <UploadCloud size={13} />
                <span>{item.filename ? 'Replace File' : 'Upload Document'}</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  // Reusable Assessment Card Renderer
  const renderAssessmentCard = (item: PortfolioAssessmentItem) => {
    const isReviewed = item.status === 'REVIEWED';
    const isSubmitted = item.status === 'SUBMITTED';
    const isInProgress = item.status === 'IN_PROGRESS';

    return (
      <article key={item.id} className={styles.assessmentItemCard}>
        <div className={styles.assessmentItemHeader}>
          <div className={styles.assessmentTitleBlock}>
            <span className={styles.assessmentCodeBadge}>{item.code}</span>
            <span className={styles.assessmentStagePill}>{item.stage}</span>
            <h3 className={styles.assessmentItemTitle}>{item.name}</h3>
          </div>

          <span
            className={`${styles.statusPill} ${
              isReviewed
                ? styles.statusApproved
                : isSubmitted
                  ? styles.statusPending
                  : isInProgress
                    ? styles.statusPending
                    : styles.statusNotSubmitted
            }`}
          >
            {isReviewed && <CheckCircle2 size={12} />}
            {isSubmitted && <Clock size={12} />}
            {isInProgress && <Sparkles size={12} />}
            <span>{item.statusLabel}</span>
          </span>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
          {item.description}
        </p>

        {/* Due Date & Evaluator Metadata */}
        <div className={styles.assessmentMetaStrip}>
          <span className={`${styles.dueDateTag} ${item.isOverdue ? styles.dueDateOverdue : ''}`}>
            <Clock size={12} />
            <span>Target: {item.dueDate}</span>
            {item.isOverdue && <span style={{ color: '#dc2626', fontWeight: 700 }}>(Action Required)</span>}
          </span>
          {item.evaluator && (
            <span>Evaluator: <strong>{item.evaluator}</strong></span>
          )}
          {item.version && (
            <span className={styles.versionBadge}>Version v{item.version}</span>
          )}
        </div>

        {/* Available Results: Score Meters */}
        {item.scores && item.scores.length > 0 && (
          <div className={styles.assessmentScoresGrid}>
            {item.scores.map((sc, idx) => {
              const pct = Math.round((sc.score / sc.maxScore) * 100);
              return (
                <div key={idx} className={styles.assessmentScoreMeter}>
                  <div className={styles.meterLabelRow}>
                    <span>{sc.label}</span>
                    <strong>{sc.score} / {sc.maxScore}</strong>
                  </div>
                  <div className={styles.meterTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={styles.meterFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feedback / Review Note */}
        {item.feedback && (
          <div className={styles.feedbackBox}>
            <span className={styles.feedbackLabel}>Feedback & Status Note:</span>
            {item.feedback}
          </div>
        )}

        {/* Assessment Card Actions */}
        <div className={styles.cardFooterActions}>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            {item.submittedDate ? `Submitted on ${item.submittedDate}` : 'Required for practicum clearance'}
          </span>

          {item.actionKind === 'self_assessment' ? (
            <button
              type="button"
              className={item.status === 'NOT_STARTED' ? styles.btnPrimary : styles.btnSecondary}
              onClick={() => setShowSelfAssessmentModal(true)}
            >
              <Sparkles size={13} />
              <span>{item.actionLabel}</span>
              {item.status === 'NOT_STARTED' && <ArrowRight size={13} />}
            </button>
          ) : item.actionKind === 'completion_form' && onNavigate ? (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => onNavigate('documents')}
              title="Open Document Clearance to access exit forms"
            >
              <span>{item.actionLabel}</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              {item.actionLabel}
            </span>
          )}
        </div>
      </article>
    );
  };

  // If no active placement is found for student
  if (!activePlacement) {
    return (
      <div className={styles.portfolioContainer}>
        <div className={styles.emptyState}>
          <FolderOpen size={40} color="#94a3b8" />
          <h2 className={styles.emptyStateTitle}>No Active Practicum Placement Found</h2>
          <p className={styles.emptyStateText}>
            You are not currently enrolled in an active practicum section. Please reach out to your department coordinator or submit a class enrollment code.
          </p>
          {onNavigate && role === 'STUDENT' && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => onNavigate('classes')}
            >
              Go to My Class
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.portfolioContainer}>
      {/* 1. Student Identity Header & Privacy Controller */}
      <section className={styles.executivePortfolioCard} aria-label="Student Clearance Tracker Header">
        <div className={styles.executiveProfileSection}>
          <div className={styles.profileMainRow}>
            {/* Student Identity */}
            <div className={styles.studentIdentityBlock}>
              <div className={styles.studentAvatar} aria-hidden="true">
                {studentInitials}
              </div>
              <div className={styles.studentDetails}>
                <div className={styles.studentNameRow}>
                  <h1 className={styles.studentName}>{targetStudentName}</h1>
                  <span className={`chip green ${styles.activePlacementBadge}`}>
                    Active Placement
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions: Document Clearance Bridge & PDF Export */}
            <div className={styles.headerActionsBlock}>
              {onExportPdf && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => onExportPdf(activePlacement)}
                  disabled={isExporting}
                  title="Download official PDF clearance tracker"
                >
                  <Download size={13} />
                  <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>
              )}

              {onNavigate && role === 'STUDENT' && (
                <button
                  type="button"
                  className={styles.btnNavBridge}
                  onClick={() => onNavigate('documents')}
                  title="Fill out official RTU forms in Document Clearance"
                >
                  <FileText size={13} />
                  <span>Document Clearance</span>
                  <ArrowUpRight size={13} />
                </button>
              )}

              {/* Coordinator Student Selector (Hidden for students) */}
              {role !== 'STUDENT' && data.placements && data.placements.length > 0 && (
                <div className={styles.headerStudentSelectWrap}>
                  <Users size={14} />
                  <select
                    id="student-selector"
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className={styles.studentSelectDropdown}
                    aria-label="Select student to review"
                  >
                    {data.placements.map(p => (
                      <option key={p.id} value={String(p.studentId)}>
                        {String(p.studentName)} — {String(p.section)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className={styles.studentMetaSection}>
            <div className={styles.studentMetaCapsuleRow}>
              <span
                className={`${styles.metaCapPill} ${styles.metaDetailPill}`}
                title="Academic Year and Section"
              >
                <GraduationCap size={13} />
                <span>{yearAndBlock}</span>
              </span>
              <span
                className={`${styles.metaCoursePill} ${styles.metaDetailPill}`}
                title={targetCourseName}
              >
                <span>{targetCourseName}</span>
              </span>
              <span
                className={`${styles.metaCompanyPill} ${styles.metaDetailPill}`}
                title={`Internship company: ${targetCompany}`}
                aria-label={`Internship company: ${targetCompany}`}
              >
                <Building2 size={13} />
                <span>{targetCompany}</span>
              </span>
            </div>
            <span
              className={styles.privacyBadge}
              title="Strict privacy: accessible only to you and authorized university staff"
            >
              <Lock size={12} />
              <span>Private Student Record</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. Sub-Navigation Tabs */}
      <div className={styles.trackerNavTabs} role="tablist" aria-label="Tracker Views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTrackerTab === 'overview'}
          className={`${styles.trackerTabBtn} ${activeTrackerTab === 'overview' ? styles.trackerTabBtnActive : ''}`}
          onClick={() => setActiveTrackerTab('overview')}
        >
          <Layers size={14} />
          <span>Overview & Status</span>
          {attentionItems.length > 0 && (
            <span className={styles.chipCountDanger} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999 }}>
              {attentionItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTrackerTab === 'documents'}
          className={`${styles.trackerTabBtn} ${activeTrackerTab === 'documents' ? styles.trackerTabBtnActive : ''}`}
          onClick={() => setActiveTrackerTab('documents')}
        >
          <FileText size={14} />
          <span>Required Documents</span>
          <span className={styles.trackerTabBadge}>{approvedCount}/{totalCount}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTrackerTab === 'assessments'}
          className={`${styles.trackerTabBtn} ${activeTrackerTab === 'assessments' ? styles.trackerTabBtnActive : ''}`}
          onClick={() => setActiveTrackerTab('assessments')}
        >
          <Award size={14} />
          <span>Assessments</span>
          <span className={styles.trackerTabBadge}>{completedAssessmentsCount}/{assessmentsList.length}</span>
        </button>
      </div>

      {/* 3. OVERVIEW TAB CONTENT */}
      {activeTrackerTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Dual Progress Engine Grid */}
          <div className={styles.overviewProgressGrid}>
            {/* Documents Progress Card */}
            <div className={styles.overviewProgressCard}>
              <div className={styles.overviewCardHead}>
                <div className={styles.overviewCardTitleGroup}>
                  <div className={styles.overviewCardIcon}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className={styles.overviewCardTitle}>Document Clearances</h3>
                    <span style={{ fontSize: 11, color: '#64748b' }}>6 Required RTU Institutional Papers</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={styles.overviewCardFraction}>{approvedCount} / {totalCount} Approved</span>
                  <span className={styles.completionPercentBadge} style={{ marginLeft: 6 }}>{completionPercent}%</span>
                </div>
              </div>

              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-valuenow={completionPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Document Clearance Progress"
              >
                <div
                  className={`${styles.progressFill} ${isFullyReady ? styles.progressFillComplete : ''}`}
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              <div className={styles.overviewBreakdownRow}>
                <span className={`${styles.breakdownChip} ${styles.breakdownApproved}`}>
                  <Check size={11} /> {approvedCount} Approved
                </span>
                <span className={`${styles.breakdownChip} ${styles.breakdownPending}`}>
                  <Clock size={11} /> {pendingCount} Under Review
                </span>
                {rejectedCount > 0 && (
                  <span className={`${styles.breakdownChip} ${styles.breakdownRejected}`}>
                    <AlertCircle size={11} /> {rejectedCount} Needs Revision
                  </span>
                )}
                {notSubmittedCount > 0 && (
                  <span className={`${styles.breakdownChip} ${styles.breakdownMuted}`}>
                    {notSubmittedCount} Not Submitted
                  </span>
                )}
              </div>
            </div>

            {/* Assessments Progress Card */}
            <div className={styles.overviewProgressCard}>
              <div className={styles.overviewCardHead}>
                <div className={styles.overviewCardTitleGroup}>
                  <div className={styles.overviewCardIcon} style={{ background: '#fdf4ea', color: '#b45309' }}>
                    <Award size={16} />
                  </div>
                  <div>
                    <h3 className={styles.overviewCardTitle}>Competency Assessments</h3>
                    <span style={{ fontSize: 11, color: '#64748b' }}>4 Core OJT Assessment Milestones</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={styles.overviewCardFraction}>{completedAssessmentsCount} / {assessmentsList.length} Done</span>
                  <span className={styles.completionPercentBadge} style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e' }}>
                    {assessmentsPercent}%
                  </span>
                </div>
              </div>

              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-valuenow={assessmentsPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Assessment Progress"
              >
                <div
                  className={styles.progressFill}
                  style={{ width: `${assessmentsPercent}%`, background: 'linear-gradient(90deg, #d97706, #f59e0b)' }}
                />
              </div>

              <div className={styles.overviewBreakdownRow}>
                <span className={`${styles.breakdownChip} ${styles.breakdownApproved}`}>
                  <Check size={11} /> {reviewedAssessmentsCount} Reviewed
                </span>
                <span className={`${styles.breakdownChip} ${styles.breakdownPending}`}>
                  <Clock size={11} /> {submittedAssessmentsCount} Submitted
                </span>
                <span className={`${styles.breakdownChip} ${styles.breakdownMuted}`}>
                  {inProgressAssessmentsCount} In Progress
                </span>
                {notStartedAssessmentsCount > 0 && (
                  <span className={`${styles.breakdownChip} ${styles.breakdownRejected}`}>
                    {notStartedAssessmentsCount} Not Started
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Attention & Action Banner */}
          {showAttentionSection && (
            <section className={styles.attentionSection} aria-label="Action Items & Deadlines">
              {overviewAttentionItems.length > 0 ? (
                overviewAttentionItems.map(item => (
                  <div
                    key={item.id}
                    className={item.type === 'REVISION' || item.type === 'OVERDUE' ? styles.attentionAlertCard : styles.attentionWarningCard}
                  >
                    <div className={styles.attentionAlertContent}>
                      {item.type === 'REVISION' ? (
                        <AlertCircle size={20} className={styles.attentionIconDanger} />
                      ) : (
                        <AlertTriangle size={20} className={styles.attentionIconWarning} />
                      )}
                      <div>
                        <h4 className={styles.attentionAlertTitle}>{item.title}</h4>
                        <p className={styles.attentionAlertDesc}>{item.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={item.type === 'REVISION' ? styles.btnActionCorrection : styles.btnPrimary}
                      onClick={item.onAction}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))
              ) : attentionItems.length === 0 ? (
                <div className={styles.attentionSuccessCard}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span>All practicum document clearances and assessments are on schedule with no pending correction requests.</span>
                </div>
              ) : null}

              {/* Upcoming Deadlines Ribbon */}
              {activeDeadlines.length > 0 && (
                <div className={styles.deadlinesRibbon}>
                  <div className={styles.deadlinesRibbonTitle}>
                    <CalendarDays size={15} color="#124c91" />
                    <span>Institutional Submission Deadlines</span>
                  </div>
                  <div className={styles.deadlinesList}>
                    {activeDeadlines.slice(0, 3).map(dl => (
                      <span key={dl.id} className={styles.deadlineItemPill}>
                        <strong>{dl.title}</strong>
                        <span style={{ color: '#64748b' }}>Due {dl.date}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Quick Summary of Both Modules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Documents preview banner */}
            <div className={styles.phaseContainerHeader} style={{ border: 'none', padding: '6px 0 0' }}>
              <div className={styles.phaseHeaderLeft}>
                <h2 className={styles.phaseTitle}>Required Document Clearances</h2>
                <span className="chip blue" style={{ fontSize: 11 }}>{approvedCount} of {totalCount} Cleared</span>
              </div>
              <button
                type="button"
                className={styles.btnActionText}
                onClick={() => setActiveTrackerTab('documents')}
              >
                <span>View All 6 Documents</span>
                <ChevronRight size={13} />
              </button>
            </div>
            <div className={styles.requirementsGrid}>
              {requirementsList.slice(0, 3).map(renderDocumentCard)}
            </div>

            {/* Assessments preview banner */}
            <div className={styles.phaseContainerHeader} style={{ border: 'none', padding: '12px 0 0' }}>
              <div className={styles.phaseHeaderLeft}>
                <h2 className={styles.phaseTitle}>Practicum Assessments</h2>
                <span className="chip orange" style={{ fontSize: 11 }}>{completedAssessmentsCount} of 4 Completed</span>
              </div>
              <button
                type="button"
                className={styles.btnActionText}
                onClick={() => setActiveTrackerTab('assessments')}
              >
                <span>View All 4 Assessments</span>
                <ChevronRight size={13} />
              </button>
            </div>
            <div className={styles.assessmentsList}>
              {assessmentsList.slice(0, 2).map(renderAssessmentCard)}
            </div>
          </div>
        </div>
      )}

      {/* 4. DOCUMENTS TAB CONTENT */}
      {activeTrackerTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Filter Toolbar */}
          <div className={styles.toolbarRow}>
            <div className={styles.phaseFilterGroup}>
              {[
                { id: 'ALL', label: 'All Documents', count: requirementsList.length },
                { id: 'PRE_OJT', label: 'Stage 1: Pre-Deployment', count: preList.length },
                { id: 'POST_OJT', label: 'Stage 2: After OJT', count: postList.length },
                ...(hasRejection
                  ? [{ id: 'ATTENTION', label: 'Needs Revision', count: rejectedCount, isDanger: true }]
                  : []),
              ].map(phase => (
                <button
                  type="button"
                  key={phase.id}
                  className={`${styles.filterChip} ${selectedPhase === phase.id ? styles.filterChipActive : ''}`}
                  onClick={() => setSelectedPhase(phase.id)}
                >
                  <span>{phase.label}</span>
                  <span
                    className={`${styles.chipCount} ${
                      phase.isDanger ? styles.chipCountDanger : ''
                    }`}
                  >
                    {phase.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Phased Document Containers */}
          {filteredRequirements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Stage 1: Pre-Deployment */}
              {filteredPre.length > 0 && (
                <section className={styles.phaseContainer} aria-label="Pre-Deployment Requirements">
                  <div className={styles.phaseContainerHeader}>
                    <div className={styles.phaseHeaderLeft}>
                      <span className={styles.phaseBadge}>Stage 1</span>
                      <h2 className={styles.phaseTitle}>Pre-Deployment Clearances</h2>
                    </div>
                    <span
                      className={`${styles.phaseClearedBadge} ${
                        preApproved === preList.length ? styles.phaseClearedBadgeDone : ''
                      }`}
                    >
                      {preApproved === preList.length && <Check size={12} />}
                      <span>{preApproved} of {preList.length} Approved</span>
                    </span>
                  </div>

                  <div className={styles.requirementsGrid}>
                    {filteredPre.map(renderDocumentCard)}
                  </div>
                </section>
              )}

              {/* Stage 2: After OJT */}
              {filteredPost.length > 0 && (
                <section className={styles.phaseContainer} aria-label="After OJT Requirements">
                  <div className={styles.phaseContainerHeader}>
                    <div className={styles.phaseHeaderLeft}>
                      <span className={styles.phaseBadge}>Stage 2</span>
                      <h2 className={styles.phaseTitle}>After OJT Completion Clearances</h2>
                    </div>
                    <span
                      className={`${styles.phaseClearedBadge} ${
                        postApproved === postList.length ? styles.phaseClearedBadgeDone : ''
                      }`}
                    >
                      {postApproved === postList.length && <Check size={12} />}
                      <span>{postApproved} of {postList.length} Approved</span>
                    </span>
                  </div>

                  <div className={styles.requirementsGrid}>
                    {filteredPost.map(renderDocumentCard)}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FolderOpen size={36} color="#94a3b8" />
              <h3 className={styles.emptyStateTitle}>No requirements match this filter</h3>
              <p className={styles.emptyStateText}>
                Select &quot;All Documents&quot; to review the complete practicum requirement portfolio.
              </p>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setSelectedPhase('ALL')}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. ASSESSMENTS TAB CONTENT */}
      {activeTrackerTab === 'assessments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.phaseContainerHeader} style={{ border: 'none', padding: 0 }}>
            <div className={styles.phaseHeaderLeft}>
              <h2 className={styles.phaseTitle}>Required Competency Assessments & Checkpoints</h2>
              <span className="chip orange" style={{ fontSize: 11 }}>{completedAssessmentsCount} of 4 Completed</span>
            </div>
          </div>

          <div className={styles.assessmentsList}>
            {assessmentsList.map(renderAssessmentCard)}
          </div>
        </div>
      )}

      {/* 6. INSPECT GUIDELINES MODAL */}
      {inspectDoc && (
        <div className={styles.modalOverlay} onClick={() => setInspectDoc(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{inspectDoc.name}</h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {inspectDoc.code} · {inspectDoc.phaseLabel} · {inspectDoc.formatAccepted}
                </span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setInspectDoc(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 700, color: 'var(--rtu-navy, #08274d)' }}>
                  Institutional Requirement Purpose
                </h4>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#334155' }}>
                  {inspectDoc.description}
                </p>
              </div>

              <div className={styles.guidelinesTable}>
                <div className={styles.guidelineItem}>
                  <span className={styles.guidelineLabel}>STATUS</span>
                  <span
                    className={styles.guidelineValue}
                    style={{
                      color:
                        inspectDoc.status === 'APPROVED'
                          ? '#166534'
                          : inspectDoc.status === 'REJECTED'
                            ? '#b91c1c'
                            : '#92400e',
                    }}
                  >
                    {inspectDoc.status === 'APPROVED'
                      ? 'Approved'
                      : inspectDoc.status === 'PENDING'
                        ? 'Submitted / Under review'
                        : inspectDoc.status === 'REJECTED'
                          ? 'Needs revision'
                          : 'Not submitted'}
                  </span>
                </div>
                <div className={styles.guidelineItem}>
                  <span className={styles.guidelineLabel}>DUE DATE</span>
                  <span className={styles.guidelineValue}>{inspectDoc.dueDate}</span>
                </div>
                <div className={styles.guidelineItem}>
                  <span className={styles.guidelineLabel}>SUBMISSION RECORD</span>
                  <span className={styles.guidelineValue}>
                    {inspectDoc.filename ?? 'No file submitted yet'}
                  </span>
                </div>
                <div className={styles.guidelineItem}>
                  <span className={styles.guidelineLabel}>ACCEPTED FORMATS</span>
                  <span className={styles.guidelineValue}>{inspectDoc.formatAccepted}</span>
                </div>
                <div className={styles.guidelineItem}>
                  <span className={styles.guidelineLabel}>VERSION</span>
                  <span className={styles.guidelineValue}>v{inspectDoc.version}</span>
                </div>
                {inspectDoc.reviewReason && (
                  <div className={styles.guidelineItem}>
                    <span className={styles.guidelineLabel}>COORDINATOR REVIEW</span>
                    <span
                      className={styles.guidelineValue}
                      style={{ color: inspectDoc.status === 'REJECTED' ? '#b91c1c' : '#334155' }}
                    >
                      {inspectDoc.reviewReason}
                    </span>
                  </div>
                )}
              </div>

              {/* Document Clearance Bridge */}
              <div className={styles.modalDocumentClearanceBridge}>
                <div className={styles.bridgeIconWrap}>
                  <FolderOpen size={18} color="var(--primary, #124c91)" />
                </div>
                <div className={styles.bridgeText}>
                  <strong>Need to fill up or correct this paper?</strong>
                  <p>
                    Official RTU papers, Parent&apos;s Consent waivers, and recommendation letters are filled up in the <strong>Document Clearance</strong> module. If the coordinator marked this for correction, edit and re-generate your form there.
                  </p>
                  {onNavigate && (
                    <button
                      type="button"
                      className={styles.bridgeNavBtn}
                      onClick={() => {
                        setInspectDoc(null);
                        onNavigate('documents');
                      }}
                    >
                      <span>Open Document Clearance</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              {role === 'STUDENT' && (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => {
                    setUploadDoc(inspectDoc);
                    setInspectDoc(null);
                  }}
                >
                  <UploadCloud size={14} />
                  <span>Upload / Replace File</span>
                </button>
              )}
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setInspectDoc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. UPLOAD REQUIREMENT MODAL */}
      {uploadDoc && (
        <div className={styles.modalOverlay} onClick={() => setUploadDoc(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleUploadSubmit}>
              <div className={styles.modalHeader}>
                <div>
                  <h2>Submit Requirement Document</h2>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {uploadDoc.code} · {uploadDoc.name}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setUploadDoc(null)}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {uploadDoc.status === 'REJECTED' && uploadDoc.reviewReason && (
                  <div className={styles.reviewNoteRejected} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 12 }}>
                    <strong style={{ fontSize: 12 }}>Coordinator Revision Note:</strong>
                    <p style={{ margin: '3px 0 0 0', fontSize: 12 }}>{uploadDoc.reviewReason}</p>
                  </div>
                )}

                <div
                  className={`${styles.dropZone} ${uploadFile ? styles.dropZoneActive : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.docx,image/*"
                    onChange={handleModalFileSelect}
                  />
                  <UploadCloud size={28} color="var(--rtu-blue, #0b3c74)" />
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                    {uploadFile ? uploadFile.name : 'Click to select document file or drop file here'}
                  </p>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>
                    Supported formats: {uploadDoc.formatAccepted} (max 25MB)
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="upload-notes">Submission Notes for Coordinator (optional)</label>
                  <textarea
                    id="upload-notes"
                    placeholder="Add details, revision clarifications, or document remarks..."
                    value={uploadNotes}
                    onChange={e => setUploadNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setUploadDoc(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. SELF-ASSESSMENT MODAL */}
      {showSelfAssessmentModal && activePlacement && (
        <SelfAssessmentModal
          placement={activePlacement}
          data={data}
          isLocked={!!hteEvaluation}
          onClose={() => setShowSelfAssessmentModal(false)}
          onSubmit={async (scores, version) => {
            if (!onAction) return false;
            await onAction('studentSelfAssessment', {
              placementId: activePlacement.id,
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
