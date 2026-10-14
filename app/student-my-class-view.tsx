'use client';

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Star,
  ShieldCheck,
  Building2,
  CalendarDays,
  Users,
  Search,
  Mail,
  CheckCircle2,
  Clock,
  Copy,
  Plus,
  BookOpen,
  Check,
  Building,
  UserCheck,
  ArrowUpRight,
} from 'lucide-react';
import type { Snapshot, Identity, Row } from '@/packages/validation/contracts';
import { toast } from 'sonner';

interface StudentMyClassViewProps {
  data: Snapshot;
  user: Identity;
  ownPlacement?: Row | null;
  openJoinModal: () => void;
  onViewStudent?: (studentId: string) => void;
}

export default function StudentMyClassView({
  data,
  user,
  ownPlacement,
  openJoinModal,
  onViewStudent,
}: StudentMyClassViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLACED' | 'PENDING'>('ALL');
  const [copiedCode, setCopiedCode] = useState(false);

  // 1. Identify enrolled class or fallback
  const myClass = data.classes.find(c => c.id === ownPlacement?.classId) ?? data.classes[0];
  const myPending = (data.joinRequests ?? []).find(r => r.studentId === user.id && r.status === 'PENDING');

  // 2. Resolve Course & Department Details
  const course = data.courses.find(co => co.id === myClass?.courseId);
  const courseCode = course?.code || 'BSIT';
  const courseName = course?.name || 'Bachelor of Science in Information Technology';
  const department = data.departments.find(d => d.id === course?.departmentId);
  const deptName = department?.name || 'College of Engineering & Information Technology';

  // 3. Coordinator Details
  const coordinatorUser = data.users.find(u => u.id === myClass?.coordinatorId);
  const coordinatorName = String(coordinatorUser?.name ?? myClass?.coordinatorName ?? 'Assigned Practicum Coordinator');
  const coordinatorEmail = coordinatorUser?.email ? String(coordinatorUser.email) : `${coordinatorName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rtu.edu.ph`;

  // 4. Resolve Peer Roster
  interface ClassMemberItem {
    studentId: string;
    studentName: string;
    studentEmail: string;
    companyName: string | null;
    placementStatus: string;
    classId?: string;
  }

  const classmates = useMemo<ClassMemberItem[]>(() => {
    if (!myClass) return [];
    if (data.classMembers && data.classMembers.length > 0) {
      return data.classMembers
        .filter(m => !m.classId || String(m.classId) === String(myClass.id))
        .map(m => {
          const sName = String(m.studentName ?? 'Student');
          return {
            studentId: String(m.studentId ?? ''),
            studentName: sName,
            studentEmail: String(m.studentEmail ?? `${sName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rtu.edu.ph`),
            companyName: m.companyName ? String(m.companyName) : null,
            placementStatus: String(m.placementStatus ?? 'ACTIVE'),
            classId: String(myClass.id),
          };
        });
    }
    // Fallback: derive from data.placements
    return data.placements
      .filter(p => p.classId === myClass.id)
      .map(p => {
        const sName = String(p.studentName ?? 'Student');
        return {
          studentId: String(p.studentId ?? ''),
          studentName: sName,
          studentEmail: String(p.studentEmail ?? `${sName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@rtu.edu.ph`),
          companyName: p.companyName ? String(p.companyName) : null,
          placementStatus: String(p.status ?? 'ACTIVE'),
          classId: String(myClass.id),
        };
      });
  }, [data.classMembers, data.placements, myClass]);

  // 5. Leadership Students
  const classRepId = myClass ? String(myClass.classRepId ?? '') : '';
  const viceClassRepId = myClass ? String(myClass.viceClassRepId ?? '') : '';
  const classRepName = myClass ? String(myClass.classRepName ?? 'Not assigned') : 'Not assigned';
  const viceClassRepName = myClass ? String(myClass.viceClassRepName ?? 'None (Unassigned)') : 'None (Unassigned)';

  const classRepPeer = classmates.find(c => c.studentId === classRepId);
  const viceRepPeer = classmates.find(c => c.studentId === viceClassRepId);

  // 6. Filtered Classmates
  const filteredClassmates = useMemo(() => {
    return classmates.filter(c => {
      const name = String(c.studentName ?? '').toLowerCase();
      const comp = String(c.companyName ?? '').toLowerCase();
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || name.includes(query) || comp.includes(query);

      const isPlaced = Boolean(c.companyName);
      if (statusFilter === 'PLACED') return matchesSearch && isPlaced;
      if (statusFilter === 'PENDING') return matchesSearch && !isPlaced;
      return matchesSearch;
    });
  }, [classmates, search, statusFilter]);

  const placedCount = useMemo(() => classmates.filter(c => Boolean(c.companyName)).length, [classmates]);
  const pendingCount = classmates.length - placedCount;

  // Helper for 2-letter uppercase initials
  const initials = (name?: string | null) => {
    if (!name) return 'PS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  };

  const copyCode = async () => {
    if (!myClass?.codeLabel) return;
    try {
      await navigator.clipboard.writeText(String(myClass.codeLabel));
      setCopiedCode(true);
      toast.success(`Copied enrollment code: ${myClass.codeLabel}`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Unable to copy code to clipboard.');
    }
  };

  return (
    <div className="student-classroom-container">
      {/* Pending Join Request Alert */}
      {myPending && (
        <div className="join-requests-alert">
          <div className="join-requests-alert-left">
            <div className="join-requests-alert-icon">
              <Clock size={20} />
            </div>
            <div>
              <strong>Class Join Request Pending Review</strong>
              <p>
                You requested to join <b>{String(myPending.classSection || myPending.section || 'class')}</b>. Your
                practicum coordinator will review and verify your eligibility shortly.
              </p>
            </div>
          </div>
          <span className="chip orange">Pending Approval</span>
        </div>
      )}

      {/* Main Classroom View */}
      {myClass ? (
        <div className="myclass-layout-wrap">
          {/* 1. Header Card with Balanced Grid */}
          <section className="myclass-header-card">
            <div className="myclass-header-hero">
              <div className="myclass-hero-left">
                <div className="myclass-tag-row">
                  <span className="chip green myclass-status-chip">
                    <CheckCircle2 size={13} /> Enrolled Section
                  </span>
                  <span className="myclass-dept-badge">{deptName}</span>
                </div>
                <h1 className="myclass-section-title">{String(myClass.section || 'Your Section')}</h1>
                <p className="myclass-course-sub">
                  {courseName} ({courseCode}) · {String(myClass.name || 'Practicum')}
                </p>
              </div>

              <div className="myclass-hero-actions">
                <button
                  type="button"
                  className="secondary myclass-switch-btn"
                  onClick={openJoinModal}
                  title="Switch to another section with enrollment code"
                >
                  <Plus size={14} />
                  Switch or enter code
                </button>
              </div>
            </div>

            {/* Header Balanced Grid: Academic Info & Coordinator Consultation Details */}
            <div className="myclass-header-grid">
              {/* Academic & Section Information */}
              <div className="myclass-meta-column">
                <div className="myclass-meta-header">
                  <span className="eyebrow">Academic Term & Details</span>
                </div>
                <div className="myclass-meta-row">
                  <CalendarDays size={16} className="myclass-meta-icon" />
                  <div>
                    <span className="myclass-meta-label">Academic Period</span>
                    <strong className="myclass-meta-value">
                      {String(myClass.period || 'A.Y. 2026–2027 · 1st Semester')}
                    </strong>
                  </div>
                </div>

                <div className="myclass-meta-row">
                  <Users size={16} className="myclass-meta-icon" />
                  <div>
                    <span className="myclass-meta-label">Class Size</span>
                    <strong className="myclass-meta-value">{classmates.length} Enrolled Classmates</strong>
                  </div>
                </div>

                {myClass.codeLabel && (
                  <div className="myclass-meta-row">
                    <Copy size={16} className="myclass-meta-icon" />
                    <div>
                      <span className="myclass-meta-label">Section Enrollment Code</span>
                      <div className="myclass-code-copy-wrap">
                        <code className="myclass-code-badge">{String(myClass.codeLabel)}</code>
                        <button
                          type="button"
                          className="myclass-code-copy-btn"
                          onClick={copyCode}
                          title="Copy enrollment code"
                        >
                          {copiedCode ? <Check size={12} color="#166b42" /> : <Copy size={12} />}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Coordinator Consultation & Office Details */}
              <div className="myclass-coordinator-column">
                <div className="myclass-meta-header">
                  <span className="eyebrow">Assigned OJT Coordinator</span>
                </div>
                <div className="myclass-coordinator-card">
                  <div className="myclass-coordinator-top">
                    <div className="myclass-coord-avatar">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <strong className="myclass-coord-name">{coordinatorName}</strong>
                      <span className="myclass-coord-role">Practicum Faculty Coordinator</span>
                    </div>
                  </div>

                  <div className="myclass-coordinator-details">
                    <div className="myclass-coord-detail-item">
                      <Mail size={13} className="myclass-coord-icon" />
                      <a href={`mailto:${coordinatorEmail}`} className="myclass-coord-link">
                        {coordinatorEmail}
                      </a>
                    </div>
                    <div className="myclass-coord-detail-item">
                      <Building size={13} className="myclass-coord-icon" />
                      <span>CEIT Faculty Center · Rm 304, Boni Campus</span>
                    </div>
                    <div className="myclass-coord-detail-item">
                      <Clock size={13} className="myclass-coord-icon" />
                      <span>Mon & Wed 1:00 PM – 4:30 PM (Consultation)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Class Leadership Section */}
          <section className="myclass-section myclass-leadership-section">
            <div className="myclass-section-head">
              <div>
                <span className="eyebrow">Student Governance & Liaison</span>
                <h2 className="myclass-section-title-sm">
                  <Star size={18} fill="#d7aa3e" color="#d7aa3e" style={{ marginRight: 6 }} />
                  Class Section Leadership
                </h2>
                <p className="myclass-section-desc">
                  Designated student officers serving as direct communication liaisons between your coordinator and
                  classmates.
                </p>
              </div>
            </div>

            <div className="myclass-leadership-grid">
              {/* Class Representative Card */}
              <div className="myclass-leader-card rep-card">
                <div className="myclass-leader-top">
                  <span className="avatar tan myclass-leader-avatar">{initials(classRepName)}</span>
                  <div className="myclass-leader-title-wrap">
                    <div className="myclass-leader-name-row">
                      <strong className="myclass-leader-name">{classRepName}</strong>
                      {classRepId === user.id && <span className="chip blue myclass-you-chip">You</span>}
                    </div>
                    <span className="badge-class-rep" title="Class Representative">
                      <Star size={11} fill="#d7aa3e" color="#d7aa3e" style={{ marginRight: 4 }} />
                      Class Representative
                    </span>
                  </div>
                </div>

                <p className="myclass-leader-desc">
                  Main student point of contact for coordinator announcements, class attendance submissions, and
                  section inquiries.
                </p>

                <div className="myclass-leader-footer">
                  {classRepPeer?.studentEmail ? (
                    <a href={`mailto:${classRepPeer.studentEmail}`} className="myclass-peer-email-link">
                      <Mail size={13} />
                      <span>{classRepPeer.studentEmail}</span>
                    </a>
                  ) : (
                    <span className="small muted">Official Class Liaison</span>
                  )}
                  {classRepPeer?.companyName && (
                    <span className="chip green myclass-placement-tag">
                      <Building2 size={12} />
                      Placed: {classRepPeer.companyName}
                    </span>
                  )}
                </div>
              </div>

              {/* Vice Class Representative Card */}
              <div className="myclass-leader-card vice-card">
                <div className="myclass-leader-top">
                  <span className="avatar myclass-leader-avatar">{initials(viceClassRepName)}</span>
                  <div className="myclass-leader-title-wrap">
                    <div className="myclass-leader-name-row">
                      <strong className="myclass-leader-name">{viceClassRepName}</strong>
                      {viceClassRepId === user.id && <span className="chip blue myclass-you-chip">You</span>}
                    </div>
                    <span className="badge-vice-rep" title="Vice Class Representative">
                      <ShieldCheck size={11} color="#12437b" style={{ marginRight: 4 }} />
                      Vice Class Representative
                    </span>
                  </div>
                </div>

                <p className="myclass-leader-desc">
                  Assists the Class Representative with peer coordination, emergency check-ins, and section activities.
                </p>

                <div className="myclass-leader-footer">
                  {viceRepPeer?.studentEmail ? (
                    <a href={`mailto:${viceRepPeer.studentEmail}`} className="myclass-peer-email-link">
                      <Mail size={13} />
                      <span>{viceRepPeer.studentEmail}</span>
                    </a>
                  ) : (
                    <span className="small muted">Peer Support Lead</span>
                  )}
                  {viceRepPeer?.companyName && (
                    <span className="chip green myclass-placement-tag">
                      <Building2 size={12} />
                      Placed: {viceRepPeer.companyName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Classmate Directory */}
          <section className="myclass-section myclass-directory-section">
            <div className="myclass-directory-header-row">
              <div>
                <span className="eyebrow">Peer Directory</span>
                <h2 className="myclass-section-title-sm">
                  <Users size={18} style={{ marginRight: 6 }} />
                  Classmate Directory
                </h2>
                <p className="myclass-section-desc">
                  Explore enrolled peers in your section and their host training establishment placements.
                </p>
              </div>

              <div className="myclass-directory-count-badge">
                <UserCheck size={14} />
                <span>{classmates.length} Total Enrolled</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="myclass-directory-toolbar">
              <div className="myclass-search-wrap">
                <Search size={15} className="myclass-search-icon" />
                <input
                  type="text"
                  placeholder="Search classmate by name or company..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="myclass-search-input"
                />
              </div>

              <div className="myclass-filter-pills">
                <button
                  type="button"
                  className={`myclass-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  All ({classmates.length})
                </button>
                <button
                  type="button"
                  className={`myclass-filter-pill ${statusFilter === 'PLACED' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('PLACED')}
                >
                  Placed ({placedCount})
                </button>
                <button
                  type="button"
                  className={`myclass-filter-pill ${statusFilter === 'PENDING' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('PENDING')}
                >
                  Pending ({pendingCount})
                </button>
              </div>
            </div>

            {/* Responsive Multi-Column Peer Grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6) */}
            {filteredClassmates.length > 0 ? (
              <div className="myclass-peer-grid">
                {filteredClassmates.map(peer => {
                  const isRep = peer.studentId === classRepId;
                  const isVice = peer.studentId === viceClassRepId;
                  const isSelf = peer.studentId === user.id;
                  const isPlaced = Boolean(peer.companyName);

                  return (
                    <article key={peer.studentId} className={`myclass-peer-card ${isSelf ? 'is-self' : ''}`}>
                      <div className="myclass-peer-card-top">
                        <span className={`avatar ${isRep ? 'tan' : isVice ? 'blue' : ''} myclass-peer-avatar`}>
                          {initials(peer.studentName)}
                        </span>
                        <div className="myclass-peer-info">
                          <div className="myclass-peer-name-wrap">
                            <strong className="myclass-peer-name">{peer.studentName}</strong>
                            {isSelf && <span className="chip blue myclass-you-tag">You</span>}
                          </div>
                          {isRep && (
                            <span className="badge-class-rep mt-1" title="Class Representative">
                              <Star size={10} fill="#d7aa3e" color="#d7aa3e" style={{ marginRight: 3 }} />
                              Class Rep
                            </span>
                          )}
                          {isVice && (
                            <span className="badge-vice-rep mt-1" title="Vice Class Representative">
                              <ShieldCheck size={10} color="#12437b" style={{ marginRight: 3 }} />
                              Vice Rep
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Placement Status Box */}
                      <div className={`myclass-placement-box ${isPlaced ? 'placed' : 'pending'}`}>
                        <div className="myclass-placement-box-head">
                          {isPlaced ? (
                            <>
                              <Building2 size={13} className="text-blue-700" />
                              <span className="myclass-placement-status-label">Host Training Company</span>
                            </>
                          ) : (
                            <>
                              <Clock size={13} className="text-amber-700" />
                              <span className="myclass-placement-status-label">Placement Status</span>
                            </>
                          )}
                        </div>
                        <strong className="myclass-placement-company-name">
                          {isPlaced ? peer.companyName : 'Pending Endorsement / Matching'}
                        </strong>
                      </div>

                      {/* Contact & Profile Action */}
                      <div className="myclass-peer-card-bottom">
                        <a
                          href={`mailto:${peer.studentEmail}`}
                          className="myclass-peer-email-link"
                          title={`Email ${peer.studentName}`}
                        >
                          <Mail size={12} />
                          <span className="truncate">{peer.studentEmail}</span>
                        </a>

                        {onViewStudent && (
                          <button
                            type="button"
                            className="textbutton myclass-view-profile-btn"
                            onClick={() => onViewStudent(peer.studentId)}
                          >
                            <span>Profile</span>
                            <ArrowUpRight size={12} />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="myclass-directory-empty">
                <Users size={32} className="myclass-empty-icon" />
                <h3>No classmates found</h3>
                <p>No peers match your search filter "{search}". Try searching by another name or company.</p>
                <button
                  type="button"
                  className="secondary mt-2"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Empty State: Not Yet Enrolled in Any Class */
        <div className="classroom-join-empty">
          <div className="classroom-join-empty-icon">
            <BookOpen size={28} />
          </div>
          <h3>Join your Practicum Class</h3>
          <p>
            You are not currently enrolled in an active practicum section. Ask your coordinator for your section
            enrollment code to sync your class roster, milestone tracker, and daily time records.
          </p>
          <button className="primary" onClick={openJoinModal}>
            <Plus size={15} />
            Join a class
          </button>
        </div>
      )}
    </div>
  );
}
