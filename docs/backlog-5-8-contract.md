# Tasks 5–8 implementation contract

Decision date: 2026-10-21 (Asia/Manila). Approved in the planning conversation.

## Institutional scope (FEAT-08A)

A tenant is a university. Departments and courses/programs are university-owned subdivisions, not separate tenants. Classes belong to a program and coordinator; students join eligible classes. A coordinator may own classes in multiple programs but has no implicit authority over other coordinators' classes. Program rubric authoring requires an explicit program grant, to be implemented by FEAT-01. University school forms remain university-owned; publication authority stays with Super Admin.

An HTE company belongs to a university tenant. The same real company operating at another university requires a separate scoped company record. An approved supervisor accesses only actively assigned placements at their approved company, across programs where assigned. Revocation removes future access immediately. Super Admin oversees university records but gains no sensitive incident access from that role alone.

All ownership comes from authenticated server identity, not payload role/tenant fields. Background work carries an explicit tenant and rechecks resource ownership. Runtime writes and audit rows must carry that tenant. Existing fictional records are retained; migrations are additive. No university onboarding product or department-to-tenant conversion is included.

The manuscript must describe university tenancy with program/class scope. Two fictional universities plus multiple programs are required for the eventual PostgreSQL isolation gate. FEAT-08B remains open until FEAT-01–04 integration has passed that gate.

## Product choices

- FEAT-05: supervisor-only direct submissions, verified against the live company and assignment at submission. Legacy records remain unverified. Verified history survives assignment removal; Super Admin may invalidate with an audited reason. Analytics select the latest eligible verified response per placement, retaining every revision.
- FEAT-06: prepare RTU Google sign-in; staff require invitations/preassigned roles. HTEs and authorized domain exceptions use local accounts. Never merge identities by email alone. Activation lasts 24 hours, recovery 30 minutes; both are single-use. Real OAuth/email and institutional readiness require separately authorized configuration and verification.
- FEAT-07: in-app document deadline reminders at 09:00 Manila three days and one day before the deadline. Date-only cutoffs end at 23:59. Submitted/approved linked obligations suppress reminders; correction requests permit remaining future slots. No reminder email or assessment workflow is included yet.

## UI design contract

Product and users: HTE supervisors submitting attributed feedback, university reviewers inspecting its origin, account holders recovering access, and coordinators scheduling document deadlines.

Surface: Operate. Primary actions: Submit feedback; Send recovery link / Set password; Save deadline. University provenance ledger is read-first; invalidation is a separate, confirmed destructive action.

Reuse: Inter; RTU navy, blue, gold and semantic tokens; current compact spacing, 8px controls, 12px panels, Lucide icons, shared dialogs and inline feedback. Preserve the existing identity. No decorative motion is necessary; pending and focus feedback suffice.

Real content: evaluator, entering account, company, assignment, authorship/verification, timestamps, version, invalidation reason, deadline, Manila reminder times, document linkage and delivery state. No fabricated metrics or institutional readiness claims.

Required states: loading, first-use/no-results, error with retained input, success/receipt, stale version, denied/revoked access, pending submission, unavailable OAuth/email and invalid/expired/used tokens. On small screens use a single-column form and contained table scrolling. Do not treat generated document downloads or seeded metadata as submission evidence.

Out of scope: academic rubric design/weights, midterm workflow, document clearance/storage policy, real institutional activation, reminder email, deployment and real student/employer data.

## Finish gate

Run unit/integration checks, TypeScript, lint, build and schema validation. Inspect phone/intermediate/desktop renders, keyboard/focus, long content and failure states. Record actual PostgreSQL, provider, worker and delivery evidence separately from mocks. Preserve baseline failures and identify new failures. Update Obsidian notes with source revision, adapter, results and limitations; paper claims follow evidence.
