# Validation record

## Lint cleanup — October 21, 2026

- Full repository lint passes with **0 errors and 0 warnings**, enforced by `pnpm lint --max-warnings 0`. No rule suppressions were added. This supersedes the earlier lint-failure records below for the current working tree.
- Calendar cleanup removes unused imports/calculations, uses a subscribed viewport snapshot for the responsive default, preserves explicit view choices, fixes memo/export callback dependencies, replaces `any` casts and uses supported grid selection semantics. Dead inspector state was removed; day indicators now select the calendar date. The old layout helper is ESM at `scripts/apply_layout_improvements.mjs`; its syntax was checked without executing its source mutations.
- All **119 tests across 17 files**, TypeScript, Prisma validation and production build pass. PostgreSQL isolation acceptance, both HTTP smoke scripts and the workflow worker one-shot check also pass in the dedicated fictional verification database.
- Both browser checks pass: 14 backlog UI checks and 10 calendar checks at 390, 820 and 1440px. The calendar pass covers responsive defaults, user-selected mode on resize, keyboard/focus/selection, schedule filters and fresh JSON/CSV/iCalendar downloads after a real deadline save. A long-label phone overflow exposed by the rerun was fixed with a bounded grid track; no page overflow, hydration or runtime errors remain in these checks.
- Evidence and remaining institutional/release gates: [tasks 5–8 verification](backlog-5-8-evidence.md). Local screenshots/logs are in `.local/backlog-5-8-evidence/`. Earlier dated records remain historical.

## Student registration and RTU access — October 20, 2026

- Replaces the earlier coordinator approval flow with immediate registration into an active class. The complete suite passes 102 tests across 14 files; the 10 registration/access checks also pass after the final changes, including direct API denial before setup, fresh-profile isolation, duplicate-number handling, atomic rollback, exact email-domain checks, manual exceptions, retired review actions, scoped removal and immediate enrollment in another eligible class.
- TypeScript and the production build pass. Targeted lint has zero errors and seven existing warnings. Repository lint still has nine errors in unchanged app/calendar-view.tsx and scripts/apply_layout_improvements.cjs. The build retains the two known local-SQLite tracing warnings. Prisma schema validation and client generation pass.
- Applied 202610200003_student_registration to the confirmed local PostgreSQL practisync_demo database on localhost:5433. Confirmed all five supplied yopmail accounts have explicit email exceptions. Existing completed registrations were preserved. The document worker and port-3000 preview were restarted after releasing the Windows Prisma engine lock; the worker reports ready.
- Browser checks at 390px, 820px and 1440px covered registration validation and alignment, a long name, keyboard focus trapping, Escape protection, class-code preview and immediate entry into the student workspace. The new student appeared in the coordinator roster without a placement. Roster search/no-results, removal confirmation/cancel, mobile action visibility and the RTU-only/manual-exception provisioning control were checked. The final phone roster has no horizontal page overflow; screenshots are in .local/student-registration-qa/. No new browser errors appeared after handling the optional navigation-tool cancellation.
- Real Google Workspace sign-in and institutional activation remain disabled. No production identity verification was exercised.


## Student verification — October 20, 2026 (superseded; retained as history)

- All 101 Vitest tests across 14 files passed, including nine new checks for first-login access denial, section routing, correction/resubmission, rejection/reopening, record linking, duplicate/stale decisions and linked-session revocation.
- Browser walkthroughs passed at 390px, 820px and 1440px widths: form validation, pending lock, direct-page/API denial, logout and persistent status, coordinator corrections, resubmission, approval unlock, rejection, Super Admin reopening, keyboard focus trapping, reduced motion and input retention after a failed submission. No browser runtime errors were reported. Screenshots are local QA artifacts in `.local/verification-qa/`.
- Prisma schema validation/client generation passed. The verification migrations and the previously pending final-DTR migration were applied to the confirmed local fictional PostgreSQL demo on localhost:5433. A disposable PostgreSQL fixture verified that only one concurrent review commits and that the losing transaction leaves no profile or audit writes; fixture records were removed afterward.
- Production build and TypeScript checks passed. The build retains the existing local SQLite dynamic-filesystem tracing warnings. Targeted lint passes for the new verification files; full-repository lint still reports nine errors in unchanged `app/calendar-view.tsx` and `scripts/apply_layout_improvements.cjs`.
- These results verify the fictional demo phase. Institutional Google Workspace authentication and a live university data adapter remain disabled and are not claimed as tested.

## PostgreSQL and Prisma

- Prisma 6.19.3 schema validation and client generation passed.
- A clean PostgreSQL 17 demo database received the first four migrations during earlier database validation. The limited HTE workflow migration (`202610110003_limited_hte_workflows`) and the outcome/industry-feedback migration (`202610130001_outcome_and_industry_feedback`) have since been applied to the isolated local demo database; those six migrations are recorded as present. The interactive document form migrations (`202610140001_interactive_document_forms`, `202610140002_coe_document_forms`), Super Admin template migration (`202610140003_admin_document_templates`), and PDF binary/snapshot migration (`202610140004_pdf_document_templates`) have not been applied or verified against PostgreSQL in this change.
- The guarded demo seed ran twice against the primary local database. Counts stayed stable at 4 demo identities (Student, Coordinator, Super Admin, and HTE Supervisor), 10 fictional users, 120 seeded DTR entries, 8 notifications, and 3 assessment schedules.
- The seed was tested with the demo tenant temporarily marked `INSTITUTIONAL`; it rejected the run with status 403. The tenant was restored to `DEMO` afterward.
- The local Postgres service listens on port `5433` to avoid the unrelated Postgres service already using `5432`.

## Application checks

- Earlier application validation passed 44 Vitest checks. The current PSS-26–29 branch passes 65 tests across 9 files, including company approval, post gating, restricted HTE access, placement confirmation and activation, guest evaluations, feedback privacy threshold, and the two completion forms. The domain suite uses SQLite as a fast test adapter over the demo DDL shape; it does not replace PostgreSQL checks.
- `pnpm check`: passed.
- `pnpm lint`: passed.
- `pnpm build`: native Next.js production build passed for the current HTE workflow implementation.
- `pnpm db:validate`: current Prisma schema validation passed.
- Earlier versions of `tests/http-smoke.py` passed against native Next.js/PostgreSQL (`localhost:3000`) and the retained Cloudflare/D1 local build (`localhost:8787`). The current script covers the three original quick accounts plus HTE through the normal username/password form, including its assigned-placement/time-only snapshot and dedicated portal. The HTE quick sign-in was added on October 13, 2026 and manually verified against the local Next.js/PostgreSQL app: credentials flow returned a `SUPERVISOR` session and scoped data with HTTP 200.
- `tests/postgres-smoke.py` previously passed against a separate disposable PostgreSQL smoke database. It exercised DTR submission/correction/confirmation, class creation and enrollment approval, policy version update, eligible job application, notification read state, coordinator-routed SOS privacy, and session revocation after disabling an account; it predates the new HTE workflows.

The HTE workflow and outcome/industry-feedback migrations have now been applied to the isolated local PostgreSQL demo database. The local demo has four quick sign-ins: Student, Coordinator, Super Admin, and HTE Supervisor (`demo.supervisor`). HTE may also use the normal username/password form. The seed promotes the existing fictional HTE account to a protected demo identity without resetting other demo edits. Earlier HTTP smoke checks verified its limited assigned-placement snapshot and dedicated portal; rerun the updated script before preview sign-off.

The PostgreSQL smoke script creates and disables a synthetic account, changes demo data, and creates a case. Run it only against a disposable demo database, never against an institutional database.

## Deployment status

The HTE quick sign-in and password sign-in are available; quick sign-in was manually checked against the local PostgreSQL-backed app on October 13, 2026. Full HTE company/post, guest evaluation, feedback, and completion workflows have domain coverage and should still be exercised end to end against PostgreSQL before Vercel preview sign-off. The existing Cloudflare/D1 local build and its configuration are being retained until Vercel preview passes. A Vercel project and hosted preview database are not configured in this checkout, so Vercel preview deployment and final Cloudflare/D1 cleanup remain outstanding. No real student data or production launch is claimed.

Google account linking, private file uploads/scanning, email, durable queues, production load/concurrency testing, browser visual QA, and institutional repository integration remain unconfigured or unverified.
