# Tasks 5–8 verification — October 21, 2026

The approved execution order was FEAT-08A scope, FEAT-05 attribution, FEAT-06 prepared account integration, FEAT-07 document reminders, then FEAT-08B checks on the currently implemented flows. Product choices and UI intent are in [the contract](backlog-5-8-contract.md); operation is in [the runbook](runbook.md).

Source: uncommitted working tree above `3d9e9a2a9f3ac34feee47a5c077d5656c9eb4630`. A base commit alone does not reproduce these changes. No deployment or institutional activation was performed. No real student or employer records were used.

## Result by task

| Task | Review status | Implemented result and boundary |
| --- | --- | --- |
| FEAT-05 | Ready for review | Only a verified, actively assigned supervisor at an approved company submits direct employer feedback. Evaluator, entering account, assignment, company, university, verification, version and timestamp are retained. Legacy evidence remains unverified. History survives unassignment; Super Admin invalidation requires a reason and audit. Analytics use the latest eligible verified response per placement. University transcription is excluded. |
| FEAT-06 | Prepared integration ready for review | Explicit Google identity invitations, RTU claims checks, fresh student registration, preassigned staff scope, encrypted account-mail outbox, local activation/recovery, expiry/reuse checks and session revocation are implemented. Demo and institutional configuration are separate. Real RTU OAuth, first institutional admin bootstrap, sender authorization and inbox delivery have not been exercised. |
| FEAT-07 | Ready for review | Persistent in-app document reminders run at 09:00 Manila three days and one day before deadlines. Current eligibility, preferences, submitted/approved linked forms, correction, changes/cancellation, deduplication, catch-up and bounded retry are handled. A separate worker is required. New FEAT-04 wallet/clearance evidence still needs integration through the completion resolver. |
| FEAT-08 | Phase A complete; Phase B in progress | University tenancy and program/class/company/placement scope are recorded. Trusted tenant context, ownership constraints, tenant-correct audit and notification/job checks were added. Current flows passed fictional two-university PostgreSQL checks. The full release gate remains open until FEAT-01–04 and their exports/files/jobs have been integrated and verified. |

## Executed checks

| Check | Result | Evidence scope |
| --- | --- | --- |
| `pnpm test` | PASS: 119 tests, 17 files | Includes new account lifecycle, reminders, tenant runtime and feedback analytics cases; many domain tests use isolated SQLite fixtures. |
| `pnpm check` | PASS | TypeScript, exit 0. |
| `pnpm db:validate` | PASS | Prisma schema validation. |
| `pnpm build` | PASS | Next.js 16.3.4 production build, including TypeScript and route generation. |
| `pnpm lint --max-warnings 0` | PASS: 0 errors, 0 warnings | Calendar hook dependencies, unused code, typed filters and grid selection semantics were corrected; the layout helper is now ESM (`scripts/apply_layout_improvements.mjs`). The initial implementation run reported 9 errors and 24 warnings; the October 20 baseline had 9 errors and 31 warnings. No lint rules were disabled. |
| Prisma migration deployment | PASS | All 23 committed migrations applied to a dedicated PostgreSQL 17 verification database; five additive migrations belong to this work. Prisma client generation and fictional seed completed. No reset of the persistent demo database. |
| `node --env-file-if-exists=.env --import tsx scripts/verify-backlog-postgres.ts` | PASS | Fictional universities A/B, four-role scoped reads, forged identity denial, composite ownership constraint, stale/duplicate denial, revoked assignment, preserved history, permitted cross-program access, tenant-correct audit, native-document version denial, controlled-time persistent reminders, repeat deduplication and revoked-recipient inbox visibility. |
| `python tests/postgres-smoke.py` | PASS | Real Auth.js HTTP sessions against PostgreSQL: sign-in, registration, DTR correction, retired daily-confirmation denial, class enrollment, notifications, policy/application, incident privacy, disabled-session denial and self-session revocation without revoking another user. |
| `python tests/http-smoke.py` | PASS | Four authenticated role routes, scoped snapshots, supervisor narrative exclusion, student unauthorized mutation denial, credential form, sign-out and anonymous denial. The placement assertion permits explicitly assigned cross-program fixtures. |
| `pnpm workflows:worker --once` | PASS | Actual Node worker entry point connected to the verification PostgreSQL database. Controlled-time reminder delivery was separately exercised by the PostgreSQL acceptance script. No claim of live email or a continuously hosted scheduler. |
| `node scripts/check-backlog-ui.mjs` | PASS: 14 checks | Edge/Playwright at 390, 820 and 1440px: recovery, HTE feedback, deadline dialog and reminder preference without page overflow; real save/revision and receipt; retained failed draft; visible keyboard focus; real date-only deadline creation; authorized admin provenance ledger. Only the deliberate HTTP 503 failure response was mocked. |
| `node .local/check-calendar-lint.mjs` | PASS: 10 checks | Responsive calendar defaults, manual mode retained across resize, selected gridcell and keyboard focus, type/status/sort filters and reset, and actual JSON/CSV/iCalendar downloads containing a freshly saved deadline. No browser runtime or hydration errors were observed. Local QA helper and screenshots are retained with the working copy. |

The lint-cleanup follow-up reran the full test suite, TypeScript, Prisma validation, production build, PostgreSQL isolation/HTTP checks, workflow worker and both browser checks. `node --check scripts/apply_layout_improvements.mjs` also passed without executing the old source-rewriting helper. The browser gate exposed a narrow-screen minimum-content sizing issue with long deadline labels; the phone card grid now uses `minmax(0, 1fr)` and the complete UI rerun passes.

The local production preview runs at `http://localhost:3100`, using the separate fictional database `practisync_backlog_verification_20261021` on the compose PostgreSQL service at port 5433. Environment overrides were per process; `.env` was not changed. Verification creates synthetic fixtures and does not target institutional data. Restart application/worker processes after migrations to avoid stale PostgreSQL prepared plans.

## UI finish record

Applied ui-craft-v3 to the Operate surfaces, retaining Inter and RTU navy/blue/gold. The forms have named primary actions, explicit labels, pending states, inline errors with retained input, versioned receipts and clear configuration limits. Reviewers can inspect legacy/verified/invalidation history independently of privacy-suppressed aggregates. Settings now offers actual own-session revocation and truthful unavailable MFA/digest states.

Screenshots and local logs are in `.local/backlog-5-8-evidence/` (ignored local artifacts):

- `supervisor-feedback-{390,820,1440}.png`
- `supervisor-feedback-error-390.png`
- `recovery-{390,820,1440}.png`
- `deadline-dialog-{390,820,1440}.png`
- `admin-provenance-1440.png`
- `calendar-lint-{390,820,1440}.png`, `calendar-lint-check.json`, `calendar-lint-ui.log`
- `ui-check.json`, `tests.log`, `build.log`, `lint.log`, `http-smoke.log`, `postgres-isolation.log`

Phone/intermediate/desktop renders were inspected. The failure and long-recommendation cases preserve readability; keyboard focus is visible. Reduced-motion preference was enabled for the responsive test contexts. Automated checks do not establish universal accessibility conformance.

## Remaining acceptance gates

1. Configure and validate the authorized RTU Google client, hosted-domain claims, invitation identity binding and provider-managed recovery with institutional test identities. Check email sender authorization, actual receipt, expired/reused links and bootstrap in that environment.
2. Integrate FEAT-01–04, including program rubric grants and document-wallet/clearance submission semantics, then repeat isolation acceptance for their reads, writes, downloads, exports, aggregates and workers.
3. Deployment, load/security evaluation, document-service interoperability, portfolio/export review and user-study results remain separate evidence.

Test counts and fictional ratings are technical development evidence. They are not study findings, university policy approval, security certification or production-readiness evidence.
