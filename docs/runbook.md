# Runbook and verification

## Hosted demo

The app starts on `/` with username/password sign-in and three role choices. Auth.js issues the actual encrypted cookie session; changing browser state does not establish identity. All protected reads/actions reload the current account and version. Fictional demo identities: demo.student, demo.coordinator, demo.admin. The username/password form can exercise these sample accounts with the clearly fictional password `Demo@2026!`; this is not an institutional secret. Quick demo buttons use fixed server-checked IDs through the same credentials provider.

Sites runtime variables: DEPLOYMENT_MODE=demo, DEMO_ENABLED=true, AUTH_SECRET is a managed secret. D1 binding DB is dedicated to this Site. Schema migrations run before deployment. First sign-in calls idempotent, guarded seed; INSERT OR IGNORE supports concurrent initialization. No emails or object writes are made. Demo mutations persist and are shared across accounts. No automatic reset or real production recipient is configured.

Coordinators configure the weekly, monthly, or combined competency assessment cadence per course in Competency Insights. Students submit one self-assessment per enabled calendar week (Monday–Sunday) or month, using a date within their placement and no later than today in Philippine time. Daily DTR entries remain separate and appear as read-only context beside the assessment. Coordinators approve submissions or request a revision with a note; the student can resubmit a requested revision. Earlier baseline/final demo evaluations remain read-only in history. Existing courses receive a weekly default that coordinators can change.

Run `pnpm install`, set local .dev.vars using .env.example keys, and `pnpm build`. Apply every pending D1 migration in numeric order before starting the app or signing in. For an existing local database, include `0004_coordinator_features.sql`, `0005_notifications.sql`, and `0006_periodic_assessments.sql` if they have not yet been applied; `0005` also handles a notifications table already created by an earlier demo seed. Use `pnpm exec wrangler d1 execute site-creator-d1 --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/<migration>.sql` for each pending file. Use only a fresh disposable local database when applying migrations from zero. Run `pnpm test`, `pnpm check`, `pnpm lint`.

## PostgreSQL institutional reference

`docker compose -f packages/db/docker-compose.yml up -d` provisions disposable PostgreSQL 17 locally. Set DATABASE_URL, then run `pnpm db:validate`, `pnpm db:generate`, and `pnpm db:migrate`. The complete 68-model schema has scoped composite foreign keys, indexes, generated initial SQL, and additional checks/partial indexes.

For an optional load fixture in a disposable **DEMO** PostgreSQL tenant with an existing active course, set `DEPLOYMENT_MODE=demo`, `DEMO_ENABLED=true`, `BULK_DEMO_CONFIRM=synthetic-only`, and `DATABASE_URL`. Run `pnpm db:bulk-demo --tenant TENANT_ID --course COURSE_ID --count 30000`. The generator inserts users, STUDENT memberships, and profiles in batches of 500, uses deterministic IDs and `skipDuplicates` so interrupted runs can resume, and creates no credentials or placements. `--dry-run true` previews the first and last records without connecting to a database. It refuses institutional tenants. A database run has not been verified here.

Live PostgreSQL migrations and concurrency/load scenarios have not run in this environment. The current institutional repository integration is not complete. Deploying the hosted demo adapter with institutional mode intentionally refuses access. Integrate Prisma scoped repositories, authenticated Google account linking, recovery/bootstrap, explicit completion configuration, private object scanning/signed uploads, durable outbox/queues, Resend, provider configuration, retention and measured capacity before real usage. Do not present the hosted demo as the full production platform.

## Verification performed

- Prisma 6.19.3 schema validate passed for 68 models.
- Prisma Client 6.19.3 generation passed.
- Initial PostgreSQL migration SQL generated, additional invariant constraints committed; application to PostgreSQL unrun.
- Hosted demo schema includes 28 tables and extra scope/overlap triggers. SQLite integration tests use actual SQLite with transactions, not mocked query results; this is not a substitute for PostgreSQL concurrency tests.
- Domain suite includes tenant/resource denials, supervisor cross-department and revoked-assignment behavior, SOS privacy including Super Admin denial, multiple coordinator classes, invalid/expired/revoked code checks, enrollment idempotency, supervisor-only policy scope/versioning and stable targets, reported vs confirmed DTR, repeated confirmations, correction history/invalidation, application eligibility/duplicate checks, completed-placement review rule, cross-midnight intervals, and sample-generation no-submission.
- Auth.js HTTP smoke tests, type checks, build, and lint results are recorded in validation.md after running.
- Full browser/visual QA and WebMCP runtime validation are unavailable because the required managed control-browser capability is absent. No browser pass is claimed.

## Load scenarios (not executed)

Start with measured workload: 30,000 provisioned fictional students, 500 simultaneous signed-in readers, 50 DTR submissions/sec for 10 minutes, coordinator scoped aggregates, policy/version contention and export queue bursts. Set explicit p95 latency/error-rate goals with operators and measure connection pool saturation. Use cursor pagination, scoped server aggregation, tenant/user cache keys and bounded queue work before production. Population is not a concurrency proof.

Password runtime compatibility was also checked inside the actual Workers-compatible Miniflare runtime: both PBKDF2 Web Crypto and Node/OpenSSL methods at 600,000 iterations completed. The implemented hash uses the Node-compatible built-in implementation.
