'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, ListOrdered, RefreshCw, Users } from 'lucide-react';
import type { Identity, Row } from '@/packages/validation/contracts';
import type { Action } from '@/packages/validation/contracts';

type QueueEntry = Row & { studentName?: string; coordinatorName?: string; queuePosition?: number };

function text(row: Row, key: string) { return String(row[key] ?? ''); }
function localClock(value: string) { return value ? value.slice(0, 5) : '—'; }

export default function QueueWorkspace({ user, entries, onAction, onRefresh }: {
  user: Identity; entries: QueueEntry[];
  onAction: (action: Action, values: Record<string, string | number>) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const isStudent = user.role === 'STUDENT';
  const activeEntries = useMemo(() => entries.filter(entry => !['CANCELLED', 'ABSENT'].includes(text(entry, 'status'))), [entries]);

  useEffect(() => {
    const timer = window.setInterval(() => { void onRefresh(); }, 15000);
    return () => window.clearInterval(timer);
  }, [onRefresh]);

  async function submitJoin() {
    setBusy(true);
    try { await onAction('queueJoin', {}); }
    finally { setBusy(false); }
  }
  async function changeStatus(entry: QueueEntry, status: string) {
    setBusy(true);
    try { await onAction('queueStatus', { queueId: entry.id, status }); }
    finally { setBusy(false); }
  }

  const canManage = user.role === 'SUPER_ADMIN';
  const today = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full' }).format(new Date());

  return <div className="queue-workspace" style={{ display: 'grid', gap: 20 }}>
    <section className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-head" style={{ padding: '20px 22px' }}>
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>COE Office consultation schedule</h2>
          <p className="small muted" style={{ marginTop: 4 }}>{today} · Philippine time</p>
        </div>
        <button type="button" className="secondary" onClick={() => void onRefresh()} style={{ minHeight: 38 }}><RefreshCw size={15}/> Refresh</button>
      </div>

      <div style={{ padding: '22px', display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '0 4px' }}>
          <span className="chip blue" style={{ padding: '6px 10px' }}>Office-only queue</span>
          <span className="small muted">No coordinator scheduling. All bookings go through the COE Office.</span>
        </div>
        <div className="cards-grid" style={{ gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', margin: 0 }}>
          <div className="item-card" style={{ background: 'linear-gradient(135deg, #edf5ff 0%, #f5f9ff 100%)', border: '1px solid #cfe0f8', boxShadow: '0 10px 24px rgba(25, 84, 149, 0.06)' }}>
            <div className="item-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Clock3 size={20} color="#214a83" />
              <span className="chip blue" style={{ padding: '5px 10px' }}>Morning availability</span>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <h3 style={{ fontSize: 24, letterSpacing: '-0.03em' }}>8:00 AM – 11:00 AM</h3>
              <p>Up to 36 five-minute consultations per office session.</p>
            </div>
          </div>

          <div className="item-card" style={{ background: 'linear-gradient(135deg, #edf6f2 0%, #f6fbf9 100%)', border: '1px solid #cfe9dc', boxShadow: '0 10px 24px rgba(20, 94, 72, 0.06)' }}>
            <div className="item-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Clock3 size={20} color="#216251" />
              <span className="chip blue" style={{ padding: '5px 10px' }}>Afternoon availability</span>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <h3 style={{ fontSize: 24, letterSpacing: '-0.03em' }}>1:00 PM – 5:00 PM</h3>
              <p>Up to 48 five-minute consultations per office session.</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid #dfeaf6', borderRadius: 12, background: '#f9fbff', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4d6d95', marginBottom: 8 }}>Consultation cap</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#153d73' }}>5 min</div>
            <div style={{ fontSize: 12, color: '#5d7897' }}>per student</div>
          </div>
          <div style={{ border: '1px solid #dfeaf6', borderRadius: 12, background: '#f9fbff', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4d6d95', marginBottom: 8 }}>Queue policy</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#153d73' }}>First in</div>
            <div style={{ fontSize: 12, color: '#5d7897' }}>first served</div>
          </div>
          {!isStudent && <div style={{ border: '1px solid #dfeaf6', borderRadius: 12, background: '#f9fbff', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4d6d95', marginBottom: 8 }}>Status</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#153d73' }}>{activeEntries.length}</div>
            <div style={{ fontSize: 12, color: '#5d7897' }}>active entries today</div>
          </div>}
        </div>
      </div>
    </section>

    {isStudent && <section className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-head" style={{ padding: '20px 22px' }}>
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>Book a consultation with the COE Office</h2>
          <p className="small muted" style={{ marginTop: 4 }}>Reserve a 5-minute meeting window with office staff.</p>
        </div>
      </div>
      <div style={{ padding: '22px', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button type="button" className="primary" disabled={busy} onClick={() => void submitJoin()} style={{ minHeight: 44 }}>
            {busy ? 'Processing…' : 'Book consultation'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderTop: '1px solid #edf2f8', paddingTop: 10 }}>
          <span className="small muted">Consultation cap: 5 minutes per student</span>
          <span className="small muted">Availability is shown below in real time.</span>
        </div>
      </div>
    </section>}

    <section className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-head" style={{ padding: '20px 22px' }}>
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>{isStudent ? 'Your scheduled meetings' : 'Office queue overview'}</h2>
          <p className="small muted" style={{ marginTop: 4 }}>{activeEntries.length} active {activeEntries.length === 1 ? 'meeting' : 'meetings'} today</p>
        </div>
        <ListOrdered size={21} color="#214a83" />
      </div>
      {entries.length ? <div className="queue-entry-list" style={{ display: 'grid', gap: 12, padding: '20px 22px' }}>
        {entries.map(entry => <article key={entry.id} className="item-card" style={{ display: 'grid', gap: 12, border: '1px solid #dfeaf6', background: '#f9fbff', padding: 18 }}>
          <div className="item-card-top" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="chip blue" style={{ padding: '5px 10px' }}>Meeting #{entry.queueNumber}</span>
            {isStudent && ['WAITING', 'SERVING'].includes(text(entry, 'status')) && <span className="chip" style={{ padding: '5px 10px' }}>Position {entry.queuePosition}</span>}
            <span className={'chip ' + (entry.status === 'SERVED' ? 'green' : entry.status === 'ABSENT' || entry.status === 'CANCELLED' ? 'orange' : 'blue')} style={{ padding: '5px 10px' }}>{entry.status}</span>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <h3 style={{ fontSize: 18, margin: 0 }}>{entry.studentName || 'Student'}</h3>
            <p>{entry.coordinatorName || 'COE office staff'} · {entry.session === 'MORNING' ? 'Morning consultation window' : 'Afternoon consultation window'}</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13, color: '#4d6d95' }}>
            <span><strong style={{ color: '#153d73' }}>{localClock(text(entry, 'scheduledStart'))}</strong> start</span>
            <span><strong style={{ color: '#153d73' }}>{localClock(text(entry, 'scheduledEnd'))}</strong> end</span>
            <span>5-minute cap</span>
            <span className="small muted">Joined {new Date(text(entry, 'joinedAt')).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}</span>
          </div>

          {canManage && ['WAITING', 'SERVING'].includes(text(entry, 'status')) && <div className="table-actions" style={{ marginTop: 4 }}>
            {entry.status === 'WAITING' && <button type="button" className="primary" disabled={busy} onClick={() => void changeStatus(entry, 'SERVING')}>Call student</button>}
            {entry.status === 'SERVING' && <button type="button" className="primary" disabled={busy} onClick={() => void changeStatus(entry, 'SERVED')}>Mark served</button>}
            {entry.status === 'WAITING' && <button type="button" className="secondary" disabled={busy} onClick={() => void changeStatus(entry, 'ABSENT')}>Mark absent</button>}
            <button type="button" className="secondary" disabled={busy} onClick={() => void changeStatus(entry, 'CANCELLED')}>Cancel</button>
          </div>}
        </article>)}
      </div> : <div className="empty" style={{ margin: '0 22px 22px', padding: '32px 18px' }}><Users size={28}/>{isStudent ? 'You have not booked a consultation today.' : 'No student consultations are scheduled yet. New entries will appear here as they are added.'}</div>}
    </section>
  </div>;
}
