import type { Row } from '../validation/contracts';

export interface CurriculumAnalyticsOptions {
  courseId?: string;
  academicPeriod?: string;
  companyId?: string;
  privacyThreshold?: number; // Configurable privacy threshold, defaults to 3
}

export interface DimensionSummary {
  key: string;
  label: string;
  averageScore: number | null;
  sampleCount: number;
  isGap: boolean;
}

export interface CurriculumGapItem {
  category: 'TECHNICAL' | 'SOFT_SKILL' | 'DIMENSION';
  topic: string;
  mentionCount: number;
  sampleBasis: string;
  percentage: number;
}

export interface QualitativeFeedbackItem {
  id: string;
  companyName: string;
  supervisorName: string;
  courseCode: string;
  academicPeriod: string;
  workplaceReadiness: number;
  competencyRelevance: number;
  curriculumAlignment: number;
  recommendations: string;
  createdAt: string;
}

export interface CurriculumAnalyticsResult {
  filterCourseId: string;
  filterPeriod: string;
  filterCompanyId: string;
  cohortSize: number;
  feedbackCount: number;
  missingCount: number;
  responseRatePercent: number;
  frameworkVersion: number;
  scaleMin: number;
  scaleMax: number;
  privacyThreshold: number;
  isPrivacySuppressed: boolean;
  privacySuppressionNotice: string | null;
  isSmallSample: boolean;
  smallSampleNotice: string | null;
  studentReviewsSeparated: boolean;
  separationNotice: string;
  dimensions: DimensionSummary[];
  overallIndex: number | null;
  curriculumGaps: CurriculumGapItem[];
  qualitativeRecommendations: QualitativeFeedbackItem[];
}

export const DEFAULT_PRIVACY_THRESHOLD = 3;
export const CURRICULUM_GAP_THRESHOLD = 3.5; // Scores below 3.50 flag an institutional curriculum gap

/**
 * Calculates privacy-conscious curriculum gap and industry preparedness analytics.
 * Strictly enforces sample disclosure, privacy threshold suppression, compatible scales,
 * and clear separation from student-to-company reviews.
 */
export function calculateCurriculumAnalytics(
  placements: Row[],
  feedbackList: Row[],
  options: CurriculumAnalyticsOptions = {}
): CurriculumAnalyticsResult {
  const filterCourseId = options.courseId && options.courseId !== 'ALL' ? options.courseId : 'ALL';
  const filterPeriod =
    options.academicPeriod && options.academicPeriod !== 'ALL' ? options.academicPeriod : 'ALL';
  const filterCompanyId =
    options.companyId && options.companyId !== 'ALL' ? options.companyId : 'ALL';
  const privacyThreshold = Math.max(1, options.privacyThreshold ?? DEFAULT_PRIVACY_THRESHOLD);

  // 1. Filter cohort placements to determine true cohort size
  const matchingPlacements = placements.filter((p) => {
    if (filterCourseId !== 'ALL' && String(p.courseId) !== filterCourseId) return false;
    if (filterPeriod !== 'ALL' && String(p.period) !== filterPeriod) return false;
    if (filterCompanyId !== 'ALL' && String(p.companyId) !== filterCompanyId) return false;
    return true;
  });
  const cohortSize = matchingPlacements.length;

  // 2. Filter industry supervisor feedback to matching cohorts and compatible scale
  const matchingFeedback = feedbackList.filter((fb) => {
    if (filterCourseId !== 'ALL' && String(fb.courseId) !== filterCourseId) return false;
    if (filterPeriod !== 'ALL' && String(fb.academicPeriod) !== filterPeriod) return false;
    if (filterCompanyId !== 'ALL' && String(fb.companyId) !== filterCompanyId) return false;

    // Check compatibility: Framework version must be 1, scale scores must be within 1..5
    const version = Number(fb.frameworkVersion ?? 1);
    if (version !== 1) return false;

    const r = Number(fb.workplaceReadiness);
    const cr = Number(fb.competencyRelevance);
    const ss = Number(fb.supervisionSupport);
    const ca = Number(fb.curriculumAlignment);
    if ([r, cr, ss, ca].some((val) => isNaN(val) || val < 1 || val > 5)) return false;

    return true;
  });

  const feedbackCount = matchingFeedback.length;
  const missingCount = Math.max(0, cohortSize - feedbackCount);
  const responseRatePercent =
    cohortSize > 0 ? Number(((feedbackCount / cohortSize) * 100).toFixed(1)) : 0;

  // 3. Privacy Threshold Rule: If below threshold, suppress metrics to safeguard student anonymity
  const isPrivacySuppressed = feedbackCount < privacyThreshold;
  const privacySuppressionNotice = isPrivacySuppressed
    ? `Data suppressed for privacy: The cohort sample size (${feedbackCount} response${
        feedbackCount === 1 ? '' : 's'
      }) is below the required privacy protection threshold (${privacyThreshold}). Aggregated metrics and individual evaluations are suppressed to prevent student re-identification.`
    : null;

  // 4. Small sample warning (when not suppressed, but sample size is under 5)
  const isSmallSample = !isPrivacySuppressed && feedbackCount > 0 && feedbackCount < 5;
  const smallSampleNotice = isSmallSample
    ? `Preliminary sample size notice: The current sample size (${feedbackCount} response${
        feedbackCount === 1 ? '' : 's'
      }) provides early qualitative signals, but is not statistically representative of the entire academic cohort.`
    : null;

  const separationNotice =
    'Student reviews of companies (student -> company) are maintained in a separate workflow and are never counted as industry employer feedback.';

  if (isPrivacySuppressed || feedbackCount === 0) {
    return {
      filterCourseId,
      filterPeriod,
      filterCompanyId,
      cohortSize,
      feedbackCount,
      missingCount,
      responseRatePercent,
      frameworkVersion: 1,
      scaleMin: 1,
      scaleMax: 5,
      privacyThreshold,
      isPrivacySuppressed: true,
      privacySuppressionNotice,
      isSmallSample: false,
      smallSampleNotice: null,
      studentReviewsSeparated: true,
      separationNotice,
      dimensions: [
        {
          key: 'workplaceReadiness',
          label: 'Student Workplace Readiness',
          averageScore: null,
          sampleCount: feedbackCount,
          isGap: false,
        },
        {
          key: 'competencyRelevance',
          label: 'Competency Relevance to Industry',
          averageScore: null,
          sampleCount: feedbackCount,
          isGap: false,
        },
        {
          key: 'supervisionSupport',
          label: 'Workplace Mentorship & Supervision',
          averageScore: null,
          sampleCount: feedbackCount,
          isGap: false,
        },
        {
          key: 'curriculumAlignment',
          label: 'OJT Curriculum & Tech Stack Alignment',
          averageScore: null,
          sampleCount: feedbackCount,
          isGap: false,
        },
      ],
      overallIndex: null,
      curriculumGaps: [],
      qualitativeRecommendations: [],
    };
  }

  // 5. Calculate dimension averages
  const calcAvg = (key: string): number => {
    const sum = matchingFeedback.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);
    return Number((sum / feedbackCount).toFixed(2));
  };

  const readinessAvg = calcAvg('workplaceReadiness');
  const relevanceAvg = calcAvg('competencyRelevance');
  const supervisionAvg = calcAvg('supervisionSupport');
  const alignmentAvg = calcAvg('curriculumAlignment');

  const dimensions: DimensionSummary[] = [
    {
      key: 'workplaceReadiness',
      label: 'Student Workplace Readiness',
      averageScore: readinessAvg,
      sampleCount: feedbackCount,
      isGap: readinessAvg < CURRICULUM_GAP_THRESHOLD,
    },
    {
      key: 'competencyRelevance',
      label: 'Competency Relevance to Industry',
      averageScore: relevanceAvg,
      sampleCount: feedbackCount,
      isGap: relevanceAvg < CURRICULUM_GAP_THRESHOLD,
    },
    {
      key: 'supervisionSupport',
      label: 'Workplace Mentorship & Supervision',
      averageScore: supervisionAvg,
      sampleCount: feedbackCount,
      isGap: supervisionAvg < CURRICULUM_GAP_THRESHOLD,
    },
    {
      key: 'curriculumAlignment',
      label: 'OJT Curriculum & Tech Stack Alignment',
      averageScore: alignmentAvg,
      sampleCount: feedbackCount,
      isGap: alignmentAvg < CURRICULUM_GAP_THRESHOLD,
    },
  ];

  const overallIndex = Number(
    ((readinessAvg + relevanceAvg + supervisionAvg + alignmentAvg) / 4).toFixed(2)
  );

  // 6. Aggregate recurring technical and soft skill gaps without fabricating scores
  const gapCounter = new Map<string, { topic: string; category: 'TECHNICAL' | 'SOFT_SKILL'; count: number }>();

  for (const row of matchingFeedback) {
    const technical = String(row.technicalGaps ?? '')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.toLowerCase() !== 'none' && s.toLowerCase() !== 'none observed');

    for (const t of technical) {
      const normalized = t.charAt(0).toUpperCase() + t.slice(1);
      const existing = gapCounter.get(normalized.toLowerCase());
      if (existing) {
        existing.count++;
      } else {
        gapCounter.set(normalized.toLowerCase(), {
          topic: normalized,
          category: 'TECHNICAL',
          count: 1,
        });
      }
    }

    const soft = String(row.softSkillGaps ?? '')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.toLowerCase() !== 'none' && s.toLowerCase() !== 'none observed');

    for (const s of soft) {
      const normalized = s.charAt(0).toUpperCase() + s.slice(1);
      const existing = gapCounter.get(normalized.toLowerCase());
      if (existing) {
        existing.count++;
      } else {
        gapCounter.set(normalized.toLowerCase(), {
          topic: normalized,
          category: 'SOFT_SKILL',
          count: 1,
        });
      }
    }
  }

  const curriculumGaps: CurriculumGapItem[] = Array.from(gapCounter.values())
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .map((item) => ({
      category: item.category,
      topic: item.topic,
      mentionCount: item.count,
      sampleBasis: `${item.count} of ${feedbackCount} supervisor evaluation${
        feedbackCount === 1 ? '' : 's'
      }`,
      percentage: Number(((item.count / feedbackCount) * 100).toFixed(0)),
    }));

  // Add low-scoring dimension gap items if applicable
  for (const dim of dimensions) {
    if (dim.isGap && dim.averageScore !== null) {
      curriculumGaps.unshift({
        category: 'DIMENSION',
        topic: `${dim.label} (Score: ${dim.averageScore.toFixed(2)} / 5.00)`,
        mentionCount: feedbackCount,
        sampleBasis: `Average score below ${CURRICULUM_GAP_THRESHOLD.toFixed(2)} threshold`,
        percentage: 100,
      });
    }
  }

  // 7. Qualitative recommendations with attributable company/supervisor metadata
  const qualitativeRecommendations: QualitativeFeedbackItem[] = matchingFeedback
    .filter((fb) => fb.recommendations && String(fb.recommendations).trim().length > 0)
    .map((fb) => ({
      id: String(fb.id),
      companyName: String(fb.companyName ?? 'Verified Host Company'),
      supervisorName: String(fb.supervisorName ?? 'Industry Supervisor'),
      courseCode: String(fb.courseCode ?? 'Course'),
      academicPeriod: String(fb.academicPeriod ?? 'Academic Term'),
      workplaceReadiness: Number(fb.workplaceReadiness ?? 3),
      competencyRelevance: Number(fb.competencyRelevance ?? 3),
      curriculumAlignment: Number(fb.curriculumAlignment ?? 3),
      recommendations: String(fb.recommendations),
      createdAt: String(fb.createdAt ?? new Date().toISOString()),
    }));

  return {
    filterCourseId,
    filterPeriod,
    filterCompanyId,
    cohortSize,
    feedbackCount,
    missingCount,
    responseRatePercent,
    frameworkVersion: 1,
    scaleMin: 1,
    scaleMax: 5,
    privacyThreshold,
    isPrivacySuppressed: false,
    privacySuppressionNotice: null,
    isSmallSample,
    smallSampleNotice,
    studentReviewsSeparated: true,
    separationNotice,
    dimensions,
    overallIndex,
    curriculumGaps,
    qualitativeRecommendations,
  };
}
