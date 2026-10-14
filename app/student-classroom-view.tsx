'use client';

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  CalendarDays,
  Star,
  ShieldCheck,
  Building2,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Mail,
  Search,
  BookOpen,
  ArrowRight,
  ExternalLink,
  MapPin,
  Sparkles,
  School,
  AlertCircle
} from 'lucide-react';
import type { Snapshot, Row, Identity } from '@/packages/validation/contracts';

interface StudentClassroomViewProps {
  data: Snapshot;
  user: Identity;
  ownPlacement?: Row;
  onOpenJoin: () => void;
  onViewStudent: (placement: Row) => void;
}

const s = (r?: Row | null, key = ''): string => String(r?.[key] ?? '');
const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function StudentClassroomView({
  data,
  user,
  ownPlacement,
  onOpenJoin,
  onViewStudent,
}: StudentClassroomViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Pending join requests
  const myPending = (data.joinRequests ?? []).find(
    r => r.studentId === user.id && r.status === 'PENDING'
  );

  // 2. Enrolled class
  const myClass =
    data.classes.find(c => c.id === ownPlacement?.classId) ?? data.classes[0];

  // Course & department context
  const course = data.courses.find(co => co.id === myClass?.courseId);
  const department = data.departments.find(d => d.id === course?.departmentId);
  const courseCode = s(course, 'code') || 'BSIT';
  const courseName = s(course, 'name') || 'BS Information Technology';
  const departmentName = s(department, 'name') || 'Computing & Technology';

  // Coordinator context
  const coordinatorUser = data.users.find(u => u.id === myClass?.coordinatorId);
  const coordinatorName: string =
    s(myClass, 'coordinatorName') ||
    (coordinatorUser?.name ? String(coordinatorUser.name) : '') ||
    'Assigned Practicum Coordinator';
  const coordinatorEmail: string =
    (coordinatorUser?.email ? String(coordinatorUser.email) : '') ||
    `${coordinatorName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rtu.edu.ph`;

  // Leadership context
  const classRepId = s(myClass, 'classRepId');
  const viceClassRepId = s(myClass, 'viceClassRepId');

  const classPlacements = useMemo(
    () => (myClass ? data.placements.filter(p => p.classId === myClass.id) : []),
    [data.placements, myClass]
  );

  const classRepPlacement = classPlacements.find(p => p.studentId === classRepId);
  const classRepUser = data.users.find(u => u.id === classRepId);
  const classRepName: string =
    s(myClass, 'classRepName') ||
    s(classRepPlacement, 'studentName') ||
    (classRepUser?.name ? String(classRepUser.name) : '') ||
    '';
  const classRepEmail: string =
    s(classRepPlacement, 'studentEmail') ||
    (classRepUser?.email ? String(classRepUser.email) : '') ||
    (classRepName ? `${classRepName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rtu.edu.ph` : '');

  const viceRepPlacement = classPlacements.find(p => p.studentId === viceClassRepId);
  const viceRepUser = data.users.find(u => u.id === viceClassRepId);
  const viceRepName: string =
    s(myClass, 'viceClassRepName') ||
    s(viceRepPlacement, 'studentName') ||
    (viceRepUser?.name ? String(viceRepUser.name) : '') ||
    '';
  const viceRepEmail: string =
    s(viceRepPlacement, 'studentEmail') ||
    (viceRepUser?.email ? String(viceRepUser.email) : '') ||
    (viceRepName ? `${viceRepName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rtu.edu.ph` : '');

  // Filtered classmate directory
  const filteredClassmates = useMemo(() => {
    if (!searchQuery.trim()) return classPlacements;
    const q = searchQuery.toLowerCase();
    return classPlacements.filter(p => {
      const name = s(p, 'studentName').toLowerCase();
      const company = s(p, 'companyName').toLowerCase();
      const email = s(p, 'studentEmail').toLowerCase();
      return name.includes(q) || company.includes(q) || email.includes(q);
    });
  }, [classPlacements, searchQuery]);

  // If no enrolled class and no class available
  if (!myClass) {
    return (
      <div className="student-classroom-container">
        {myPending && (
          <div className="join-requests-alert">
            <div className="join-requests-alert-left">
              <div className="join-requests-alert-icon">
                <Clock size={20} />
              </div>
              <div>
                <strong>Class Join Request Pending Review</strong>
                <p>
                  You requested to join <b>{s(myPending, 'classSection') || s(myPending, 'section')}</b>.
                  Your coordinator must approve your enrollment.
                </p>
              </div>
            </div>
            <span className="chip orange">Pending Approval</span>
          </div>
        )}
        <div className="classroom-join-empty">
          <div className="classroom-join-empty-icon">
            <BookOpen size={28} />
          </div>
          <h3>Join your Practicum Class</h3>
          <p>
            Ask your coordinator for your class enrollment code. Enter the code to join your practicum section and sync your training records.
          </p>
          <button className="primary" onClick={onOpenJoin}>
            <Plus size={15} /> Join a class
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-classroom-container">
      {/* 1. Pending Approval Banner if student submitted a request */}
      {myPending && (
        <div className="join-requests-alert">
          <div className="join-requests-alert-left">
            <div className="join-requests-alert-icon">
              <Clock size={20} />
            </div>
            <div>
              <strong>Class Join Request Pending Review</strong>
              <p>
                You requested to join <b>{s(myPending, 'classSection') || s(myPending, 'section')}</b>.
                Your coordinator must review and approve your request before your section is updated.
              </p>
            </div>
          </div>
          <span className="chip orange">Pending Approval</span>
        </div>
      )}

      {/* 2. Header Card (Acceptance Criterion 1) */}
      <section className="classroom-banner-card">
        {/* Banner Hero */}
        <div className="classroom-banner-header">
          <div className="classroom-banner-top">
            <div>
              <div className="classroom-banner-badge-row">
                <span className="classroom-academic-badge">
                  <CalendarDays size={12} />
                  {s(myClass, 'period') || 'A.Y. 2026–2027 · 1st Semester'}
                </span>
                <span className="classroom-dept-badge">
                  <School size={12} />
                  {departmentName}
                </span>
              </div>
              <h2 className="classroom-banner-title">{s(myClass, 'section')}</h2>
              <div className="classroom-banner-sub">
                {s(myClass, 'name')} · {courseName} ({courseCode})
              </div>
            </div>
            <div className="classroom-banner-status-wrap">
              <span className="classroom-enrolled-pill">
                <CheckCircle2 size={13} />
                Enrolled Section
              </span>
              <button
                type="button"
                className="classroom-switch-code-btn"
                onClick={onOpenJoin}
                title="Switch section or enter an enrollment code"
              >
                <Plus size={13} />
                Switch / Enter Code
              </button>
            </div>
          </div>
        </div>

        {/* Balanced Grid Body: Consultation & Coordinator Details */}
        <div className="classroom-banner-grid-body">
          <div className="classroom-meta-cell">
            <div className="classroom-meta-icon">
              <GraduationCap size={18} />
            </div>
            <div className="classroom-meta-content">
              <span className="classroom-meta-label">Practicum Coordinator</span>
              <strong className="classroom-meta-value">{coordinatorName}</strong>
              <a
                href={`mailto:${coordinatorEmail}`}
                className="classroom-meta-sublink"
                title={`Email ${coordinatorName}`}
              >
                <Mail size={12} />
                {coordinatorEmail}
              </a>
            </div>
          </div>

          <div className="classroom-meta-cell">
            <div className="classroom-meta-icon">
              <Clock size={18} />
            </div>
            <div className="classroom-meta-content">
              <span className="classroom-meta-label">Consultation Schedule</span>
              <strong className="classroom-meta-value">Mon–Thu · 1:00 PM – 5:00 PM</strong>
              <span className="classroom-meta-sub">
                OJT Affairs Office · Room 302 (Pasig Campus)
              </span>
            </div>
          </div>

          <div className="classroom-meta-cell">
            <div className="classroom-meta-icon">
              <Building2 size={18} />
            </div>
            <div className="classroom-meta-content">
              <span className="classroom-meta-label">Your Training Placement</span>
              <strong className="classroom-meta-value">
                {s(ownPlacement, 'companyName') || 'Pending Placement'}
              </strong>
              <span className="classroom-meta-sub">
                {ownPlacement ? `Status: ${s(ownPlacement, 'status')}` : 'Awaiting company endorsement'}
              </span>
            </div>
          </div>

          <div className="classroom-meta-cell">
            <div className="classroom-meta-icon">
              <Users size={18} />
            </div>
            <div className="classroom-meta-content">
              <span className="classroom-meta-label">Class Roster Capacity</span>
              <strong className="classroom-meta-value">
                {classPlacements.length} Enrolled Students
              </strong>
              <span className="classroom-meta-sub">
                Enrollment Code: <code className="classroom-code-inline">{s(myClass, 'codeLabel') || 'SYNC4A'}</code>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Class Leadership Section (Acceptance Criterion 2) */}
      <section className="student-leadership-section">
        <div className="student-section-header">
          <div className="student-section-header-left">
            <div className="student-section-icon gold">
              <Star size={18} fill="#d7aa3e" color="#d7aa3e" />
            </div>
            <div>
              <h3 className="student-section-title">Class Leadership & Student Representatives</h3>
              <p className="student-section-subtitle">
                Official student leaders designated for coordinator liaison, section announcements, and peer guidance.
              </p>
            </div>
          </div>
        </div>

        <div className="student-leadership-grid">
          {/* Class Representative Card */}
          <div className="student-leader-card leader-rep">
            <div className="student-leader-top">
              <div className="student-leader-avatar rep">
                {classRepName ? initials(classRepName) : 'CR'}
              </div>
              <div className="student-leader-info">
                <div className="student-leader-tag-row">
                  <span className="badge-class-rep">
                    <Star size={11} fill="#825b08" color="#825b08" />
                    Class Representative
                  </span>
                  {classRepId === user.id && (
                    <span className="chip blue student-self-pill">You</span>
                  )}
                </div>
                <h4 className="student-leader-name">
                  {classRepName || 'Unassigned Representative'}
                </h4>
                <p className="student-leader-desc">
                  Primary point of contact (kakausapin) for coordinator inquiries and section coordination.
                </p>
              </div>
            </div>
            {classRepName ? (
              <div className="student-leader-footer">
                <a
                  href={`mailto:${classRepEmail}`}
                  className="student-leader-contact-btn"
                  title={`Email ${classRepName}`}
                >
                  <Mail size={13} />
                  <span>{classRepEmail || 'Contact Representative'}</span>
                </a>
              </div>
            ) : (
              <div className="student-leader-footer empty">
                <span className="small muted">Awaiting designation by the class coordinator.</span>
              </div>
            )}
          </div>

          {/* Vice Class Representative Card */}
          <div className="student-leader-card leader-vice">
            <div className="student-leader-top">
              <div className="student-leader-avatar vice">
                {viceRepName ? initials(viceRepName) : 'VR'}
              </div>
              <div className="student-leader-info">
                <div className="student-leader-tag-row">
                  <span className="badge-vice-rep">
                    <ShieldCheck size={11} color="#12437b" />
                    Vice Representative
                  </span>
                  {viceClassRepId === user.id && (
                    <span className="chip blue student-self-pill">You</span>
                  )}
                </div>
                <h4 className="student-leader-name">
                  {viceRepName || 'Unassigned (Optional)'}
                </h4>
                <p className="student-leader-desc">
                  Assists the class representative with section updates, peer support, and meeting notes.
                </p>
              </div>
            </div>
            {viceRepName ? (
              <div className="student-leader-footer">
                <a
                  href={`mailto:${viceRepEmail}`}
                  className="student-leader-contact-btn"
                  title={`Email ${viceRepName}`}
                >
                  <Mail size={13} />
                  <span>{viceRepEmail || 'Contact Vice Representative'}</span>
                </a>
              </div>
            ) : (
              <div className="student-leader-footer empty">
                <span className="small muted">Optional role designated by the coordinator.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Classmate Directory Section (Acceptance Criterion 3) */}
      <section className="student-directory-section">
        <div className="student-directory-header">
          <div className="student-section-header-left">
            <div className="student-section-icon blue">
              <Users size={18} />
            </div>
            <div>
              <div className="student-directory-title-row">
                <h3 className="student-section-title">Classmate Directory</h3>
                <span className="student-roster-count-badge">
                  {classPlacements.length} {classPlacements.length === 1 ? 'Peer' : 'Peers'} Enrolled
                </span>
              </div>
              <p className="student-section-subtitle">
                Directory of student trainees currently enrolled in {s(myClass, 'section')}.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="student-directory-search-wrap">
            <Search size={15} className="student-directory-search-icon" />
            <input
              type="text"
              placeholder="Search classmates or companies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="student-directory-search-input"
              aria-label="Search classmates"
            />
          </div>
        </div>

        {/* Directory Grid: 1 / 2 / 3 columns */}
        {filteredClassmates.length > 0 ? (
          <div className="student-classmate-grid">
            {filteredClassmates.map(placement => {
              const studentId = s(placement, 'studentId');
              const studentName = s(placement, 'studentName');
              const studentEmail =
                s(placement, 'studentEmail') ||
                (studentName ? `${studentName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rtu.edu.ph` : '');
              const companyName = s(placement, 'companyName');
              const placementStatus = s(placement, 'status');
              const isSelf = studentId === user.id;
              const isRep = studentId === classRepId;
              const isVice = studentId === viceClassRepId;

              return (
                <article className={`classmate-card ${isSelf ? 'is-self' : ''}`} key={placement.id}>
                  <div className="classmate-card-header">
                    <div className="classmate-avatar">
                      {initials(studentName)}
                    </div>
                    <div className="classmate-main-info">
                      <div className="classmate-name-row">
                        <strong className="classmate-name">{studentName}</strong>
                        {isSelf && <span className="chip blue student-self-pill">You</span>}
                      </div>
                      <a
                        href={`mailto:${studentEmail}`}
                        className="classmate-email"
                        title={`Send email to ${studentName}`}
                      >
                        <Mail size={12} />
                        <span>{studentEmail}</span>
                      </a>
                    </div>
                  </div>

                  {/* Badges row if leadership */}
                  {(isRep || isVice) && (
                    <div className="classmate-leadership-badge-row">
                      {isRep && (
                        <span className="badge-class-rep">
                          <Star size={11} fill="#825b08" color="#825b08" />
                          Class Rep
                        </span>
                      )}
                      {isVice && (
                        <span className="badge-vice-rep">
                          <ShieldCheck size={11} color="#12437b" />
                          Vice Rep
                        </span>
                      )}
                    </div>
                  )}

                  {/* Placement Company Status */}
                  <div className="classmate-placement-box">
                    <span className="classmate-placement-label">Training Placement:</span>
                    {companyName ? (
                      <div className="classmate-placement-status placed">
                        <Building2 size={13} className="placement-company-icon" />
                        <span className="placement-company-name">{companyName}</span>
                        <span className="placement-status-pill green">
                          {placementStatus === 'ACTIVE' ? 'Placed' : placementStatus}
                        </span>
                      </div>
                    ) : (
                      <div className="classmate-placement-status pending">
                        <Clock size={13} className="placement-pending-icon" />
                        <span className="placement-pending-name">Pending Endorsement</span>
                        <span className="placement-status-pill orange">Seeking</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action */}
                  <div className="classmate-card-footer">
                    <button
                      type="button"
                      className="classmate-view-profile-btn"
                      onClick={() => onViewStudent(placement)}
                    >
                      <span>View Training Profile</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="student-directory-empty">
            <div className="student-directory-empty-icon">
              <Search size={24} />
            </div>
            <h4>No classmates found</h4>
            <p>
              No student records matched &quot;{searchQuery}&quot;. Try adjusting your search query.
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => setSearchQuery('')}
            >
              Clear search filter
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
