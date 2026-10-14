# Validation record

## PostgreSQL and Prisma

- Prisma 6.19.3 schema validation and client generation passed.
- A clean PostgreSQL 17 demo database received the first four migrations during earlier database validation. The limited HTE workflow migration (`202610110003_limited_hte_workflows`) and the outcome/industry-feedback migration (`202610130001_outcome_and_industry_feedback`) have since been applied to the isolated local demo database; all six migrations are present.
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
