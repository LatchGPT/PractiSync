'use client';

import React from 'react';
import type {Row} from '@/packages/validation/contracts';
import {getHolidayLabel} from './ph-holidays';
import {Clock} from 'lucide-react';

interface DtrHistoryTableProps {
  entries: Row[];
  role: string;
  placement: (id: string) => Row | undefined;
  fmtDate: (iso: string) => string;
  fmtTime: (iso: string) => string;
  hours: (minutes: number) => number | string;
  onView: (entry: Row) => void;
  onCorrect?: (entry: Row) => void;
  onConfirm?: (entry: Row) => void;
  s: (row: Row, key: string) => string;
  n: (row: Row, key: string) => number;
}

export default function DtrHistoryTable({
  entries,
  role,
  placement,
  fmtDate,
  fmtTime,
  hours,
  onView,
  onCorrect,
  onConfirm,
  s,
  n,
}: DtrHistoryTableProps) {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <div className="card-title">
          <span className="ct-dot" />
          Time Log History &amp; Daily Records
        </div>
        <div className="table-header-meta">
          <span className="badge badge-neutral">
            <Clock size={11} style={{marginRight: 3, display: 'inline'}} />
            Philippine Standard Time (UTC+8)
          </span>
          <span className="badge badge-blue">
            {entries.length} {entries.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {role !== 'STUDENT' && <th>Student</th>}
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Break</th>
              <th>Hours</th>
              <th>Overtime</th>
              <th>Confirmation</th>
              <th>Narrative / Note</th>
              <th style={{textAlign: 'right'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, index) => {
              const mins = n(e, 'minutes');
              const hrs = hours(mins);
              const isOT = mins > 480;
              const otMins = isOT ? mins - 480 : 0;
              const otH = Math.floor(otMins / 60);
              const otM = otMins % 60;
              const isConfirmed = e.confirmedVersion === e.version;
              const holiday = getHolidayLabel(s(e, 'date'));
              const student = role !== 'STUDENT' ? placement(s(e, 'placementId')) : null;

              return (
                <tr key={e.id} className={isOT ? 'row-overtime' : ''}>
                  <td className="mono" style={{color: '#64748b', fontSize: '0.74rem'}}>
                    {index + 1}
                  </td>
                  {role !== 'STUDENT' && (
                    <td className="td-main">
                      <strong>{student?.studentName || 'Student'}</strong>
                    </td>
                  )}
                  <td className="td-main">
                    <div className="dtr-date-col">
                      <span>{fmtDate(s(e, 'date'))}</span>
                      {holiday && (
                        <div className="holiday-flag" title={`Philippine Holiday: ${holiday}`}>
                          🇵🇭 {holiday}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="mono" style={{fontSize: '0.8rem'}}>
                    {fmtTime(s(e, 'startsAt'))}
                  </td>
                  <td className="mono" style={{fontSize: '0.8rem'}}>
                    {fmtTime(s(e, 'endsAt'))}
                  </td>
                  <td>{n(e, 'breakMinutes')} min</td>
                  <td className="td-num">
                    <strong>{hrs} hrs</strong>
                  </td>
                  <td>
                    {isOT ? (
                      <span
                        className="badge badge-purple"
                        title={`${otH}h ${otM}m overtime beyond 8.0h standard daily target`}
                      >
                        <span className="badge-dot" />
                        +{otH}h{otM > 0 ? ` ${otM}m` : ''}
                      </span>
                    ) : (
                      <span className="badge badge-neutral">—</span>
                    )}
                  </td>
                  <td>
                    {isConfirmed ? (
                      <span className="badge badge-green">
                        <span className="badge-dot" />
                        Confirmed
                      </span>
                    ) : (
                      <span className="badge badge-blue">
                        <span className="badge-dot" />
                        Self-reported
                      </span>
                    )}
                  </td>
                  <td className="td-note">
                    <span className="dtr-note-snippet" title={s(e, 'narrative')}>
                      {s(e, 'narrative') || '—'}
                    </span>
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <div className="table-actions" style={{justifyContent: 'flex-end'}}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onView(e)}
                      >
                        View
                      </button>
                      {role === 'STUDENT' && onCorrect && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onCorrect(e)}
                        >
                          Correct
                        </button>
                      )}
                      {(role === 'COORDINATOR' || role === 'SUPER_ADMIN') &&
                        !isConfirmed &&
                        onConfirm && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onConfirm(e)}
                          >
                            Confirm accuracy
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="table-empty">
            <span className="empty-icon">📋</span>
            No attendance records found matching your current filter.
          </div>
        )}
      </div>
    </div>
  );
}
