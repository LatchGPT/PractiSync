# COE Office reservations and queue display

## Student reservation flow

- Select a date from today through 30 calendar days ahead, then choose a five-minute slot.
- Reservation requests work at any time. Slots are limited to weekdays, 8:00–11:00 AM and 1:00–5:00 PM Philippine time, excluding public and university-wide holidays.
- One active reservation is allowed per student across all dates. A successful reservation immediately occupies that slot for everyone else.
- A student can forfeit a waiting reservation until it is called. Forfeiting releases the slot for another student.
- If a waiting reservation is not called before its five-minute slot ends, it becomes missed. A consultation that has started remains active until an administrator finishes it.

## COE Office flow

- Every Super Admin sees and operates the same institution queue.
- Select a date to review full student names, current consultation, next reserved student, and the day's reservation list.
- Call a student at the reserved time or later. The server rejects early calls and prevents more than one active consultation.
- The monitor opens in a separate window. It shows the current or next reservation with queue number, first name and last initial. It never exposes full names or student IDs.
- When no reservation is due now and the office is open, the monitor says **Walk-in available**, including when a later reservation exists. It displays availability only; staff do not start or register walk-ins through it.

## Calendar and availability

- The free Nager.Date Philippine public-holiday feed is cached by year and refreshed daily. Active university-wide HOLIDAY calendar events add institution-specific closures.
- An outage uses the last saved year. If no saved calendar exists for a requested year, the server blocks booking until it can sync that year.
- When a newly synced public holiday or university holiday affects a waiting reservation, the reservation is cancelled and the student is notified. Removing a holiday does not restore a cancelled reservation.
- The workflow worker reconciles expired reservations every five seconds. Queue reads and writes also reconcile first.

## Database and operations

- `packages/db/prisma/migrations/202610230002_queue_reservations/migration.sql` adds closure reasons, office-wide slot uniqueness, one active reservation per student, one active consultation, and cached holiday tables.
- Existing queue rows remain as history. Conflicting active rows are retained but closed with `MIGRATION_CONFLICT` before the new uniqueness rules apply.
- The local SQLite demo applies the same migration and advances its schema version to 19.
- Start the queue, email and reminder worker with `pnpm workflows:worker`; the demo SQLite worker uses `pnpm workflows:demo`.
- `queueJoin` is retired. Clients use `queueReserve` and `queueForfeit`; `queueStatus` is Super Admin only.

## Design contract

See [the queue design contract and finish-gate evidence](docs/student-queue-design.md).
