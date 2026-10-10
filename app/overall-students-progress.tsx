'use client';

import { useState } from 'react';
import {
  ArrowRight,
  UserCheck,
  Eye,
} from 'lucide-react';
import type { Row, Snapshot } from '@/packages/validation/contracts';

const s = (row: Row, key: string) => String(row[key] ?? '');
const n = (row: Row, key: string) => Number(row[key] ?? 0);
const hours = (minutes: number) => `${Number((minutes / 60).toFixed(1))} hrs`;
const initials = (name: string) =>
  name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('');

export default function OverallStudentsProgress({
  data,
  navigate,
  onViewStudent,
}: {
  data: Snapshot;
  navigate: (page: string) => void;
  onViewStudent?: (studentId: string) => void;
}) {
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  // Coordinated classes
  const classes = data.classes.filter(c => !n(c, 'revoked'));

  // Placements in coordinator view
  const allPlacements = data.placements;

  // Sections list from classes
  const sections = Array.from(new Set(classes.map(c => s(c, 'section')).filter(Boolean)));

  // Filtered placements
  const filteredPlacements = selectedSection === 'ALL'
    ? allPlacements
    : allPlacements.filter(p => s(p, 'section') === selectedSection);

  // Pending join requests
  const pendingRequests = (data.joinRequests ?? []).filter(r => r.status === 'PENDING');

  // Helper calculations
  const studentEntries = (placementId: string) =>
    data.entries.filter(e => e.placementId === placementId);

  const reportedMinutes = (placementId: string) =>
    studentEntries(placementId).reduce((sum, e) => sum + n(e, 'minutes'), 0);

  const confirmedMinutes = (placementId: string) =>
    studentEntries(placementId)
      .filter(e => e.confirmedVersion === e.version)
      .reduce((sum, e) => sum + n(e, 'minutes'), 0);

  return (
    <section className="overall-students-card">
      <div className="overall-card-header">
        <div>
          <h2>Overall Students Progress</h2>
          <p>
            Comprehensive tracking of training hours, verification rates, and student leaders by section.
          </p>
        </div>
        <button
          type="button"
          className="role-link"
          onClick={() => navigate('classes')}
        >
          Manage classes & rosters <ArrowRight size={14} />
        </button>
      </div>

      {/* Pending Join Requests Alert Banner */}
      {pendingRequests.length > 0 && (
        <div className="join-requests-alert">
          <div className="join-requests-alert-left">
            <div className="join-requests-alert-icon">
              <UserCheck size={20} />
            </div>
            <div>
              <strong>
                {pendingRequests.length} Student Join Request
                {pendingRequests.length > 1 ? 's' : ''} Awaiting Approval
              </strong>
              <p>
                {pendingRequests.length === 1
                  ? `${s(pendingRequests[0], 'studentName')} has requested to join ${s(pendingRequests[0], 'classSection')}.`
                  : `${pendingRequests.length} students have submitted enrollment requests for your classes.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="primary"
            style={{ padding: '7px 16px', fontSize: 13 }}
            onClick={() => navigate('classes')}
          >
            Review Requests <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Section / Block Filter Bar */}
      <div className="section-filter-bar">
        <button
          type="button"
          className={`section-pill ${selectedSection === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedSection('ALL')}
        >
          All Sections
          <span className="section-pill-count">{allPlacements.length}</span>
        </button>
        {sections.map(section => {
          const count = allPlacements.filter(p => s(p, 'section') === section).length;
          return (
            <button
              key={section}
              type="button"
              className={`section-pill ${selectedSection === section ? 'active' : ''}`}
              onClick={() => setSelectedSection(section)}
            >
              {section}
              <span className="section-pill-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Student Progress Roster */}
      <div className="student-progress-roster">
        {filteredPlacements.length > 0 ? (
          filteredPlacements.map(placement => {
            const cls = classes.find(c => c.id === placement.classId);
            const isClassRep = cls ? s(cls, 'classRepId') === placement.studentId : false;
            const isViceRep = cls ? s(cls, 'viceClassRepId') === placement.studentId : false;

            const repMins = reportedMinutes(placement.id);
            const confMins = confirmedMinutes(placement.id);
            const targetMins = n(placement, 'requiredMinutes');
            const percentReported = targetMins > 0 ? Math.min(100, Math.round((repMins / targetMins) * 100)) : 0;
            const percentConfirmed = targetMins > 0 ? Math.min(100, Math.round((confMins / targetMins) * 100)) : 0;

            return (
              <div className="student-progress-item" key={placement.id}>
                {/* Student Info */}
                <div className="student-info-col">
                  <span className="avatar tan" style={{ width: 40, height: 40, fontSize: 13 }}>
                    {initials(s(placement, 'studentName'))}
                  </span>
                  <div className="student-meta-details">
                    <strong>{s(placement, 'studentName')}</strong>
                    <span>
                      {s(placement, 'section')} · {s(placement, 'companyName')}
                    </span>
                    {(isClassRep || isViceRep) && (
                      <div className="student-rep-tags">
                        {isClassRep && (
                          <span className="badge-class-rep" title="Class Representative">
                            Class Rep
                          </span>
                        )}
                        {isViceRep && (
                          <span className="badge-vice-rep" title="Vice Class Representative">
                            Vice Rep
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="student-bars-col">
                  <div className="student-bars-header">
                    <div>
                      <strong>{hours(repMins)}</strong>
                      <span style={{ margin: '0 4px', color: '#8aa0b8' }}>/</span>
                      <span>{targetMins ? hours(targetMins) : 'No target'}</span>
                      <strong style={{ marginLeft: 8, color: '#185399' }}>({percentReported}%)</strong>
                    </div>
                    <span className="student-bars-confirmed">{hours(confMins)} confirmed</span>
                  </div>
                  <div
                    className="dual-progress-bar-track"
                    title={`Reported: ${hours(repMins)} (${percentReported}%) | Confirmed: ${hours(confMins)} (${percentConfirmed}%)`}
                  >
                    <div
                      className="dual-progress-fill-reported"
                      style={{ width: `${percentReported}%` }}
                    />
                    <div
                      className="dual-progress-fill-confirmed"
                      style={{ width: `${percentConfirmed}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="student-action-col">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      if (onViewStudent) {
                        onViewStudent(s(placement, 'studentId'));
                      } else {
                        navigate('classes');
                      }
                    }}
                  >
                    <Eye size={13} style={{ display: 'inline', marginRight: 5 }} />
                    View profile
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="role-empty" style={{ padding: '24px 0' }}>
            No students found in {selectedSection === 'ALL' ? 'your classes' : selectedSection}.
          </p>
        )}
      </div>
    </section>
  );
}
