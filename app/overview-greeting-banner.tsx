'use client';

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type {Snapshot} from '@/packages/validation/contracts';

interface OverviewGreetingBannerProps {
  data: Snapshot;
  navigate: (page: string) => void;
  onLogAttendance: () => void;
}

export default function OverviewGreetingBanner({
  data,
  navigate,
  onLogAttendance,
}: OverviewGreetingBannerProps) {
  const {user} = data;
  const role = user.role;

  // Time-aware greeting based on Philippine time (Asia/Manila)
  const now = new Date();
  const manilaHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Manila',
    }).format(now),
    10
  );

  const timeGreeting =
    manilaHour < 12
      ? 'Good morning'
      : manilaHour < 18
      ? 'Good afternoon'
      : 'Good evening';

  const firstName = user.name.split(' ')[0];

  // Manila formatted current date string YYYY-MM-DD for attendance checking
  const todayManila = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
  }).format(now);

  // Student specific data
  if (role === 'STUDENT') {
    const placement =
      data.placements.find(p => p.studentId === user.id && p.status === 'ACTIVE') ??
      data.placements.find(p => p.studentId === user.id);

    const course = data.courses.find(c => c.id === user.courseId);
    const hasLoggedToday = data.entries.some(
      e => e.placementId === placement?.id && e.date === todayManila
    );

    const pendingDocs = placement
      ? data.documents.filter(
          d => d.placementId === placement.id && d.status !== 'APPROVED'
        )
      : [];

    const isPlacementActive = placement?.status === 'ACTIVE';

    return (
      <section className="overview-greeting-banner" aria-label="Personalized welcome and status">
        <div className="banner-content">
          <div className="banner-eyebrow">
            <Sparkles size={13} className="banner-sparkle-icon" />
            <span>PRACTICUM WORKSPACE · AY 2026–2027</span>
          </div>

          <h1 className="banner-title">
            {timeGreeting}, {firstName} 👋
          </h1>

          <p className="banner-subtitle">
            <GraduationCap size={15} />
            <span>
              {course?.name ?? 'BS Information Technology'}
              {placement ? (
                <>
                  {' '}· <strong style={{color: '#fff'}}>{placement.companyName}</strong> ({placement.section})
                </>
              ) : (
                ' · Awaiting placement allocation'
              )}
            </span>
          </p>

          <div className="banner-pills">
            {/* Primary Placement Status */}
            <span className={`banner-pill ${isPlacementActive ? 'pill-green' : 'pill-amber'}`}>
              <span className="pulse-dot" />
              {isPlacementActive ? 'Active Placement' : 'Pending Placement'}
            </span>

            {/* Today's DTR Status */}
            {placement && (
              hasLoggedToday ? (
                <button
                  type="button"
                  className="banner-pill pill-glass clickable"
                  onClick={() => navigate('attendance')}
                  title="View your submitted attendance"
                >
                  <CheckCircle2 size={13} style={{color: '#4ade80'}} />
                  <span>Today’s shift logged</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="banner-pill pill-gold clickable"
                  onClick={onLogAttendance}
                  title="Click to log today's attendance"
                >
                  <Clock size={13} />
                  <span>Log today’s shift</span>
                </button>
              )
            )}

            {/* Pending Document Alert */}
            {pendingDocs.length > 0 ? (
              <button
                type="button"
                className="banner-pill pill-amber clickable"
                onClick={() => navigate('documents')}
                title="View document clearance"
              >
                <FileText size={13} />
                <span>{pendingDocs.length} doc{pendingDocs.length > 1 ? 's' : ''} pending review</span>
              </button>
            ) : (
              <span className="banner-pill pill-glass">
                <CheckCircle2 size={13} style={{color: '#60a5fa'}} />
                <span>Documents on track</span>
              </span>
            )}
          </div>
        </div>

        <div className="banner-actions">
          <button
            type="button"
            className="overview-btn primary"
            onClick={onLogAttendance}
          >
            <Plus size={15} />
            <span>Log attendance</span>
          </button>
          <button
            type="button"
            className="overview-btn secondary"
            onClick={() => navigate('portfolio')}
          >
            <Download size={14} />
            <span>My portfolio</span>
          </button>
        </div>
      </section>
    );
  }

  // Coordinator specific data
  if (role === 'COORDINATOR') {
    const pendingDocuments = data.documents.filter(d => d.status === 'PENDING');
    const openCases = data.incidents.filter(i => i.status !== 'RESOLVED');

    return (
      <section className="overview-greeting-banner" aria-label="Personalized welcome and status">
        <div className="banner-content">
          <div className="banner-eyebrow">
            <Sparkles size={13} className="banner-sparkle-icon" />
            <span>COORDINATOR DASHBOARD · AY 2026–2027</span>
          </div>

          <h1 className="banner-title">
            {timeGreeting}, {user.name} 👋
          </h1>

          <p className="banner-subtitle">
            <BookOpen size={15} />
            <span>OJT Practicum Coordinator</span>
          </p>

          <div className="banner-pills">
            <span className="banner-pill pill-green">
              <span className="pulse-dot" />
              Active Academic Term
            </span>

            {pendingDocuments.length > 0 ? (
              <button
                type="button"
                className="banner-pill pill-amber clickable"
                onClick={() => navigate('documents')}
                title="Review pending documents"
              >
                <FileText size={13} />
                <span>{pendingDocuments.length} submission{pendingDocuments.length !== 1 ? 's' : ''} awaiting review</span>
              </button>
            ) : (
              <span className="banner-pill pill-glass">
                <CheckCircle2 size={13} style={{color: '#4ade80'}} />
                <span>Document queue clear</span>
              </span>
            )}

            {openCases.length > 0 ? (
              <button
                type="button"
                className="banner-pill pill-red clickable"
                onClick={() => navigate('incidents')}
                title="Open student support incidents"
              >
                <AlertCircle size={13} />
                <span>{openCases.length} support case{openCases.length !== 1 ? 's' : ''} open</span>
              </button>
            ) : (
              <span className="banner-pill pill-glass">
                <CheckCircle2 size={13} style={{color: '#60a5fa'}} />
                <span>No urgent alerts</span>
              </span>
            )}
          </div>
        </div>

        <div className="banner-actions">
          <button
            type="button"
            className="overview-btn primary"
            onClick={() => navigate('classes')}
          >
            <Users size={15} />
            <span>Manage classes</span>
          </button>
          <button
            type="button"
            className="overview-btn secondary"
            onClick={() => navigate('documents')}
          >
            <FileText size={14} />
            <span>Review documents ({pendingDocuments.length})</span>
          </button>
        </div>
      </section>
    );
  }

  // Super Admin view
  return (
    <section className="overview-greeting-banner" aria-label="Personalized welcome and status">
      <div className="banner-content">
        <div className="banner-eyebrow">
          <Sparkles size={13} className="banner-sparkle-icon" />
          <span>INSTITUTIONAL ADMINISTRATION · RIZAL TECHNOLOGICAL UNIVERSITY</span>
        </div>

        <h1 className="banner-title">
          {timeGreeting}, {firstName} 👋
        </h1>

        <p className="banner-subtitle">
          <ShieldCheck size={15} />
          <span>Rizal Technological University OJT Portal</span>
        </p>

        <div className="banner-pills">
          <span className="banner-pill pill-green">
            <span className="pulse-dot" />
            Portal Active & Synced
          </span>

        </div>
      </div>

      <div className="banner-actions">
        <button
          type="button"
          className="overview-btn primary"
          onClick={() => navigate('accounts')}
        >
          <Users size={15} />
          <span>Manage accounts</span>
        </button>
        <button
          type="button"
          className="overview-btn secondary"
          onClick={() => navigate('institution')}
        >
          <GraduationCap size={14} />
          <span>University structure</span>
        </button>
      </div>
    </section>
  );
}
