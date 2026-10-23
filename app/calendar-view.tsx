'use client';

import { toast } from 'sonner';

/**
 * Intent brief
 * Who: Students tracking placement hours, with coordinators and the COE Office publishing schedules.
 * Job: Unified timeline bridging daily DTR hours with academic milestones, deadlines, and COE appointments.
 * Worst case: A student mistakes unconfirmed hours for confirmed hours or misses an appointment, so states stay explicit.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  MapPin,
  Pencil,
  Search,
  Sparkles,
  Target,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Identity, Row } from '@/packages/validation/contracts';
import { calendarDateValue, parseCalendarDate } from './calendar-date';
import styles from './calendar-view.module.css';

type CalendarMode = 'month' | 'week' | 'agenda';
type EventFilter = 'ALL' | 'DTR' | 'CONFIRMED' | 'DEADLINE' | 'APPOINTMENT' | 'ACADEMIC' | 'HOLIDAY' | 'MISSING';
type DayTotals = { minutes: number; confirmed: number; pending: number; entries: Row[] };

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const eventLabels: Record<string, string> = {
  ACADEMIC: 'Academic event',
  HOLIDAY: 'University holiday',
  DEADLINE: 'Passing of documents (Deadline)',
  APPOINTMENT: 'COE appointment',
};

const eventColors: Record<string, string> = {
  ACADEMIC: 'blue',
  HOLIDAY: 'purple',
  DEADLINE: 'orange',
  APPOINTMENT: 'green',
};

const eventClassByType: Record<string, string> = {
  ACADEMIC: styles.eventAcademic,
  HOLIDAY: styles.eventHoliday,
  DEADLINE: styles.eventDeadline,
  APPOINTMENT: styles.eventAppointment,
};

const value = (row: Row, key: string) => String(row[key] ?? '');
const hours = (minutes: number) => `${(minutes / 60).toFixed(1)} hrs`;

const compactCalendarQuery = '(max-width: 767px)';
function subscribeToCalendarViewport(onChange: () => void) {
  const query = window.matchMedia(compactCalendarQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const compactCalendarSnapshot = () => window.matchMedia(compactCalendarQuery).matches;
const serverCalendarSnapshot = () => false;

function manilaToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dayTotals(entries: Row[], date: string): DayTotals {
  const rows = entries.filter((entry) => value(entry, 'date').slice(0, 10) === date);
  const minutes = rows.reduce((sum, entry) => sum + Math.max(0, Number(entry.minutes) || 0), 0);
  const confirmed = rows.reduce(
    (sum, entry) =>
      sum + (String(entry.confirmedVersion) === String(entry.version) ? Math.max(0, Number(entry.minutes) || 0) : 0),
    0
  );
  return { minutes, confirmed, pending: Math.max(0, minutes - confirmed), entries: rows };
}

function timeLabel(val: string): string {
  if (!val) return '';
  if (/^\d{2}:\d{2}$/.test(val)) {
    return new Date(`1970-01-01T${val}:00+08:00`).toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    });
  }
  const date = new Date(val);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
}

function dateLabel(
  date: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
): string {
  const parsed = parseCalendarDate(date);
  return parsed ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-PH', { ...options, timeZone: 'UTC' }) : date;
}

function eventOccursOn(event: Row, date: string): boolean {
  return value(event, 'startDate') <= date && value(event, 'endDate') >= date;
}

function noHoursWeekday(
  date: Date,
  dateKey: string,
  role: Identity['role'],
  placements: Row[],
  userId: string,
  totals: DayTotals,
  today: string
): boolean {
  if (role !== 'STUDENT' || dateKey > today || date.getDay() === 0 || date.getDay() === 6 || totals.minutes > 0)
    return false;
  return placements.some(
    (placement) =>
      placement.studentId === userId &&
      placement.status === 'ACTIVE' &&
      value(placement, 'startsAt').slice(0, 10) <= dateKey &&
      value(placement, 'endsAt').slice(0, 10) >= dateKey
  );
}

function eventDescription(event: Row): string {
  const allDay = Number(event.allDay) === 1 || !value(event, 'startTime');
  return allDay ? 'All day' : `${timeLabel(value(event, 'startTime'))} – ${timeLabel(value(event, 'endTime'))}`;
}

function icsEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
}
function icsDate(date: string) {
  return date.replaceAll('-', '');
}
function icsNextDate(date: string) {
  const parsed = parseCalendarDate(date);
  return parsed ? icsDate(calendarDateValue(addDays(parsed, 1))) : icsDate(date);
}
function icsTimestamp(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, hour! - 8, minute!))
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export interface CalendarViewProps {
  user: Identity;
  events: Row[];
  entries: Row[];
  placements: Row[];
  classes?: Row[];
  documents?: Row[];
  evaluations?: Row[];
  assessmentSchedules?: Row[];
  canCreateEvents?: boolean;
  onCreateEvent?: () => void;
  onEditEvent?: (event: Row) => void;
  onCancelEvent?: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  onCorrectEntry?: (entry: Row) => void;
  onViewEntry?: (entry: Row) => void;
  onConfirmEntry?: (entryId: string, version: number) => void;
  onRegisterExport?: (fn: (formatType?: 'ics' | 'csv' | 'json') => void) => void;
  onLogAttendanceForDate?: (date: string) => void;
  onNavigate?: (page: string) => void;
}

export default function CalendarView({
  user,
  events,
  entries,
  placements,
  classes,
  documents,
  evaluations,
  onEditEvent,
  onCancelEvent,
  onDeleteEvent,
  onRegisterExport,
  onNavigate,
}: CalendarViewProps) {
  const today = manilaToday();
  const compactViewport = useSyncExternalStore(subscribeToCalendarViewport, compactCalendarSnapshot, serverCalendarSnapshot);
  const [selectedMode, setMode] = useState<CalendarMode | null>(null);
  const mode = selectedMode ?? (compactViewport ? 'agenda' : 'month');

  const [cursor, setCursor] = useState<Date>(() => parseCalendarDate(today) ?? new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [categoryFilter, setCategoryFilter] = useState<EventFilter>('ALL');

  // Managed Schedules & Deadlines Directory state (for Coordinator & Super Admin)
  const [schedSearch, setSchedSearch] = useState('');
  const [schedTypeFilter, setSchedTypeFilter] = useState<'ALL' | 'DEADLINE' | 'ACADEMIC' | 'HOLIDAY' | 'APPOINTMENT'>('ALL');
  const [schedStatusFilter, setSchedStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [schedClassFilter, setSchedClassFilter] = useState<string>('ALL');
  const [schedSort, setSchedSort] = useState<'CLOSING_SOONEST' | 'CLOSING_LATEST' | 'NEWEST_CREATED' | 'TITLE_AZ'>('CLOSING_SOONEST');
  const [schedPage, setSchedPage] = useState(1);
  const [schedPageSize, setSchedPageSize] = useState(5);
  const [viewingSchedule, setViewingSchedule] = useState<Row | null>(null);
  const [leftRailTab, setLeftRailTab] = useState<'MILESTONES' | 'CLEARANCE'>('MILESTONES');


  const selectedKey = selectedDate || today;

  // Hybrid Internship Milestones (Dynamic Placement Commencements & Completion Deadlines)
  const combinedEvents = useMemo(() => {
    const list: Row[] = [...events];
    const existingIds = new Set(list.map((e) => String(e.id)));

    for (const placement of placements) {
      if (user.role === 'STUDENT' && placement.studentId !== user.id) continue;
      const startKey = value(placement, 'startsAt').slice(0, 10);
      const endKey = value(placement, 'endsAt').slice(0, 10);
      const studentPrefix = user.role !== 'STUDENT' && value(placement, 'studentName') ? `${value(placement, 'studentName')} · ` : '';

      if (startKey && !existingIds.has(`milestone-start-${placement.id}`)) {
        existingIds.add(`milestone-start-${placement.id}`);
        list.push({
          id: `milestone-start-${placement.id}`,
          tenantId: user.tenantId,
          createdAt: value(placement, 'createdAt'),
          eventType: 'ACADEMIC',
          title: `${studentPrefix}Internship begins · ${value(placement, 'companyName')}`,
          description: `Official training commencement for ${value(placement, 'studentName') || 'your'} practicum placement with ${value(placement, 'companyName')}.`,
          startDate: startKey,
          endDate: startKey,
          allDay: 1,
          audience: 'CLASS',
          isMilestone: 1,
          status: 'ACTIVE',
        });
      }

      if (endKey && !existingIds.has(`milestone-end-${placement.id}`)) {
        existingIds.add(`milestone-end-${placement.id}`);
        list.push({
          id: `milestone-end-${placement.id}`,
          tenantId: user.tenantId,
          createdAt: value(placement, 'createdAt'),
          eventType: 'DEADLINE',
          title: `${studentPrefix}Internship target completion deadline`,
          description: `Target practicum completion date. Verify all DTR shifts are signed and clearance documents submitted.`,
          startDate: endKey,
          endDate: endKey,
          allDay: 1,
          audience: 'CLASS',
          isMilestone: 1,
          status: 'ACTIVE',
        });
      }
    }

    if (documents?.length) {
      for (const doc of documents) {
        if (user.role === 'STUDENT' && doc.placementId) {
          const placement = placements.find((p) => p.id === doc.placementId);
          if (placement && placement.studentId !== user.id) continue;
        }
        if (doc.status !== 'APPROVED' && doc.placementId) {
          const placement = placements.find((p) => p.id === doc.placementId);
          if (placement) {
            const startKey = value(placement, 'startsAt').slice(0, 10);
            const milestoneDocId = `milestone-doc-${doc.id}`;
            if (startKey && !existingIds.has(milestoneDocId)) {
              existingIds.add(milestoneDocId);
              list.push({
                id: milestoneDocId,
                tenantId: user.tenantId,
                createdAt: value(doc, 'createdAt'),
                eventType: 'DEADLINE',
                title: `Internship Document Submission: ${value(doc, 'name')}`,
                description: `Required practicum document submission for ${value(placement, 'companyName')}. Status: ${value(doc, 'status') || 'Pending submission'}.`,
                startDate: startKey,
                endDate: startKey,
                allDay: 1,
                audience: 'CLASS',
                isMilestone: 1,
                status: 'ACTIVE',
              });
            }
          }
        }
      }
    }

    if (evaluations?.length) {
      for (const evl of evaluations) {
        if (user.role === 'STUDENT' && evl.placementId) {
          const placement = placements.find((p) => p.id === evl.placementId);
          if (placement && placement.studentId !== user.id) continue;
        }
        const periodEnd = value(evl, 'periodEnd')?.slice(0, 10);
        const milestoneEvlId = `milestone-eval-${evl.id}`;
        if (periodEnd && !existingIds.has(milestoneEvlId)) {
          existingIds.add(milestoneEvlId);
          const kind = value(evl, 'kind') || 'Periodic';
          const placement = evl.placementId ? placements.find((p) => p.id === evl.placementId) : undefined;
          const studentPrefix = user.role !== 'STUDENT' && placement && value(placement, 'studentName') ? `${value(placement, 'studentName')} · ` : '';
          list.push({
            id: milestoneEvlId,
            tenantId: user.tenantId,
            createdAt: value(evl, 'createdAt'),
            eventType: 'ACADEMIC',
            title: `${studentPrefix}${kind === 'WEEKLY' ? 'Weekly' : kind === 'MONTHLY' ? 'Monthly' : kind} Competency Assessment`,
            description: `Assessment period: ${value(evl, 'periodStart')} to ${periodEnd}. Status: ${value(evl, 'status') || 'Submitted'}.`,
            startDate: periodEnd,
            endDate: periodEnd,
            allDay: 1,
            audience: 'CLASS',
            isMilestone: 1,
            status: 'ACTIVE',
          });
        }
      }
    }

    return list;
  }, [events, placements, documents, evaluations, user]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, Row[]>();
    for (const entry of entries) {
      const key = value(entry, 'date').slice(0, 10);
      const rows = grouped.get(key) ?? [];
      rows.push(entry);
      grouped.set(key, rows);
    }
    return grouped;
  }, [entries]);

  const totalsFor = useCallback((date: string): DayTotals => {
    const rows = entriesByDate.get(date) ?? [];
    const minutes = rows.reduce((sum, entry) => sum + Math.max(0, Number(entry.minutes) || 0), 0);
    const confirmed = rows.reduce(
      (sum, entry) =>
        sum + (String(entry.confirmedVersion) === String(entry.version) ? Math.max(0, Number(entry.minutes) || 0) : 0),
      0
    );
    return { minutes, confirmed, pending: Math.max(0, minutes - confirmed), entries: rows };
  }, [entriesByDate]);

  const eventsFor = (date: string) => combinedEvents.filter((event) => eventOccursOn(event, date));

  // Calendar dates
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) }),
    [cursor]
  );
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) }),
    [cursor]
  );

  const visibleDays = mode === 'month' ? monthDays : weekDays;
  const weekRows = Array.from({ length: Math.ceil(visibleDays.length / 7) }, (_, index) =>
    visibleDays.slice(index * 7, index * 7 + 7)
  );

  // Month Statistics
  const currentMonthStats = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const daysInCurrentMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    let totalMinutes = 0;
    let confirmedMinutes = 0;
    let pendingMinutes = 0;
    let activeDaysCount = 0;
    let missedWeekdaysCount = 0;

    for (const d of daysInCurrentMonth) {
      const k = calendarDateValue(d);
      const tot = totalsFor(k);
      if (tot.minutes > 0) {
        totalMinutes += tot.minutes;
        confirmedMinutes += tot.confirmed;
        pendingMinutes += tot.pending;
        activeDaysCount++;
      } else if (noHoursWeekday(d, k, user.role, placements, user.id, tot, today)) {
        missedWeekdaysCount++;
      }
    }

    const monthEventsCount = combinedEvents.filter((ev) => {
      const sDate = value(ev, 'startDate');
      const eDate = value(ev, 'endDate');
      const startKey = calendarDateValue(monthStart);
      const endKey = calendarDateValue(monthEnd);
      return sDate <= endKey && eDate >= startKey;
    }).length;

    const confirmationRate = totalMinutes > 0 ? Math.round((confirmedMinutes / totalMinutes) * 100) : 0;

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      confirmedHours: (confirmedMinutes / 60).toFixed(1),
      pendingHours: (pendingMinutes / 60).toFixed(1),
      confirmationRate,
      activeDaysCount,
      missedWeekdaysCount,
      monthEventsCount,
    };
  }, [cursor, totalsFor, combinedEvents, placements, user.id, user.role, today]);

  // Student placement and requirement calculations
  const studentPlacement = useMemo(() => {
    if (user.role !== 'STUDENT') return null;
    return (
      placements.find((p) => p.studentId === user.id && p.status === 'ACTIVE') ??
      placements.find((p) => p.studentId === user.id) ??
      null
    );
  }, [placements, user]);

  const studentTargetMinutes = Number(studentPlacement?.requiredMinutes) || 0;
  const studentTargetHours = studentTargetMinutes / 60;

  const studentOverallStats = useMemo(() => {
    if (user.role !== 'STUDENT') return null;
    let totalMinutes = 0;
    let confirmedMinutes = 0;
    let totalShifts = 0;

    for (const entry of entries) {
      if (studentPlacement && entry.placementId && entry.placementId !== studentPlacement.id) continue;
      const mins = Math.max(0, Number(entry.minutes) || 0);
      if (mins > 0) {
        totalMinutes += mins;
        totalShifts++;
        if (String(entry.confirmedVersion) === String(entry.version)) {
          confirmedMinutes += mins;
        }
      }
    }

    const pendingMinutes = Math.max(0, totalMinutes - confirmedMinutes);
    const targetMin = studentTargetMinutes > 0 ? studentTargetMinutes : (totalMinutes || 1);
    const reportedPercent = Math.min(100, Math.round((totalMinutes / targetMin) * 100));
    const confirmedPercent = Math.min(100, Math.round((confirmedMinutes / targetMin) * 100));

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      confirmedHours: (confirmedMinutes / 60).toFixed(1),
      pendingHours: (pendingMinutes / 60).toFixed(1),
      totalShifts,
      reportedPercent,
      confirmedPercent,
      targetHours: studentTargetHours > 0 ? studentTargetHours.toFixed(0) : null,
      policyVersion: value(studentPlacement ?? ({} as Row), 'policyVersion') || '1',
      companyName: value(studentPlacement ?? ({} as Row), 'companyName') || 'Training Partner',
    };
  }, [entries, studentPlacement, studentTargetMinutes, studentTargetHours, user.role]);

  const studentClearanceDocs = useMemo(() => {
    if (user.role !== 'STUDENT' || !documents?.length) return [];
    return documents.filter((doc) => {
      if (studentPlacement && doc.placementId) {
        return doc.placementId === studentPlacement.id;
      }
      return true;
    });
  }, [documents, studentPlacement, user.role]);

  const upcomingEvents = useMemo(() => {
    return combinedEvents
      .filter((ev) => value(ev, 'endDate') >= today && value(ev, 'status') !== 'CANCELLED')
      .sort((a, b) => value(a, 'startDate').localeCompare(value(b, 'startDate')))
      .slice(0, 4);
  }, [combinedEvents, today]);

  // Managed schedules directory for Coordinator & Super Admin
  const managedEvents = useMemo(() => {
    let list = [...events];

    if (schedSearch.trim()) {
      const q = schedSearch.toLowerCase().trim();
      list = list.filter((ev) => {
        const title = String(value(ev, 'title') || '').toLowerCase();
        const desc = String(value(ev, 'description') || '').toLowerCase();
        const loc = String(value(ev, 'location') || '').toLowerCase();
        const createdBy = String(value(ev, 'createdByName') || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || loc.includes(q) || createdBy.includes(q);
      });
    }

    if (schedTypeFilter !== 'ALL') {
      list = list.filter((ev) => value(ev, 'eventType') === schedTypeFilter);
    }

    if (schedStatusFilter !== 'ALL') {
      list = list.filter((ev) => value(ev, 'status') === schedStatusFilter);
    }

    if (schedClassFilter !== 'ALL') {
      if (schedClassFilter === 'GENERAL') {
        list = list.filter((ev) => !value(ev, 'classId'));
      } else {
        list = list.filter((ev) => value(ev, 'classId') === schedClassFilter);
      }
    }

    // Sort order
    list.sort((a, b) => {
      if (schedSort === 'CLOSING_SOONEST') {
        const aEnd = value(a, 'endDate') || '9999-99-99';
        const bEnd = value(b, 'endDate') || '9999-99-99';
        if (aEnd !== bEnd) return aEnd.localeCompare(bEnd);
        return value(a, 'title').localeCompare(value(b, 'title'));
      }
      if (schedSort === 'CLOSING_LATEST') {
        const aEnd = value(a, 'endDate') || '';
        const bEnd = value(b, 'endDate') || '';
        if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);
        return value(a, 'title').localeCompare(value(b, 'title'));
      }
      if (schedSort === 'TITLE_AZ') {
        return value(a, 'title').localeCompare(value(b, 'title'));
      }
      // NEWEST_CREATED
      const aDate = value(a, 'startDate') || '';
      const bDate = value(b, 'startDate') || '';
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return String(b.id).localeCompare(String(a.id));
    });

    return list;
  }, [events, schedSearch, schedTypeFilter, schedStatusFilter, schedClassFilter, schedSort]);

  const totalSchedPages = Math.max(1, Math.ceil(managedEvents.length / schedPageSize));
  const currentSchedPage = Math.min(schedPage, totalSchedPages);
  const pagedEvents = useMemo(() => {
    const start = (currentSchedPage - 1) * schedPageSize;
    return managedEvents.slice(start, start + schedPageSize);
  }, [managedEvents, currentSchedPage, schedPageSize]);

  function getAudienceLabel(ev: Row): string {
    const aud = value(ev, 'audience');
    if (aud === 'CLASS') {
      const cid = value(ev, 'classId');
      const matchedClass = classes?.find((c) => c.id === cid);
      if (matchedClass) {
        return `Class ${value(matchedClass, 'section') || value(matchedClass, 'name')}`;
      }
      return 'Class section';
    }
    if (aud === 'UNIVERSITY') return 'University-wide';
    if (aud === 'DEPARTMENT') return 'Department';
    if (aud === 'COURSE') return 'Course-wide';
    return 'University';
  }

  function getOrganizerBadge(ev: Row): React.ReactNode {
    const createdByName = value(ev, 'createdByName');
    const aud = value(ev, 'audience');
    const cid = value(ev, 'classId');
    const matchedClass = classes?.find((c) => c.id === cid);

    if (aud === 'UNIVERSITY' || !createdByName || createdByName.includes('Office') || createdByName.includes('Admin')) {
      return (
        <span className="chip blue" style={{ fontSize: 10, padding: '1px 6px' }} title="Managed by COE Practicum Office">
          <Building2 size={10} style={{ display: 'inline', marginRight: 3 }} />
          COE Office
        </span>
      );
    }

    return (
      <span className="chip green" style={{ fontSize: 10, padding: '1px 6px' }} title={`Set by ${createdByName}${matchedClass ? ` for ${value(matchedClass, 'section')}` : ''}`}>
        <Users size={10} style={{ display: 'inline', marginRight: 3 }} />
        {createdByName}
      </span>
    );
  }

  function canUserManageEvent(ev: Row): boolean {
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'COORDINATOR') {
      const evType = value(ev, 'eventType');
      if (evType !== 'DEADLINE') return false;
      const createdBy = value(ev, 'createdBy');
      const cid = value(ev, 'classId');
      if (createdBy === user.id) return true;
      if (cid && classes?.some((c) => c.id === cid)) return true;
      return true;
    }
    return false;
  }

  function formatDateBadge(dateStr: string): string {
    const d = parseCalendarDate(dateStr);
    if (!d) return dateStr;
    return format(d, 'MMM d, yyyy');
  }

  function getUrgencyBadge(ev: Row, todayStr: string): React.ReactNode {
    const status = value(ev, 'status');
    if (status === 'CANCELLED' || status === 'COMPLETED') return null;

    const endDate = value(ev, 'endDate');
    if (!endDate) return null;

    if (endDate < todayStr) {
      return (
        <span className={styles.urgencyBadgeOverdue} title="Deadline has passed">
          <Clock3 size={11} />
          <span>Past due</span>
        </span>
      );
    }

    if (endDate === todayStr) {
      return (
        <span className={styles.urgencyBadgeToday} title="Closes today!">
          <AlertTriangle size={11} />
          <span>Closes today</span>
        </span>
      );
    }

    const endObj = parseCalendarDate(endDate);
    const todayObj = parseCalendarDate(todayStr);
    if (endObj && todayObj) {
      const diffMs = endObj.getTime() - todayObj.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        return (
          <span className={styles.urgencyBadgeSoon} title="Closes tomorrow">
            <Clock3 size={11} />
            <span>Due tomorrow</span>
          </span>
        );
      }
      if (diffDays > 1 && diffDays <= 3) {
        return (
          <span className={styles.urgencyBadgeSoon} title={`Closes in ${diffDays} days`}>
            <Clock3 size={11} />
            <span>Due in {diffDays}d</span>
          </span>
        );
      }
    }

    return null;
  }

  function copyScheduleNotice(ev: Row) {
    const title = value(ev, 'title');
    const type = eventLabels[value(ev, 'eventType')] ?? value(ev, 'eventType');
    const opens = `${formatDateBadge(value(ev, 'startDate'))}${value(ev, 'startTime') && !Number(ev.allDay) ? ` (${timeLabel(value(ev, 'startTime'))})` : ''}`;
    const closes = `${formatDateBadge(value(ev, 'endDate'))}${value(ev, 'endTime') && !Number(ev.allDay) ? ` (${timeLabel(value(ev, 'endTime'))})` : ''}`;
    const audience = getAudienceLabel(ev);
    const desc = value(ev, 'description');
    const venue = value(ev, 'location');
    const meetingUrl = value(ev, 'meetingUrl');

    const lines = [
      `📢 PRACTICUM NOTICE: ${title}`,
      `📌 Category: ${type}`,
      `👥 Target Section: ${audience}`,
      `📅 Submission Window: Opens ${opens} · Closes ${closes}`,
    ];
    if (venue) lines.push(`📍 Venue / Office: ${venue}`);
    if (meetingUrl) lines.push(`🔗 Portal / Link: ${meetingUrl}`);
    if (desc) lines.push(`\n📝 Instructions / Guidelines:\n${desc}`);
    lines.push(`\nPlease ensure timely compliance. Thank you!`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      toast.success(`Copied reminder notice for "${title}"!`);
    }).catch(() => {
      toast.error('Unable to copy notice to clipboard.');
    });
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="chip green">
            <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="chip red">
            <X size={12} style={{ display: 'inline', marginRight: 4 }} />
            Cancelled
          </span>
        );
      case 'SCHEDULED':
      default:
        return (
          <span className="chip blue">
            <CalendarCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
            Scheduled
          </span>
        );
    }
  }

  const periodTitle =
    mode === 'week'
      ? `${format(weekDays[0]!, 'MMM d')} – ${format(weekDays[6]!, 'MMM d, yyyy')}`
      : format(cursor, 'MMMM yyyy');

  function movePeriod(direction: -1 | 1) {
    if (mode === 'week') setCursor((current) => (direction < 0 ? subWeeks(current, 1) : addWeeks(current, 1)));
    else setCursor((current) => (direction < 0 ? subMonths(current, 1) : addMonths(current, 1)));
  }

  function chooseDay(date: Date) {
    const key = calendarDateValue(date);
    setSelectedDate(key);
    if (mode === 'month' && !isSameMonth(date, cursor)) setCursor(date);
    if (mode === 'week') setCursor(date);
  }

  const exportCalendar = useCallback((formatType: 'ics' | 'csv' | 'json' = 'ics') => {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

    function triggerDownload(blob: Blob, filename: string) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    if (formatType === 'csv') {
      const csvRows: string[][] = [
        ['Record Type', 'Date', 'Start Time', 'End Time', 'Title / Summary', 'Hours Rendered', 'Status', 'Location / Meeting', 'Organizer / Student']
      ];

      for (const event of combinedEvents) {
        const isCancelled = value(event, 'status') === 'CANCELLED';
        csvRows.push([
          eventLabels[value(event, 'eventType')] ?? value(event, 'eventType'),
          value(event, 'startDate') + (value(event, 'endDate') && value(event, 'endDate') !== value(event, 'startDate') ? ` to ${value(event, 'endDate')}` : ''),
          value(event, 'startTime') || 'All day',
          value(event, 'endTime') || 'All day',
          (isCancelled ? '[CANCELLED] ' : '') + value(event, 'title'),
          '—',
          isCancelled ? 'CANCELLED' : 'ACTIVE',
          value(event, 'meetingUrl') || value(event, 'location') || 'On campus / Virtual',
          value(event, 'createdByName') || (value(event, 'audience') === 'CLASS' ? 'Class Coordinator' : 'COE Office')
        ]);
      }

      for (const [date, rows] of entriesByDate) {
        const totals = dayTotals(rows, date);
        if (!totals.minutes) continue;
        const confirmed = totals.pending === 0;
        csvRows.push([
          'Daily Training Record',
          date,
          rows[0] ? timeLabel(value(rows[0], 'startsAt')) : '',
          rows[0] ? timeLabel(value(rows[0], 'endsAt')) : '',
          `DTR Log (${rows.length} shift${rows.length === 1 ? '' : 's'})`,
          (totals.minutes / 60).toFixed(1),
          confirmed ? 'Confirmed' : 'Pending Review',
          String(placements.find(p => p.studentId === user.id)?.companyName ?? 'Industry Partner'),
          user.name
        ]);
      }

      const csvContent = csvRows
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      triggerDownload(blob, 'practisync-schedule-and-dtr.csv');
      toast.success('Calendar & DTR exported as CSV (.csv)');
      return;
    }

    if (formatType === 'json') {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, name: user.name, role: user.role },
        academicTerm: 'A.Y. 2026–2027 · RTU Practicum',
        events: combinedEvents.map(ev => ({
          id: ev.id,
          type: value(ev, 'eventType'),
          title: value(ev, 'title'),
          description: value(ev, 'description'),
          startDate: value(ev, 'startDate'),
          endDate: value(ev, 'endDate'),
          startTime: value(ev, 'startTime'),
          endTime: value(ev, 'endTime'),
          location: value(ev, 'location'),
          meetingUrl: value(ev, 'meetingUrl'),
          status: value(ev, 'status') || 'ACTIVE',
          audience: value(ev, 'audience')
        })),
        attendance: Array.from(entriesByDate.entries()).map(([date, rows]) => {
          const tot = dayTotals(rows, date);
          return {
            date,
            totalMinutes: tot.minutes,
            confirmedMinutes: tot.confirmed,
            pendingMinutes: tot.pending,
            entries: rows.map(r => ({
              id: r.id,
              startsAt: value(r, 'startsAt'),
              endsAt: value(r, 'endsAt'),
              breakMinutes: r.breakMinutes,
              minutes: r.minutes,
              narrative: value(r, 'narrative'),
              version: r.version,
              confirmedVersion: r.confirmedVersion
            }))
          };
        })
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
      triggerDownload(blob, 'practisync-calendar-export.json');
      toast.success('Calendar exported as JSON (.json)');
      return;
    }

    // Default: iCalendar (.ics)
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PractiSync//Training Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const event of combinedEvents) {
      const startDate = value(event, 'startDate');
      const endDate = value(event, 'endDate');
      const startTime = value(event, 'startTime');
      const endTime = value(event, 'endTime');
      const isCancelled = value(event, 'status') === 'CANCELLED';
      const description = [
        isCancelled ? '[CANCELLED EVENT]' : '',
        value(event, 'description'),
        eventDescription(event),
        value(event, 'audience') === 'CLASS' ? 'Class schedule' : 'University schedule',
        value(event, 'createdByName') ? `Organizer: ${value(event, 'createdByName')}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      lines.push('BEGIN:VEVENT', `UID:${icsEscape(value(event, 'id'))}@practisync.local`, `DTSTAMP:${stamp}`);
      if (isCancelled) lines.push('STATUS:CANCELLED');
      if (startTime && endTime) {
        lines.push(`DTSTART:${icsTimestamp(startDate, startTime)}`, `DTEND:${icsTimestamp(endDate, endTime)}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${icsDate(startDate)}`, `DTEND;VALUE=DATE:${icsNextDate(endDate)}`);
      }
      lines.push(`SUMMARY:${icsEscape(value(event, 'title'))}`, `DESCRIPTION:${icsEscape(description)}`);
      if (value(event, 'location')) lines.push(`LOCATION:${icsEscape(value(event, 'location'))}`);
      const meetingUrl = value(event, 'meetingUrl');
      if (meetingUrl.startsWith('https://')) lines.push(`URL:${meetingUrl}`);
      lines.push('END:VEVENT');
    }

    for (const [date, rows] of entriesByDate) {
      const totals = dayTotals(rows, date);
      if (!totals.minutes) continue;
      const status =
        totals.pending === 0
          ? 'Industry Partner verified'
          : totals.confirmed === 0
          ? 'Awaiting final Industry Partner verification'
          : `${hours(totals.confirmed)} confirmed; ${hours(totals.pending)} pending`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:dtr-${date}-${user.id}@practisync.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${icsDate(date)}`,
        `DTEND;VALUE=DATE:${icsNextDate(date)}`,
        `SUMMARY:${icsEscape(`DTR · ${hours(totals.minutes)} rendered`)}`,
        `DESCRIPTION:${icsEscape(`${status}. Reported time is not formal completion.`)}`,
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    triggerDownload(blob, 'practisync-calendar.ics');
    toast.success('Calendar exported as iCalendar (.ics)');
  }, [combinedEvents, entriesByDate, placements, user.id, user.name, user.role]);

  useEffect(() => {
    onRegisterExport?.(exportCalendar);
  }, [onRegisterExport, exportCalendar]);

  // Filter checker
  function matchesFilter(type: string) {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'CONFIRMED') return type === 'DTR';
    return categoryFilter === type;
  }

  // WAI-ARIA Grid Keyboard Navigation
  function handleDayKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, date: Date) {
    let targetDate: Date | null = null;
    switch (e.key) {
      case 'ArrowRight':
        targetDate = addDays(date, 1);
        break;
      case 'ArrowLeft':
        targetDate = addDays(date, -1);
        break;
      case 'ArrowDown':
        targetDate = addDays(date, 7);
        break;
      case 'ArrowUp':
        targetDate = addDays(date, -7);
        break;
      case 'Home':
        targetDate = startOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'End':
        targetDate = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case 't':
      case 'T': {
        const todayDate = parseCalendarDate(today);
        if (todayDate) {
          targetDate = todayDate;
        }
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        chooseDay(date);
        return;
      default:
        return;
    }

    if (targetDate) {
      e.preventDefault();
      const nextKey = calendarDateValue(targetDate);
      chooseDay(targetDate);
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLButtonElement>(`button[data-date="${nextKey}"]`);
        el?.focus();
      });
    }
  }

  interface MultiDaySlot {
    event: Row;
    trackIndex: number;
    isSegmentStart: boolean;
    isSegmentEnd: boolean;
    isEventStart: boolean;
    isEventEnd: boolean;
    isContinuationFromPrevWeek: boolean;
    isContinuationToNextWeek: boolean;
    totalSpanDays: number;
    currentDayNum: number;
  }

  function getEventIcon(evType: string) {
    switch (evType) {
      case 'ACADEMIC':
        return <GraduationCap size={11} />;
      case 'HOLIDAY':
        return <Sparkles size={11} />;
      case 'DEADLINE':
        return <AlertCircle size={11} />;
      case 'APPOINTMENT':
        return <Video size={11} />;
      default:
        return <CalendarDays size={11} />;
    }
  }

  function getSpanBarColorClass(evType: string, isCancelled: boolean) {
    if (isCancelled) return styles.spanBarCancelled;
    switch (evType) {
      case 'ACADEMIC':
        return styles.spanBarAcademic;
      case 'HOLIDAY':
        return styles.spanBarHoliday;
      case 'DEADLINE':
        return styles.spanBarDeadline;
      case 'APPOINTMENT':
        return styles.spanBarAppointment;
      default:
        return styles.spanBarAcademic;
    }
  }

  function getSpanSegmentShapeClass(slot: MultiDaySlot) {
    const { isSegmentStart, isSegmentEnd, isContinuationFromPrevWeek, isContinuationToNextWeek } = slot;
    if (isSegmentStart && isSegmentEnd) {
      return styles.spanSegmentSingle;
    }
    if (isSegmentStart) {
      return isContinuationFromPrevWeek ? styles.spanSegmentStartContinuation : styles.spanSegmentStart;
    }
    if (isSegmentEnd) {
      return isContinuationToNextWeek ? styles.spanSegmentEndContinuation : styles.spanSegmentEnd;
    }
    return styles.spanSegmentMiddle;
  }

  function getWeekMultiDayTracks(
    week: Date[],
    events: Row[]
  ): Array<Array<MultiDaySlot | null>> {
    if (week.length < 7) return [];
    const weekStartKey = calendarDateValue(week[0]!);
    const weekEndKey = calendarDateValue(week[6]!);

    const multiDayEvents = events.filter((ev) => {
      const s = value(ev, 'startDate');
      const e = value(ev, 'endDate');
      return s && e && s < e && s <= weekEndKey && e >= weekStartKey;
    });

    if (multiDayEvents.length === 0) return [];

    multiDayEvents.sort((a, b) => {
      const aStart = value(a, 'startDate');
      const bStart = value(b, 'startDate');
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      const aDur = (parseCalendarDate(value(a, 'endDate'))?.getTime() ?? 0) - (parseCalendarDate(aStart)?.getTime() ?? 0);
      const bDur = (parseCalendarDate(value(b, 'endDate'))?.getTime() ?? 0) - (parseCalendarDate(bStart)?.getTime() ?? 0);
      if (bDur !== aDur) return bDur - aDur;
      return String(a.id).localeCompare(String(b.id));
    });

    const MAX_TRACKS = 2;
    const trackOccupancy: boolean[][] = [];
    const trackAssignments: Array<{ event: Row; trackIndex: number; startCol: number; endCol: number }> = [];

    for (const ev of multiDayEvents) {
      const s = value(ev, 'startDate');
      const e = value(ev, 'endDate');

      let startCol = 0;
      for (let c = 0; c < 7; c++) {
        if (calendarDateValue(week[c]!) >= s) {
          startCol = c;
          break;
        }
      }

      let endCol = 6;
      for (let c = 6; c >= 0; c--) {
        if (calendarDateValue(week[c]!) <= e) {
          endCol = c;
          break;
        }
      }

      if (startCol > endCol) continue;

      let assignedTrack = -1;
      for (let t = 0; t < MAX_TRACKS; t++) {
        if (!trackOccupancy[t]) trackOccupancy[t] = [false, false, false, false, false, false, false];
        let conflict = false;
        for (let c = startCol; c <= endCol; c++) {
          if (trackOccupancy[t]![c]) {
            conflict = true;
            break;
          }
        }
        if (!conflict) {
          assignedTrack = t;
          break;
        }
      }

      if (assignedTrack !== -1) {
        for (let c = startCol; c <= endCol; c++) {
          trackOccupancy[assignedTrack]![c] = true;
        }
        trackAssignments.push({ event: ev, trackIndex: assignedTrack, startCol, endCol });
      }
    }

    const activeTracksCount = trackAssignments.reduce((max, a) => Math.max(max, a.trackIndex + 1), 0);
    if (activeTracksCount === 0) return [];

    const result: Array<Array<MultiDaySlot | null>> = Array.from({ length: 7 }, () =>
      Array.from({ length: activeTracksCount }, () => null)
    );

    for (const assignment of trackAssignments) {
      const { event, trackIndex, startCol, endCol } = assignment;
      const s = value(event, 'startDate');
      const e = value(event, 'endDate');

      const sDate = parseCalendarDate(s);
      const eDate = parseCalendarDate(e);
      const totalSpanDays =
        sDate && eDate
          ? Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24)) + 1)
          : 1;

      for (let col = startCol; col <= endCol; col++) {
        const dayDate = week[col]!;
        const dayKey = calendarDateValue(dayDate);
        const isEventStart = dayKey === s;
        const isEventEnd = dayKey === e;
        const isSegmentStart = col === startCol;
        const isSegmentEnd = col === endCol;
        const isContinuationFromPrevWeek = !isEventStart && col === 0;
        const isContinuationToNextWeek = !isEventEnd && col === 6;

        const currentDayNum = sDate
          ? Math.max(1, Math.round((dayDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24)) + 1)
          : 1;

        result[col]![trackIndex] = {
          event,
          trackIndex,
          isSegmentStart,
          isSegmentEnd,
          isEventStart,
          isEventEnd,
          isContinuationFromPrevWeek,
          isContinuationToNextWeek,
          totalSpanDays,
          currentDayNum,
        };
      }
    }

    return result;
  }

  // Render day cell in month view
  function renderDay(
    date: Date,
    multiDaySlots: Array<MultiDaySlot | null> = []
  ) {
    const dateKey = calendarDateValue(date);
    const totals = totalsFor(dateKey);
    const dayEvents = eventsFor(dateKey);
    const missed = noHoursWeekday(date, dateKey, user.role, placements, user.id, totals, today);
    const confirmedOnly = totals.minutes > 0 && totals.pending === 0;

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isToday = dateKey === today;
    const isSelected = selectedDate === dateKey;
    const isOutsideMonth = mode === 'month' && !isSameMonth(date, cursor);

    // Dimming logic for interactive legend highlighting
    const isDtrDimmed =
      categoryFilter !== 'ALL' &&
      categoryFilter !== 'DTR' &&
      (categoryFilter !== 'CONFIRMED' || !confirmedOnly);

    const isMissedDimmed =
      categoryFilter !== 'ALL' &&
      categoryFilter !== 'MISSING' &&
      categoryFilter !== 'DTR';

    // Separate multi-day events from single-day events
    const singleDayEvents = dayEvents.filter(
      (ev) => value(ev, 'startDate') === value(ev, 'endDate')
    );

    // Prioritize selected category for single-day items
    const sortedSingleEvents =
      categoryFilter === 'ALL'
        ? singleDayEvents
        : [...singleDayEvents].sort((a, b) => {
            const aMatch = value(a, 'eventType') === categoryFilter ? 1 : 0;
            const bMatch = value(b, 'eventType') === categoryFilter ? 1 : 0;
            return bMatch - aMatch;
          });

    const activeMultiDayCount = multiDaySlots.filter(Boolean).length;
    const visibleSingleLimit = activeMultiDayCount > 0 ? 1 : 2;
    const visibleSingleEvents = sortedSingleEvents.slice(0, visibleSingleLimit);
    const moreCount = dayEvents.length - activeMultiDayCount - visibleSingleEvents.length;

    // Accessible description for screen readers
    const multiDayAccessible = multiDaySlots
      .filter((s): s is MultiDaySlot => s !== null)
      .map((slot) => {
        const ev = slot.event;
        const title = value(ev, 'title');
        if (slot.isSegmentStart && slot.isEventStart) {
          return `${title} starts today (${slot.totalSpanDays}-day event)`;
        } else if (slot.isSegmentEnd && slot.isEventEnd) {
          return `${title} ends today`;
        } else {
          return `${title} (Day ${slot.currentDayNum} of ${slot.totalSpanDays})`;
        }
      });

    const accessible = [
      dateLabel(dateKey),
      ...multiDayAccessible,
      totals.minutes
        ? `${hours(totals.minutes)} rendered, ${hours(totals.confirmed)} confirmed, ${hours(totals.pending)} pending`
        : missed
        ? 'No DTR hours recorded on this placement weekday'
        : '',
      `${dayEvents.length} scheduled ${dayEvents.length === 1 ? 'event' : 'events'}`,
    ]
      .filter(Boolean)
      .join('. ');

    return (
      <button
        type="button"
        key={dateKey}
        data-date={dateKey}
        role="gridcell"
        tabIndex={isSelected ? 0 : -1}
        aria-label={accessible}
        aria-selected={isSelected}
        aria-current={isToday ? 'date' : undefined}
        onClick={() => chooseDay(date)}
        onKeyDown={(e) => handleDayKeyDown(e, date)}
        className={`${styles.dayCell} ${isOutsideMonth ? styles.outsideMonth : ''} ${isWeekend ? styles.weekendCell : ''} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
      >
        <div className={styles.dayHeader}>
          <span className={styles.dayNumber}>
            <span>{format(date, 'd')}</span>
          </span>
          {isToday && <span className={styles.todayTag}>Today</span>}
        </div>

        {/* Multi-Day Continuous Span Ribbon Track */}
        {multiDaySlots.length > 0 && (
          <span className={styles.multiDayTrack}>
            {multiDaySlots.map((slot, sIdx) => {
              if (!slot) {
                return <span key={`spacer-${sIdx}`} className={styles.multiDaySpacer} aria-hidden="true" />;
              }
              const {
                event,
                isSegmentStart,
                isSegmentEnd,
                isContinuationFromPrevWeek,
                isContinuationToNextWeek,
                totalSpanDays,
              } = slot;
              const evType = value(event, 'eventType');
              const isCancelled = value(event, 'status') === 'CANCELLED';
              const isEvDimmed = categoryFilter !== 'ALL' && categoryFilter !== evType;

              return (
                <span
                  key={`span-${event.id}-${sIdx}`}
                  className={`${styles.spanBar} ${getSpanBarColorClass(evType, isCancelled)} ${getSpanSegmentShapeClass(slot)} ${isEvDimmed ? styles.itemDimmed : ''}`}
                  title={`${isCancelled ? '[CANCELLED] ' : ''}${value(event, 'title')} (${eventDescription(event)} · ${totalSpanDays} days)`}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingSchedule(event);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      setViewingSchedule(event);
                    }
                  }}
                >
                  {isSegmentStart ? (
                    <>
                      {isContinuationFromPrevWeek ? (
                        <span className={styles.spanContinuationTag} title="Continued from previous week">
                          ←
                        </span>
                      ) : (
                        <span className={styles.spanIconWrap}>
                          {isCancelled ? <X size={10} /> : getEventIcon(evType)}
                        </span>
                      )}
                      <span className={styles.spanBarTitle}>{value(event, 'title')}</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.spanMiddleTrackContent}>
                        {value(event, 'title')}
                      </span>
                      {isSegmentEnd && !isContinuationToNextWeek && (
                        <span className={styles.spanEndBadge}>Ends</span>
                      )}
                      {isContinuationToNextWeek && (
                        <span className={styles.spanContinuationTag} title="Continues next week">
                          →
                        </span>
                      )}
                    </>
                  )}
                </span>
              );
            })}
          </span>
        )}

        <div className={styles.dayItems}>
          {totals.minutes > 0 && (
            <span
              className={`${styles.hoursPill} ${confirmedOnly ? styles.hoursConfirmed : styles.hoursPending} ${isDtrDimmed ? styles.itemDimmed : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                chooseDay(date);
              }}
              title={`${hours(totals.minutes)} rendered · ${confirmedOnly ? 'Industry Partner verified' : `${hours(totals.confirmed)} confirmed, ${hours(totals.pending)} pending`}`}
            >
              <Clock3 size={11} />
              <span>{hours(totals.minutes)}</span>
              {confirmedOnly ? (
                <span className={styles.statusCheck}>✓</span>
              ) : (
                <span className={styles.statusCheck}>• pending</span>
              )}
            </span>
          )}

          {missed && (
            <span
              className={`${styles.missingPill} ${isMissedDimmed ? styles.itemDimmed : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                chooseDay(date);
              }}
              title="No DTR hours recorded on this placement weekday."
            >
              <AlertTriangle size={11} />
              <span>No DTR</span>
            </span>
          )}

          {visibleSingleEvents.map((event) => {
            const evType = value(event, 'eventType');
            const isEvDimmed = categoryFilter !== 'ALL' && categoryFilter !== evType;
            const isCancelled = value(event, 'status') === 'CANCELLED';
            return (
              <span
                key={event.id}
                className={`${styles.eventPill} ${isCancelled ? styles.eventCancelled : (eventClassByType[evType] ?? styles.eventAcademic)} ${isCancelled ? styles.eventPillCancelled : ''} ${isEvDimmed ? styles.itemDimmed : ''}`}
                title={`${isCancelled ? '[CANCELLED] ' : ''}${value(event, 'title')} (${eventDescription(event)})`}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingSchedule(event);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    setViewingSchedule(event);
                  }
                }}
              >
                {isCancelled ? (
                  <X size={11} />
                ) : (
                  <>
                    {evType === 'ACADEMIC' && <GraduationCap size={11} />}
                    {evType === 'HOLIDAY' && <Sparkles size={11} />}
                    {evType === 'DEADLINE' && <AlertCircle size={11} />}
                    {evType === 'APPOINTMENT' && <Video size={11} />}
                  </>
                )}
                <span style={isCancelled ? { textDecoration: 'line-through' } : undefined}>
                  {value(event, 'title')}
                </span>
              </span>
            );
          })}

          {moreCount > 0 && (
            <span className={styles.moreEvents}>+{moreCount} more</span>
          )}
        </div>
      </button>
    );
  }

  // Render week view
  function renderWeek() {
    return (
      <div className={styles.weekGrid}>
        {weekDays.map((date) => {
          const dateKey = calendarDateValue(date);
          const totals = totalsFor(dateKey);
          const dayEvents = eventsFor(dateKey);
          const missed = noHoursWeekday(date, dateKey, user.role, placements, user.id, totals, today);
          const confirmedOnly = totals.minutes > 0 && totals.pending === 0;
          const isToday = dateKey === today;
          const isSelected = selectedDate === dateKey;

          const isDtrDimmed =
            categoryFilter !== 'ALL' &&
            categoryFilter !== 'DTR' &&
            (categoryFilter !== 'CONFIRMED' || !confirmedOnly);

          const isMissedDimmed =
            categoryFilter !== 'ALL' &&
            categoryFilter !== 'MISSING' &&
            categoryFilter !== 'DTR';

          const sortedWeekEvents =
            categoryFilter === 'ALL'
              ? dayEvents
              : [...dayEvents].sort((a, b) => {
                  const aMatch = value(a, 'eventType') === categoryFilter ? 1 : 0;
                  const bMatch = value(b, 'eventType') === categoryFilter ? 1 : 0;
                  return bMatch - aMatch;
                });

          return (
            <div key={dateKey} className={`${styles.weekColumn} ${isSelected ? styles.selected : ''}`}>
              <button
                type="button"
                className={`${styles.weekColHeader} ${isToday ? styles.weekColToday : ''}`}
                onClick={() => chooseDay(date)}
                aria-label={`Select ${dateLabel(dateKey)}`}
              >
                <span className={styles.weekColDayName}>{format(date, 'EEE')}</span>
                <span className={styles.weekColDateNumber}>{format(date, 'd')}</span>
              </button>

              <div className={styles.weekColContent}>
                {totals.minutes > 0 && (
                  <div className={`${styles.weekDtrCard} ${isDtrDimmed ? styles.itemDimmed : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => chooseDay(date)}
                    role="button"
                    tabIndex={0}
                    title="Select this day">
                    <div className={styles.weekDtrCardTop}>
                      <span className={styles.weekDtrHours}>{hours(totals.minutes)}</span>
                      <span className={`chip ${totals.pending === 0 ? 'green' : 'orange'}`}>
                        {totals.pending === 0 ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                    <small className="muted">{totals.entries.length} shift logs</small>
                  </div>
                )}

                {missed && (
                  <div className={`${styles.missingPill} ${isMissedDimmed ? styles.itemDimmed : ''}`}
                    style={{ padding: '6px 8px', cursor: 'pointer' }}
                    onClick={() => chooseDay(date)}
                    role="button"
                    tabIndex={0}
                    title="No hours logged · Select this placement day">
                    <AlertTriangle size={12} />
                    <span>No hours logged</span>
                  </div>
                )}

                {sortedWeekEvents.map((event) => {
                  const evType = value(event, 'eventType');
                  const isEvDimmed = categoryFilter !== 'ALL' && categoryFilter !== evType;
                  const isCancelled = value(event, 'status') === 'CANCELLED';
                  return (
                    <article
                      key={event.id}
                      className={`${styles.weekEventCard} ${isCancelled ? styles.weekEventCancelled : ''} ${isEvDimmed ? styles.itemDimmed : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setViewingSchedule(event)}
                      role="button"
                      tabIndex={0}
                      title="Click to view schedule guidelines"
                    >
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`chip ${isCancelled ? 'red' : (eventColors[evType] ?? 'blue')}`} style={{ fontSize: 9.5 }}>
                          {isCancelled ? 'Cancelled' : (eventLabels[evType] ?? 'Event')}
                        </span>
                        {value(event, 'startDate') < value(event, 'endDate') && (
                          <span className="chip" style={{ fontSize: 9, padding: '1px 5px', background: '#e0edff', color: 'var(--rtu-blue)' }}>
                            <CalendarRange size={10} /> Multi-day span
                          </span>
                        )}
                      </div>
                      <strong
                        className={styles.weekEventTitle}
                        style={isCancelled ? { textDecoration: 'line-through', color: 'var(--muted-foreground)' } : undefined}
                      >
                        {value(event, 'title')}
                      </strong>
                      <span className={styles.weekEventTime}>
                        <Clock3 size={11} />
                        {eventDescription(event)}
                      </span>
                    </article>
                  );
                })}

                {totals.minutes === 0 && !missed && sortedWeekEvents.length === 0 && (
                  <div style={{ padding: '20px 4px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 11 }}>
                    No items
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render individual event card
  function renderEvent(event: Row) {
    const eventType = value(event, 'eventType');
    const meetingUrl = value(event, 'meetingUrl');
    const safeMeetingUrl = meetingUrl.startsWith('https://') ? meetingUrl : '';
    const isCancelled = value(event, 'status') === 'CANCELLED';
    const isMilestone = Number(event.isMilestone) === 1;
    const canManageThis =
      !isMilestone &&
      (user.role === 'SUPER_ADMIN' || (user.role === 'COORDINATOR' && eventType === 'DEADLINE'));

    return (
      <article className={`${styles.eventCard} ${isCancelled ? styles.eventCardCancelled : ''}`} key={event.id}>
        <div className={styles.eventCardTop}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`chip ${isCancelled ? 'red' : (eventColors[eventType] ?? 'blue')}`}>
              {isCancelled ? (
                <>
                  <X size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Cancelled
                </>
              ) : (
                <>
                  {eventType === 'ACADEMIC' && <GraduationCap size={12} style={{ display: 'inline', marginRight: 4 }} />}
                  {eventType === 'HOLIDAY' && <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />}
                  {eventType === 'DEADLINE' && <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />}
                  {eventType === 'APPOINTMENT' && <Video size={12} style={{ display: 'inline', marginRight: 4 }} />}
                  {eventLabels[eventType] ?? 'Calendar event'}
                </>
              )}
            </span>
            {isMilestone && (
              <span className="chip gold" style={{ fontSize: 10, padding: '1px 6px' }}>
                Internship milestone
              </span>
            )}
          </div>
          <span className={styles.eventTime}>
            <Clock3 size={12} />
            {eventDescription(event)}
          </span>
        </div>

        <h4 style={isCancelled ? { textDecoration: 'line-through', color: 'var(--muted-foreground)' } : undefined}>
          {value(event, 'title')}
        </h4>

        {isCancelled && (
          <div className={styles.cancelledAlertNotice}>
            <AlertCircle size={13} style={{ flexShrink: 0 }} />
            <span>This event has been officially cancelled by the practicum coordinator / COE office.</span>
          </div>
        )}

        {value(event, 'description') && <p>{value(event, 'description')}</p>}

        <div className={styles.eventMeta}>
          {value(event, 'location') && (
            <span>
              <MapPin size={13} />
              {value(event, 'location')}
            </span>
          )}
          {safeMeetingUrl && (
            <a href={safeMeetingUrl} target="_blank" rel="noreferrer" title="Open virtual meeting link">
              <Video size={13} />
              <span>Join meeting</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div className={styles.eventFooterRow}>
          <small className={styles.organizer}>
            {value(event, 'createdByName')
              ? `Organized by ${value(event, 'createdByName')}`
              : isMilestone
              ? 'PractiSync Dynamic Milestone'
              : 'Scheduled by Rizal Technological University COE Office'}
          </small>

          {canManageThis && (
            <div className={styles.eventActionsGroup}>
              {onEditEvent && (
                <button
                  type="button"
                  className={styles.eventActionBtn}
                  onClick={() => onEditEvent(event)}
                  title="Edit event details"
                >
                  Edit
                </button>
              )}
              {!isCancelled && onCancelEvent && (
                <button
                  type="button"
                  className={styles.eventActionBtn}
                  style={{ color: '#c25e1a' }}
                  onClick={() => onCancelEvent(String(event.id))}
                  title="Mark event as cancelled"
                >
                  Cancel event
                </button>
              )}
              {onDeleteEvent && (
                <button
                  type="button"
                  className={styles.eventActionBtn}
                  style={{ color: '#b91c1c' }}
                  onClick={() => onDeleteEvent(String(event.id))}
                  title="Delete event permanently"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  // Render agenda view
  function renderAgenda() {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const dates = eachDayOfInterval({ start, end }).filter((date) => {
      const key = calendarDateValue(date);
      const evs = eventsFor(key).filter((ev) => matchesFilter(value(ev, 'eventType')));
      const dtrMatches = totalsFor(key).minutes > 0 && matchesFilter('DTR');
      return evs.length > 0 || dtrMatches;
    });

    if (!dates.length) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconCircle}>
            <CalendarDays size={24} />
          </div>
          <strong>No calendar items found this month</strong>
          <p>
            {categoryFilter !== 'ALL'
              ? `There are no ${categoryFilter.toLowerCase()} items for ${format(cursor, 'MMMM yyyy')}. Try switching filters or selecting another month.`
              : `There are no scheduled events or DTR entries for ${format(cursor, 'MMMM yyyy')}.`}
          </p>
          {categoryFilter !== 'ALL' && (
            <button type="button" className="secondary" onClick={() => setCategoryFilter('ALL')}>
              Show all categories
            </button>
          )}
        </div>
      );
    }

    return (
      <div className={styles.agendaContainer}>
        {dates.map((date) => {
          const key = calendarDateValue(date);
          const dayEvents = eventsFor(key).filter((ev) => matchesFilter(value(ev, 'eventType')));
          const totals = totalsFor(key);
          const showDtr = totals.minutes > 0 && matchesFilter('DTR');
          const isToday = key === today;

          return (
            <article key={key} className={styles.agendaItem}>
              <button
                type="button"
                className={styles.agendaDateBox}
                onClick={() => chooseDay(date)}
                aria-pressed={selectedDate === key}
              >
                <span className={styles.agendaDateDay}>{format(date, 'EEE, MMM d')}</span>
                <span className={styles.agendaDateSub}>{format(date, 'yyyy')}</span>
                {isToday && <span className={styles.agendaBadgeToday}>Today</span>}
              </button>

              <div className={styles.agendaContent}>
                {showDtr && (
                  <div className={styles.agendaDtrBanner}
                    style={{ cursor: 'pointer' }}
                    onClick={() => chooseDay(date)}
                    role="button"
                    tabIndex={0}
                    title="Select this day">
                    <div className={styles.agendaDtrLeft}>
                      <Clock3 size={15} color="var(--rtu-blue)" />
                      <strong>{hours(totals.minutes)} rendered</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`chip ${totals.pending === 0 ? 'green' : 'orange'}`}>
                        {totals.pending === 0 ? 'Industry Partner verified' : `${hours(totals.pending)} pending verification`}
                      </span>
                      {totals.confirmed > 0 && totals.pending > 0 && (
                        <span className="chip green">{hours(totals.confirmed)} confirmed</span>
                      )}
                    </div>
                  </div>
                )}
                {dayEvents.map(renderEvent)}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  const toggleFilter = (cat: EventFilter) => {
    setCategoryFilter((cur) => (cur === cat ? 'ALL' : cat));
  };

  // Top 3-Card Deck (placed horizontally from left to right above the calendar for Student role)
  const TopCardsContainer = (
    <div className={styles.topCardsGrid} role="region" aria-label="Calendar overview and legend">
      {/* 1. Schedule Legend Card Container */}
      <div className={styles.legendCard}>
        <div className={styles.legendCardHeader}>
          <h3>
            <BookOpen size={16} color="var(--rtu-blue)" />
            Schedule Legend
          </h3>
          {categoryFilter !== 'ALL' && (
            <button
              type="button"
              className={styles.legendResetBtn}
              onClick={() => setCategoryFilter('ALL')}
              title="Clear filter and show all categories"
            >
              Reset ✕
            </button>
          )}
        </div>

        <div className={styles.legendList}>
          <button
            type="button"
            className={`${styles.legendItem} ${categoryFilter === 'DTR' ? styles.legendItemActive : ''}`}
            onClick={() => toggleFilter('DTR')}
            aria-pressed={categoryFilter === 'DTR'}
          >
            <span className={`${styles.legendDotWrap} ${styles.legendDotDtr}`}>
              <Clock3 size={12} />
            </span>
            <div className={styles.legendItemText}>
              <strong>DTR Hours</strong>
              <span>Logged daily attendance</span>
            </div>
            {categoryFilter === 'DTR' && <span className={styles.legendActiveDot} />}
          </button>

          <button
            type="button"
            className={`${styles.legendItem} ${categoryFilter === 'CONFIRMED' ? styles.legendItemActive : ''}`}
            onClick={() => toggleFilter('CONFIRMED')}
            aria-pressed={categoryFilter === 'CONFIRMED'}
          >
            <span className={`${styles.legendDotWrap} ${styles.legendDotConfirmed}`}>
              <Check size={12} />
            </span>
            <div className={styles.legendItemText}>
              <strong>Confirmed DTR</strong>
              <span>Verified by coordinator</span>
            </div>
            {categoryFilter === 'CONFIRMED' && <span className={styles.legendActiveDot} />}
          </button>

          <button
            type="button"
            className={`${styles.legendItem} ${categoryFilter === 'DEADLINE' ? styles.legendItemActive : ''}`}
            onClick={() => toggleFilter('DEADLINE')}
            aria-pressed={categoryFilter === 'DEADLINE'}
          >
            <span className={`${styles.legendDotWrap} ${styles.legendDotDeadline}`}>
              <AlertCircle size={12} />
            </span>
            <div className={styles.legendItemText}>
              <strong>Passing of documents</strong>
              <span>Requirements &amp; form dues</span>
            </div>
            {categoryFilter === 'DEADLINE' && <span className={styles.legendActiveDot} />}
          </button>

          <button
            type="button"
            className={`${styles.legendItem} ${categoryFilter === 'APPOINTMENT' ? styles.legendItemActive : ''}`}
            onClick={() => toggleFilter('APPOINTMENT')}
            aria-pressed={categoryFilter === 'APPOINTMENT'}
          >
            <span className={`${styles.legendDotWrap} ${styles.legendDotAppointment}`}>
              <Video size={12} />
            </span>
            <div className={styles.legendItemText}>
              <strong>COE Appointment</strong>
              <span>Advising &amp; consult sessions</span>
            </div>
            {categoryFilter === 'APPOINTMENT' && <span className={styles.legendActiveDot} />}
          </button>

          <button
            type="button"
            className={`${styles.legendItem} ${categoryFilter === 'ACADEMIC' ? styles.legendItemActive : ''}`}
            onClick={() => toggleFilter('ACADEMIC')}
            aria-pressed={categoryFilter === 'ACADEMIC'}
          >
            <span className={`${styles.legendDotWrap} ${styles.legendDotAcademic}`}>
              <GraduationCap size={12} />
            </span>
            <div className={styles.legendItemText}>
              <strong>Academic Event</strong>
              <span>University milestones &amp; terms</span>
            </div>
            {categoryFilter === 'ACADEMIC' && <span className={styles.legendActiveDot} />}
          </button>

          <button
            type="button"
            className={`${styles.legendItem} ${categoryFilter === 'HOLIDAY' ? styles.legendItemActive : ''}`}
            onClick={() => toggleFilter('HOLIDAY')}
            aria-pressed={categoryFilter === 'HOLIDAY'}
          >
            <span className={`${styles.legendDotWrap} ${styles.legendDotHoliday}`}>
              <Sparkles size={12} />
            </span>
            <div className={styles.legendItemText}>
              <strong>University Holiday</strong>
              <span>Campus &amp; offices closed</span>
            </div>
            {categoryFilter === 'HOLIDAY' && <span className={styles.legendActiveDot} />}
          </button>

          {user.role === 'STUDENT' && (
            <button
              type="button"
              className={`${styles.legendItem} ${categoryFilter === 'MISSING' ? styles.legendItemActive : ''}`}
              onClick={() => toggleFilter('MISSING')}
              aria-pressed={categoryFilter === 'MISSING'}
            >
              <span className={`${styles.legendDotWrap} ${styles.legendDotMissing}`}>
                <AlertTriangle size={12} />
              </span>
              <div className={styles.legendItemText}>
                <strong>Missing Log Alert</strong>
                <span>Active placement weekday with no log</span>
              </div>
              {categoryFilter === 'MISSING' && <span className={styles.legendActiveDot} />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Month Summary & Pacing Card */}
      <div className={styles.monthStatsCard}>
        {user.role === 'STUDENT' && studentOverallStats && (
          <div className={styles.practicumTargetSection}>
            <div className={styles.practicumTargetHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={15} color="var(--rtu-blue)" />
                <strong>Practicum Hours Goal</strong>
              </div>
              <span className="chip green" style={{ fontSize: 10, padding: '2px 6px' }}>
                {studentOverallStats.reportedPercent}% completed
              </span>
            </div>

            <div className={styles.practicumHoursRow}>
              <span className={styles.practicumHoursMain}>
                <strong>{studentOverallStats.totalHours}</strong>
                <span> / {studentOverallStats.targetHours ? `${studentOverallStats.targetHours} hrs` : 'Required'}</span>
              </span>
              <span className={styles.practicumShiftsCount}>
                {studentOverallStats.totalShifts} {studentOverallStats.totalShifts === 1 ? 'shift' : 'shifts'}
              </span>
            </div>

            <div
              className={styles.dualProgressTrack}
              title={`Confirmed: ${studentOverallStats.confirmedHours} hrs · Pending: ${studentOverallStats.pendingHours} hrs (Goal: ${studentOverallStats.targetHours ?? '—'} hrs)`}
            >
              <div
                className={styles.dualProgressConfirmed}
                style={{ width: `${studentOverallStats.confirmedPercent}%` }}
              />
              <div
                className={styles.dualProgressPending}
                style={{
                  width: `${Math.max(0, studentOverallStats.reportedPercent - studentOverallStats.confirmedPercent)}%`,
                }}
              />
            </div>

            <div className={styles.practicumTargetSub}>
              <span style={{ color: '#166b42', fontWeight: 600 }}>
                {studentOverallStats.confirmedHours}h confirmed
              </span>
              <span className="muted">·</span>
              <span style={{ color: '#c2410c', fontWeight: 600 }}>
                {studentOverallStats.pendingHours}h pending
              </span>
            </div>
          </div>
        )}

        <div className={user.role === 'STUDENT' && studentOverallStats ? styles.monthPacingDivider : ''}>
          <div className={styles.monthPacingHeader}>
            <h4 className={styles.monthPacingTitle}>
              <Clock3 size={14} color="var(--rtu-blue)" />
              {format(cursor, 'MMMM')} Shift Pacing
            </h4>
            <span className="chip" style={{ fontSize: 10, padding: '1px 5px' }}>
              {currentMonthStats.activeDaysCount} {currentMonthStats.activeDaysCount === 1 ? 'shift' : 'shifts'}
            </span>
          </div>

          <div className={styles.monthStatsGrid}>
            <div className={styles.monthStatItem}>
              <span className={styles.monthStatLabel}>Rendered this month</span>
              <strong className={styles.monthStatValue}>{currentMonthStats.totalHours} hrs</strong>
            </div>

            <div className={styles.monthStatItem}>
              <span className={styles.monthStatLabel}>Verified by Coord.</span>
              <strong className={styles.monthStatValue} style={{ color: '#166b42' }}>
                {currentMonthStats.confirmedHours} hrs
              </strong>
              <span className="chip green" style={{ fontSize: 9.5, padding: '1px 5px', marginTop: 2 }}>
                {currentMonthStats.confirmationRate}% verified
              </span>
            </div>
          </div>
        </div>

        {user.role === 'STUDENT' && currentMonthStats.missedWeekdaysCount > 0 && (
          <div className={styles.monthMissedAlert}>
            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
            <span>
              {currentMonthStats.missedWeekdaysCount} missed placement{' '}
              {currentMonthStats.missedWeekdaysCount === 1 ? 'day' : 'days'}
            </span>
          </div>
        )}
      </div>

      {/* 3. Upcoming Milestones & Internship Documents Card */}
      <div className={styles.upcomingCard}>
        <div className={styles.legendCardHeader}>
          {user.role === 'STUDENT' && studentClearanceDocs.length > 0 ? (
            <div className={styles.leftRailTabSwitcher} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={leftRailTab === 'MILESTONES'}
                className={`${styles.leftRailTabBtn} ${leftRailTab === 'MILESTONES' ? styles.leftRailTabBtnActive : ''}`}
                onClick={() => setLeftRailTab('MILESTONES')}
              >
                <CalendarRange size={13} />
                <span>Milestones ({upcomingEvents.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leftRailTab === 'CLEARANCE'}
                className={`${styles.leftRailTabBtn} ${leftRailTab === 'CLEARANCE' ? styles.leftRailTabBtnActive : ''}`}
                onClick={() => setLeftRailTab('CLEARANCE')}
              >
                <FileText size={13} />
                <span>Internship Documents ({studentClearanceDocs.length})</span>
              </button>
            </div>
          ) : (
            <>
              <h3>
                <CalendarRange size={15} color="var(--rtu-blue)" />
                Upcoming Milestones
              </h3>
              <span className="chip blue" style={{ fontSize: 10.5, padding: '2px 6px' }}>
                {upcomingEvents.length}
              </span>
            </>
          )}
        </div>

        {leftRailTab === 'MILESTONES' || user.role !== 'STUDENT' ? (
          upcomingEvents.length ? (
            <div className={styles.upcomingList}>
              {upcomingEvents.map((ev) => {
                const evType = value(ev, 'eventType');
                const startDate = parseCalendarDate(value(ev, 'startDate')) ?? new Date();
                const isSelected = value(ev, 'startDate') === selectedKey;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    className={`${styles.upcomingItem} ${isSelected ? styles.upcomingItemActive : ''}`}
                    onClick={() => {
                      chooseDay(startDate);
                      setViewingSchedule(ev);
                    }}
                    title={`View guidelines for ${value(ev, 'title')} on ${dateLabel(value(ev, 'startDate'))}`}
                  >
                    <div className={styles.upcomingDateBadge}>
                      <span className={styles.upcomingDateMonth}>{format(startDate, 'MMM')}</span>
                      <span className={styles.upcomingDateDay}>{format(startDate, 'd')}</span>
                    </div>
                    <div className={styles.upcomingInfo}>
                      <strong className={styles.upcomingTitle}>{value(ev, 'title')}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span className={`chip ${eventColors[evType] ?? 'blue'}`} style={{ fontSize: 9.5, padding: '1px 5px' }}>
                          {eventLabels[evType] ?? evType}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className={styles.upcomingEmpty}>No upcoming milestones or deadlines recorded.</p>
          )
        ) : (
          <div className={styles.clearanceDocList}>
            {studentClearanceDocs.map((doc) => {
              const docStatus = value(doc, 'status') || 'PENDING';
              const isApproved = docStatus === 'APPROVED';
              const isPending = docStatus === 'PENDING';
              const isRejected = docStatus === 'REJECTED';
              return (
                <div key={doc.id} className={styles.clearanceDocItem}>
                  <div className={styles.clearanceDocHeader}>
                    <strong className={styles.clearanceDocName}>{value(doc, 'name')}</strong>
                    <span
                      className={`chip ${isApproved ? 'green' : isRejected ? 'red' : isPending ? 'orange' : ''}`}
                      style={{ fontSize: 9.5, padding: '1px 5px' }}
                    >
                      {isApproved ? 'Cleared ✓' : isRejected ? 'Needs revision' : 'Pending review'}
                    </span>
                  </div>
                  {value(doc, 'filename') && (
                    <span className={styles.clearanceDocFile}>
                      {value(doc, 'filename')} {doc.version ? `· v${doc.version}` : ''}
                    </span>
                  )}
                  {onNavigate && (
                    <button
                      type="button"
                      className={styles.clearanceDocLink}
                      onClick={() => onNavigate('documents')}
                    >
                      <span>{isApproved ? 'View approved submission' : 'Submit / update in Internship Documents'}</span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>
              );
            })}
            {onNavigate && (
              <button
                type="button"
                className={styles.clearanceAllBtn}
                onClick={() => onNavigate('documents')}
              >
                <span>Open Internship Documents</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Top 3-Card Deck for Super Admin (COE Office staff managing internships and finalized clearance)
  const coeDeadlines = useMemo(() => {
    return combinedEvents
      .filter((ev) => value(ev, 'eventType') === 'DEADLINE' && value(ev, 'status') !== 'CANCELLED')
      .sort((a, b) => value(a, 'endDate').localeCompare(value(b, 'endDate')));
  }, [combinedEvents]);

  const coeAppointments = useMemo(() => {
    return combinedEvents
      .filter((ev) => value(ev, 'eventType') === 'APPOINTMENT' && value(ev, 'status') !== 'CANCELLED')
      .sort((a, b) => value(a, 'startDate').localeCompare(value(b, 'startDate')));
  }, [combinedEvents]);

  const coeAcademicEvents = useMemo(() => {
    return combinedEvents
      .filter(
        (ev) =>
          (value(ev, 'eventType') === 'ACADEMIC' || value(ev, 'eventType') === 'HOLIDAY') &&
          value(ev, 'status') !== 'CANCELLED'
      )
      .sort((a, b) => value(a, 'startDate').localeCompare(value(b, 'startDate')));
  }, [combinedEvents]);

  const CoeAdminTopCardsDeck = (
    <div className={styles.topCardsGrid} role="region" aria-label="COE Office internship schedule overview">
      {/* 1. Internship Document Submission Cutoffs */}
      <div className={styles.legendCard}>
        <div className={styles.legendCardHeader}>
          <h3>
            <FileCheck size={16} color="var(--rtu-blue)" />
            Internship Documents
          </h3>
          <span className="chip orange" style={{ fontSize: 11, padding: '2px 7px' }}>
            {coeDeadlines.length} active
          </span>
        </div>
        <div className={styles.upcomingList} style={{ maxHeight: 170 }}>
          {coeDeadlines.length ? (
            coeDeadlines.slice(0, 5).map((ev) => {
              const endDate = parseCalendarDate(value(ev, 'endDate')) ?? new Date();
              const isSelected = selectedDate === value(ev, 'endDate');
              const cid = value(ev, 'classId');
              const matchedClass = classes?.find((c) => c.id === cid);
              return (
                <button
                  type="button"
                  key={ev.id}
                  onClick={() => {
                    const d = parseCalendarDate(value(ev, 'endDate'));
                    if (d) chooseDay(d);
                    setViewingSchedule(ev);
                  }}
                  className={`${styles.upcomingItem} ${isSelected ? styles.upcomingItemActive : ''}`}
                >
                  <div className={styles.upcomingDateBadge}>
                    <span className={styles.upcomingDateMonth}>{format(endDate, 'MMM')}</span>
                    <span className={styles.upcomingDateDay}>{format(endDate, 'd')}</span>
                  </div>
                  <div className={styles.upcomingInfo}>
                    <strong className={styles.upcomingTitle}>{value(ev, 'title')}</strong>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span className="chip" style={{ fontSize: 9.5, padding: '1px 5px' }}>
                        {matchedClass ? `Section ${value(matchedClass, 'section')}` : 'College-wide'}
                      </span>
                      {getUrgencyBadge(ev, today)}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <p className={styles.upcomingEmpty}>No pending document deadlines scheduled.</p>
          )}
        </div>
      </div>

      {/* 2. COE Office Consultations & Industry Alignments */}
      <div className={styles.legendCard}>
        <div className={styles.legendCardHeader}>
          <h3>
            <CalendarCheck size={16} color="#166b42" />
            COE Office Consultations
          </h3>
          <span className="chip green" style={{ fontSize: 11, padding: '2px 7px' }}>
            {coeAppointments.length} sessions
          </span>
        </div>
        <div className={styles.upcomingList} style={{ maxHeight: 170 }}>
          {coeAppointments.length ? (
            coeAppointments.slice(0, 5).map((ev) => {
              const startDate = parseCalendarDate(value(ev, 'startDate')) ?? new Date();
              const isSelected = selectedDate === value(ev, 'startDate');
              return (
                <button
                  type="button"
                  key={ev.id}
                  onClick={() => {
                    const d = parseCalendarDate(value(ev, 'startDate'));
                    if (d) chooseDay(d);
                    setViewingSchedule(ev);
                  }}
                  className={`${styles.upcomingItem} ${isSelected ? styles.upcomingItemActive : ''}`}
                >
                  <div className={styles.upcomingDateBadge} style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166b42' }}>
                    <span className={styles.upcomingDateMonth}>{format(startDate, 'MMM')}</span>
                    <span className={styles.upcomingDateDay}>{format(startDate, 'd')}</span>
                  </div>
                  <div className={styles.upcomingInfo}>
                    <strong className={styles.upcomingTitle}>{value(ev, 'title')}</strong>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      {value(ev, 'location') && (
                        <span className="small muted" style={{ fontSize: 11 }}>
                          <MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />
                          {value(ev, 'location')}
                        </span>
                      )}
                      {value(ev, 'meetingUrl') && (
                        <span className="chip blue" style={{ fontSize: 9.5, padding: '1px 5px' }}>
                          <Video size={10} style={{ display: 'inline', marginRight: 3 }} />
                          Virtual
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <p className={styles.upcomingEmpty}>No scheduled partner meetings or consultations.</p>
          )}
        </div>
      </div>

      {/* 3. Academic Calendar & Term Milestones */}
      <div className={styles.legendCard}>
        <div className={styles.legendCardHeader}>
          <h3>
            <GraduationCap size={16} color="var(--rtu-gold-deep)" />
            College Term Milestones
          </h3>
          <span className="chip blue" style={{ fontSize: 11, padding: '2px 7px' }}>
            A.Y. 2026–2027
          </span>
        </div>
        <div className={styles.upcomingList} style={{ maxHeight: 170 }}>
          {coeAcademicEvents.length ? (
            coeAcademicEvents.slice(0, 5).map((ev) => {
              const startDate = parseCalendarDate(value(ev, 'startDate')) ?? new Date();
              const isSelected = selectedDate === value(ev, 'startDate');
              const isHoliday = value(ev, 'eventType') === 'HOLIDAY';
              return (
                <button
                  type="button"
                  key={ev.id}
                  onClick={() => {
                    const d = parseCalendarDate(value(ev, 'startDate'));
                    if (d) chooseDay(d);
                    setViewingSchedule(ev);
                  }}
                  className={`${styles.upcomingItem} ${isSelected ? styles.upcomingItemActive : ''}`}
                >
                  <div className={styles.upcomingDateBadge} style={isHoliday ? { background: '#faf5ff', borderColor: '#e9d5ff', color: '#7e22ce' } : undefined}>
                    <span className={styles.upcomingDateMonth}>{format(startDate, 'MMM')}</span>
                    <span className={styles.upcomingDateDay}>{format(startDate, 'd')}</span>
                  </div>
                  <div className={styles.upcomingInfo}>
                    <strong className={styles.upcomingTitle}>{value(ev, 'title')}</strong>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span className={`chip ${isHoliday ? 'purple' : 'blue'}`} style={{ fontSize: 9.5, padding: '1px 5px' }}>
                        {isHoliday ? 'Holiday / Non-working' : 'Academic Event'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <p className={styles.upcomingEmpty}>No upcoming term milestones recorded.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>

      {/* Main Layout: Full-width container with top 3-card deck for Student/Coordinator/SuperAdmin and directory for Coordinator/SuperAdmin */}
      <div className={styles.standardLayout}>
        {/* Top 3-Card Deck: Student and Coordinator deck, and dedicated COE deck for Super Admin */}
        {(user.role === 'STUDENT' || user.role === 'COORDINATOR') && TopCardsContainer}
        {user.role === 'SUPER_ADMIN' && CoeAdminTopCardsDeck}

        {/* Main Calendar Card (Full Width) */}
          <section className={styles.calendarCard} aria-label="PractiSync calendar">
            {/* Top Toolbar */}
            <div className={styles.toolbar}>
              {/* View Switcher Tabs */}
              <div className={styles.viewTabs} role="tablist" aria-label="Calendar view mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'month'}
                  onClick={() => setMode('month')}
                >
                  <CalendarDays size={14} />
                  Month
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'week'}
                  onClick={() => setMode('week')}
                >
                  <CalendarRange size={14} />
                  Week
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'agenda'}
                  onClick={() => setMode('agenda')}
                >
                  <CalendarCheck size={14} />
                  Agenda
                </button>
              </div>

              {/* Period Controls */}
              <div className={styles.periodControls}>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Previous ${mode}`}
                  title={`Previous ${mode}`}
                  onClick={() => movePeriod(-1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 className={styles.periodTitle} aria-live="polite">
                  {periodTitle}
                </h2>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Next ${mode}`}
                  title={`Next ${mode}`}
                  onClick={() => movePeriod(1)}
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className={styles.todayButton}
                  onClick={() => {
                    const date = parseCalendarDate(today);
                    if (date) {
                      setCursor(date);
                      chooseDay(date);
                    }
                  }}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Coordinator & Super Admin (COE Office) Compact Schedule Filter Bar */}
            {(user.role === 'COORDINATOR' || user.role === 'SUPER_ADMIN') && (
              <div className={styles.coordinatorFilterBar} role="group" aria-label="Filter schedule events">
                <div className={styles.coordinatorFilterHeader}>
                  <Filter size={13} className={styles.coordinatorFilterIcon} />
                  <span className={styles.coordinatorFilterLabel}>
                    {user.role === 'SUPER_ADMIN' ? 'COE Internship categories:' : 'Schedule categories:'}
                  </span>
                </div>
                <div className={styles.coordinatorPills}>
                  <button
                    type="button"
                    className={`${styles.coordinatorPill} ${categoryFilter === 'ALL' ? styles.coordinatorPillActive : ''}`}
                    onClick={() => setCategoryFilter('ALL')}
                  >
                    All Schedules
                  </button>
                  <button
                    type="button"
                    className={`${styles.coordinatorPill} ${categoryFilter === 'DEADLINE' ? styles.coordinatorPillActive : ''}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'DEADLINE' ? 'ALL' : 'DEADLINE')}
                  >
                    <span className={`${styles.filterDot} ${styles.filterDotDeadline}`} />
                    {user.role === 'SUPER_ADMIN' ? 'Internship Document Deadlines' : 'Passing of documents'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.coordinatorPill} ${categoryFilter === 'ACADEMIC' ? styles.coordinatorPillActive : ''}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'ACADEMIC' ? 'ALL' : 'ACADEMIC')}
                  >
                    <span className={`${styles.filterDot} ${styles.filterDotAcademic}`} />
                    {user.role === 'SUPER_ADMIN' ? 'Internship & Academic Milestones' : 'Academic milestones'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.coordinatorPill} ${categoryFilter === 'APPOINTMENT' ? styles.coordinatorPillActive : ''}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'APPOINTMENT' ? 'ALL' : 'APPOINTMENT')}
                  >
                    <span className={`${styles.filterDot} ${styles.filterDotAppointment}`} />
                    COE Appointments
                  </button>
                  <button
                    type="button"
                    className={`${styles.coordinatorPill} ${categoryFilter === 'HOLIDAY' ? styles.coordinatorPillActive : ''}`}
                    onClick={() => setCategoryFilter(categoryFilter === 'HOLIDAY' ? 'ALL' : 'HOLIDAY')}
                  >
                    <span className={`${styles.filterDot} ${styles.filterDotHoliday}`} />
                    Holidays & Suspensions
                  </button>
                </div>
                {categoryFilter !== 'ALL' && (
                  <button
                    type="button"
                    className={styles.coordinatorResetBtn}
                    onClick={() => setCategoryFilter('ALL')}
                  >
                    Reset filter
                  </button>
                )}
              </div>
            )}

            {/* Calendar Grid Container */}
            {mode === 'agenda' ? (
              renderAgenda()
            ) : mode === 'week' ? (
              renderWeek()
            ) : (
              <div className={styles.grid} role="grid" aria-label={`Month view for ${periodTitle}`}>
                <div className={styles.weekdayRow} role="row">
                  {weekdays.map((day, idx) => (
                    <span
                      role="columnheader"
                      key={day}
                      aria-label={day}
                      className={idx >= 5 ? styles.weekendHeader : ''}
                    >
                      {day.slice(0, 3)}
                    </span>
                  ))}
                </div>
                <div className={styles.weekRows} role="rowgroup">
                  {weekRows.map((week, index) => {
                    const weekTracks = getWeekMultiDayTracks(week, combinedEvents);
                    return (
                      <div className={styles.weekRow} role="row" key={`${index}-${calendarDateValue(week[0]!)}`}>
                        {week.map((date, dayIdx) => renderDay(date, weekTracks[dayIdx]))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* =========================================================
              MANAGED SCHEDULES & DEADLINES DIRECTORY (COORDINATOR & SUPER ADMIN)
              ========================================================= */}
          {(user.role === 'COORDINATOR' || user.role === 'SUPER_ADMIN') && (
            <section className={styles.scheduleDirectoryCard} aria-label="Managed schedules and deadlines directory">
              {/* Header */}
              <div className={styles.directoryHeader}>
                <div className={styles.directoryTitleWrap}>
                  <div className={styles.directoryTitleRow}>
                    <h3 className={styles.directoryTitle}>
                      <CalendarRange size={18} color="var(--rtu-blue)" />
                      {user.role === 'COORDINATOR'
                        ? 'Document Submission & Class Schedule Directory'
                        : 'College of Engineering internship and schedules directory'}
                    </h3>
                    <span className={styles.directoryCountBadge}>
                      {managedEvents.length} {managedEvents.length === 1 ? 'schedule' : 'schedules'}
                    </span>
                  </div>
                  <p className={styles.directorySubtitle}>
                    {user.role === 'COORDINATOR'
                      ? 'Search, filter, review, and manage scheduled document passing requirements for your assigned classes.'
                      : 'Overview of college internship requirements, document deadlines, partner consultations, and academic schedules.'}
                  </p>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className={styles.directoryToolbar}>
                <div className={styles.searchWrap}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    value={schedSearch}
                    onChange={(e) => {
                      setSchedSearch(e.target.value);
                      setSchedPage(1);
                    }}
                    placeholder="Search schedule name, requirement, or notes..."
                    className={styles.searchInput}
                    aria-label="Search schedules by name"
                  />
                  {schedSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setSchedSearch('');
                        setSchedPage(1);
                      }}
                      className={styles.searchClearBtn}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className={styles.filterGroup}>
                  {/* Class / Section Filter */}
                  {(user.role === 'COORDINATOR' || (classes && classes.length > 0)) && (
                    <select
                      value={schedClassFilter}
                      onChange={(e) => {
                        setSchedClassFilter(e.target.value);
                        setSchedPage(1);
                      }}
                      className={styles.filterSelect}
                      aria-label="Filter by class section"
                    >
                      <option value="ALL">All Sections / Classes</option>
                      <option value="GENERAL">General (All Enrolled Classes)</option>
                      {classes?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {value(c, 'section') ? `Section ${value(c, 'section')}` : value(c, 'name')}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={schedTypeFilter}
                    onChange={(e) => {
                      setSchedTypeFilter(e.target.value as typeof schedTypeFilter);
                      setSchedPage(1);
                    }}
                    className={styles.filterSelect}
                    aria-label="Filter by event type"
                  >
                    <option value="ALL">All Event Types</option>
                    <option value="DEADLINE">Passing of documents (Deadline)</option>
                    <option value="ACADEMIC">Academic milestones</option>
                    <option value="HOLIDAY">University holidays</option>
                    <option value="APPOINTMENT">COE appointments</option>
                  </select>

                  <select
                    value={schedStatusFilter}
                    onChange={(e) => {
                      setSchedStatusFilter(e.target.value as typeof schedStatusFilter);
                      setSchedPage(1);
                    }}
                    className={styles.filterSelect}
                    aria-label="Filter by status"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SCHEDULED">Scheduled / Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>

                  {/* Sort Order */}
                  <select
                    value={schedSort}
                    onChange={(e) => {
                      setSchedSort(e.target.value as typeof schedSort);
                      setSchedPage(1);
                    }}
                    className={styles.filterSelect}
                    aria-label="Sort schedules"
                  >
                    <option value="CLOSING_SOONEST">Sort: Due soonest</option>
                    <option value="CLOSING_LATEST">Sort: Due latest</option>
                    <option value="NEWEST_CREATED">Sort: Recently added</option>
                    <option value="TITLE_AZ">Sort: Title (A–Z)</option>
                  </select>

                  {(schedSearch || schedTypeFilter !== 'ALL' || schedStatusFilter !== 'ALL' || schedClassFilter !== 'ALL' || schedSort !== 'CLOSING_SOONEST') && (
                    <button
                      type="button"
                      className={styles.resetFiltersBtn}
                      onClick={() => {
                        setSchedSearch('');
                        setSchedTypeFilter('ALL');
                        setSchedStatusFilter('ALL');
                        setSchedClassFilter('ALL');
                        setSchedSort('CLOSING_SOONEST');
                        setSchedPage(1);
                      }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              </div>

              {/* Table / List Container */}
              {managedEvents.length === 0 ? (
                <div className={styles.directoryEmptyState}>
                  <div className={styles.directoryEmptyIcon}>
                    <CalendarRange size={24} color="var(--rtu-blue)" />
                  </div>
                  <h4>No schedules found</h4>
                  <p>
                    {schedSearch || schedTypeFilter !== 'ALL' || schedStatusFilter !== 'ALL'
                      ? 'No schedules match your current search and filter criteria. Try adjusting or resetting your filters.'
                      : user.role === 'COORDINATOR'
                      ? 'No document deadlines scheduled yet. Click "Schedule document deadline" to publish submission instructions for your class.'
                      : 'No calendar events or submission deadlines recorded yet.'}
                  </p>
                  {(schedSearch || schedTypeFilter !== 'ALL' || schedStatusFilter !== 'ALL') && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setSchedSearch('');
                        setSchedTypeFilter('ALL');
                        setSchedStatusFilter('ALL');
                        setSchedPage(1);
                      }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.directoryTableCard}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.directoryTable}>
                      <thead>
                        <tr>
                          <th style={{ minWidth: 220 }}>Schedule Name</th>
                          <th style={{ minWidth: 150 }}>Event Type</th>
                          <th style={{ minWidth: 200 }}>Submission Window (Opens / Closes)</th>
                          <th style={{ minWidth: 110 }}>Status</th>
                          <th style={{ minWidth: 190, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedEvents.map((ev) => {
                          const evType = value(ev, 'eventType');
                          const isCanManage = canUserManageEvent(ev);
                          const isCancelled = value(ev, 'status') === 'CANCELLED';

                          return (
                            <tr key={ev.id}>
                              {/* Schedule Name */}
                              <td>
                                <div className={styles.schedTitleCell}>
                                  <strong
                                    className={styles.schedMainTitle}
                                    style={isCancelled ? { textDecoration: 'line-through', opacity: 0.7 } : undefined}
                                  >
                                    {value(ev, 'title')}
                                  </strong>
                                  <div className={styles.schedMetaRow}>
                                    <span className={styles.schedAudienceBadge}>
                                      {getAudienceLabel(ev)}
                                    </span>
                                    {getOrganizerBadge(ev)}
                                    {value(ev, 'location') && (
                                      <span className={styles.schedLocation} title={`Venue: ${value(ev, 'location')}`}>
                                        <MapPin size={11} />
                                        {value(ev, 'location')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Event Type */}
                              <td>
                                <span className={`chip ${isCancelled ? 'red' : (eventColors[evType] ?? 'blue')}`}>
                                  {isCancelled ? (
                                    <X size={11} style={{ display: 'inline', marginRight: 4 }} />
                                  ) : (
                                    <>
                                      {evType === 'DEADLINE' && <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />}
                                      {evType === 'ACADEMIC' && <GraduationCap size={11} style={{ display: 'inline', marginRight: 4 }} />}
                                      {evType === 'HOLIDAY' && <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />}
                                      {evType === 'APPOINTMENT' && <Video size={11} style={{ display: 'inline', marginRight: 4 }} />}
                                    </>
                                  )}
                                  <span>{eventLabels[evType] ?? evType}</span>
                                </span>
                              </td>

                              {/* Opens and Closes */}
                              <td>
                                <div className={styles.schedDateRange}>
                                  <div className={styles.schedDateRow}>
                                    <span className={styles.schedDatePrefix}>Opens:</span>
                                    <span className={styles.schedDateVal}>{formatDateBadge(value(ev, 'startDate'))}</span>
                                    {value(ev, 'startTime') && !Number(ev.allDay) && (
                                      <span className={styles.schedDateTime}>({timeLabel(value(ev, 'startTime'))})</span>
                                    )}
                                  </div>
                                  <div className={styles.schedDateRow}>
                                    <span className={styles.schedDatePrefix}>Closes:</span>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <strong className={styles.schedDateDeadlineVal}>
                                        {formatDateBadge(value(ev, 'endDate'))}
                                        {value(ev, 'endTime') && !Number(ev.allDay) ? ` · ${timeLabel(value(ev, 'endTime'))}` : ''}
                                      </strong>
                                      {getUrgencyBadge(ev, today)}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td>{renderStatusBadge(value(ev, 'status'))}</td>

                              {/* Actions: View, Copy Notice, Edit, Delete by buttons in the same row */}
                              <td style={{ textAlign: 'right' }}>
                                <div className={styles.schedActionButtons} style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className={styles.actionBtnView}
                                    onClick={() => setViewingSchedule(ev)}
                                    title="View complete schedule guidelines and details"
                                  >
                                    <Eye size={13} />
                                    <span>View</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={styles.actionBtnCopy}
                                    onClick={() => copyScheduleNotice(ev)}
                                    title="Copy formatted notice for announcements or group chats"
                                  >
                                    <Copy size={13} />
                                    <span>Notice</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={styles.actionBtnEdit}
                                    disabled={!isCanManage}
                                    onClick={() => {
                                      if (isCanManage) onEditEvent?.(ev);
                                    }}
                                    title={
                                      isCanManage
                                        ? 'Edit schedule details'
                                        : 'Only administrators or the assigning coordinator can edit this event'
                                    }
                                  >
                                    <Pencil size={13} />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={styles.actionBtnDelete}
                                    disabled={!isCanManage}
                                    onClick={() => {
                                      if (!isCanManage) return;
                                      if (confirm(`Permanently delete "${value(ev, 'title')}"? This cannot be undone.`)) {
                                        onDeleteEvent?.(String(ev.id));
                                      }
                                    }}
                                    title={
                                      isCanManage
                                        ? 'Delete this schedule permanently'
                                        : 'Only administrators or the assigning coordinator can delete this event'
                                    }
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {managedEvents.length > 0 && (
                    <div className={styles.directoryPagination}>
                      <div className={styles.paginationSummary}>
                        Showing <strong>{(currentSchedPage - 1) * schedPageSize + 1}–{Math.min(currentSchedPage * schedPageSize, managedEvents.length)}</strong> of{' '}
                        <strong>{managedEvents.length}</strong> schedules
                      </div>

                      <div className={styles.paginationControls}>
                        <div className={styles.pageSizeSelectWrap}>
                          <label htmlFor="sched-page-size" className={styles.pageSizeLabel}>Rows per page:</label>
                          <select
                            id="sched-page-size"
                            value={schedPageSize}
                            onChange={(e) => {
                              setSchedPageSize(Number(e.target.value));
                              setSchedPage(1);
                            }}
                            className={styles.pageSizeSelect}
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                          </select>
                        </div>

                        <span className={styles.paginationDivider} aria-hidden="true" />

                        <div className={styles.pageBtnGroup}>
                          <button
                            type="button"
                            className={styles.pageNavBtn}
                            disabled={currentSchedPage === 1}
                            onClick={() => setSchedPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                          >
                            <ChevronLeft size={14} />
                            <span>Prev</span>
                          </button>

                          {Array.from({ length: totalSchedPages }, (_, idx) => idx + 1).map((pg) => {
                            if (
                              totalSchedPages > 6 &&
                              pg !== 1 &&
                              pg !== totalSchedPages &&
                              Math.abs(pg - currentSchedPage) > 1
                            ) {
                              if (pg === 2 || pg === totalSchedPages - 1) {
                                return <span key={pg} className={styles.paginationEllipsis}>…</span>;
                              }
                              return null;
                            }
                            return (
                              <button
                                type="button"
                                key={pg}
                                className={`${styles.pageNumberBtn} ${pg === currentSchedPage ? styles.pageNumberBtnActive : ''}`}
                                onClick={() => setSchedPage(pg)}
                                aria-label={`Page ${pg}`}
                                aria-current={pg === currentSchedPage ? 'page' : undefined}
                              >
                                {pg}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            className={styles.pageNavBtn}
                            disabled={currentSchedPage === totalSchedPages}
                            onClick={() => setSchedPage((p) => Math.min(totalSchedPages, p + 1))}
                            aria-label="Next page"
                          >
                            <span>Next</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

      </div>

      {/* View Schedule Details Modal Dialog */}
      {viewingSchedule && (
        <Dialog
          open={viewingSchedule !== null}
          onOpenChange={(open) => {
            if (!open) setViewingSchedule(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
            <DialogHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span className={`chip ${value(viewingSchedule, 'status') === 'CANCELLED' ? 'red' : (eventColors[value(viewingSchedule, 'eventType')] ?? 'blue')}`}>
                  {eventLabels[value(viewingSchedule, 'eventType')] ?? value(viewingSchedule, 'eventType')}
                </span>
                {renderStatusBadge(value(viewingSchedule, 'status'))}
                <span className="chip" style={{ fontSize: 11 }}>
                  {getAudienceLabel(viewingSchedule)}
                </span>
                {getOrganizerBadge(viewingSchedule)}
              </div>
              <DialogTitle style={{ fontSize: 18, color: 'var(--rtu-navy)' }}>
                {value(viewingSchedule, 'title')}
              </DialogTitle>
              <DialogDescription>
                {value(viewingSchedule, 'createdByName')
                  ? `Organized by ${value(viewingSchedule, 'createdByName')}`
                  : 'Scheduled in PractiSync calendar'}
              </DialogDescription>
            </DialogHeader>

            <div className={styles.viewModalContent}>
              {/* Submission Window / Dates */}
              <div className={styles.viewModalWindowBox}>
                <div className={styles.viewModalWindowCol}>
                  <span className={styles.viewModalMetaLabel}>Submission Opens</span>
                  <strong className={styles.viewModalMetaVal}>
                    {formatDateBadge(value(viewingSchedule, 'startDate'))}
                    {value(viewingSchedule, 'startTime') && !Number(viewingSchedule.allDay)
                      ? ` at ${timeLabel(value(viewingSchedule, 'startTime'))}`
                      : ''}
                  </strong>
                </div>
                <div className={styles.viewModalWindowDivider}>→</div>
                <div className={styles.viewModalWindowCol}>
                  <span className={styles.viewModalMetaLabel}>Deadline / Closes</span>
                  <strong className={styles.viewModalMetaVal} style={{ color: '#c2410c' }}>
                    {formatDateBadge(value(viewingSchedule, 'endDate'))}
                    {value(viewingSchedule, 'endTime') && !Number(viewingSchedule.allDay)
                      ? ` at ${timeLabel(value(viewingSchedule, 'endTime'))}`
                      : ''}
                  </strong>
                </div>
              </div>

              {/* Guidelines / Description */}
              {value(viewingSchedule, 'description') && (
                <div className={styles.viewModalSection}>
                  <h5 className={styles.viewModalSectionTitle}>
                    <FileText size={14} color="var(--rtu-blue)" />
                    Guidelines & Submission Instructions
                  </h5>
                  <p className={styles.viewModalDescText}>{value(viewingSchedule, 'description')}</p>
                </div>
              )}

              {/* Venue & Virtual URL */}
              {(value(viewingSchedule, 'location') || value(viewingSchedule, 'meetingUrl')) && (
                <div className={styles.viewModalSection}>
                  <h5 className={styles.viewModalSectionTitle}>
                    <MapPin size={14} color="var(--rtu-blue)" />
                    Submission Office & Venue
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {value(viewingSchedule, 'location') && (
                      <div style={{ fontSize: 13, color: 'var(--foreground)' }}>
                        <strong>Office / Venue:</strong> {value(viewingSchedule, 'location')}
                      </div>
                    )}
                    {value(viewingSchedule, 'meetingUrl') && (
                      <a
                        href={value(viewingSchedule, 'meetingUrl')}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.viewModalLink}
                      >
                        <Video size={13} />
                        <span>Open virtual meeting or submission portal</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className={styles.viewModalFooter}>
                {canUserManageEvent(viewingSchedule) && (
                  <button
                    type="button"
                    className={styles.actionBtnDelete}
                    style={{ marginRight: 'auto', padding: '6px 14px' }}
                    onClick={() => {
                      const target = viewingSchedule;
                      if (confirm(`Permanently delete "${value(target, 'title')}"?`)) {
                        setViewingSchedule(null);
                        onDeleteEvent?.(String(target.id));
                      }
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete schedule</span>
                  </button>
                )}

                {canUserManageEvent(viewingSchedule) && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      const target = viewingSchedule;
                      setViewingSchedule(null);
                      onEditEvent?.(target);
                    }}
                  >
                    <Pencil size={13} />
                    <span>Edit details</span>
                  </button>
                )}

                <button
                  type="button"
                  className="secondary"
                  onClick={() => copyScheduleNotice(viewingSchedule)}
                  title="Copy formatted notice for announcements or class group chat"
                >
                  <Copy size={13} />
                  <span>Copy notice</span>
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={() => setViewingSchedule(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
