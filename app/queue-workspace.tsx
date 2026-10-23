'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, CircleAlert, ExternalLink, MonitorUp, RefreshCw, Ticket, WifiOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RtuSeal } from '@/components/rtu-seal';
import type { Action, Identity } from '@/packages/validation/contracts';
import styles from './queue-workspace.module.css';

type QueueStatus = 'WAITING' | 'SERVING' | 'SERVED' | 'ABSENT' | 'CANCELLED';
type QueueEntry = {
  id: string;
  studentId?: string;
  studentName?: string;
  serviceDate: string;
  session: string;
  queueNumber: number;
  scheduledStart: string;
  scheduledEnd: string;
  status: QueueStatus;
  closureReason?: string;
};
type QueueSlot = { start: string; end: string; number: number; session: string; state: 'AVAILABLE' | 'RESERVED' | 'PAST' | 'CLOSED'; booking?: string; status?: string; queueNumber?: number; entryId?: string };
type QueueData = {
  date: string;
  today: string;
  serverTime: string;
  minDate: string;
  maxDate: string;
  closureReason: string | null;
  holidayName: string | null;
  holidayProviderStale: boolean;
  holidayProviderSyncedAt: string | null;
  officeOpenNow: boolean;
  slots: QueueSlot[];
  walkInAvailable: boolean;
  current: QueueEntry | null;
  next: QueueEntry | null;
  ownReservation?: QueueEntry | null;
  entries?: QueueEntry[];
  history?: QueueEntry[];
};
type Confirmation = { kind: 'FORFEIT'; entry: QueueEntry } | { kind: 'CLOSE'; entry: QueueEntry; status: 'ABSENT' | 'CANCELLED' };

const manilaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });
const longDate = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const longDateShort = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'long', day: 'numeric' });
const activeStatuses = new Set(['WAITING', 'SERVING']);
const emptyEntries: QueueEntry[] = [];

function todayInManila() { return manilaDate.format(new Date()); }
function timeLabel(clock: string) {
  if (!/^\d{2}:\d{2}$/.test(clock)) return 'Time unavailable';
  const [hour, minute] = clock.split(':').map(Number);
  if (hour > 23 || minute > 59) return 'Time unavailable';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
function dateLabel(date: string, formatter = longDateShort) {
  const value = new Date(`${date}T12:00:00+08:00`);
  return Number.isNaN(value.getTime()) ? 'Date unavailable' : formatter.format(value);
}
function numberLabel(number: number) { return Number.isInteger(number) && number > 0 ? `#${String(number).padStart(2, '0')}` : '#—'; }
function isWeekend(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return value === 0 || value === 6;
}
function statusLabel(entry: QueueEntry) {
  if (entry.closureReason === 'FORFEITED') return 'Forfeited';
  if (entry.closureReason === 'HOLIDAY') return 'Cancelled · holiday';
  if (entry.status === 'SERVING') return 'In consultation';
  return ({ WAITING: 'Reserved', SERVED: 'Completed', ABSENT: 'Missed', CANCELLED: 'Cancelled' } as Record<string, string>)[entry.status] ?? 'Status unavailable';
}
function officeOpen(data: QueueData) {
  return data.officeOpenNow;
}

function Status({ entry }: { entry: QueueEntry }) {
  return <span className={styles.status} data-status={entry.status} data-closure={entry.closureReason || undefined}>{statusLabel(entry)}</span>;
}

function TimeSlot({ slot, selected, disabled, onSelect, staff = false }: { slot: QueueSlot; selected: boolean; disabled: boolean; onSelect: () => void; staff?: boolean }) {
  const reserved = slot.state === 'RESERVED';
  const unavailable = slot.state !== 'AVAILABLE';
  return <button type="button" className={styles.slot} data-state={slot.state.toLowerCase()} data-selected={selected} disabled={disabled || unavailable} aria-pressed={selected} onClick={onSelect}>
    <span className={styles.slotTime}>{timeLabel(slot.start)}</span>
    {reserved ? <span className={styles.slotState}>{staff ? `${slot.booking || 'Reserved'} · ${numberLabel(slot.queueNumber ?? slot.number)}` : 'Reserved'}</span> : slot.state === 'PAST' ? <span className={styles.slotState}>Passed</span> : slot.state === 'CLOSED' ? <span className={styles.slotState}>Closed</span> : <span className={styles.slotState}>{numberLabel(slot.number)} · Available</span>}
  </button>;
}

export default function QueueWorkspace({ user, onAction, monitorMode = false, workspacePath = '/dashboard/admin' }: {
  user: Identity;
  onAction: (action: Action, values: Record<string, unknown>) => Promise<void> | void;
  monitorMode?: boolean;
  workspacePath?: string;
}) {
  const [selectedDate, setSelectedDate] = useState(todayInManila);
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<QueueSlot | null>(null);
  const [selectedSession, setSelectedSession] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [online, setOnline] = useState(true);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [showMore, setShowMore] = useState(18);
  const [monitorBlocked, setMonitorBlocked] = useState(false);
  const requestSequence = useRef(0);
  const actionInFlight = useRef(false);
  const confirmationTrigger = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isStudent = user.role === 'STUDENT';
  const allowed = isStudent || user.role === 'SUPER_ADMIN';

  const loadQueue = useCallback(async (manual = false) => {
    if (!allowed || !navigator.onLine) return;
    const requestId = ++requestSequence.current;
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ date: monitorMode ? todayInManila() : selectedDate });
      if (monitorMode) params.set('display', 'monitor');
      const response = await fetch(`/api/queue?${params}`, { cache: 'no-store' });
      if (response.status === 401) {
        location.replace('/login?redirect=' + encodeURIComponent(location.pathname + location.search));
        return;
      }
      const result = await response.json() as QueueData & { error?: string };
      if (!response.ok) throw new Error(result.error || 'The COE Office queue could not be loaded.');
      if (requestId === requestSequence.current) {
        setData(result);
        setRefreshError('');
        setSelectedSlot(current => current && result.slots.find(slot => slot.start === current.start)?.state === 'AVAILABLE' ? current : null);
        if (manual) setAnnouncement('Queue updated.');
      }
    } catch (error) {
      if (requestId === requestSequence.current) setRefreshError(error instanceof Error ? error.message : 'The queue could not be updated. Retry when the connection is available.');
    } finally {
      if (requestId === requestSequence.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [allowed, monitorMode, selectedDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (navigator.onLine) void loadQueue();
      else { setOnline(false); setLoading(false); }
    }, 0);
    return () => { window.clearTimeout(timer); requestSequence.current += 1; };
  }, [loadQueue]);
  useEffect(() => {
    if (!allowed) return;
    const interval = window.setInterval(() => { if (!document.hidden) void loadQueue(); }, monitorMode ? 5000 : 10000);
    const connection = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void loadQueue();
    };
    const visible = () => { if (!document.hidden) void loadQueue(); };
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [allowed, loadQueue, monitorMode]);

  const activeReservation = data?.ownReservation ?? null;
  const allEntries = data?.entries ?? emptyEntries;
  const activeEntries = useMemo(() => allEntries.filter(entry => activeStatuses.has(entry.status)).sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)), [allEntries]);
  const waitingEntries = activeEntries.filter(entry => entry.status === 'WAITING');
  const currentEntry = activeEntries.find(entry => entry.status === 'SERVING') ?? waitingEntries.find(entry => entry.serviceDate < (data?.today ?? '') || (entry.serviceDate === data?.today && entry.scheduledStart <= (data?.serverTime ?? '')));
  const nextEntry = waitingEntries.find(entry => entry.id !== currentEntry?.id);
  const closure = data?.closureReason || (data && isWeekend(data.date) ? 'COE Office reservations are closed on weekends.' : '');
  const dateBounds = data ? { min: data.minDate, max: data.maxDate } : { min: todayInManila(), max: '' };
  const dateTime = data && `${dateLabel(data.date, longDate)} · ${timeLabel(data.serverTime)} Philippine time`;
  const sessionSlots = data?.slots.filter(slot => slot.session === selectedSession) ?? [];

  function changeDate(value: string) {
    if (!value) return;
    requestSequence.current += 1;
    setSelectedDate(value);
    setSelectedSlot(null);
    setActionError('');
    setShowMore(18);
    setData(null);
    setLoading(true);
  }

  async function runAction(action: Action, values: Record<string, string | number>, success: string) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setPending(true);
    setActionError('');
    setAnnouncement('');
    try {
      await onAction(action, values);
      await loadQueue();
      setConfirmation(null);
      setAnnouncement(success);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not save this queue change. Refresh, then try again.';
      if (error instanceof Error && (error.cause === 'queue-refresh-required' || error.cause === 409)) {
        setConfirmation(null);
        await loadQueue();
      }
      setActionError(message);
    } finally {
      actionInFlight.current = false;
      setPending(false);
    }
  }

  function openDisplay() {
    const url = `${workspacePath}?view=queue&display=monitor`;
    const popup = window.open(url, 'practisync-queue-display', 'popup,width=1080,height=760,resizable=yes,scrollbars=yes');
    if (popup) setMonitorBlocked(false);
    else setMonitorBlocked(true);
  }

  if (!allowed) return <section className={styles.permission}><Ticket size={24} aria-hidden="true"/><h2>The COE Office queue is for students</h2><p>Students reserve a time from their own account. Office administrators manage the queue.</p></section>;

  if (monitorMode) {
    const current = data?.current ?? null;
    const next = data?.next ?? null;
    const openNow = data ? officeOpen(data) : false;
    const currentTitle = current?.status === 'SERVING' ? 'Now serving' : current ? 'Please wait to be called' : !openNow ? 'COE Office is closed' : data?.walkInAvailable ? 'Walk-in available' : 'No student is being served';
    return <main className={styles.monitor} ref={rootRef} aria-busy={loading}>
      <header className={styles.monitorHeader}><span className={styles.monitorBrand}><RtuSeal size={48} className={styles.monitorLogo}/><span>COE Office<small>Student queue</small></span></span><div className={styles.monitorHeaderRight}><span>{data ? dateLabel(data.date, longDate) : 'Loading queue'}</span><span>{data ? `${timeLabel(data.serverTime)} · Philippine time` : 'Connecting…'}</span></div></header>
      {!online && <div className={styles.monitorAlert} role="status"><WifiOff size={18} aria-hidden="true"/>Offline · showing the last queue update</div>}
      {refreshError && <div className={styles.monitorAlert} role="alert"><CircleAlert size={18} aria-hidden="true"/>{refreshError}</div>}
      <div className={styles.monitorContent}>
        {loading && !data ? <div className={styles.monitorSkeleton} role="status" aria-label="Loading queue"><span/><span/><span/></div> : <>
          <section className={styles.monitorCurrent}>
            <p className={styles.monitorTitle}>{currentTitle}</p>
            {current ? <><strong className={styles.monitorNumber}>{numberLabel(current.queueNumber)}</strong><h1>{current.studentName || 'Student name unavailable'}</h1><p className={styles.monitorTime}>{timeLabel(current.scheduledStart)} reservation</p></> : data?.closureReason ? <><h1>{data.holidayName || 'Office closed'}</h1><p className={styles.monitorTime}>{data.closureReason}</p></> : openNow && data?.walkInAvailable ? <><h1>Walk-in available</h1><p className={styles.monitorTime}>Please speak with COE Office staff before entering the queue.</p></> : <><h1>There is no active consultation</h1><p className={styles.monitorTime}>Please check with COE Office staff.</p></>}
          </section>
          {next && <section className={styles.monitorNext} aria-label="Next reservation"><div><span>Next reservation</span><strong>{next.studentName || 'Student name unavailable'}</strong></div><div className={styles.monitorNextMeta}><strong>{numberLabel(next.queueNumber)}</strong><span>{timeLabel(next.scheduledStart)}</span></div></section>}
          {!next && current && <p className={styles.monitorNoNext}>No other reservation is waiting.</p>}
          {!current && !next && data?.closureReason && <p className={styles.monitorNoNext}>The next available office day can be selected from the reservation screen.</p>}
        </>}
      </div>
      <footer className={styles.monitorFooter}><span>Reservations are called at their scheduled time or later.</span><span>{refreshing ? 'Updating…' : 'Updates every 5 seconds'}</span></footer>
      <p className={styles.srOnly} role="status">{announcement}</p>
    </main>;
  }

  const studentHistory = data?.history ?? [];
  const adminHistory = allEntries.filter(entry => !activeStatuses.has(entry.status)).sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart));
  const history = isStudent ? studentHistory : adminHistory;

  return <AlertDialog open={confirmation !== null} onOpenChange={open => { if (!open && !pending) setConfirmation(null); }}>
    <div className={styles.workspace} ref={rootRef}>
      <header className={styles.header} aria-busy={loading}>
        <div><h1>COE Office queue</h1><p className={styles.date}>{dateTime || 'Loading office schedule…'}</p></div>
        {isStudent && activeReservation ? <div className={styles.topDate}><span>Reservation date</span><strong>{dateLabel(activeReservation.serviceDate, longDate)}</strong></div> : <label className={styles.topDate} htmlFor="queue-workspace-date"><span>{isStudent ? 'Reservation date' : 'Queue date'}</span><input id="queue-workspace-date" type="date" min={dateBounds.min} max={dateBounds.max} value={selectedDate} onChange={event => changeDate(event.target.value)} aria-describedby={isStudent ? 'queue-date-help' : undefined}/></label>}
        <div className={styles.headerActions}>
          {!isStudent && <button type="button" className={styles.monitorButton} onClick={openDisplay}><MonitorUp size={16} aria-hidden="true"/>Open student display</button>}
          <button type="button" className={styles.refreshButton} disabled={refreshing || !online} onClick={() => void loadQueue(true)} aria-label={refreshing ? 'Updating queue' : 'Refresh queue'}><RefreshCw size={15} aria-hidden="true"/>{refreshing ? 'Updating…' : 'Refresh'}</button>
        </div>
      </header>
      {!isStudent && monitorBlocked && <p className={styles.inlineNotice} role="status">The display window was blocked. <a href={`${workspacePath}?view=queue&display=monitor`} target="_blank" rel="noreferrer">Open the student display in a new tab <ExternalLink size={13}/></a></p>}
      {!online && <div className={styles.notice} role="status"><WifiOff size={18} aria-hidden="true"/><p>You’re offline. Your last queue details are shown. Reconnect to get updates and make changes.</p></div>}
      {online && refreshError && <div className={styles.notice} role="status"><CircleAlert size={18} aria-hidden="true"/><p>{refreshError}</p></div>}
      {actionError && !confirmation && <div className={styles.error} role="alert"><CircleAlert size={18} aria-hidden="true"/><p>{actionError}</p></div>}
      <p className={styles.srOnly} role="status">{announcement}</p>

      {loading && !data ? <div className={styles.loading}><span/><span/><span/></div> : !data ? <div className={styles.empty}><CircleAlert size={22} aria-hidden="true"/><h3>Queue details are unavailable</h3><p>{refreshError || 'Retry the queue request to see current reservations and open slots.'}</p><button type="button" className={styles.refreshButton} onClick={() => void loadQueue(true)}>Retry</button></div> : <div className={styles.layout}>
        <div className={styles.main}>
          {isStudent ? <>
            <section className={styles.bookingPanel} aria-labelledby="reservation-heading">
              <div className={styles.bookingHeader}><div><h2 id="reservation-heading">{activeReservation ? 'Your reservation' : 'Reserve a consultation'}</h2><p>Choose a weekday and an available five-minute slot.</p></div><span className={styles.timezone}>Philippine time · UTC+8</span></div>
              {activeReservation ? <div className={styles.ticketBody}>
                <div className={styles.ticketNumber}><Ticket size={21} aria-hidden="true"/><span>Reservation number</span><strong>{numberLabel(activeReservation.queueNumber)}</strong><Status entry={activeReservation}/></div>
                <div className={styles.ticketDetails}>
                  <div><h3>{dateLabel(activeReservation.serviceDate, longDate)}</h3><p>{timeLabel(activeReservation.scheduledStart)}–{timeLabel(activeReservation.scheduledEnd)}</p></div>
                  <p className={styles.helper}>{activeReservation.status === 'SERVING' ? 'Your consultation has started. Please proceed to the COE Office.' : 'Arrive near your reserved time. You can forfeit this slot until your consultation starts.'}</p>
                  {activeReservation.status === 'WAITING' && <button type="button" className={styles.secondaryButton} disabled={pending || !online} onClick={event => { confirmationTrigger.current = event.currentTarget; setConfirmation({ kind: 'FORFEIT', entry: activeReservation }); }}>Forfeit reservation</button>}
                </div>
              </div> : <>
                <div className={styles.bookingControls}>
                  <p id="queue-date-help">Reservations are open 24 hours a day. Choose a slot within the next 30 days.</p>
                </div>
                {closure ? <div className={styles.closedNotice}><CircleAlert size={18} aria-hidden="true"/><p>{closure}. Choose another weekday.</p></div> : <div className={styles.slotGroups}>
                  <div className={styles.sessionPicker} role="group" aria-label="Choose a consultation session">
                    {(['MORNING', 'AFTERNOON'] as const).map(session => {
                      const slots = data?.slots.filter(slot => slot.session === session) ?? [];
                      const available = slots.filter(slot => slot.state === 'AVAILABLE').length;
                      return <button type="button" key={session} aria-pressed={selectedSession === session} data-active={selectedSession === session} onClick={() => { setSelectedSession(session); setSelectedSlot(null); }}>
                        <strong>{session === 'MORNING' ? 'Morning' : 'Afternoon'}</strong><span>{session === 'MORNING' ? '8:00–11:00 AM' : '1:00–5:00 PM'}</span><small>{available} available</small>
                      </button>;
                    })}
                  </div>
                  <div className={styles.slotGroupHeader}><h3>{selectedSession === 'MORNING' ? 'Morning slots' : 'Afternoon slots'}</h3><span>5 minutes each</span></div>
                  <div className={styles.slotGrid}>{sessionSlots.map(slot => <TimeSlot key={slot.start} slot={slot} selected={selectedSlot?.start === slot.start} disabled={pending || !online || Boolean(activeReservation)} onSelect={() => setSelectedSlot(slot)}/>)}</div>
                </div>}
                {selectedSlot && !activeReservation && <div className={styles.selectedSlot}><div><span>Selected slot</span><strong>{dateLabel(selectedDate, longDate)} · {timeLabel(selectedSlot.start)}</strong></div><button type="button" className={styles.primaryButton} disabled={pending || !online} onClick={() => void runAction('queueReserve', { serviceDate: selectedDate, scheduledStart: selectedSlot.start }, 'Your reservation is confirmed.')}>{pending ? 'Reserving…' : `Reserve ${timeLabel(selectedSlot.start)}`}<ArrowRight size={16} aria-hidden="true"/></button></div>}
                {activeReservation && <p className={styles.bookingLock}>You already have an active reservation. Forfeit it before booking another slot.</p>}
              </>}
            </section>
            {history.length > 0 && <section className={styles.historyPanel} aria-labelledby="student-history-heading"><div className={styles.sectionHeader}><h2 id="student-history-heading">Reservation history</h2><span>{history.length} recent</span></div><ul className={styles.historyList}>{history.slice(0, 8).map(entry => <li className={styles.historyRow} key={entry.id}><div><strong>{numberLabel(entry.queueNumber)} · {dateLabel(entry.serviceDate)}</strong><span>{timeLabel(entry.scheduledStart)}</span></div><Status entry={entry}/></li>)}</ul></section>}
          </> : <>
            <section className={styles.officePanel} aria-labelledby="office-queue-heading">
              <div className={styles.sectionHeader}><div><h2 id="office-queue-heading">{currentEntry?.status === 'SERVING' ? 'Now in consultation' : currentEntry ? 'Ready to call' : closure ? 'COE Office closed' : officeOpen(data!) ? 'Walk-in available' : 'No active consultation'}</h2><span className={styles.queueMeta}>{waitingEntries.length} waiting · {dateLabel(selectedDate)}</span></div></div>
              {closure && <div className={styles.closedNotice}><CircleAlert size={18} aria-hidden="true"/><p>{closure}</p></div>}
              {currentEntry ? <div className={styles.officeCurrent}>
                <div className={styles.officeIdentity}><strong>{numberLabel(currentEntry.queueNumber)}</strong><div><h3>{currentEntry.studentName || 'Student name unavailable'}</h3><p>{timeLabel(currentEntry.scheduledStart)} reservation · {currentEntry.session === 'MORNING' ? 'Morning' : 'Afternoon'}</p></div></div>
                {currentEntry.status === 'SERVING' ? <button type="button" className={styles.primaryButton} disabled={pending || !online} onClick={() => void runAction('queueStatus', { queueId: currentEntry.id, status: 'SERVED' }, 'Consultation completed.')}>{pending ? 'Saving…' : 'Finish consultation'}<Check size={16} aria-hidden="true"/></button> : <div className={styles.callAction}><p>{currentEntry.serviceDate > (data?.today ?? '') || (currentEntry.serviceDate === data?.today && currentEntry.scheduledStart > (data?.serverTime ?? '')) ? `Calling opens at ${timeLabel(currentEntry.scheduledStart)}.` : 'The reserved time has started. Call this student when ready.'}</p><button type="button" className={styles.primaryButton} disabled={pending || !online || currentEntry.serviceDate > (data?.today ?? '') || (currentEntry.serviceDate === data?.today && currentEntry.scheduledStart > (data?.serverTime ?? ''))} onClick={() => void runAction('queueStatus', { queueId: currentEntry.id, status: 'SERVING' }, 'Student called to the office.')}>{pending ? 'Calling…' : 'Call student'}<ArrowRight size={16} aria-hidden="true"/></button></div>}
              </div> : <div className={styles.walkinState}><div className={styles.walkinIcon}><Check size={22} aria-hidden="true"/></div><div><h3>{officeOpen(data!) && data?.walkInAvailable ? 'Walk-in available' : data?.next ? 'No student is scheduled now' : 'No reservations for this date'}</h3><p>{officeOpen(data!) && data?.walkInAvailable ? 'There is no reservation during this time. The office can assist a walk-in.' : data?.next ? `The next reservation is ${timeLabel(data.next.scheduledStart)}.` : 'New reservations will appear here after a student books a slot.'}</p></div></div>}
              {nextEntry && <div className={styles.nextRow}><span>Next reservation</span><strong>{numberLabel(nextEntry.queueNumber)} · {nextEntry.studentName || 'Student name unavailable'}</strong><span>{timeLabel(nextEntry.scheduledStart)}</span></div>}
            </section>
            <section className={styles.historyPanel} aria-labelledby="daily-reservations-heading"><div className={styles.sectionHeader}><div><h2 id="daily-reservations-heading">Reservations</h2><span>{allEntries.length} total on {dateLabel(selectedDate)}</span></div></div>
              {allEntries.length ? <ol className={styles.reservationList}>{allEntries.slice(0, showMore).map(entry => <li key={entry.id} className={styles.reservationRow}>
                <strong className={styles.listNumber}>{numberLabel(entry.queueNumber)}</strong><div className={styles.listPerson}><strong>{entry.studentName || 'Student name unavailable'}</strong><span>{timeLabel(entry.scheduledStart)}–{timeLabel(entry.scheduledEnd)}</span></div><Status entry={entry}/>
                <div className={styles.rowActions}>{entry.status === 'WAITING' && <><button type="button" disabled={pending || !online || entry.serviceDate > (data?.today ?? '') || (entry.serviceDate === data?.today && entry.scheduledStart > (data?.serverTime ?? ''))} onClick={() => void runAction('queueStatus', { queueId: entry.id, status: 'ABSENT' }, 'Reservation marked missed.')}>Mark missed</button><button type="button" className={styles.dangerLink} disabled={pending || !online} onClick={event => { confirmationTrigger.current = event.currentTarget; setConfirmation({ kind: 'CLOSE', entry, status: 'CANCELLED' }); }}>Cancel</button></>}{entry.status === 'SERVING' && <button type="button" className={styles.dangerLink} disabled={pending || !online} onClick={event => { confirmationTrigger.current = event.currentTarget; setConfirmation({ kind: 'CLOSE', entry, status: 'CANCELLED' }); }}>End without completing</button>}</div>
              </li>)}</ol> : <div className={styles.empty}><Ticket size={22} aria-hidden="true"/><h3>No reservations yet</h3><p>Available slots remain open for students to reserve.</p></div>}
              {allEntries.length > showMore && <button type="button" className={styles.showMore} onClick={() => setShowMore(value => value + 18)}>Show {Math.min(18, allEntries.length - showMore)} more reservations</button>}
            </section>
          </>}
        </div>
        <aside className={styles.hours} aria-labelledby="queue-guidance-heading">
          <div className={styles.officeIdentity}><CalendarDays size={18} aria-hidden="true"/><span>COE Office</span></div>
          <h2 id="queue-guidance-heading">{isStudent ? 'Reservation hours' : 'Queue operations'}</h2>
          <dl><div><dt>Morning</dt><dd>8:00–11:00 AM</dd></div><div><dt>Afternoon</dt><dd>1:00–5:00 PM</dd></div></dl>
          <p className={styles.helper}>Weekdays only · Philippine time (UTC+8)</p>
          {isStudent ? <div className={styles.howItWorks}><h3>How reservations work</h3><p>Choose one five-minute slot up to 30 days ahead. Your reservation is held immediately.</p><p>You may forfeit it until your consultation starts. If it is not called before the slot ends, it is marked missed.</p></div> : <div className={styles.howItWorks}><h3>Calling students</h3><p>Call at the reserved start time or later. Finish one consultation before calling the next student.</p><p>A reservation that has not started expires at the end of its five-minute slot.</p></div>}
          {data?.holidayProviderStale && <p className={styles.providerNotice}>Public holiday calendar last synced {data.holidayProviderSyncedAt ? new Date(data.holidayProviderSyncedAt).toLocaleDateString() : 'previously'}. New bookings use the last saved calendar.</p>}
        </aside>
      </div>}
    </div>

    {confirmation && <AlertDialogContent className={styles.confirmation} onCloseAutoFocus={event => { event.preventDefault(); if (confirmationTrigger.current?.isConnected) confirmationTrigger.current.focus(); else rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }}>
      <AlertDialogHeader><AlertDialogTitle>{confirmation.kind === 'FORFEIT' ? 'Forfeit this reservation?' : confirmation.status === 'ABSENT' ? 'Mark this reservation as missed?' : 'Cancel this reservation?'}</AlertDialogTitle><AlertDialogDescription>{confirmation.kind === 'FORFEIT' ? `Your slot ${numberLabel(confirmation.entry.queueNumber)} on ${dateLabel(confirmation.entry.serviceDate, longDate)} at ${timeLabel(confirmation.entry.scheduledStart)} will be released for another student. You can reserve a different slot afterward.` : `${confirmation.entry.studentName || 'This student'} · ${numberLabel(confirmation.entry.queueNumber)} · ${timeLabel(confirmation.entry.scheduledStart)}. ${confirmation.status === 'ABSENT' ? 'The reservation will be marked missed and the student notified.' : 'The reservation will be removed from the active queue and the student notified.'}`}</AlertDialogDescription></AlertDialogHeader>
      {actionError && <p className={styles.error} role="alert">{actionError}</p>}
      {!online && <p className={styles.notice} role="status">Reconnect before changing this reservation.</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={pending}>Keep reservation</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending || !online} onClick={event => { event.preventDefault(); if (confirmation.kind === 'FORFEIT') void runAction('queueForfeit', { queueId: confirmation.entry.id }, 'Reservation forfeited. The slot is available again.'); else void runAction('queueStatus', { queueId: confirmation.entry.id, status: confirmation.status }, confirmation.status === 'ABSENT' ? 'Reservation marked missed.' : 'Reservation cancelled.'); }}>{pending ? 'Saving…' : confirmation.kind === 'FORFEIT' ? 'Forfeit reservation' : confirmation.status === 'ABSENT' ? 'Mark missed' : 'Cancel reservation'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>}
  </AlertDialog>;
}
