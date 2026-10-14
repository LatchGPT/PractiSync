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
  School,
  Copy,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
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
  const [placementFilter, setPlacementFilter] = useState<'ALL' | 'PLACED' | 'SEEKING'>('ALL');
  const [copiedCode, setCopiedCode] = useState(false);

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
  const departmentName = s(department, 'name') || 'College of Computer Studies';

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
    let list = classPlacements;

    if (placementFilter === 'PLACED') {
      list = list.filter(p => Boolean(s(p, 'companyName')));
    } else if (placementFilter === 'SEEKING') {
      list = list.filter(p => !s(p, 'companyName'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const name = s(p, 'studentName').toLowerCase();
        const company = s(p, 'companyName').toLowerCase();
        const email = s(p, 'studentEmail').toLowerCase();
        return name.includes(q) || company.includes(q) || email.includes(q);
      });
    }

    return list;
  }, [classPlacements, placementFilter, searchQuery]);

  const placedCount = useMemo(
    () => classPlacements.filter(p => Boolean(s(p, 'companyName'))).length,
    [classPlacements]
  );
  const seekingCount = classPlacements.length - placedCount;

  const copyClassCode = async () => {
    const code = s(myClass, 'codeLabel') || 'SYNC4A';
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success(`Class enrollment code "${code}" copied to clipboard.`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Could not copy class code.');
    }
  };

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
          <div className="classroom-banner-top-row">
            <div className="classroom-banner-badges">
              <span className="classroom-academic-badge">
                <CalendarDays size={12} />
                {s(myClass, 'period') || 'A.Y. 2026–2027 · 1st Semester'}
              </span>
              <span className="classroom-dept-badge">
                <School size={12} />
                {departmentName}
              </span>
            </div>

            <div className="classroom-banner-actions">
              <span className="classroom-enrolled-pill">
                <CheckCircle2 size={13} />
                Enrolled Trainee
              </span>
              <button
                type="button"
                className="classroom-switch-code-btn"
                onClick={onOpenJoin}
                title="Switch section or enter an enrollment code"
              >
                <Plus size={13} />
                Switch Section
              </button>
            </div>
          </div>

          <div className="classroom-banner-hero-body">
            <h1 className="classroom-banner-title">{s(myClass, 'section')}</h1>
            <p className="classroom-banner-sub">
              {courseName} ({courseCode}) · {s(myClass, 'name')}
            </p>
          </div>
        </div>

        {/* Balanced 3-Column Metadata Shelf */}
        <div className="classroom-banner-meta-shelf">
          {/* Col 1: Coordinator */}
          <div className="classroom-meta-col">
            <div className="classroom-meta-icon blue">
              <GraduationCap size={18} />
            </div>
            <div className="classroom-meta-text">
              <span className="classroom-meta-label">Practicum Coordinator</span>
              <strong className="classroom-meta-value" title={coordinatorName}>
                {coordinatorName}
              </strong>
              <a
                href={`mailto:${coordinatorEmail}`}
                className="classroom-meta-link"
                title={`Email ${coordinatorName}`}
              >
                <Mail size={12} />
                <span>{coordinatorEmail}</span>
              </a>
            </div>
          </div>

          {/* Col 2: Consultation & Office */}
          <div className="classroom-meta-col">
            <div className="classroom-meta-icon amber">
              <Clock size={18} />
            </div>
            <div className="classroom-meta-text">
              <span className="classroom-meta-label">Consultation & Office Hours</span>
              <strong className="classroom-meta-value">
                Mon–Thu · 1:00 PM – 5:00 PM
              </strong>
              <span className="classroom-meta-subtext">
                OJT Affairs Office · Room 302 (Pasig Campus)
              </span>
            </div>
          </div>

          {/* Col 3: Section Roster & Code */}
          <div className="classroom-meta-col">
            <div className="classroom-meta-icon green">
              <Users size={18} />
            </div>
            <div className="classroom-meta-text">
              <span className="classroom-meta-label">Class Roster & Enrollment</span>
              <strong className="classroom-meta-value">
                {classPlacements.length} Enrolled Trainees
              </strong>
              <div className="classroom-code-row">
                <span className="classroom-code-label">Code:</span>
                <code className="classroom-code-inline">
                  {s(myClass, 'codeLabel') || 'SYNC4A'}
                </code>
                <button
                  type="button"
                  className="classroom-copy-code-btn"
                  onClick={copyClassCode}
                  title="Copy enrollment code"
                >
                  {copiedCode ? <Check size={12} color="#166b42" /> : <Copy size={12} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Class Leadership Section (Acceptance Criterion 2) */}
      <section className="student-leadership-section">
        <div className="student-section-header">
          <div className="student-section-header-left">
            <div className="student-section-icon gold">
              <Star size={17} fill="#d7aa3e" color="#d7aa3e" />
            </div>
            <div>
              <h2 className="student-section-title">Section Leadership</h2>
              <p className="student-section-subtitle">
                Official student leaders designated for coordinator liaison and section announcements.
              </p>
            </div>
          </div>
        </div>

        <div className="student-leadership-grid">
          {/* Class Representative Card */}
          <div className="student-leader-card leader-rep">
            <div className="student-leader-card-main">
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
                <h3 className="student-leader-name">
                  {classRepName || 'Unassigned Representative'}
                </h3>
                <p className="student-leader-role-desc">
                  Primary student point of contact for coordinator announcements & section concerns.
                </p>
              </div>
            </div>
            <div className="student-leader-action-row">
              {classRepName ? (
                <a
                  href={`mailto:${classRepEmail}`}
                  className="student-leader-contact-btn rep"
                  title={`Email ${classRepName}`}
                >
                  <Mail size={13} />
                  <span>Email Representative</span>
                </a>
              ) : (
                <span className="student-leader-status-note">
                  Awaiting coordinator designation
                </span>
              )}
            </div>
          </div>

          {/* Vice Class Representative Card */}
          <div className="student-leader-card leader-vice">
            <div className="student-leader-card-main">
              <div className="student-leader-avatar vice">
                {viceRepName ? initials(viceRepName) : <ShieldCheck size={20} />}
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
                <h3 className="student-leader-name">
                  {viceRepName || 'Not Designated'}
                </h3>
                <p className="student-leader-role-desc">
                  Assists representative with meeting updates, peer support, and documentation.
                </p>
              </div>
            </div>
            <div className="student-leader-action-row">
              {viceRepName ? (
                <a
                  href={`mailto:${viceRepEmail}`}
                  className="student-leader-contact-btn vice"
                  title={`Email ${viceRepName}`}
                >
                  <Mail size={13} />
                  <span>Email Vice Representative</span>
                </a>
              ) : (
                <span className="student-leader-status-note">
                  Optional peer leadership role
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Classmate Directory Section (Acceptance Criterion 3) */}
      <section className="student-directory-section">
        {/* Directory Controls Bar */}
        <div className="student-directory-controls">
          <div className="student-directory-head-info">
            <div className="student-section-icon blue">
              <Users size={17} />
            </div>
            <div>
              <div className="student-directory-title-row">
                <h2 className="student-section-title">Classmate Directory</h2>
                <span className="student-roster-count-badge">
                  {classPlacements.length} Trainees
                </span>
              </div>
              <p className="student-section-subtitle">
                Directory of student trainees currently enrolled in {s(myClass, 'section')}.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="student-directory-search-wrap">
            <Search size={15} className="student-directory-search-icon" />
            <input
              type="text"
              placeholder="Search by name, company, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="student-directory-search-input"
              aria-label="Search classmates"
            />
            {searchQuery && (
              <button
                type="button"
                className="student-directory-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="student-directory-filter-tabs">
          <button
            type="button"
            className={`directory-filter-pill ${placementFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setPlacementFilter('ALL')}
          >
            All Trainees <span className="filter-pill-num">{classPlacements.length}</span>
          </button>
          <button
            type="button"
            className={`directory-filter-pill ${placementFilter === 'PLACED' ? 'active' : ''}`}
            onClick={() => setPlacementFilter('PLACED')}
          >
            Placed at Company <span className="filter-pill-num green">{placedCount}</span>
          </button>
          <button
            type="button"
            className={`directory-filter-pill ${placementFilter === 'SEEKING' ? 'active' : ''}`}
            onClick={() => setPlacementFilter('SEEKING')}
          >
            Seeking Placement <span className="filter-pill-num orange">{seekingCount}</span>
          </button>
        </div>

        {/* Directory Multi-Column Grid */}
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
                <article
                  className={`classmate-card ${isSelf ? 'is-self' : ''}`}
                  key={placement.id}
                  onClick={() => onViewStudent(placement)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onViewStudent(placement);
                    }
                  }}
                >
                  <div className="classmate-card-top">
                    <div className="classmate-avatar">
                      {initials(studentName)}
                    </div>
                    <div className="classmate-header-info">
                      <div className="classmate-name-line">
                        <strong className="classmate-name" title={studentName}>
                          {studentName}
                        </strong>
                        {isSelf && <span className="chip blue student-self-pill">You</span>}
                      </div>
                      <a
                        href={`mailto:${studentEmail}`}
                        className="classmate-email-link"
                        title={`Send email to ${studentName}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <Mail size={11} />
                        <span>{studentEmail}</span>
                      </a>
                    </div>
                  </div>

                  {/* Leadership Badge if applicable */}
                  {(isRep || isVice) && (
                    <div className="classmate-badge-line">
                      {isRep && (
                        <span className="badge-class-rep">
                          <Star size={11} fill="#825b08" color="#825b08" />
                          Class Representative
                        </span>
                      )}
                      {isVice && (
                        <span className="badge-vice-rep">
                          <ShieldCheck size={11} color="#12437b" />
                          Vice Representative
                        </span>
                      )}
                    </div>
                  )}

                  {/* Clean Placement Status Row */}
                  <div className="classmate-placement-row">
                    {companyName ? (
                      <div className="classmate-company-info">
                        <Building2 size={13} className="classmate-status-icon green" />
                        <span className="classmate-company-name" title={companyName}>
                          {companyName}
                        </span>
                      </div>
                    ) : (
                      <div className="classmate-company-info">
                        <Clock size={13} className="classmate-status-icon amber" />
                        <span className="classmate-pending-text">
                          Seeking Endorsement
                        </span>
                      </div>
                    )}
                    <span className={`classmate-status-chip ${companyName ? 'placed' : 'seeking'}`}>
                      {companyName ? (placementStatus === 'ACTIVE' ? 'Placed' : placementStatus) : 'Pending'}
                    </span>
                  </div>

                  {/* Card Action Link */}
                  <div className="classmate-card-footer">
                    <span className="classmate-action-text">View Training Profile</span>
                    <ArrowRight size={13} className="classmate-action-arrow" />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="student-directory-empty">
            <div className="student-directory-empty-icon">
              <Search size={22} />
            </div>
            <h4>No trainees found</h4>
            <p>
              {searchQuery
                ? `No student records matched "${searchQuery}". Try a different keyword.`
                : 'No students found in this placement filter category.'}
            </p>
            {(searchQuery || placementFilter !== 'ALL') && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setPlacementFilter('ALL');
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
