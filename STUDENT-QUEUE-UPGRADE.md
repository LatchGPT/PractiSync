# PractiSync Student Queue Upgrade

This is an additive upgrade to the existing PractiSync application.

## Included

- New Student Queue workspace for Students, Coordinators, and Super Admins.
- Student self-join and staff-assisted queue entry.
- Five-minute slots in Asia/Manila time, with service windows of 08:00–11:00 and 13:00–17:00.
- FIFO queue ordering, duplicate active-entry prevention, session capacity checks, and status changes.
- Coordinator-scoped queue management and Super Admin institution-wide queue access.
- Onscreen status updates and in-app notifications.
- Additive PostgreSQL/Prisma migration mirrored in the local SQLite demo runtime.

## Roles

- Student: join an assigned coordinator's queue and view today's own entries.
- Coordinator: manage queue entries for their assigned students/classes only.
- Super Admin: view and administer today's queues across the institution.
- Supervisor: no queue access.

## Database migration

The migration is `packages/db/prisma/migrations/202610230001_student_queuing/migration.sql`. Deploy using the project's existing migration workflow (`pnpm db:migrate`). The local demo runtime creates the new table when it is first opened after this upgrade. Existing data is not dropped or rewritten.

## Operational rules

- A slot is five minutes and cannot extend past the session end.
- Students may join only while a session is open.
- Only one active queue entry per student per service date is allowed.
- A coordinator can call the next waiting student in FIFO order and must finish the current service before calling another.
- Queue slots are assigned using the current Manila time and the latest non-cancelled slot for that coordinator/session.

## Verification performed

- TypeScript/TSX transpilation syntax checks passed for the modified TypeScript files.
- The queue migration SQL was executed against SQLite with the expected `users` table and passed syntax/constraint creation checks.
- A full project typecheck, lint run, and application test suite could not be run in this environment because project dependencies were not installed and the package registry was unreachable.
