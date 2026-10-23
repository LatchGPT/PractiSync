import { database, insert, list, one, statement } from '../db/demo';
import { withTenant } from '../db/tenant-context';
import { mailConfigured, queuedMail } from '../auth/mail';
import { DomainError, requireRole } from './policies';
import { inputs, type Action, type Identity } from '../validation/contracts';

const timeZone = 'Asia/Manila';
const slotLength = 5;
const reservationDays = 30;
const holidayFreshMs = 24 * 60 * 60 * 1000;
const holidayRetryMs = 15 * 60 * 1000;
const inflightHolidaySync = new Map<string, Promise<void>>();

type QueueRow = Record<string, unknown>;
type Holiday = { date: string; name?: string; countryCode?: string; holidayTypes?: string[]; nationalHoliday?: boolean; subdivisionCodes?: string[] | null };

function parts(date: Date) {
  const values = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = (name: string) => values.find(part => part.type === name)?.value ?? '';
  return { date: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}` };
}

export function manilaNow(now = new Date()) { return parts(now); }

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function dayOffset(date: string, days: number) {
  const parsed = parseDate(date);
  if (!parsed) throw new DomainError('Choose a valid reservation date.');
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function minuteOfDay(clock: string) {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

function clockOfMinute(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function sessionFor(start: number) { return start < 660 ? 'MORNING' : 'AFTERNOON'; }

export function queueSlots() {
  const slots: { start: string; end: string; number: number; session: 'MORNING' | 'AFTERNOON' }[] = [];
  for (const [start, end] of [[480, 660], [780, 1020]]) {
    for (let minute = start; minute + slotLength <= end; minute += slotLength) {
      const index = slots.length + 1;
      slots.push({ start: clockOfMinute(minute), end: clockOfMinute(minute + slotLength), number: index, session: sessionFor(minute) });
    }
  }
  return slots;
}

function publicHolidayUrl(year: number) { return `https://date.nager.at/api/v4/Holidays/PH/${year}`; }

async function cancelForNewPublicHolidays(tenantId: string, dates: string[]) {
  if (!dates.length) return;
  const placeholders = dates.map(() => '?').join(',');
  const affected = await list(`SELECT q.id,q.student_id,u.email AS student_email,q.service_date,q.scheduled_start,q.queue_number FROM queue_entries q JOIN users u ON u.id=q.student_id AND u.tenant_id=q.tenant_id WHERE q.tenant_id=? AND q.service_date IN (${placeholders}) AND q.status='WAITING'`, tenantId, ...dates);
  const now = new Date().toISOString();
  const transitions = affected.map(entry => statement("UPDATE queue_entries SET status='CANCELLED',closure_reason='HOLIDAY',completed_at=?,updated_at=? WHERE tenant_id=? AND id=? AND status='WAITING'", now, now, tenantId, String(entry.id)));
  const changed = transitions.length ? await database().batch(transitions) : [];
  const notices = affected.flatMap((entry, index) => {
    if (!databaseChangeCount(changed[index])) return [];
    const message = `Your COE Office reservation for ${String(entry.serviceDate)} at ${String(entry.scheduledStart)} Philippine time was cancelled because the date is now a public holiday. Please choose another slot.`;
    const statements = [
      insert('notifications', { user_id: String(entry.studentId), title: 'COE Office reservation cancelled', message, type: 'QUEUE', resource_type: 'queue_entry', resource_id: String(entry.id), link_page: 'queue', read_at: null }),
    ];
    const email = String(entry.studentEmail ?? '').trim();
    if (mailConfigured() && email) statements.push(queuedMail(tenantId, { to: email, subject: 'COE Office reservation cancelled', text: message }));
    return statements;
  });
  if (notices.length) await database().batch(notices);
}

async function cancelForUniversityHolidays(tenantId: string) {
  const entries = await list(`SELECT DISTINCT q.id,q.student_id,q.service_date,q.scheduled_start,q.queue_number,u.email AS student_email
    FROM queue_entries q JOIN users u ON u.id=q.student_id AND u.tenant_id=q.tenant_id
    JOIN calendar_events e ON e.tenant_id=q.tenant_id AND e.event_type='HOLIDAY' AND e.audience='UNIVERSITY' AND e.status='ACTIVE' AND e.start_date<=q.service_date AND e.end_date>=q.service_date
    WHERE q.tenant_id=? AND q.status='WAITING' AND q.service_date>=?`, tenantId, manilaNow().date);
  const now = new Date().toISOString();
  const transitions = entries.map(entry => statement("UPDATE queue_entries SET status='CANCELLED',closure_reason='HOLIDAY',completed_at=?,updated_at=? WHERE tenant_id=? AND id=? AND status='WAITING'", now, now, tenantId, String(entry.id)));
  const changed = transitions.length ? await database().batch(transitions) : [];
  const notices = entries.flatMap((entry, index) => {
    if (!databaseChangeCount(changed[index])) return [];
    const message = `Your COE Office reservation for ${String(entry.serviceDate)} at ${String(entry.scheduledStart)} Philippine time was cancelled because the university calendar marks that date as a holiday. Please choose another slot.`;
    const statements = [
      insert('notifications', { user_id: String(entry.studentId), title: 'COE Office reservation cancelled', message, type: 'QUEUE', resource_type: 'queue_entry', resource_id: String(entry.id), link_page: 'queue', read_at: null }),
    ];
    const email = String(entry.studentEmail ?? '').trim();
    if (mailConfigured() && email) statements.push(queuedMail(tenantId, { to: email, subject: 'COE Office reservation cancelled', text: message }));
    return statements;
  });
  if (notices.length) await database().batch(notices);
}

function databaseChangeCount(result: unknown) {
  if (typeof result === 'number') return result > 0;
  if (result && typeof result === 'object' && 'meta' in result) {
    return Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0) > 0;
  }
  return false;
}

async function syncPublicHolidays(tenantId: string, year: number, force = false) {
  const key = `${tenantId}:${year}`;
  const current = inflightHolidaySync.get(key);
  if (current && !force) return current;
  const operation = (async () => {
    const now = new Date();
    const sync = await one('SELECT * FROM queue_holiday_sync WHERE tenant_id=? AND holiday_year=?', tenantId, year);
    const lastSyncedAt = Date.parse(String(sync?.lastSyncedAt ?? ''));
    const lastAttemptAt = Date.parse(String(sync?.lastAttemptAt ?? ''));
    if (!force && lastSyncedAt && now.getTime() - lastSyncedAt < holidayFreshMs) return;
    if (!force && sync?.lastError && lastAttemptAt && now.getTime() - lastAttemptAt < holidayRetryMs) return;
    const nowIso = now.toISOString();
    try {
      const response = await fetch(publicHolidayUrl(year), { cache: 'no-store', signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`Public holiday source returned ${response.status}.`);
      const result: unknown = await response.json();
      if (!Array.isArray(result)) throw new Error('Public holiday source returned an invalid calendar.');
      const holidays = (result as Holiday[]).filter(item => item.countryCode === 'PH' && item.date?.startsWith(`${year}-`) && item.holidayTypes?.includes('Public'));
      const existingDates = await list('SELECT DISTINCT holiday_date FROM queue_public_holidays WHERE tenant_id=? AND holiday_year=?', tenantId, year);
      const prior = new Set(existingDates.map(item => String(item.holidayDate)));
      const incoming = new Set(holidays.map(item => item.date));
      const newlyAdded = [...incoming].filter(date => !prior.has(date));
      const syncId = String(sync?.id ?? crypto.randomUUID());
      const writes = [statement('DELETE FROM queue_public_holidays WHERE tenant_id=? AND holiday_year=?', tenantId, year)];
      for (const holiday of holidays) {
        writes.push(insert('queue_public_holidays', { holiday_year: year, holiday_date: holiday.date, name: String(holiday.name || 'Public holiday'), country_code: 'PH', synced_at: nowIso }, `holiday-${tenantId}-${holiday.date}-${encodeURIComponent(String(holiday.name || 'holiday'))}`));
      }
      writes.push(statement(`INSERT INTO queue_holiday_sync (id,tenant_id,created_at,holiday_year,last_attempt_at,last_synced_at,last_error)
        VALUES (?,?,?,?,?,?,NULL) ON CONFLICT (tenant_id,holiday_year) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,last_synced_at=excluded.last_synced_at,last_error=NULL`, syncId, tenantId, nowIso, year, nowIso, nowIso));
      await database().batch(writes);
      await cancelForNewPublicHolidays(tenantId, newlyAdded);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : 'Public holiday calendar could not be refreshed.';
      const syncId = String(sync?.id ?? crypto.randomUUID());
      await database().batch([statement(`INSERT INTO queue_holiday_sync (id,tenant_id,created_at,holiday_year,last_attempt_at,last_synced_at,last_error)
        VALUES (?,?,?,?,?,NULL,?) ON CONFLICT (tenant_id,holiday_year) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,last_error=excluded.last_error`, syncId, tenantId, nowIso, year, nowIso, message)]);
      const cached = await one('SELECT id FROM queue_holiday_sync WHERE tenant_id=? AND holiday_year=? AND last_synced_at IS NOT NULL', tenantId, year);
      if (!cached) throw new DomainError('The public holiday calendar is not available yet. Try again when the connection is restored.', 503);
    }
  })();
  inflightHolidaySync.set(key, operation);
  try { await operation; } finally { inflightHolidaySync.delete(key); }
}

async function holidayState(tenantId: string, date: string) {
  const year = Number(date.slice(0, 4));
  await syncPublicHolidays(tenantId, year);
  const [publicHoliday, universityHoliday, sync] = await Promise.all([
    one('SELECT name FROM queue_public_holidays WHERE tenant_id=? AND holiday_date=? LIMIT 1', tenantId, date),
    one("SELECT title AS name FROM calendar_events WHERE tenant_id=? AND event_type='HOLIDAY' AND audience='UNIVERSITY' AND status='ACTIVE' AND start_date<=? AND end_date>=? ORDER BY created_at LIMIT 1", tenantId, date, date),
    one('SELECT last_synced_at,last_error FROM queue_holiday_sync WHERE tenant_id=? AND holiday_year=?', tenantId, year),
  ]);
  return { name: publicHoliday?.name ? String(publicHoliday.name) : universityHoliday?.name ? String(universityHoliday.name) : null, providerStale: Boolean(sync?.lastError), providerSyncedAt: sync?.lastSyncedAt ? String(sync.lastSyncedAt) : null };
}

function fullName(name: unknown) { return String(name ?? '').trim() || 'Student name unavailable'; }

function publicName(name: unknown) {
  const tokens = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 'Student name unavailable';
  return tokens.length === 1 ? tokens[0] : `${tokens[0]} ${tokens[tokens.length - 1]!.slice(0, 1)}.`;
}

function formatQueueEntry(row: QueueRow, monitor = false) {
  const name = String(row.studentName ?? '');
  return {
    ...(!monitor ? { id: String(row.id), studentId: String(row.studentId) } : {}),
    studentName: monitor ? publicName(name) : fullName(name),
    serviceDate: String(row.serviceDate),
    session: String(row.session),
    queueNumber: Number(row.queueNumber),
    scheduledStart: String(row.scheduledStart),
    scheduledEnd: String(row.scheduledEnd),
    status: String(row.status),
    closureReason: String(row.closureReason ?? ''),
    startedAt: String(row.startedAt ?? ''),
    completedAt: String(row.completedAt ?? ''),
    joinedAt: String(row.joinedAt ?? ''),
  };
}

async function expireEntries(tenantId: string) {
  const now = manilaNow();
  const expired = await list(`SELECT q.id,q.student_id,u.email AS student_email,q.service_date,q.scheduled_start,q.queue_number
    FROM queue_entries q JOIN users u ON u.id=q.student_id AND u.tenant_id=q.tenant_id
    WHERE q.tenant_id=? AND q.status='WAITING' AND (q.service_date<? OR (q.service_date=? AND q.scheduled_end<=?))`, tenantId, now.date, now.date, now.time);
  const timestamp = new Date().toISOString();
  const transitions = expired.map(entry => statement("UPDATE queue_entries SET status='ABSENT',closure_reason='MISSED',completed_at=?,updated_at=? WHERE tenant_id=? AND id=? AND status='WAITING'", timestamp, timestamp, tenantId, String(entry.id)));
  const changed = transitions.length ? await database().batch(transitions) : [];
  const notices = expired.flatMap((entry, index) => {
    if (!databaseChangeCount(changed[index])) return [];
    const message = `Your COE Office reservation #${String(entry.queueNumber).padStart(2, '0')} at ${String(entry.scheduledStart)} has expired because the five-minute slot ended before your consultation started.`;
    const statements = [
      insert('notifications', { user_id: String(entry.studentId), title: 'COE Office reservation marked missed', message, type: 'QUEUE', resource_type: 'queue_entry', resource_id: String(entry.id), link_page: 'queue', read_at: null }),
    ];
    const email = String(entry.studentEmail ?? '').trim();
    if (mailConfigured() && email) statements.push(queuedMail(tenantId, { to: email, subject: 'COE Office reservation marked missed', text: message }));
    return statements;
  });
  if (notices.length) await database().batch(notices);
}

export async function reconcileQueue(tenantId: string) {
  return withTenant(tenantId, async () => {
    const today = manilaNow().date;
    await expireEntries(tenantId);
    await Promise.allSettled([
      syncPublicHolidays(tenantId, Number(today.slice(0, 4))),
      syncPublicHolidays(tenantId, Number(dayOffset(today, reservationDays).slice(0, 4))),
    ]);
    await cancelForUniversityHolidays(tenantId);
  });
}

function inWorkingWeek(date: string) {
  const day = parseDate(date)?.getUTCDay();
  return day !== undefined && day !== 0 && day !== 6;
}

function checkReservationDate(date: string, now: { date: string; time: string }) {
  if (!parseDate(date)) throw new DomainError('Choose a valid reservation date.');
  if (date < now.date || date > dayOffset(now.date, reservationDays)) throw new DomainError('Choose a date from today through the next 30 days.');
}

async function ensureOfficeOwner(tenantId: string) {
  const owner = await one("SELECT id FROM users WHERE tenant_id=? AND role='SUPER_ADMIN' AND status='ACTIVE' ORDER BY created_at,id LIMIT 1", tenantId);
  if (!owner) throw new DomainError('COE Office reservations are unavailable because no active office administrator is assigned.', 503);
  return String(owner.id);
}

export async function getQueueView(user: Identity, requestedDate: string, monitor = false) {
  requireRole(user, 'STUDENT', 'SUPER_ADMIN');
  if (monitor && user.role !== 'SUPER_ADMIN') throw new DomainError('The student display is available to office administrators only.', 403);
  const now = manilaNow();
  const date = requestedDate || now.date;
  checkReservationDate(date, now);
  await reconcileQueue(user.tenantId);
  const holiday = await holidayState(user.tenantId, date);
  const [rows, ownRows, historyRows, studentOccupiedRows] = await Promise.all([
    user.role === 'SUPER_ADMIN' ? list(`SELECT q.*,u.name AS student_name FROM queue_entries q JOIN users u ON u.id=q.student_id AND u.tenant_id=q.tenant_id WHERE q.tenant_id=? AND q.service_date=? ORDER BY q.scheduled_start,q.queue_number`, user.tenantId, date) : Promise.resolve([]),
    user.role === 'STUDENT' ? list(`SELECT q.*,u.name AS student_name FROM queue_entries q JOIN users u ON u.id=q.student_id AND u.tenant_id=q.tenant_id WHERE q.tenant_id=? AND q.student_id=? AND q.status IN ('WAITING','SERVING') ORDER BY q.service_date,q.scheduled_start LIMIT 1`, user.tenantId, user.id) : Promise.resolve([]),
    user.role === 'STUDENT' ? list(`SELECT q.*,u.name AS student_name FROM queue_entries q JOIN users u ON u.id=q.student_id AND u.tenant_id=q.tenant_id WHERE q.tenant_id=? AND q.student_id=? AND q.status NOT IN ('WAITING','SERVING') ORDER BY q.service_date DESC,q.scheduled_start DESC LIMIT 20`, user.tenantId, user.id) : Promise.resolve([]),
    user.role === 'STUDENT' ? list("SELECT scheduled_start,status FROM queue_entries WHERE tenant_id=? AND service_date=? AND status IN ('WAITING','SERVING')", user.tenantId, date) : Promise.resolve([]),
  ]);
  const active = rows.filter(row => row.status === 'WAITING' || row.status === 'SERVING').map(row => formatQueueEntry(row));
  const currentActive = active.find(row => row.status === 'SERVING') ?? active.find(row => row.status === 'WAITING' && (date < now.date || (date === now.date && row.scheduledStart <= now.time)));
  const waiting = active.filter(row => row.status === 'WAITING').sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  const nextActive = waiting.find(row => row.id !== currentActive?.id) ?? (currentActive ? undefined : waiting[0]);
  const formatPublicEntry = (entry: typeof currentActive) => entry ? monitor ? formatQueueEntry(rows.find(row => String(row.id) === entry.id)!, true) : entry : null;
  const current = formatPublicEntry(currentActive);
  const next = formatPublicEntry(nextActive);
  const allSlots = queueSlots();
  const isToday = date === now.date;
  const unavailableReason = holiday.name ? `Closed for ${holiday.name}` : !inWorkingWeek(date) ? 'Closed on weekends' : null;
  const currentMinute = minuteOfDay(now.time);
  const officeOpenNow = isToday && !unavailableReason && ((currentMinute >= 480 && currentMinute < 660) || (currentMinute >= 780 && currentMinute < 1020));
  const occupied = new Map<string, { studentName?: string; status: string; queueNumber?: number; id?: string }>(active.map(entry => [entry.scheduledStart, entry]));
  if (user.role === 'STUDENT') for (const row of studentOccupiedRows) occupied.set(String(row.scheduledStart), { status: String(row.status) });
  const slots = allSlots.map(slot => {
    const booking = occupied.get(slot.start);
    const past = isToday && slot.start <= now.time;
    return { ...slot, state: unavailableReason ? 'CLOSED' : booking ? 'RESERVED' : past ? 'PAST' : 'AVAILABLE', ...(user.role === 'SUPER_ADMIN' && !monitor && booking ? { booking: booking.studentName, status: booking.status, queueNumber: booking.queueNumber, entryId: booking.id } : {}) };
  });
  const walkInAvailable = officeOpenNow && !currentActive;
  const result: Record<string, unknown> = {
    date, today: now.date, serverTime: now.time, timeZone, minDate: now.date, maxDate: dayOffset(now.date, reservationDays),
    closureReason: unavailableReason, holidayName: holiday.name, holidayProviderStale: holiday.providerStale, holidayProviderSyncedAt: holiday.providerSyncedAt, officeOpenNow,
    slots, walkInAvailable, current: current ?? null, next: next ?? null,
  };
  if (!monitor && user.role === 'SUPER_ADMIN') {
    result.entries = rows.map(row => formatQueueEntry(row));
  } else {
    const ownActive = ownRows[0] ? formatQueueEntry(ownRows[0]) : null;
    result.ownReservation = ownActive;
    result.history = historyRows.map(row => formatQueueEntry(row));
  }
  return result;
}

async function queueEmail(tenantId: string, studentId: string, title: string, message: string) {
  if (!mailConfigured()) return null;
  const user = await one('SELECT email FROM users WHERE tenant_id=? AND id=?', tenantId, studentId);
  const email = String(user?.email ?? '').trim();
  return email ? queuedMail(tenantId, { to: email, subject: title, text: message }) : null;
}

async function persistQueueUpdate(tenantId: string, actorId: string, queueId: string, expectedStatus: string, status: string, closureReason: string | null, startedAt: string | null, completedAt: string | null, notice: { studentId: string; title: string; message: string } | null) {
  const now = new Date().toISOString();
  const transition = await database().batch([statement(`UPDATE queue_entries SET status=?,closure_reason=?,started_at=COALESCE(?,started_at),completed_at=?,updated_at=? WHERE tenant_id=? AND id=? AND status=?`, status, closureReason, startedAt, completedAt, now, tenantId, queueId, expectedStatus)]);
  if (!databaseChangeCount(transition[0])) throw new DomainError('This reservation changed. Refresh the queue and try again.', 409);
  const writes = [] as ReturnType<typeof insert>[];
  if (notice) {
    writes.push(insert('notifications', { user_id: notice.studentId, title: notice.title, message: notice.message, type: 'QUEUE', resource_type: 'queue_entry', resource_id: queueId, link_page: 'queue', read_at: null }));
    const email = await queueEmail(tenantId, notice.studentId, notice.title, notice.message);
    if (email) writes.push(email);
  }
  writes.push(statement('INSERT INTO audit (id,tenant_id,created_at,actor_id,action,resource_id,reason) VALUES (?,?,?,?,?,?,?)', crypto.randomUUID(), tenantId, now, actorId, 'QUEUE_STATUS_UPDATED', queueId, status));
  await database().batch(writes);
}

export async function mutateQueue(user: Identity, action: Action, payload: unknown) {
  if (action === 'queueJoin') throw new DomainError('The queue now uses date and time reservations. Choose an available slot.', 410);
  if (action === 'queueAddStudent') throw new DomainError('Students reserve their own COE Office slot.', 403);
  if (action === 'queueReserve') {
    requireRole(user, 'STUDENT');
    const data = inputs.queueReserve.parse(payload);
    const now = manilaNow();
    checkReservationDate(data.serviceDate, now);
    if (!inWorkingWeek(data.serviceDate)) throw new DomainError('COE Office reservations are available Monday through Friday.');
    if (data.serviceDate === now.date && minuteOfDay(now.time) >= 1020) throw new DomainError('Today’s reservation window has ended. Choose another date.');
    await reconcileQueue(user.tenantId);
    const holiday = await holidayState(user.tenantId, data.serviceDate);
    if (holiday.name) throw new DomainError(`COE Office is closed for ${holiday.name}. Choose another date.`, 409);
    const slot = queueSlots().find(item => item.start === data.scheduledStart);
    if (!slot) throw new DomainError('Choose one of the five-minute slots shown during COE Office hours.');
    if (data.serviceDate === now.date && slot.start <= now.time) throw new DomainError('That slot has already started. Choose a later time.');
    if (await one("SELECT id FROM queue_entries WHERE tenant_id=? AND student_id=? AND status IN ('WAITING','SERVING') LIMIT 1", user.tenantId, user.id)) throw new DomainError('You already have an active reservation. Forfeit it before reserving another slot.', 409);
    const occupied = await one("SELECT id FROM queue_entries WHERE tenant_id=? AND service_date=? AND scheduled_start=? AND status IN ('WAITING','SERVING') LIMIT 1", user.tenantId, data.serviceDate, slot.start);
    if (occupied) throw new DomainError('That slot was just reserved. Choose another available time.', 409);
    const coordinatorId = await ensureOfficeOwner(user.tenantId);
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const message = `Your COE Office reservation is confirmed for ${data.serviceDate} at ${slot.start} Philippine time. Reservation number: #${String(slot.number).padStart(2, '0')}. You can forfeit it until your consultation starts.`;
    const writes = [
      insert('queue_entries', { student_id: user.id, coordinator_id: coordinatorId, service_date: data.serviceDate, session: slot.session, queue_number: slot.number, joined_at: nowIso, scheduled_start: slot.start, scheduled_end: slot.end, status: 'WAITING', started_at: null, completed_at: null, closure_reason: null, updated_at: nowIso }, id),
      insert('notifications', { user_id: user.id, title: 'COE Office reservation confirmed', message, type: 'QUEUE', resource_type: 'queue_entry', resource_id: id, link_page: 'queue', read_at: null }),
      statement('INSERT INTO audit (id,tenant_id,created_at,actor_id,action,resource_id,reason) VALUES (?,?,?,?,?,?,?)', crypto.randomUUID(), user.tenantId, nowIso, user.id, 'QUEUE_SLOT_RESERVED', id, `${data.serviceDate} ${slot.start}`),
    ];
    const email = await queueEmail(user.tenantId, user.id, 'COE Office reservation confirmed', message);
    if (email) writes.push(email);
    try { await database().batch(writes); } catch { throw new DomainError('That slot or your active reservation changed while you were booking. Refresh and choose an available slot.', 409); }
    return { id, message: `Reservation confirmed for ${data.serviceDate} at ${slot.start}.` };
  }
  if (action === 'queueForfeit') {
    requireRole(user, 'STUDENT');
    const data = inputs.queueForfeit.parse(payload);
    await reconcileQueue(user.tenantId);
    const entry = await one('SELECT * FROM queue_entries WHERE tenant_id=? AND id=? AND student_id=?', user.tenantId, data.queueId, user.id);
    if (!entry) throw new DomainError('Reservation not found.', 404);
    if (entry.status === 'SERVING') throw new DomainError('Your consultation has started. Ask the COE Office if you need to leave.', 409);
    if (entry.status !== 'WAITING') throw new DomainError('This reservation is already closed.', 409);
    const message = `Your COE Office reservation #${String(entry.queueNumber).padStart(2, '0')} for ${entry.serviceDate} at ${entry.scheduledStart} has been forfeited. The slot is available to another student.`;
    await persistQueueUpdate(user.tenantId, user.id, data.queueId, 'WAITING', 'CANCELLED', 'FORFEITED', null, new Date().toISOString(), { studentId: user.id, title: 'COE Office reservation forfeited', message });
    return { id: data.queueId, message: 'Reservation forfeited. The slot is available again.' };
  }
  if (action === 'queueStatus') {
    requireRole(user, 'SUPER_ADMIN');
    const data = inputs.queueStatus.parse(payload);
    await reconcileQueue(user.tenantId);
    const entry = await one(`SELECT q.*,u.name AS student_name FROM queue_entries q JOIN users u ON u.id=q.student_id AND u.tenant_id=q.tenant_id WHERE q.tenant_id=? AND q.id=?`, user.tenantId, data.queueId);
    if (!entry) throw new DomainError('Reservation not found.', 404);
    if (!['WAITING', 'SERVING'].includes(String(entry.status))) throw new DomainError('This reservation is already closed.', 409);
    const now = manilaNow();
    if (data.status === 'SERVING') {
      if (entry.status !== 'WAITING') throw new DomainError('Only a waiting student can be called.', 409);
      if (String(entry.serviceDate) > now.date || (String(entry.serviceDate) === now.date && String(entry.scheduledStart) > now.time)) throw new DomainError('This student can be called at the reserved time or later.', 409);
      const earlier = await one("SELECT id FROM queue_entries WHERE tenant_id=? AND service_date=? AND status='WAITING' AND (scheduled_start<? OR (scheduled_start=? AND queue_number<?)) LIMIT 1", user.tenantId, entry.serviceDate, entry.scheduledStart, entry.scheduledStart, entry.queueNumber);
      if (earlier) throw new DomainError('Call the earlier reserved student first.', 409);
      if (await one("SELECT id FROM queue_entries WHERE tenant_id=? AND status='SERVING' AND id<>? LIMIT 1", user.tenantId, entry.id)) throw new DomainError('Finish the current consultation before calling another student.', 409);
    }
    if (data.status === 'SERVED' && entry.status !== 'SERVING') throw new DomainError('Only a student in consultation can be marked complete.', 409);
    if (data.status === 'ABSENT' && entry.status !== 'WAITING') throw new DomainError('A student in consultation cannot be marked missed.', 409);
    if (data.status === 'ABSENT' && (String(entry.serviceDate) > now.date || (String(entry.serviceDate) === now.date && String(entry.scheduledStart) > now.time))) throw new DomainError('A reservation can be marked missed at its reserved time or later.', 409);
    const title = data.status === 'SERVING' ? 'Your COE Office consultation is starting' : data.status === 'SERVED' ? 'COE Office consultation completed' : data.status === 'ABSENT' ? 'COE Office reservation marked missed' : 'COE Office reservation cancelled';
    const message = data.status === 'SERVING' ? 'It’s your turn. Please proceed to the COE Office for your consultation.' : data.status === 'SERVED' ? 'Your COE Office consultation is complete.' : data.status === 'ABSENT' ? 'Your COE Office reservation was marked missed.' : 'Your COE Office reservation was cancelled by the office.';
    const closes = data.status !== 'SERVING';
    await persistQueueUpdate(user.tenantId, user.id, data.queueId, String(entry.status), data.status, data.status === 'ABSENT' ? 'MISSED' : data.status === 'CANCELLED' ? 'ADMIN_CANCELLED' : null, data.status === 'SERVING' ? new Date().toISOString() : null, closes ? new Date().toISOString() : null, { studentId: String(entry.studentId), title, message });
    return { id: data.queueId, message: data.status === 'SERVING' ? 'Student called.' : data.status === 'SERVED' ? 'Consultation completed.' : data.status === 'ABSENT' ? 'Reservation marked missed.' : 'Reservation cancelled.' };
  }
  throw new DomainError('Unknown queue action.');
}
