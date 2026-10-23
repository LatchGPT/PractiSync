# Privacy consent validation

Validated on October 24, 2026. Implementation and validation cover all eight requested phases. No notice placeholders were filled, and no deployment was performed.

## Repeatable checks

| Check | Result |
| --- | --- |
| `pnpm check` (the repository's strict TypeScript check) | Passed |
| `pnpm lint` | Passed with 21 existing warnings and no errors |
| `pnpm test` | 222 passed across 25 Vitest files |
| `pnpm db:validate` | Passed |
| `pnpm test:privacy:e2e --max-failures=1` | 14 passed; none skipped or flaky |
| `pnpm exec next build` with a dedicated test database/build directory | Passed |
| PostgreSQL 17 isolated-schema checks | Passed; schema removed after validation |

The normal `pnpm build` script also applies database migrations. Database rollout remains an operator step via `pnpm db:migrate`; the production-build check used the dedicated local test database.

## Requested coverage

| Requirement | Evidence |
| --- | --- |
| No row, ACCEPTED, DECLINED, WITHDRAWN, and a new policy version | `tests/consent.test.ts` |
| Cross-tenant isolation and authentication-to-student mappings | `tests/consent.test.ts`, `tests/consent-api.test.ts` |
| Consent API Zod validation; reject client user/tenant/policy IDs and metadata | `tests/consent-api.test.ts` |
| New unregistered student is gated before registration | Playwright: `a new unregistered student is gated before student registration` |
| Direct URL access is redirected; API access returns 403 CONSENT_REQUIRED | Playwright: `direct URLs and API calls are gated; accepting preserves the destination and refresh never re-prompts` |
| Accept flow and session refresh | The direct-URL Playwright case and four separate role cases |
| Decline stays on the page, survives refresh, then permits re-consent | Playwright: `declining stays on the gate, survives refresh, and permits reconsideration` |
| A published version re-gates an existing user immediately | Playwright: `a newly published version re-gates an existing accepted user on the next request` |
| Withdrawal defeats an old accepted JWT and a protected page still redirects | Playwright: `withdrawal defeats a still-accepted token and the database page guard returns to the gate` |
| Language toggle is remembered and saved as Filipino | Playwright: `language selection persists and the consent row records Filipino` |
| One test per STUDENT, COORDINATOR, SUPERVISOR, SUPER_ADMIN | Four separately named Playwright role cases |
| Forged session consent/identity claims cannot grant access | Playwright session-update case and `tests/consent-api.test.ts` |
| Notice changes during review reject a stale acceptance | Playwright stale-notice case, plus a publication race in `tests/consent.test.ts` |
| Settings confirmation, cancellation, withdrawal, re-consent and history | Playwright Settings case; `scripts/check-privacy-settings.mjs` covers all roles and error recovery |
| Every protected API is guarded | `tests/consent-route-coverage.test.ts` checks all 17 protected Route Handler files |
| Safe return destinations, including sign-in/consent nesting | `tests/consent-paths.test.ts` |
| Policy uniqueness, immutable text and append-only history | `tests/privacy-policy.test.ts` and PostgreSQL 17 DDL checks |
| Reminder delivery excludes withdrawn users | `tests/consent-api.test.ts` exercises actual reminder delivery |
| BullMQ work is skipped before document reads and rechecked before publishing | `tests/native-document-worker.test.ts` |
| History pagination, same-timestamp ordering and omission of IP/user-agent data | `tests/consent.test.ts`, `tests/consent-api.test.ts` and PostgreSQL 17 history checks |
| Public notice keeps all seven placeholders | Playwright public-policy case |

## PostgreSQL and UI verification

PostgreSQL 17 checks used a new, disposable schema in the local PostgreSQL 17 service. They applied the actual migration and verified the bilingual seed against the source notice, enum casts, same-account concurrent writes, monotonic choice ordering, withdrawal, version publication, duplicate-publication rollback, stale-version rejection, tenant isolation, history cursors, and metadata omission. A separate rolled-back DDL check verified UPDATE/DELETE/TRUNCATE rejection, invalid language rejection, tenant foreign keys, immutable notice content, and the single-current-policy index.

Additional Playwright UI checks from Phases 4–6 rendered the consent gate and Privacy settings at 390, 820 and 1440 pixels. They exercised keyboard acknowledgement, focus after reconsideration, Cancel as the dialog's initial focus, retained input after network failures, retained history after pagination failures, and redirection after a saved withdrawal even if session refresh failed. Screenshots are retained in `.local/privacy-evidence` and `.local/privacy-settings-evidence`.

## Delivery notes

- The application uses its existing Auth.js core credentials/JWT flow and existing account/tenant isolation. Consent belongs to the authenticating runtime `users` record, represented by Prisma `DemoUsers`.
- The approved bootstrap exceptions remain public: Auth.js, login configuration, account recovery/invitation claiming, and Industry Partner registration. Guest evaluation requires account sign-in and consent.
- Existing unrelated edits in `packages/db/demo.ts` and pre-existing content in `app/page.tsx` were preserved. Existing generated video/output/scratch files were left in place.
- Baseline TypeScript errors and stale test fixtures/expectations were repaired with the user's approval. Generated toolkit/video artifacts were excluded from application linting; application lint rules were not disabled.
- The source manifest is `docs/privacy-consent-files.md`. Policy operations and the complete unfilled-placeholder list are in `docs/privacy-policy.md`.
