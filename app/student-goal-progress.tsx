'use client';

import {useState} from 'react';
import {CalendarDays, CheckCircle2, Clock, Info, Target, TrendingUp} from 'lucide-react';
import type {Row} from '@/packages/validation/contracts';
import {studentGoal} from './student-goal';

const hours = (minutes: number) => `${Number((minutes / 60).toFixed(1))} hrs`;
const circumference = 2 * Math.PI * 92;
const confirmedCircumference = 2 * Math.PI * 68;

export default function StudentGoalProgress({entries, requiredMinutes}: {entries: Row[]; requiredMinutes: number}) {
  const [hovered, setHovered] = useState<'reported' | 'confirmed' | null>(null);
  const goal = studentGoal(entries, requiredMinutes);
  const confirmedFraction = goal.target ? Math.min(goal.confirmed, goal.target) / goal.target : 0;
  const reportedFraction = goal.target ? Math.min(goal.reported, goal.target) / goal.target : 0;
  const awaitingMinutes = Math.max(0, goal.reported - goal.confirmed);
  const forecast = !goal.target
    ? 'Required hours not configured'
    : goal.remaining === 0
    ? 'Hours target reached'
    : goal.daysOnRecord < 3
    ? 'Available after 3 logged days'
    : goal.predictedDays
    ? `About ${goal.predictedDays} more logged days`
    : 'Log attendance to estimate';

  return (
    <div className="goal-summary">
      {/* Left Column: Enlarged Visual Donut Hero Section */}
      <div className="goal-donut-section">
        <svg
          viewBox="0 0 240 240"
          className={`goal-donut ${hovered ? 'has-hover' : ''}`}
          role="img"
          aria-label={`${hours(goal.reported)} reported of ${goal.target ? hours(goal.target) : 'no configured target'}; ${hours(goal.confirmed)} coordinator confirmed`}
        >
          {/* Outer Ring: Self-Reported */}
          <g
            className={`goal-ring-group ring-reported ${hovered === 'reported' ? 'is-active' : ''}`}
            onMouseEnter={() => setHovered('reported')}
            onMouseLeave={() => setHovered(null)}
            tabIndex={0}
            role="button"
            aria-label={`Outer Ring: ${hours(goal.reported)} self-reported (${goal.target ? Math.round(reportedFraction * 100) : 0}% of goal)`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setHovered(h => (h === 'reported' ? null : 'reported'));
              }
            }}
          >
            <circle cx="120" cy="120" r="92" fill="none" stroke="#e5edf7" strokeWidth="20" className="ring-track" />
            {reportedFraction > 0 && (
              <circle
                cx="120"
                cy="120"
                r="92"
                fill="none"
                stroke="#124c91"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray={`${reportedFraction * circumference} ${circumference}`}
                transform="rotate(-90 120 120)"
                className="ring-fill"
              />
            )}
            <title>{`Outer Ring · Self-Reported: ${hours(goal.reported)} of ${goal.target ? hours(goal.target) : '—'} (${goal.target ? Math.round(reportedFraction * 100) : 0}%). Total training time submitted from your DTR entries.`}</title>
          </g>

          {/* Inner Ring: Coordinator-Confirmed */}
          <g
            className={`goal-ring-group ring-confirmed ${hovered === 'confirmed' ? 'is-active' : ''}`}
            onMouseEnter={() => setHovered('confirmed')}
            onMouseLeave={() => setHovered(null)}
            tabIndex={0}
            role="button"
            aria-label={`Inner Ring: ${hours(goal.confirmed)} coordinator-confirmed (${goal.target ? Math.round(confirmedFraction * 100) : 0}% of goal)`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setHovered(h => (h === 'confirmed' ? null : 'confirmed'));
              }
            }}
          >
            <circle cx="120" cy="120" r="68" fill="none" stroke="transparent" strokeWidth="16" />
            <circle cx="120" cy="120" r="68" fill="none" stroke="#f6eedd" strokeWidth="8" className="ring-track" />
            {confirmedFraction > 0 && (
              <circle
                cx="120"
                cy="120"
                r="68"
                fill="none"
                stroke="#d7aa3e"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${confirmedFraction * confirmedCircumference} ${confirmedCircumference}`}
                transform="rotate(-90 120 120)"
                className="ring-fill"
              />
            )}
            <title>{`Inner Ring · Confirmed: ${hours(goal.confirmed)} of ${goal.target ? hours(goal.target) : '—'} (${goal.target ? Math.round(confirmedFraction * 100) : 0}%). Hours officially verified and endorsed by your coordinator.`}</title>
          </g>

          {/* Center Text */}
          <text
            x="120"
            y={hovered ? '112' : '114'}
            textAnchor="middle"
            className={`goal-donut-value ${hovered ? `is-${hovered}` : ''}`}
          >
            {hovered === 'reported'
              ? (goal.target ? `${Math.round(reportedFraction * 100)}%` : hours(goal.reported))
              : hovered === 'confirmed'
              ? (goal.target ? `${Math.round(confirmedFraction * 100)}%` : hours(goal.confirmed))
              : (goal.target ? `${goal.percent}%` : '—')}
          </text>
          <text
            x="120"
            y={hovered ? '136' : '138'}
            textAnchor="middle"
            className={`goal-donut-caption ${hovered ? `is-${hovered}` : ''}`}
          >
            {hovered === 'reported'
              ? 'Self-Reported'
              : hovered === 'confirmed'
              ? 'Coordinator-Confirmed'
              : 'of required hours'}
          </text>
        </svg>

        {/* Interactive Legend Pills with Quick Hours */}
        <div className="goal-donut-legend">
          <button
            type="button"
            className={`legend-pill reported ${hovered === 'reported' ? 'active' : ''}`}
            onMouseEnter={() => setHovered('reported')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setHovered(h => (h === 'reported' ? null : 'reported'))}
            aria-pressed={hovered === 'reported'}
            title="Inspect Self-Reported hours (Outer Ring)"
          >
            <i className="legend-indicator reported" />
            <span className="legend-label">Outer: Reported</span>
            <strong className="legend-val">{hours(goal.reported)}</strong>
          </button>
          <button
            type="button"
            className={`legend-pill confirmed ${hovered === 'confirmed' ? 'active' : ''}`}
            onMouseEnter={() => setHovered('confirmed')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setHovered(h => (h === 'confirmed' ? null : 'confirmed'))}
            aria-pressed={hovered === 'confirmed'}
            title="Inspect Coordinator-Confirmed hours (Inner Ring)"
          >
            <i className="legend-indicator confirmed" />
            <span className="legend-label">Inner: Confirmed</span>
            <strong className="legend-val">{hours(goal.confirmed)}</strong>
          </button>
        </div>

        {/* Target Balance Snapshot */}
        <div className="goal-hero-snapshot">
          <span className={`snapshot-badge ${goal.remaining === 0 ? 'completed' : 'in-progress'}`}>
            <Target size={12} className="snapshot-icon" />
            {goal.target === 0
              ? 'Target unassigned'
              : goal.remaining === 0
              ? 'Goal target achieved!'
              : `${hours(goal.remaining)} remaining`}
          </span>
        </div>
      </div>

      {/* Right Column: Context Focus Banner + 4 Structured Metric Tiles */}
      <div className="goal-content-section">
        {/* Real-time Focus Callout Banner */}
        <div className={`goal-focus-banner ${hovered ? `is-${hovered}` : 'is-default'}`} role="status" aria-live="polite">
          <div className="banner-inner">
            <div className="banner-left">
              <div className="banner-badge-group">
                <span className={`banner-badge ${hovered || 'default'}`}>
                  <i className="dot" />
                  {hovered === 'reported'
                    ? 'Outer Ring · Self-Reported Hours'
                    : hovered === 'confirmed'
                    ? 'Inner Ring · Coordinator-Confirmed'
                    : 'Practicum Hours Progress'}
                </span>
                <span className="banner-rate-chip">
                  {hovered === 'reported'
                    ? `${goal.target ? Math.round(reportedFraction * 100) : 0}% of target`
                    : hovered === 'confirmed'
                    ? `${goal.target ? Math.round(confirmedFraction * 100) : 0}% verified`
                    : `${goal.percent}% completed`}
                </span>
              </div>
              <p className="banner-desc">
                {hovered === 'reported'
                  ? `Total training time submitted through your Daily Training Records. ${hours(awaitingMinutes)} currently pending coordinator verification.`
                  : hovered === 'confirmed'
                  ? `Hours officially reviewed, verified, and endorsed by your practicum coordinator.`
                  : `Hover over or select either ring to inspect self-reported vs. coordinator-confirmed training time breakdown.`}
              </p>
            </div>
            <div className="banner-right">
              <div className="banner-stat-row">
                <strong className="banner-stat">
                  {hovered === 'reported'
                    ? hours(goal.reported)
                    : hovered === 'confirmed'
                    ? hours(goal.confirmed)
                    : hours(goal.reported)}
                </strong>
                <span className="banner-stat-divider">/</span>
                <span className="banner-stat-target">{goal.target ? hours(goal.target) : '480.0 hrs'}</span>
              </div>
              <span className="banner-sub">
                {hovered === 'reported'
                  ? 'Total Logged DTR Time'
                  : hovered === 'confirmed'
                  ? 'Coordinator Endorsed'
                  : 'Logged vs. Required Target'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Dedicated Metric Tiles Grid */}
        <div className="goal-metric-cards">
          {/* Card 1: Coordinator-Confirmed Hours */}
          <div className="goal-metric-card">
            <div className="metric-header">
              <span className="metric-icon-wrap gold"><CheckCircle2 size={13} /></span>
              <span>Coordinator confirmed</span>
            </div>
            <div className="metric-body">
              <strong className="metric-val">{hours(goal.confirmed)}</strong>
              <span className="metric-desc">
                {goal.target ? `${Math.round(confirmedFraction * 100)}% verified against requirement` : 'Officially verified training time'}
              </span>
            </div>
          </div>

          {/* Card 2: Pending Verification */}
          <div className="goal-metric-card">
            <div className="metric-header">
              <span className="metric-icon-wrap blue"><Clock size={13} /></span>
              <span>Pending verification</span>
            </div>
            <div className="metric-body">
              <strong className="metric-val">{hours(awaitingMinutes)}</strong>
              <span className="metric-desc">
                {awaitingMinutes > 0 ? 'Submitted in DTR · awaiting review' : 'All submitted hours confirmed'}
              </span>
            </div>
          </div>

          {/* Card 3: Predicted Completion */}
          <div className="goal-metric-card">
            <div className="metric-header">
              <span className="metric-icon-wrap navy"><TrendingUp size={13} /></span>
              <span>Predicted completion</span>
            </div>
            <div className="metric-body">
              <strong className="metric-val">{forecast}</strong>
              <span className="metric-desc">
                {goal.predictedDays
                  ? `At average of ${hours(goal.averagePerDay)} per logged day`
                  : 'Pace calculated from average daily logged time'}
              </span>
            </div>
          </div>

          {/* Card 4: Days on Record */}
          <div className="goal-metric-card">
            <div className="metric-header">
              <span className="metric-icon-wrap green"><CalendarDays size={13} /></span>
              <span>Days on record</span>
            </div>
            <div className="metric-body">
              <strong className="metric-val">{goal.daysOnRecord} {goal.daysOnRecord === 1 ? 'day' : 'days'}</strong>
              <span className="metric-desc">Distinct dates with a submitted DTR</span>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="goal-footer-bar">
          <Info size={14} className="footer-icon" />
          <p className="goal-disclaimer-text">
            {goal.target
              ? `${hours(goal.remaining)} remain against your required hours target (${hours(goal.target)}). `
              : 'A required-hours target is needed for progress tracking. '}
            DTR entries count toward self-reported hours; formal clearance requires coordinator endorsement.
          </p>
        </div>
      </div>
    </div>
  );
}
