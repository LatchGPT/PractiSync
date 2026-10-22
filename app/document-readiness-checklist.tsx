'use client';

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck,
  FileWarning,
  ShieldCheck,
} from 'lucide-react';
import type {Snapshot} from '@/packages/validation/contracts';

interface DocumentReadinessChecklistProps {
  data: Snapshot;
  navigate: (page: string) => void;
}

export default function DocumentReadinessChecklist({
  data,
  navigate,
}: DocumentReadinessChecklistProps) {
  const {user} = data;
  const placement =
    data.placements.find(p => p.studentId === user.id && p.status === 'ACTIVE') ??
    data.placements.find(p => p.studentId === user.id);

  const documents = placement
    ? data.documents.filter(d => d.placementId === placement.id)
    : [];

  const approvedDocs = documents.filter(d => d.status === 'APPROVED');
  const rejectedDocs = documents.filter(d => d.status === 'REJECTED');

  const totalCount = documents.length || 3;
  const approvedCount = approvedDocs.length;
  const readinessPercent = Math.round((approvedCount / totalCount) * 100);

  const isAllApproved = approvedCount === totalCount && totalCount > 0;
  const hasRejection = rejectedDocs.length > 0;

  return (
    <section className="role-card doc-readiness-card" aria-label="Document Readiness Checklist">
      <div className="role-card-heading">
        <h2>Internship Documents Checklist</h2>
        <button
          className="role-link"
          onClick={() => navigate('documents')}
          title="Open Internship Documents module"
        >
          View all records <ArrowRight size={14} />
        </button>
      </div>

      <div className="doc-readiness-body">
        {/* Compliance Meter Header */}
        <div className="doc-meter-wrap">
          <div className="doc-meter-top">
            <div className="doc-meter-label">
              <FileCheck size={16} className="doc-meter-icon" />
              <span>
                <strong>{approvedCount} of {totalCount}</strong> documents approved
              </span>
            </div>
            <span
              className={`doc-meter-badge ${
                isAllApproved
                  ? 'badge-success'
                  : hasRejection
                  ? 'badge-warning'
                  : 'badge-progress'
              }`}
            >
              {isAllApproved
                ? '● Fully Cleared'
                : hasRejection
                ? '▲ Action Required'
                : '⏳ In Review'}
            </span>
          </div>

          <div className="doc-progress-track">
            <div
              className={`doc-progress-bar ${
                isAllApproved ? 'bar-success' : hasRejection ? 'bar-warning' : 'bar-primary'
              }`}
              style={{width: `${readinessPercent}%`}}
            />
          </div>
        </div>

        {/* Document Items List */}
        {documents.length > 0 ? (
          <div className="doc-checklist-list">
            {documents.map(doc => {
              const status = String(doc.status ?? '');
              const statusLower = status.toLowerCase();
              const isApproved = status === 'APPROVED';
              const isRejected = status === 'REJECTED';

              return (
                <div
                  key={doc.id}
                  className={`doc-check-item status-${statusLower}`}
                  onClick={() => navigate('documents')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('documents');
                    }
                  }}
                  title="Click to view Internship Documents"
                >
                  {/* Status Indicator Icon */}
                  <div className="doc-item-icon-wrap">
                    {isApproved ? (
                      <span className="doc-icon-node node-approved">
                        <CheckCircle2 size={16} />
                      </span>
                    ) : isRejected ? (
                      <span className="doc-icon-node node-rejected">
                        <FileWarning size={16} />
                      </span>
                    ) : (
                      <span className="doc-icon-node node-pending">
                        <Clock size={16} />
                      </span>
                    )}
                  </div>

                  {/* Document Information */}
                  <div className="doc-item-content">
                    <div className="doc-item-header">
                      <strong className="doc-item-title">{String(doc.name ?? 'Internship Document')}</strong>
                      <span
                        className={`doc-status-chip chip-${statusLower}`}
                      >
                        {isApproved
                          ? 'Approved'
                          : isRejected
                          ? 'Correction Needed'
                          : 'Under Review'}
                      </span>
                    </div>

                    <div className="doc-item-meta">
                      <span>{String(doc.filename ?? 'document.pdf')}</span>
                      <span>·</span>
                      <span>Version {String(doc.version ?? 1)}</span>
                    </div>

                    {/* Feedback note if rejected */}
                    {isRejected && doc.reason && (
                      <div className="doc-rejection-note">
                        <AlertCircle size={13} />
                        <span>Feedback: {String(doc.reason)}</span>
                      </div>
                    )}
                  </div>

                  {!isRejected && (
                    <div className="doc-item-action">
                      <ArrowRight size={14} className="doc-arrow-ghost" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="role-empty">
            No internship documents uploaded yet. Ask your coordinator for the required templates.
          </div>
        )}

        {/* Footer Note */}
        <div className="doc-checklist-footer">
          <ShieldCheck size={14} />
          <span>
            Internship documents are reviewed and verified by your class coordinator before academic clearance.
          </span>
        </div>
      </div>
    </section>
  );
}
