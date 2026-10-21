'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  COMPETENCY_LEVEL_DEFINITIONS,
  SELF_ASSESSMENT_DIMENSIONS,
  SELF_ASSESSMENT_DISCLAIMER,
} from '@/packages/domain/self-assessment';
import type { Row, Snapshot } from '@/packages/validation/contracts';

interface SelfAssessmentModalProps {
  placement: Row;
  data: Snapshot;
  onClose: () => void;
  onSubmit: (scores: Record<string, { score: number; evidence: string }>, version?: number) => Promise<boolean>;
  isLocked?: boolean;
}

export default function SelfAssessmentModal({
  placement,
  data,
  onClose,
  onSubmit,
  isLocked = false,
}: SelfAssessmentModalProps) {
  // Existing baseline evaluation if any
  const existingBaseline = data.evaluations.find(
    (e) => e.placementId === placement.id && e.kind === 'BASELINE'
  );

  const existingScores = existingBaseline
    ? data.scores.filter((s) => s.evaluationId === existingBaseline.id)
    : [];

  // Form states for each dimension
  const [ratings, setRatings] = useState<Record<string, { score: number; evidence: string }>>(() => {
    const initial: Record<string, { score: number; evidence: string }> = {};
    for (const dim of SELF_ASSESSMENT_DIMENSIONS) {
      const match = existingScores.find(
        (s) => String(s.dimension ?? '').toLowerCase() === dim.name.toLowerCase()
      );
      initial[dim.key] = {
        score: match ? Number(match.score) : 3,
        evidence: match && match.evidenceNote ? String(match.evidenceNote) : '',
      };
    }
    return initial;
  });

  const [activeLevelGuidance, setActiveLevelGuidance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAlreadySubmitted = !!existingBaseline;
  const currentVersion = Number(existingBaseline?.version ?? 1);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleScoreChange = (dimKey: string, score: number) => {
    if (isLocked) return;
    setRatings((prev) => ({
      ...prev,
      [dimKey]: { ...prev[dimKey], score },
    }));
    setActiveLevelGuidance(score);
  };

  const handleEvidenceChange = (dimKey: string, evidence: string) => {
    if (isLocked) return;
    setRatings((prev) => ({
      ...prev,
      [dimKey]: { ...prev[dimKey], evidence },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setSubmitting(true);
    try {
      const ok = await onSubmit(ratings, isAlreadySubmitted ? currentVersion : undefined);
      if (ok) {
        toast.success(
          isAlreadySubmitted
            ? 'Self-assessment updated successfully.'
            : 'Self-assessment submitted! Baseline established for company evaluation.'
        );
        onClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit self-assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-assessment-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(14, 42, 87, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px -10px rgba(14, 42, 87, 0.25)',
          border: '1px solid #dbe5f2',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #eef3f9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #fbfdff 0%, #f4f8fc 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '100px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: isAlreadySubmitted ? '#eaf6ef' : '#edf4fd',
                  color: isAlreadySubmitted ? '#166b42' : '#124c91',
                  border: `1px solid ${isAlreadySubmitted ? '#c2e7d1' : '#c9defc'}`,
                }}
              >
                {isAlreadySubmitted ? (
                  <>
                    <CheckCircle2 size={12} />
                    Baseline Established · v{currentVersion}
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    Initial Self-Assessment Baseline
                  </>
                )}
              </span>

              {isLocked && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#fef3f2',
                    color: '#b42318',
                    border: '1px solid #fecdca',
                  }}
                >
                  <Lock size={12} />
                  Locked (Evaluation Underway)
                </span>
              )}
            </div>
            <h2
              id="self-assessment-title"
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: '#0e2a57',
                letterSpacing: '-0.01em',
              }}
            >
              Student Self-Assessment Competency Report
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5e7490', lineHeight: 1.45 }}>
              Record your perceived skill baseline across RTU practicum competencies. Your host company
              supervisor will compare observed workplace performance with this baseline.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748b',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Official Disclaimer Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#475569',
            }}
          >
            <ShieldAlert size={17} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#0e2a57' }}>Reflective Self-Perception Notice:</strong>{' '}
              {SELF_ASSESSMENT_DISCLAIMER}
            </div>
          </div>

          {/* Rating Level Guide Accordion / Preview */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              backgroundColor: '#f0f5fc',
              border: '1px solid #d5e4f7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Info size={15} style={{ color: '#124c91' }} />
              <strong style={{ fontSize: '13px', color: '#0e2a57' }}>
                Competency Rating Level Guide (1 to 5)
              </strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {COMPETENCY_LEVEL_DEFINITIONS.map((def) => {
                const isSelected = activeLevelGuidance === def.level;
                return (
                  <div
                    key={def.level}
                    onClick={() => setActiveLevelGuidance(def.level)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                      border: `1px solid ${isSelected ? '#124c91' : '#d2e0f2'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(18, 76, 145, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '12px', color: isSelected ? '#124c91' : '#0e2a57' }}>
                        Level {def.level}
                      </strong>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                      {def.title}
                    </div>
                  </div>
                );
              })}
            </div>
            {activeLevelGuidance && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #bcd3ef',
                  fontSize: '12px',
                  color: '#334155',
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: '#124c91' }}>
                  Level {activeLevelGuidance} —{' '}
                  {COMPETENCY_LEVEL_DEFINITIONS.find((d) => d.level === activeLevelGuidance)?.title}:
                </strong>{' '}
                {
                  COMPETENCY_LEVEL_DEFINITIONS.find((d) => d.level === activeLevelGuidance)
                    ?.behavioralAnchor
                }
              </div>
            )}
          </div>

          {/* Form */}
          <form id="self-assessment-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {SELF_ASSESSMENT_DIMENSIONS.map((dim, idx) => {
              const currentRating = ratings[dim.key] ?? { score: 3, evidence: '' };
              return (
                <div
                  key={dim.key}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: '#edf4fd',
                            color: '#124c91',
                          }}
                        >
                          {dim.weightPercent}% Weight
                        </span>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0e2a57' }}>
                          {idx + 1}. {dim.name}
                        </h3>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.45 }}>
                        {dim.description}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Selected Rating:</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#124c91' }}>
                        {currentRating.score} / 5
                      </div>
                    </div>
                  </div>

                  {/* Level Selection Pills */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Select Perceived Baseline Competency:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        const isChosen = currentRating.score === lvl;
                        const def = COMPETENCY_LEVEL_DEFINITIONS.find((d) => d.level === lvl);
                        return (
                          <button
                            type="button"
                            key={lvl}
                            disabled={isLocked}
                            onClick={() => handleScoreChange(dim.key, lvl)}
                            style={{
                              padding: '8px 6px',
                              borderRadius: '6px',
                              border: `1.5px solid ${isChosen ? '#124c91' : '#cbd5e1'}`,
                              backgroundColor: isChosen ? '#124c91' : '#ffffff',
                              color: isChosen ? '#ffffff' : '#1e293b',
                              cursor: isLocked ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              transition: 'all 0.15s ease',
                              opacity: isLocked && !isChosen ? 0.6 : 1,
                            }}
                          >
                            <span style={{ fontSize: '14px', fontWeight: 700 }}>{lvl}</span>
                            <span
                              style={{
                                fontSize: '10px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                                opacity: isChosen ? 0.95 : 0.75,
                              }}
                            >
                              {def?.title.split('/')[0]?.trim()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Evidence / Narrative Field */}
                  <div>
                    <label
                      htmlFor={`evidence-${dim.key}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '4px',
                      }}
                    >
                      <span>Reflection Note &amp; Learning Goals (Optional):</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {currentRating.evidence.length}/1000
                      </span>
                    </label>
                    <textarea
                      id={`evidence-${dim.key}`}
                      disabled={isLocked}
                      value={currentRating.evidence}
                      onChange={(e) => handleEvidenceChange(dim.key, e.target.value)}
                      placeholder={`e.g. ${dim.guidanceQuestions[0]}`}
                      maxLength={1000}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        lineHeight: 1.45,
                        color: '#1e293b',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        outline: 'none',
                        backgroundColor: isLocked ? '#f8fafc' : '#ffffff',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #eef3f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {isLocked ? (
              <span style={{ color: '#b42318' }}>Report is locked after company evaluation commences.</span>
            ) : (
              <span>All 4 competencies are required before submitting.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLocked ? 'Close' : 'Cancel'}
            </button>

            {!isLocked && (
              <button
                type="submit"
                form="self-assessment-form"
                disabled={submitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(180deg, #13529d 0%, #0d3c74 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(18, 76, 145, 0.2)',
                  opacity: submitting ? 0.75 : 1,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>Saving Baseline...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{isAlreadySubmitted ? 'Update Baseline' : 'Submit Baseline Report'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
