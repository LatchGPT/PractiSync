# PractiSync — production build prompt

Copy everything below into your coding agent. This is an implementation brief, not a request for another proposed prompt.

---

You are the senior full-stack engineer and security architect responsible for implementing PractiSync, a Cooperative Education / internship monitoring platform for one university with multiple departments and 30,000+ students.

Build working, reviewable software in the repository. Follow the confirmed requirements below, distinguish assumptions from facts, and verify each implementation phase. Do not call software production-ready merely because it compiles.

## 1. Confirmed product decisions

- This is a new project with no existing code or required folder structure.
- There is one university with multiple departments and courses/programs, such as IT, Business, and Education. Keep department and course distinct.
- There are exactly four roles: SUPER_ADMIN, COORDINATOR, SUPERVISOR, STUDENT.
- Super Admin assigns roles and manages institutional structure and account provisioning. Public registration must never grant privileged roles.
- Coordinators act as teachers. A coordinator can manage multiple blocks/sections through class spaces.
- Students join a class by entering an enrollment code, similar to Google Classroom.
- Supervisors control required internship hours per course. This is not a coordinator responsibility.
- Supervisors can oversee assigned students across different departments. Cross-department access does not mean access to every student.
- Verified supervisors with company posting permission manage internship openings for their company. Do not introduce a fifth company role.
- Students manually enter time-in/time-out and daily narratives. Their DTR is their own record; the company maintains its separate attendance record.
- No mandatory approval of each timestamp or DTR entry. A company supervisor may optionally verify accuracy or compare against company records.
- SOS reports identify the student and go to their coordinator first. There is no anonymous-reporting feature.
- Login uses username/password plus Google sign-in for university educational email accounts. Google sign-in alone does not establish institutional authorization.
- Demo sign-in uses an isolated environment with fictional data and one quick-sign-in account per role.
- Demo forms offer distinct “Generate samples” and “Autofill form” actions.
- No internship handbook, official competency rubric, document checklist, or institutional DTR template is available yet.
- No database provider or infrastructure budget has been selected.
- Backend foundations must precede dashboard development: complete schema, schema validation, authentication/authorization, and realistic seed data.

## 2. Assumptions to implement explicitly

Record these in docs/assumptions.md. They are changeable design defaults, not university policy:

1. A Tenant represents the university; departments are sub-units, not separate tenants. Keep tenant IDs to enforce the university boundary and support future expansion without building a university onboarding product now.
2. Super Admin grants selected verified supervisors course-policy management scope. Any verified company supervisor is not automatically allowed to change every course's hours. If several authorized supervisors edit the same policy, use version checks and audit history.
3. Required-hours policies are versioned per course and academic period. Snapshot the policy and required minutes onto each training placement. Changes do not silently rewrite existing student targets; explicit authorized migration is audited.
4. Each class space represents a coordinator-led block/section in an academic period. Every class has its own join code; a coordinator account has an identity distinct from its classes. Do not use a coordinator identifier as a universal enrollment secret.
5. Joining by valid code is immediate for an authenticated, eligible STUDENT. Enforce course/department/academic-period eligibility and model configurable enrollment restrictions. No client-selected role or teacher impersonation is possible.
6. One active placement and one primary internship class per student per academic period are initial defaults. Preserve enrollment and placement history, and keep this rule configurable rather than erasing historical records.
7. Submitted valid DTR minutes contribute to reported progress immediately. Supervisor-confirmed minutes are a separate metric. Do not label reported time as verified, and do not block progress on optional confirmation.
8. Formal completion/clearance is separate from an hours progress bar. Define a configurable completion checklist; do not automatically confer academic completion from self-reported hours alone.
9. SOS access goes to the student's class coordinator. Institutional escalation requires explicitly designated personnel and an audited access reason. Supervisor access is always denied; Super Admin role alone is not blanket access to case narratives.
10. Start with provider-neutral PostgreSQL and private object storage interfaces. Use local PostgreSQL for reproducible development, and document one reference cloud deployment after verifying compatibility. Do not combine multiple authentication systems.

Do not fabricate required-hour values, daily limits, breaks, grade scales, or clearance rules. Demo values must be labeled fictional. Production settings that are missing should show “Not configured” and block dependent operations with an actionable message.

## 3. Technology and repository

- Next.js App Router and React, strictly TypeScript with strict mode.
- pnpm workspace monorepo with Turborepo.
- PostgreSQL and Prisma Client with strongly typed queries and committed migrations.
- Auth.js for Google and credentials authentication. Verify the supported release, adapter compatibility, and session strategy before installing. If the requested v5 version is prerelease, report that fact and pin the selected version; never invent APIs or silently substitute Supabase Auth.
- Tailwind CSS, shadcn/ui, Lucide icons, Recharts.
- React Hook Form and Zod, with authoritative validation on the server.
- Resend for transactional email, a private AWS S3-compatible or verified private Vercel Blob implementation for documents, and @react-pdf/renderer for portfolios.
- Vitest or equivalent for unit/integration tests, Playwright for critical browser workflows, and real PostgreSQL for isolation/concurrency tests.

Suggested structure, adapting only with a documented reason:

```text
apps/web/                  # Next.js routes, server components, interactive leaves
packages/db/               # Prisma schema, configuration, migrations, client, seed
packages/auth/             # Auth.js configuration and typed identity helpers
packages/domain/           # Use cases, policies, repositories, domain services
packages/validation/       # Shared Zod inputs and typed DTO contracts
packages/ui/               # Shared visual components
packages/config/           # Shared TypeScript/lint configuration
packages/test-utils/       # Synthetic fixtures and test helpers
docs/                      # Architecture, assumptions, permissions, deployment
```

Keep server-only code and secrets out of browser bundles. Use Server Components for reads and client components only for interactive leaves. Do not require a long-running custom Next.js server.

## 4. Authorization and isolation

Create an explicit permissions matrix covering each resource and action. Route redirects and layouts are supplementary protections; enforce session, active account, role, scope, tenant, and resource ownership in every Route Handler, Server Action, and domain operation.

Use middleware or Proxy as appropriate for the installed Next.js version for coarse routing checks. Centralize authoritative authorization near the data through server-only services. Never treat a successful layout check as permission to invoke a mutation directly.

All IDs from forms, URLs, tokens, and requests are untrusted. Derive tenant and identity from the authenticated context. Resolve ownership and assignment on the server. Students access only their own private records. Coordinators access their class members. Supervisors access their assigned placements and company-scoped resources, across departments when assigned. Sensitive SOS authorization is a distinct policy.

Use composite foreign keys/unique constraints where appropriate to prevent cross-tenant relationships. Scoped repository APIs must cover reads, counts, exports, aggregates, nested operations, bulk changes, and raw SQL; do not assume adding a top-level tenant filter covers everything. Restrict unscoped Prisma access to narrowly reviewed infrastructure code. If PostgreSQL RLS is introduced, supply policies and tests; do not claim that RLS is enabled by merely using Supabase.

Tenant/user/assignment boundaries must also apply to cache keys, PDF jobs, file URLs, notifications, and analytics. Do not share private cached results across identities. Persist audit events for role changes, policy edits, enrollment changes, optional confirmations, clearance decisions, and sensitive case access. Do not put medical data, SOS narratives, passwords, OAuth secrets, or raw tokens in logs.

## 5. Schema coverage for all eight modules

Generate a complete schema.prisma first, along with a model map and any migration SQL needed for constraints Prisma cannot express. Prefer normalized relations over generic JSON for core academic records. Use UTC timestamps, explicit IANA timezone settings, integer minutes for time accounting, bounded strings, and enums/state machines with valid transitions.

Include the following domains, choosing consistent model names:

### A. Identity, institution, and classes

Auth.js-compatible identity/account/session/token models as required by the selected strategy; normalized unique usernames, account status, tenant memberships and roles; university, department, course/program, academic period, student and supervisor profiles; company and company memberships; verification status and explicit posting permission; scoped supervisor course-policy permissions; coordinator classes, enrollment records, secure join-code metadata, and placement-supervisor assignments.

Do not use a single global User.departmentId as the entire permission model. Users can supervise across departments and companies can have multiple supervisors. Deactivated accounts and removed assignments must lose access even if a previous JWT still exists.

### B. DTR and narrative engine

Training placements, versioned course hours policies, policy snapshots, daily entries and time intervals, narratives, correction/revision history, optional supervisor confirmations/disputes, and private company-record attachments.

Compute elapsed minutes on the server. Validate ordering, overlapping intervals, cross-midnight dates, breaks, future dates, and placement boundaries. A shift may cross midnight when explicit dates are supplied. Unknown institutional limits remain configurable.

Editing a confirmed entry must invalidate its previous confirmation while preserving history. Track original and changed values. Do not require emailed signature approval in the initial workflow; if added later, it must be optional and narrowly scoped.

Prefer derived sums over a mutable total-hours column. If materialized totals are needed, update with atomic deltas and idempotency protections inside transactions, and supply a reconciliation mechanism. Use conditional updates/version checks and bounded retries for conflicting writes. A transaction alone does not prevent double counting.

### C. Competency analytics

Versioned frameworks, competencies, course mappings, rubric dimensions and configured scales, baseline student assessments, supervisor final evaluations, dimension scores, submission status and evaluator assignments. Preserve rubric versions and evaluation history. Company feedback and curriculum gap analytics must use compatible cohorts/scales and disclose sample counts and missing data. Do not fabricate scores or normalize incompatible scales without a specified rule.

### D. Document clearance

Configurable document types and requirement sets, versioned student submissions, private storage metadata, review status, coordinator decisions/reasons, and expiry where configured. MOAs and medical clearances are example types; their legal/form requirements are not supplied.

Use direct signed uploads with server-authorized ownership and finalize verification. Check file size, actual type/signature, object metadata, and an allowed document format list. Quarantine until any configured malware scan succeeds. Never mark an upload approved merely because it exists. Authorize each download and return short-lived signed access; do not store public permanent URLs for sensitive files.

### E. SOS / incident handling

Identified reporter, associated placement/class, coordinator routing, case status, assigned case handlers, private messages, restricted attachments, escalation events, resolution records, and sensitive-access audit records. Enforce the same access rules for search, exports, counts, notifications, and background jobs. Emails should tell a coordinator to open the secure portal without including incident details. Show a clear fallback/escalation destination if no valid coordinator is assigned; never silently drop a report.

### F. Job board

Verified companies, company-scoped authorized supervisors, internship postings, skills/competencies, eligibility requirements, openings, application status/history, and placement linkage. Prevent duplicate active applications and unauthorized posting edits. Competency matching should be deterministic, explainable, and based on configured data, not invented AI ranking.

### G. Announcements

Draft/published announcements and explicit audiences: university, department, or class/section; read receipts and notification delivery as needed. Coordinators publish to their own classes by default. Broader publication requires explicit permission; a coordinator cannot target arbitrary departments or the whole university by supplying an ID.

### H. Legacy directory and portfolio

Company reviews by eligible completed students, moderation/publication state, directory profiles, completion/checklist records, and versioned portfolio export jobs with private artifact metadata.

The PDF Record of Training includes approved documents, submitted DTRs and narratives with their actual verification labels, submitted evaluations, policy target, and reported versus confirmed totals. Do not invent an “approved DTR” gate after approval was explicitly removed. Clearly identify missing items; generating a PDF does not certify completion. Provide reusable fictional portfolio content in demo mode, not institutional endorsements.

### Shared infrastructure

Notifications, transactional outbox events, background/export jobs, idempotency keys, and audit records. Add compound indexes matching scoped list, reporting, and date queries. Define restrictive deletion behavior and retention interfaces, without inventing mandatory retention periods. Archive historic academic records rather than casually cascading deletes.

## 6. Authentication and demo experience

Use one authentication system with credentials and Google. Credentials must be verified server-side using a maintained password-hashing implementation with appropriate parameters. Add rate limits, generic failure messages, safe recovery tokens, account status checks, and session revocation/authorization refresh. Never use browser storage as the authority for identity or roles.

Super Admin provisions or invites accounts and assigns roles. Secure initial Super Admin bootstrap with a one-time controlled process. Google sign-in must check provider-verified identity and configured educational domains; an educational-looking address is not sufficient. Use deliberate account linking and do not automatically merge identities based only on matching unverified email. Missing Google/domain configuration must be explicit, not replaced with a fake working button.

Demo mode uses a separate deployment and database with fictional data only. Do not gate it solely on NODE_ENV: an isolated hosted demo may legitimately run a production build. Use explicit deployment mode and server-side feature flags, and make the real institutional deployment refuse to enable demo sign-in or demo seeding.

Create one demo identity per role. In demo login, show “Sign in as Super Admin / Coordinator / Supervisor / Student.” Authenticate through the normal server-side Auth.js flow with a compatible session strategy and narrowly scoped demo identities; buttons must not fabricate sessions or accept arbitrary role strings. Do not ship real credentials or server secrets to client code. Show a persistent “Demo — fictional data” banner and prevent demo emails/uploads/jobs from affecting real recipients or production storage.

Document session limitations, demo reset behavior, rate limiting, and configuration. Do not provide a production authentication bypass disguised as a demo feature.

## 7. Generate samples and Autofill form

Implement reusable typed fixture generators shared by seed data and demo forms.

- “Generate samples” creates a valid synthetic preview for the current form without applying or saving it.
- “Autofill form” copies the preview into editable form fields. If no preview exists, generate one first.
- Preserve existing input unless the user explicitly chooses to replace it. Provide clear/reset or undo behavior.
- Mark values as sample data and require manual submission. Filling a form does not enroll, submit an application, save a DTR, publish a job, or create an incident.
- Support demos of profiles, DTR/narratives, baseline assessments, supervisor evaluations, job postings, applications, announcements, reviews, and incident reporting.
- Never autofill signatures, real medical facts, official clearance approvals, hidden authorization fields, tenant/role values, or secrets. A fake document is a clearly labeled fixture, never an actual medical clearance.
- Generate dates within the seeded placement and valid intervals; select foreign keys only from records the current user is allowed to access.
- Use the same server-side validators on submitted sample data as on normal input. Demo flags must never weaken authorization.
- Hide sample controls in the real institutional deployment, unless a separate non-persisting feature is explicitly authorized later.

## 8. Scaling and cloud operations

30,000 students is a population target, not a proven concurrency level. Document workload assumptions and measure performance before promising capacity.

Use cursor pagination, bounded list/export requests, indexed scoped queries, selective DTOs, and server-side aggregation. Avoid retrieving the whole student population for client-side charts. Cache only with correct authorization boundaries and invalidation. Place compute/storage near the database and use pooled database connections appropriate to the pinned Prisma version/provider; document separate migration connection requirements.

Use durable queues/workflows and an outbox for emails, large exports, scanning, and other slow work. Do not depend on in-memory timers, local filesystem persistence, or fire-and-forget promises after a serverless response. Keep external network calls outside database transactions. Jobs require retries, deduplication, tenant context, failure state, and execution-time permission checks.

Provide .env.example without secrets, a reproducible local setup, CI checks, migration deployment instructions, backup/restore verification, structured redacted logs, error monitoring, and a deployment runbook for one verified reference path on Vercel or AWS. Report provider costs/limits as unknown until selected and checked. Do not deploy externally unless the user authorizes deployment.

## 9. Phased execution with evidence

Work in dependency order. Inspect the repository first, preserve existing files if any, and read applicable AGENTS.md instructions. Consult official documentation for version-dependent APIs. Pin compatible versions and commit the lockfile. Do not mix syntax from different major Prisma or Next.js versions.

### Phase 1A — complete schema before UI

Produce the architecture decisions, assumptions, permissions matrix, monorepo foundation needed for Prisma, complete schema covering all eight modules, migration SQL, indexes/constraints, and a relationship/model map.

Run the installed version's schema formatter, validator, client generation, and migrations against disposable PostgreSQL. Report actual command results. Do not start dashboards until the schema is validated. If a database is unavailable, clearly identify migration/runtime checks as unrun rather than claiming success.

### Phase 1B — identity and authorization

Implement Auth.js credentials/Google integration, typed session helpers, trusted context, scoped data-access services, protected operations, role management, class join-code logic, supervisor course-policy scope, and isolated demo authentication. Choose an Auth.js session strategy compatible with the credentials provider and adapter; do not invent unsupported adapter behavior. Add only the minimal authentication UI needed to exercise these foundations.

### Phase 1C — realistic seed

Create seed.ts with deterministic, repeatable synthetic data and explicit demo-only execution guards. Include all four demo accounts, multiple departments/courses, academic periods, one coordinator with multiple classes, students enrolled through valid class relationships, verified and pending companies, and one supervisor assigned students from at least two departments.

Cover every module, including configured fictional hours policies, different placement stages, DTRs with reported and optionally confirmed entries, assessments with compatible rubric versions, pending/approved/rejected sample documents, private incident cases, job openings/applications, scoped announcements, completion records, company reviews, and portfolio data.

Include edge-case fixtures for revoked assignments, invalid/expired class codes, unconfigured requirements, rejected documents, corrected confirmed entries, and authorization-negative tests. Default seed volume should be manageable. Supply a separate optional bulk fixture generator for 30,000+ synthetic students; do not create that volume by default or put an expensive bulk seed inside one giant transaction.

Complete Phase 1A–1C before frontend dashboards. At this checkpoint, report files changed, model coverage, assumptions, tested commands, unrun checks, and remaining integration configuration. If the user has authorized only Phase 1, stop here; otherwise continue through the phases below.

### Phase 2 — core workflows and dashboards

Build distinct role layouts and functional dashboards over real scoped queries. Implement classes/enrollment, placements/course policies, DTR/narratives, optional company confirmation, document workflows, and SOS routing. Then build competency analytics, job board, announcements, directory/reviews, and portfolio exports.

Use accessible responsive UI, clear empty/loading/error states, paginated tables, and readable charts. Render real data and actual statuses; do not substitute hard-coded chart values outside explicit demo fixtures. Client controls are conveniences, not authorization.

### Phase 3 — verification and deployment readiness

Run build/type/lint checks and focused unit/integration/browser tests. Use real PostgreSQL tests for constraints, concurrent writes, and tenant isolation. Add measurable load-test scenarios without claiming capacity until executed. Finish the runbook and report what is ready versus what needs configured providers or institutional decisions.

## 10. Required acceptance checks

1. A student changing another student's identifier cannot read/update their DTR, rubric, documents, incidents, or PDF.
2. A supervisor can access assigned students across departments but cannot access unrelated students or SOS cases.
3. A coordinator can manage several classes and see their enrolled students, but cannot target unrelated classes or globally publish without permission.
4. An authenticated eligible student can join by code; invalid, revoked, expired, or brute-forced codes fail safely. Enrollment is idempotent and does not change roles.
5. Only authorized supervisors change course-hour policies. Existing placement targets remain stable unless explicitly migrated with an audit event.
6. Manual DTR submission counts reported minutes without approval. Optional confirmation changes the confirmed metric only; concurrent repeats never double count, and later edits invalidate confirmation.
7. Unverified companies cannot publish openings. Verified company supervisors cannot manage another company's postings.
8. Google login does not automatically grant privilege. Deactivated users and revoked assignments lose access despite stale session claims.
9. Demo login and synthetic seeding fail closed in the institutional environment. Sample generation/autofill never submit automatically.
10. Private files, emails, jobs, exports, and analytics obey the same permissions as their source records.
11. Rubric comparisons preserve scale/version meaning, and portfolio PDFs distinguish reported from confirmed time and missing from completed requirements.
12. Schema validation, migration application, client generation, authentication smoke tests, and idempotent seed execution are evidenced, or clearly reported as blocked/unrun.

## 11. Anti-hallucination and delivery rules

- Treat confirmed requirements as authoritative; do not reintroduce mandatory DTR approvals, anonymous SOS, a fifth role, or coordinator control of course hours.
- Treat institutional rules and templates as unavailable. Label fictional seed rules and keep production policy configurable.
- Never invent package APIs, provider credentials, official domains, performance results, legal compliance certification, or successful test output.
- For technical choices that can be resolved safely, choose a documented default and proceed. Ask only when a missing answer materially blocks correctness; continue independent work meanwhile.
- Validate inputs on the server, return explicit error states, and never hide failures behind mock success responses.
- Provide complete executable files, not pseudocode, ellipses, TODO-based authorization, or broad any types.
- Keep a running checklist linking requirements to models, workflows, and meaningful tests. Record unimplemented work honestly.

Begin now with Phase 1A. Briefly state your implementation assumptions and selected compatible stack versions, then create and validate the complete database schema before implementing authentication and seed data. Proceed through the phased build within the authorization given; do not skip the database-first sequence.
