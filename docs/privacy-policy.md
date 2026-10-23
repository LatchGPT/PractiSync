# Privacy policy publication

The initial RTU notice is version `2026-10-24`, effective October 24, 2026 in Philippine time. The PostgreSQL migration and the local SQLite migration seed the same English and Filipino text from `packages/privacy/initial-policy.ts`. Existing users receive no automatic consent records.

Apply database migrations with `pnpm db:migrate`. `pnpm db:seed` can also install the initial policy into an empty policy table; it never replaces or reactivates an older policy. Local demo databases install the equivalent SQLite migration when opened.

Regenerate the Prisma client with `pnpm db:generate` when installing the schema change. On Windows, stop application processes that have loaded Prisma's query-engine DLL before generating the client if Windows reports a file lock. The source schema and migration are validated independently of client generation.

To publish another version, create a JSON file with exactly these fields:

```json
{
  "version": "2026-10-25",
  "titleEn": "PractiSync Privacy Notice",
  "bodyEn": "Full revised English notice in markdown",
  "titleFil": "Abiso sa Pagkapribado ng PractiSync",
  "bodyFil": "Buong binagong abiso sa Filipino, sa markdown",
  "effectiveAt": "2026-10-25T00:00:00+08:00"
}
```

On or after the effective date, run:

```sh
pnpm privacy:publish -- --file path/to/policy.json
```

The command reads the configured environment and database. For a local SQLite demo, set `PRACTISYNC_LOCAL_DEMO=true`, `DEPLOYMENT_MODE=demo`, and `DEMO_ENABLED=true`; optionally set `PRACTISYNC_LOCAL_DEMO_PATH`. PostgreSQL publication takes a table lock; SQLite uses its write transaction. Publication atomically retires the current policy and inserts the new one. Duplicate versions or other failures roll back the entire change. Future effective dates are rejected because publication is immediate, not scheduled.

Policies are global to this RTU installation. Consent belongs to the authenticated runtime account (`users`, represented by Prisma `DemoUsers`), with a composite user/tenant foreign key. The separate institutional `User` model is not the account table used by the current authentication implementation. Student identity mapping must not transfer consent between accounts.

Policy content is immutable once stored; publish a new version for changes, including corrections. Consent rows cannot be updated or deleted. PostgreSQL also blocks truncation of the policy and consent tables. Do not edit an applied migration or rewrite consent history. The publication script is an operator command, not a public API.

## Consent server API (Phase 3)

`requireConsent(identity)` in `packages/privacy/consent.ts` reads the current policy and the account's latest consent in one database query. It throws a `ConsentRequired` error with HTTP status `403` and code `CONSENT_REQUIRED` unless the latest choice for that policy is `ACCEPTED`. A missing current policy fails closed with `503 PRIVACY_POLICY_UNAVAILABLE`. No consent value is taken from the JWT or cached between requests. Mapped student records use `authenticationId`, so another student's acceptance never substitutes for the account owner's choice.

`GET /api/consent/status` requires a valid session but does not require prior consent or completed student registration. It returns:

```json
{
  "status": null,
  "language": null,
  "recordedAt": null,
  "required": true,
  "policy": {
    "id": "privacy-2026-10-24",
    "version": "2026-10-24",
    "effectiveAt": "2026-10-23T16:00:00.000Z"
  }
}
```

The response is `private, no-store` and includes an ETag containing the quoted policy version. It does not expose IP addresses, user agents, or another account's consent.

`POST /api/consent` requires a valid session, a matching `Origin`, `Content-Type: application/json`, and a JSON object of at most 4 KiB:

```json
{"action":"ACCEPT","language":"en"}
```

Actions are `ACCEPT`, `DECLINE`, or `WITHDRAW`; languages are `en` or `fil`. Extra fields, including user ID, tenant ID, IP address, and user agent, are rejected. The server takes the authenticated account and tenant from the session-backed identity. It captures a valid IP address from the existing forwarding-header convention and the user-agent header; unavailable values are stored as null. Deployment proxies must supply or sanitize forwarding headers if IP attribution is needed.

The page should send `If-Match: "2026-10-24"` using the version it displayed. This optional precondition preserves compatibility with the specified two-field body while letting the UI reject a stale notice with `409 CONSENT_POLICY_CHANGED`. A policy change during the append also fails without recording a choice against the unseen version. Each successful request appends a row and returns its ID, status, language, recorded timestamp (`createdAt`), and policy summary. Neither consent nor a checkbox value is inferred from a previous acceptance.

PostgreSQL takes a policy-table share lock and an account-row lock while appending. SQLite serializes the write transaction. Recorded timestamps increase for that account and policy even within one millisecond or after a clock adjustment, so a withdrawal cannot lose to an earlier acceptance because of a timestamp tie. The SQLite runtime also installs the composite user/tenant unique index required by its consent foreign key.

## Gate and enforcement (Phases 4–5)

`/consent` is a standalone page with the bilingual notice, saved language preference, unchecked acknowledgement, Accept/Decline actions, reconsideration, and sign-out. `/privacy` is the public standalone policy page. Both display the stored version and effective date and preserve every placeholder. The markdown renderer escapes text and does not interpret raw HTML. A successful acceptance refreshes the Auth.js session through its CSRF-protected session endpoint and returns to the safe original path, including its query string, or the role dashboard. An already accepted user refreshes their session without being asked to consent again.

The JWT callback derives `consentVersion` from the database on sign-in and session update; it never trusts client-supplied consent claims. `proxy.ts` compares that token claim against the live current version for a convenience redirect. Database checks remain authoritative for withdrawal and every policy version, including when a token still says accepted or proxy lookup fails.

Protected dashboard layouts and page identity loading call the page guard. Workspace snapshots and every mutation entering `packages/domain/actions.ts` also check consent. Every protected `app/api` Route Handler uses `withConsent`; a coverage test verifies the complete route inventory. Blocked API calls return `403 CONSENT_REQUIRED` rather than an HTML redirect. Guest evaluation now requires sign-in and consent before its existing separate access-code checks.

The approved public exceptions are consent endpoints, Auth.js sign-in/sign-out/session/bootstrap endpoints, public policy and static assets, login configuration, account recovery/invitation claiming, and Industry Partner registration. These preserve the paths needed to establish an account and reach the gate. Student registration APIs require consent first.

Reminder recipient selection checks current consent both when selecting recipients and inside notification delivery. BullMQ document jobs carry the authenticated account ID, check its active tenant-scoped account and consent before reading documents, and check again before saving converted output. Older jobs without an owner are skipped. Document cache/job identities include the account ID. Account invitation/recovery mail remains a bootstrap exception; expiration and retention housekeeping continue to run.

## Settings → Privacy (Phase 6)

Students, coordinators and Super Admins have a Privacy tab in the existing Settings view. Industry Partner supervisors have a Settings · Privacy link in their portal. Every role can also open the protected `/settings/privacy` page. Both views reuse the same privacy panel, showing current status, current policy version and effective date, the latest acceptance date for that version, and the account's complete history through cursor pagination. Dates are displayed in Philippine time.

The panel explains that withdrawing prevents use of PractiSync and opens a confirmation dialog with Cancel focused by default. Confirming appends `WITHDRAWN` through `POST /api/consent`, refreshes the Auth.js session, and redirects to the gate. If session refresh fails after a successful withdrawal, the redirect still occurs and database enforcement remains effective. The user can agree again and return to Privacy settings. Cancel and failed submissions do not append a choice; after a network failure with an unknown result, retrying is safe because history is append-only.

`GET /api/consent/history` is an authenticated consent-management endpoint, available before student registration or consent. It derives account/tenant scope from the signed-in identity, including historical student mappings. It returns `{ state, acceptedAt, history, nextCursor }`. Each history entry contains only its ID, status, language, recorded timestamp, and policy ID/version/effective date. IP addresses and user agents are excluded. Pages contain at most 50 entries; pass the returned opaque cursor as `?cursor=...` for the next page. Invalid cursors return `400 INVALID_REQUEST`. A cursor never selects another user or tenant.

## Verification

The repeatable Playwright suite is `pnpm test:privacy:e2e`. It starts and stops its own local Next.js server at `http://localhost:3115`, uses a dedicated `.local/privacy-e2e.sqlite` database, and runs the requested consent scenarios as 14 named tests, including one for each role and a newly created student before registration. Microsoft Edge is the configured headless browser. Tests run with one worker because policy publication is global. The harness follows the app's canonical localhost origin. Existing application processes and the working demo database are not used.

The HTML report is `.local/privacy-playwright-report/index.html`; JSON results are `.local/privacy-playwright-results.json`; failure screenshots/traces are under `.local/privacy-playwright-results`. Test data is fictional. No test setup grants consent through the application's ordinary seed. The coverage matrix and final verification results are in `docs/privacy-consent-validation.md`; the complete source-file manifest is in `docs/privacy-consent-files.md`.

The local browser checker uses a dedicated `.local/privacy-*.sqlite` file and never grants consent in the working demo. Start an isolated preview using PowerShell:

```powershell
$env:PRACTISYNC_BUILD_DIR='.next-privacy-dev'
$env:PRACTISYNC_LOCAL_DEMO_PATH=Join-Path (Get-Location) '.local/privacy-ui.sqlite'
node scripts/dev-demo.mjs --port 3105
```

In another terminal run `node --import tsx scripts/check-privacy-consent.mjs`. It uses local Microsoft Edge through Playwright, tests the gate and acceptance for all four roles, decline/reconsideration, language persistence, API denial, session-claim forgery, withdrawal, new policy publication, stale notices, public policy access, and mobile/intermediate/desktop layouts. It publishes test policies only in the dedicated SQLite file and saves screenshots under `.local/privacy-evidence`. Override `PRACTISYNC_BASE_URL` and `PRACTISYNC_PRIVACY_TEST_DB` together when using another isolated test server.

For Settings validation, start the same isolated preview with `PRACTISYNC_LOCAL_DEMO_PATH` set to `.local/privacy-phase6-ui.sqlite`, then run `node --import tsx scripts/check-privacy-settings.mjs`. That checker defaults to the same dedicated database and tests all four roles, shared Settings tabs and supervisor navigation, acceptance metadata, cancellation, withdrawal errors/retry, session-refresh failure after withdrawal, pagination errors/retry, re-consent, and signed-out access. Screenshots are saved under `.local/privacy-settings-evidence`. Both checkers leave the working demo untouched.

Rights wording was checked against the National Privacy Commission's [Data Subject Rights](https://privacy.gov.ph/data-subject-rights/), [Data Privacy Act](https://privacy.gov.ph/data-privacy-act/), and [implementing rules](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/). The access condition describes PractiSync's requested behavior and does not claim that Philippine law requires consent as the sole basis for all processing.

## Unfilled placeholders

- `[HOSTING PROVIDER AND DATA LOCATION: currently local development, to be filled in before deployment]`
- `[LIST]` (email and storage services)
- `[5 YEARS, placeholder]` (student records; confirm the period and its starting point)
- `[1 YEAR, placeholder]` (login logs; confirm the period and its starting point)
- `[DPO NAME]`
- `[DPO EMAIL]`
- `[DPO PHONE/OFFICE]`
