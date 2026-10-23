# COE Office reservation design contract

- **Product and users:** Students reserve a consultation slot on phone or desktop; COE Office admins manage the day's bookings; a separate monitor helps students see who is being served and who is next.
- **Surface:** Operate. Student primary action is Reserve selected slot. Admin primary action is Call student or Finish consultation. The monitor has no controls.
- **Recovery:** Keep the selected date and time after errors. Refresh availability after conflicts. If the holiday feed is unavailable, use the saved year; if the year has never synced, explain that booking is temporarily unavailable.
- **Real content:** Date, exact five-minute time, queue number, status, reservation history, office hours, full admin names, sanitized monitor names, and holiday closure reason.
- **Reuse:** Existing Inter, RTU navy and blue, gold focus, shared alert-dialog focus handling, Lucide icons, 4px spacing, 8px controls and 12px surfaces.
- **Required states:** First load, open/available, selected slot, reserved, active reservation, forfeiture confirmation, failed reservation, conflict, offline/stale, public or university holiday, weekend, past slot, empty day, waiting, called, serving, missed, cancelled, completed, stale holiday feed, unavailable holiday year, permission denied, and monitor with no current or next reservation.
- **Worst mistake:** Two students believe they own the same slot or a student believes a late consultation is guaranteed. Database uniqueness chooses one winner; the UI confirms the exact reserved time and states that unstarted bookings expire at slot end.
- **Motion:** Brief button feedback only. Polling does not shift the layout, steal focus, or announce the entire reservation list. Respect reduced motion.
- **Out of scope:** Walk-in registration/start controls, public unauthenticated monitor access, and edits to other dashboard modules.

## Visual direction

The queue is a functional RTU workspace, not a promotional page. Use Inter and the existing blue-and-gold identity. Students see one date, one session picker and a compact grid of clearly available, reserved, past or closed times. The active reservation replaces the booking grid with a ticket and its forfeit action. Admins get a date control, the current consultation, the next booking, and a scannable reservation list. The separate monitor uses a high-contrast navy field with restrained gold for the queue number. It displays the first name plus last initial and refreshes every five seconds.

## Finish gate

- `pnpm exec eslint app/queue-workspace.tsx app/practisync.tsx app/api/queue/route.ts packages/domain/queue.ts packages/domain/actions.ts packages/validation/contracts.ts tests/domain.test.ts tests/runtime-fixture.ts scripts/workflow-worker.ts` passed with one existing hook dependency warning in `app/practisync.tsx`.
- `pnpm db:validate` passed.
- The live Nager.Date Community v4 Philippine feed returned 18 records with the expected `holidayTypes` field and `Public` classification.
- `pnpm exec vitest run tests/domain.test.ts -t "COE office queue"` passed, covering reservation exclusivity, forfeiture, monitor redaction, and public and university holiday cancellation notices.
- The full `tests/domain.test.ts` run had 40 passing tests and one failing Auth.js redirect assertion outside the queue changes.
- `pnpm check` remains blocked by five unrelated existing type errors: an optional `onAction` mismatch in `app/assessment-workspace.tsx`, two nullable snapshot accesses and an `AssessmentWorkspace` callback mismatch in `app/practisync.tsx`, and feedback action narrowing in `packages/domain/actions.ts`. The queue component and API introduce no reported type errors.
- A visual browser review could not run: the available CUA environment reported no browser providers, including for its in-app browser and Chrome options.
