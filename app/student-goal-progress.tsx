'use client';

import {useState} from 'react';
import type {Row} from '@/packages/validation/contracts';
import {studentGoal} from './student-goal';

const hours = (minutes: number) => `${Number((minutes / 60).toFixed(1))}h`;
const hoursLong = (minutes: number) => `${Number((minutes / 60).toFixed(1))} hrs`;

const circumference = 2 * Math.PI * 80;
const confirmedCircumference = 2 * Math.PI * 62;

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
    <div className="grid-progress student-goal-bento">
      {/* Left: Progress Gauge Card */}
      <div className="progress-card">
        <div className="card-title">
          <span className="ct-dot" />
          Goal Progress
        </div>

        <div className="ring-wrap">
          <svg
            className={`ring-svg ${hovered ? 'has-hover' : ''}`}
            width="190"
            height="190"
            viewBox="0 0 190 190"
            role="img"
            aria-label={`${hoursLong(goal.reported)} reported of ${goal.target ? hoursLong(goal.target) : 'no target'}; ${hoursLong(goal.confirmed)} confirmed`}
          >
            {/* Outer Ring: Self-Reported (RTU Blue) */}
            <g
              className={`ring-group ring-reported ${hovered === 'reported' ? 'is-active' : ''}`}
              onMouseEnter={() => setHovered('reported')}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered(h => (h === 'reported' ? null : 'reported'))}
              tabIndex={0}
              role="button"
              aria-label={`Outer Ring: ${hoursLong(goal.reported)} reported (${goal.target ? Math.round(reportedFraction * 100) : 0}% of goal)`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setHovered(h => (h === 'reported' ? null : 'reported'));
                }
              }}
            >
              <circle cx="95" cy="95" r="80" className="ring-track" />
              {reportedFraction > 0 && (
                <circle
                  cx="95"
                  cy="95"
                  r="80"
                  className="ring-fill ring-fill-reported"
                  strokeDasharray={`${reportedFraction * circumference} ${circumference}`}
                  transform="rotate(-90 95 95)"
                />
              )}
              <title>{`Outer Ring · Self-Reported: ${hoursLong(goal.reported)} of ${goal.target ? hoursLong(goal.target) : '—'} (${goal.target ? Math.round(reportedFraction * 100) : 0}% of goal)`}</title>
            </g>

            {/* Inner Ring: Coordinator-Confirmed (RTU Gold) */}
            <g
              className={`ring-group ring-confirmed ${hovered === 'confirmed' ? 'is-active' : ''}`}
              onMouseEnter={() => setHovered('confirmed')}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered(h => (h === 'confirmed' ? null : 'confirmed'))}
              tabIndex={0}
              role="button"
              aria-label={`Inner Ring: ${hoursLong(goal.confirmed)} confirmed (${goal.target ? Math.round(confirmedFraction * 100) : 0}% of goal)`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setHovered(h => (h === 'confirmed' ? null : 'confirmed'));
                }
              }}
            >
              <circle cx="95" cy="95" r="62" className="ring-track ring-track-inner" />
              {confirmedFraction > 0 && (
                <circle
                  cx="95"
                  cy="95"
                  r="62"
                  className="ring-fill ring-fill-confirmed"
                  strokeDasharray={`${confirmedFraction * confirmedCircumference} ${confirmedCircumference}`}
                  transform="rotate(-90 95 95)"
                />
              )}
              <title>{`Inner Ring · Coordinator-Confirmed: ${hoursLong(goal.confirmed)} of ${goal.target ? hoursLong(goal.target) : '—'} (${goal.target ? Math.round(confirmedFraction * 100) : 0}% verified)`}</title>
            </g>
          </svg>

          <div className="ring-center-content">
            <div className={`ring-center-pct ${hovered ? `is-${hovered}` : ''}`}>
              {hovered === 'reported'
                ? (goal.target ? `${Math.round(reportedFraction * 100)}%` : hours(goal.reported))
                : hovered === 'confirmed'
                ? (goal.target ? `${Math.round(confirmedFraction * 100)}%` : hours(goal.confirmed))
                : (goal.target ? `${goal.percent}%` : '0%')}
            </div>
            <div className={`ring-center-sub ${hovered ? `is-${hovered}` : ''}`}>
              {hovered === 'reported' ? 'Reported' : hovered === 'confirmed' ? 'Confirmed' : 'Complete · of required hours'}
            </div>
          </div>
        </div>

        <div className="ring-stats">
          <div
            className={`ring-stat ${hovered === 'reported' ? 'active' : ''}`}
            onMouseEnter={() => setHovered('reported')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setHovered(h => (h === 'reported' ? null : 'reported'))}
            title="Inspect Self-Reported hours (Outer Ring)"
          >
            <span className="val blue">{hours(goal.reported)}</span>
            <span className="lbl">Logged</span>
          </div>
          <div
            className={`ring-stat ${hovered === 'confirmed' ? 'active' : ''}`}
            onMouseEnter={() => setHovered('confirmed')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setHovered(h => (h === 'confirmed' ? null : 'confirmed'))}
            title="Inspect Coordinator-Confirmed hours (Inner Ring)"
          >
            <span className="val gold">{hours(goal.confirmed)}</span>
            <span className="lbl">Confirmed</span>
          </div>
          <div className="ring-stat" title="Remaining hours balance">
            <span className="val yellow">{hours(goal.remaining)}</span>
            <span className="lbl">Remaining</span>
          </div>
        </div>
      </div>

      {/* Right: User Stats Bento Grid */}
      <div className="user-stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Goal</div>
          <div className="stat-card-value blue">{goal.target ? hours(goal.target) : '—'}</div>
          <div className="stat-card-sub">Required total</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Days on record</div>
          <div className="stat-card-value green">{goal.daysOnRecord}</div>
          <div className="stat-card-sub">{goal.daysOnRecord === 1 ? 'Log entry' : 'Log entries'}</div>
        </div>

        <div className="stat-card stat-card-span">
          <div className="stat-card-label">Attendance Summary</div>
          <div className="summary-grid summary-grid-4">
            <div className="summary-item">
              <div className="summary-num blue">{hours(goal.reported)}</div>
              <div className="summary-label">Reported</div>
            </div>
            <div className="summary-item">
              <div className="summary-num gold">{hours(goal.confirmed)}</div>
              <div className="summary-label">Confirmed</div>
            </div>
            <div className="summary-item">
              <div className="summary-num yellow">{hours(awaitingMinutes)}</div>
              <div className="summary-label">Pending Review</div>
            </div>
            <div className="summary-item">
              <div className="summary-num purple">{goal.averagePerDay ? hours(goal.averagePerDay) : '0h'}</div>
              <div className="summary-label">Avg / Day</div>
            </div>
          </div>
          <div className="summary-meta">
            <span>{goal.target ? `${goal.percent}% attendance progress completed` : 'Target unconfigured'}</span>
            <span>{awaitingMinutes > 0 ? `${hoursLong(awaitingMinutes)} awaiting coordinator endorsement` : 'All reported time endorsed'}</span>
          </div>
        </div>

        <div className="stat-card status-card">
          <div className="stat-card-label">Status</div>
          <div className={`stat-card-value ${goal.remaining === 0 ? 'green' : 'blue'}`}>
            {goal.remaining === 0 ? 'Completed' : 'In Progress'}
          </div>
          <div className="stat-card-sub">
            {goal.remaining === 0 ? 'Requirement fully satisfied' : 'Current standing'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Predicted completion</div>
          <div className="stat-card-value blue">{forecast}</div>
          <div className="stat-card-sub">
            {goal.predictedDays
              ? `At your average of ${hoursLong(goal.averagePerDay)} per logged day`
              : 'Prediction uses your average reported hours'}
          </div>
        </div>
      </div>
    </div>
  );
}
