import type { Row } from '../validation/contracts';

export interface RubricDimensionConfig {
  key: string;
  name: string;
  weight: number;
  scaleMin: number;
  scaleMax: number;
}

export interface RubricFrameworkConfig {
  id: string;
  name: string;
  version: number;
  scaleMin: number;
  scaleMax: number;
  attainmentThreshold: number;
  dimensions: RubricDimensionConfig[];
}

export const DEFAULT_RUBRIC_CONFIG: RubricFrameworkConfig = {
  id: 'framework-rtu-v1',
  name: 'RTU Practicum Competency Framework',
  version: 1,
  scaleMin: 1,
  scaleMax: 5,
  attainmentThreshold: 3.5,
  dimensions: [
    { key: 'technical', name: 'Technical skills', weight: 0.35, scaleMin: 1, scaleMax: 5 },
    { key: 'problemSolving', name: 'Problem solving', weight: 0.25, scaleMin: 1, scaleMax: 5 },
    { key: 'communication', name: 'Communication', weight: 0.2, scaleMin: 1, scaleMax: 5 },
    { key: 'professionalism', name: 'Professionalism', weight: 0.2, scaleMin: 1, scaleMax: 5 },
  ],
};

export type AttainmentStatus =
  | 'ACHIEVED'
  | 'DEVELOPING'
  | 'GAP'
  | 'INSUFFICIENT_EVIDENCE'
  | 'INCOMPATIBLE_EVIDENCE';

export type DimensionAttainmentStatus = 'ACHIEVED' | 'DEVELOPING' | 'GAP' | 'NO_EVIDENCE';

export interface DimensionEvaluation {
  key: string;
  name: string;
  weight: number;
  weightPercent: number;
  averageScore: number | null;
  sampleCount: number;
  status: DimensionAttainmentStatus;
  evaluatorSources: string[];
}

export interface OutcomeEvaluationResult {
  placementId: string;
  frameworkName: string;
  frameworkVersion: number;
  scaleMin: number;
  scaleMax: number;
  attainmentThreshold: number;
  evidenceStatus: 'COMPLETE' | 'INSUFFICIENT' | 'INCOMPATIBLE';
  evidenceMessage: string;
  formula: string;
  formulaApplied: string | null;
  dimensions: DimensionEvaluation[];
  weightedScore: number | null;
  attainmentStatus: AttainmentStatus;
  achievedOutcomes: string[];
  developingOutcomes: string[];
  gapOutcomes: string[];
  totalApprovedEvaluations: number;
  includedEvaluationIds: string[];
  decisionSupportDisclaimer: string;
}

export function calculateOutcomeEvaluation(
  placementId: string,
  evaluations: Row[],
  scores: Row[],
  config: RubricFrameworkConfig = DEFAULT_RUBRIC_CONFIG
): OutcomeEvaluationResult {
  const disclaimer =
    'Decision Support Only: This calculated result does not automatically certify OJT completion, approve a grade, or replace a coordinator’s formal academic decision.';

  // Formula description
  const dimensionParts = config.dimensions.map(
    (d) => `(${d.name} × ${(d.weight * 100).toFixed(0)}%)`
  );
  const formula = `Weighted Outcome Score = ${dimensionParts.join(' + ')}`;

  // Find evaluations for this placement
  const placementEvals = evaluations.filter((e) => e.placementId === placementId);

  // Filter approved evaluations only
  const approvedEvals = placementEvals.filter((e) => {
    const kind = String(e.kind ?? '');
    const status = String(e.status ?? '');
    if (['WEEKLY', 'MONTHLY'].includes(kind)) {
      return status === 'APPROVED';
    }
    // Baseline and final legacy evaluations
    return ['BASELINE', 'FINAL'].includes(kind);
  });

  // Check for incompatible framework versions or scales
  const incompatible = approvedEvals.some((e) => {
    const ver = Number(e.frameworkVersion ?? 1);
    return ver !== config.version;
  });

  if (incompatible) {
    return {
      placementId,
      frameworkName: config.name,
      frameworkVersion: config.version,
      scaleMin: config.scaleMin,
      scaleMax: config.scaleMax,
      attainmentThreshold: config.attainmentThreshold,
      evidenceStatus: 'INCOMPATIBLE',
      evidenceMessage:
        'Evidence contains incompatible framework versions or scale configurations. Incompatible evidence cannot be combined.',
      formula,
      formulaApplied: null,
      dimensions: config.dimensions.map((d) => ({
        key: d.key,
        name: d.name,
        weight: d.weight,
        weightPercent: Math.round(d.weight * 100),
        averageScore: null,
        sampleCount: 0,
        status: 'NO_EVIDENCE',
        evaluatorSources: [],
      })),
      weightedScore: null,
      attainmentStatus: 'INCOMPATIBLE_EVIDENCE',
      achievedOutcomes: [],
      developingOutcomes: [],
      gapOutcomes: [],
      totalApprovedEvaluations: approvedEvals.length,
      includedEvaluationIds: [],
      decisionSupportDisclaimer: disclaimer,
    };
  }

  // Map scores to dimensions
  const approvedIds = new Set(approvedEvals.map((e) => e.id));
  const relevantScores = scores.filter((s) => approvedIds.has(String(s.evaluationId)));

  const dimensionResults: DimensionEvaluation[] = config.dimensions.map((dim) => {
    const dimScores = relevantScores.filter(
      (s) => String(s.dimension ?? '').toLowerCase() === dim.name.toLowerCase()
    );

    // Also check if any score is out of configured scale bounds
    const outOfBounds = dimScores.some(
      (s) => Number(s.score) < dim.scaleMin || Number(s.score) > dim.scaleMax
    );
    if (outOfBounds) {
      return {
        key: dim.key,
        name: dim.name,
        weight: dim.weight,
        weightPercent: Math.round(dim.weight * 100),
        averageScore: null,
        sampleCount: 0,
        status: 'NO_EVIDENCE',
        evaluatorSources: [],
      };
    }

    if (!dimScores.length) {
      return {
        key: dim.key,
        name: dim.name,
        weight: dim.weight,
        weightPercent: Math.round(dim.weight * 100),
        averageScore: null,
        sampleCount: 0,
        status: 'NO_EVIDENCE',
        evaluatorSources: [],
      };
    }

    const sum = dimScores.reduce((acc, s) => acc + Number(s.score), 0);
    const avg = Number((sum / dimScores.length).toFixed(2));

    const sources = Array.from(
      new Set(
        dimScores.map((s) => {
          const evalItem = approvedEvals.find((e) => e.id === s.evaluationId);
          const kind = String(evalItem?.kind ?? '');
          return kind === 'WEEKLY'
            ? 'Approved weekly assessment'
            : kind === 'MONTHLY'
              ? 'Approved monthly assessment'
              : kind === 'BASELINE'
                ? 'Baseline self-assessment'
                : kind === 'FINAL'
                  ? 'Final evaluation'
                  : 'Approved assessment';
        })
      )
    );

    let status: DimensionAttainmentStatus = 'GAP';
    if (avg >= config.attainmentThreshold) {
      status = 'ACHIEVED';
    } else if (avg >= 2.5) {
      status = 'DEVELOPING';
    } else {
      status = 'GAP';
    }

    return {
      key: dim.key,
      name: dim.name,
      weight: dim.weight,
      weightPercent: Math.round(dim.weight * 100),
      averageScore: avg,
      sampleCount: dimScores.length,
      status,
      evaluatorSources: sources,
    };
  });

  // Check evidence completeness
  const missingDimensions = dimensionResults.filter((d) => d.sampleCount === 0);

  if (missingDimensions.length > 0) {
    return {
      placementId,
      frameworkName: config.name,
      frameworkVersion: config.version,
      scaleMin: config.scaleMin,
      scaleMax: config.scaleMax,
      attainmentThreshold: config.attainmentThreshold,
      evidenceStatus: 'INSUFFICIENT',
      evidenceMessage: `Insufficient evidence: Missing approved assessments for ${missingDimensions.map((d) => d.name).join(', ')}. Outcome scores are never inferred for missing dimensions.`,
      formula,
      formulaApplied: null,
      dimensions: dimensionResults,
      weightedScore: null,
      attainmentStatus: 'INSUFFICIENT_EVIDENCE',
      achievedOutcomes: dimensionResults.filter((d) => d.status === 'ACHIEVED').map((d) => d.name),
      developingOutcomes: dimensionResults.filter((d) => d.status === 'DEVELOPING').map((d) => d.name),
      gapOutcomes: dimensionResults.filter((d) => d.status === 'GAP').map((d) => d.name),
      totalApprovedEvaluations: approvedEvals.length,
      includedEvaluationIds: approvedEvals.map((e) => e.id),
      decisionSupportDisclaimer: disclaimer,
    };
  }

  // Calculate weighted outcome score
  const totalWeight = config.dimensions.reduce((acc, d) => acc + d.weight, 0);
  const weightedSum = dimensionResults.reduce((acc, d) => {
    return acc + (d.averageScore ?? 0) * d.weight;
  }, 0);
  const weightedScore = Number((weightedSum / totalWeight).toFixed(2));

  // Applied formula string
  const appliedParts = dimensionResults.map(
    (d) => `(${(d.averageScore ?? 0).toFixed(2)} × ${d.weight.toFixed(2)})`
  );
  const formulaApplied = `${appliedParts.join(' + ')} = ${weightedScore.toFixed(2)} / ${config.scaleMax}.0`;

  let attainmentStatus: AttainmentStatus = 'GAP';
  if (weightedScore >= config.attainmentThreshold) {
    attainmentStatus = 'ACHIEVED';
  } else if (weightedScore >= 2.5) {
    attainmentStatus = 'DEVELOPING';
  } else {
    attainmentStatus = 'GAP';
  }

  return {
    placementId,
    frameworkName: config.name,
    frameworkVersion: config.version,
    scaleMin: config.scaleMin,
    scaleMax: config.scaleMax,
    attainmentThreshold: config.attainmentThreshold,
    evidenceStatus: 'COMPLETE',
    evidenceMessage: `Complete evidence: All ${config.dimensions.length} rubric dimensions have coordinator-approved assessment evidence (${approvedEvals.length} evaluations evaluated).`,
    formula,
    formulaApplied,
    dimensions: dimensionResults,
    weightedScore,
    attainmentStatus,
    achievedOutcomes: dimensionResults.filter((d) => d.status === 'ACHIEVED').map((d) => d.name),
    developingOutcomes: dimensionResults.filter((d) => d.status === 'DEVELOPING').map((d) => d.name),
    gapOutcomes: dimensionResults.filter((d) => d.status === 'GAP').map((d) => d.name),
    totalApprovedEvaluations: approvedEvals.length,
    includedEvaluationIds: approvedEvals.map((e) => e.id),
    decisionSupportDisclaimer: disclaimer,
  };
}
