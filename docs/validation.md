# Validation results

Executed in this build:

- Prisma schema format / validate: passed (67 models).
- Prisma Client generation: passed (6.19.3).
- PostgreSQL initial migration diff generated; SQL inspected and invariant checks appended.
- 19 Vitest checks: passed. These include actual SQLite schema/trigger integration and Auth.js Request/Response cookie sessions for all four roles, credentials success/failure and stale session revocation.
- Strict TypeScript `tsc --noEmit`: passed.
- Application/domain/db/test ESLint with zero warnings: passed.
- Vinext Worker/client/SSR build: passed. Bundler warns about PDF package fontkit filesystem exports in SSR; the user-triggered PDF uses browser standard fonts and is client-only. Full browser export validation is unrun.
- Local D1 schema and scope/overlap trigger migrations applied successfully. Hosted production migrations are applied during publication.

Runtime checks are recorded below as they finish. Full browser/visual QA and WebMCP runtime testing are unavailable: the required control-browser skill is absent, and the supervised preview responds with connection failure despite reporting a running state. Neither is claimed as passing.

Real PostgreSQL migration application, concurrency/locking tests, real Google integration, private object uploads/scanning, email delivery, measured 30,000-student capacity, institutional runtime repositories, and durable portfolio queue tests remain unrun/unconfigured. The hosted demo is not production-ready institutional software.

## Local Windows recheck (2026-10-05)

`pnpm install --frozen-lockfile`, `pnpm check`, `pnpm lint`, `pnpm build`, and `node tests/worker-smoke.mjs` passed. `pnpm test` passed 21 checks when run outside the filesystem sandbox; the sandbox denied esbuild access to a parent directory. The added checks verify that revoked company posting permission blocks application reads and decisions and that a final application decision cannot change in the demo database. `pnpm db:validate` and `pnpm db:generate` passed with the reference `DATABASE_URL` value supplied. The optional bulk generator produced a 30,000-record dry-run preview, and a write attempt without demo guards failed closed; no PostgreSQL rows were written. Docker CLI is installed but its Linux daemon is not running, so migration application, bulk insertion, and concurrency tests remain unrun. Build emitted chunk-size and fontkit browser-module warnings; Worker smoke passed with chart server-render dimension warnings.

## Role dashboard localhost check (2026-10-05)

Replaced the shared overview with four distinct dashboards based on each authenticated account's scoped snapshot. The student view shows personal hours, documents, placement and DTR; the coordinator view shows their classes, student progress and private review queue; the supervisor view shows assigned interns, attendance, policies and company work; the Super Admin view shows structure, accounts and general audit activity without SOS narratives. `pnpm check`, `pnpm lint`, `pnpm test` (21 checks), `pnpm build`, and `node tests/worker-smoke.mjs` passed. The live `tests/http-smoke.py` run against `http://127.0.0.1:8787` passed sign-in, scoped data, each role's rendered dashboard, password login and sign-out. The server render needed a loopback-host fix so `127.0.0.1` uses HTTP for Auth.js session lookup. Visual browser QA was unavailable because no controllable browser was exposed in this environment.

## RTU-inspired theme check (2026-10-05)

Applied a blue-and-gold palette, diagonal band and forge-like geometric motif, updated favicon and metadata, and kept fictional-demo labeling visible. The palette is an interpretation of RTU's public materials, not a claim of exact official color values or official seal usage. `pnpm check`, `pnpm lint`, `pnpm test` (21 checks), and `pnpm build` passed. The built Worker smoke checks passed for all four dashboards, and localhost HTTP smoke passed all four role sessions and page renders. The served stylesheet contains the new blue, gold, and motif rules. Browser visual inspection remains unrun because no controllable browser was available.

The follow-up pass updated secondary workspace text, tables, cards, charts and the Record of Training PDF accent. Typecheck, lint, all 21 tests, build, built Worker smoke, and live localhost HTTP smoke passed again. The served CSS includes the new workspace overrides. PDF rendering and responsive visual inspection still need a browser check.

## Built Worker runtime smoke checks — passed

`node tests/worker-smoke.mjs` executed the compiled Worker in Miniflare with an actual isolated D1 database, applied all four demo migrations, and exercised HTTPS Auth.js CSRF/cookie flows. All four roles authenticated and returned scoped database data. All four authenticated root pages rendered their workspace instead of the login form. Username/password sign-in and sign-out passed. Unauthenticated `/api/data` returned 401 and no password hashes were exposed in DTOs.

This validates the built server runtime and HTTP handlers; it does not claim browser hydration, responsive visual QA or browser PDF rendering. Recharts emits its expected server-render warning because container dimensions are measured in the browser.

## Weekly and monthly competency assessments (2026-10-09)

The hosted demo now stores a coordinator-configured cadence per course and one student self-assessment per enabled calendar week or month. Coordinators can approve a submission or request a revision with a required note. Revisions preserve prior scores in `evaluation_revisions`; earlier baseline/final evaluations remain read-only. Daily DTRs and attendance hours are unchanged and appear as read-only assessment context. The PostgreSQL reference schema has the matching cadence and period fields, but its new migration has not been applied to a live PostgreSQL instance.

`pnpm check`, `pnpm test` (44 checks), `pnpm lint`, `pnpm build`, and `node tests/worker-smoke.mjs` passed locally. The domain tests cover course scope, cadence enforcement, period uniqueness, revision history, and approval. Calendar tests cover Monday–Sunday year boundaries, leap months, and Philippine dates. The built Worker smoke applied all D1 migrations and passed sign-in and scoped-data checks for the three current demo roles. The additive D1 migration was also applied to the existing local demo database, with weekly schedules verified for its three courses. Client-side visual inspection and production database migration remain unrun.
