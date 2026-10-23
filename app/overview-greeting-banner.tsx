'use client';

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  LifeBuoy,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type {Snapshot} from '@/packages/validation/contracts';
import {studentForecastDetail, studentForecastLabel, studentGoal} from './student-goal';

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
    const completionForecast = placement
      ? studentGoal(
          data.entries.filter(entry => entry.placementId === placement.id),
          Number(placement.requiredMinutes ?? 0),
          data.calendarEvents
        ).forecast
      : null;

    const pendingDocs = placement
      ? data.documents.filter(
          d => d.placementId === placement.id && d.status !== 'APPROVED'
        )
      : [];

    const baselineEvaluation = placement
      ? data.evaluations.find(
          e => e.placementId === placement.id && e.kind === 'BASELINE'
        )
      : null;

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

            {completionForecast?.date && (
              <span
                className={`banner-pill ${completionForecast.status === 'completed' ? 'pill-green' : 'pill-glass'}`}
                title={studentForecastDetail(completionForecast)}
              >
                {completionForecast.status === 'completed'
                  ? <CheckCircle2 size={13} aria-hidden="true" />
                  : <CalendarDays size={13} aria-hidden="true" />}
                <span>{studentForecastLabel(completionForecast)}</span>
              </span>
            )}

            {/* Pending Document Alert */}
            {pendingDocs.length > 0 ? (
              <button
                type="button"
                className="banner-pill pill-amber clickable"
                onClick={() => navigate('documents')}
                title="View Internship Documents"
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
            {/* Baseline Self-Assessment Gate Status */}
            {!baselineEvaluation ? (
              <button
                type="button"
                className="banner-pill pill-amber clickable"
                onClick={() => navigate('competencies')}
                title="Establish your baseline competency self-assessment before supervisor grading"
              >
                <Sparkles size={13} />
                <span>Self-assessment required</span>
              </button>
            ) : (
              <span className="banner-pill pill-glass" title="Baseline competency self-assessment completed">
                <ShieldCheck size={13} style={{ color: '#6ee7b7' }} />
                <span>Baseline recorded</span>
              </span>
            )}
          </div>
        </div>

        <div className="banner-actions">
          {!baselineEvaluation && (
            <button
              type="button"
              className="overview-btn secondary"
              style={{ borderColor: '#f7e0b1', color: '#966914', background: '#fffdf8' }}
              onClick={() => navigate('competencies')}
              title="Complete your competency self-assessment baseline"
            >
              <Sparkles size={14} color="#d97706" />
              <span>Self-assessment</span>
            </button>
          )}
          <button
            type="button"
            className="overview-btn primary"
            onClick={onLogAttendance}
          >
            <Plus size={15} />
            <span>Log attendance</span>
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
      <section className="overview-greeting-banner coordinator-overview-banner" aria-label="Coordinator overview">
        <div className="banner-content">
          <div className="banner-eyebrow">
            <span>COORDINATOR OVERVIEW</span>
          </div>

          <h1 className="banner-title">
            {timeGreeting}, {firstName}
          </h1>
          <p className="coordinator-banner-description">
            Manage your classes, review submissions, and support your students.
          </p>

          <div className="banner-pills">
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
                <span>No documents need review</span>
              </span>
            )}

            {openCases.length > 0 ? (
              <button
                type="button"
                className="banner-pill pill-red clickable"
                onClick={() => navigate('incidents')}
                title="View open student support cases"
              >
                <AlertCircle size={13} />
                <span>{openCases.length} support case{openCases.length !== 1 ? 's' : ''} open</span>
              </button>
            ) : (
              <span className="banner-pill pill-glass">
                <CheckCircle2 size={13} style={{color: '#60a5fa'}} />
                <span>No open support cases</span>
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
          <span>UNIVERSITY OFFICE · RIZAL TECHNOLOGICAL UNIVERSITY</span>
        </div>

        <h1 className="banner-title">
          {timeGreeting}, {firstName} 👋
        </h1>

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
