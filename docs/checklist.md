# Requirements and honest implementation status

| Requirement | Implementation | Verification / remainder |
|---|---|---|
| Database first | 68-model PostgreSQL schema + migration + client; separate demo adapter | Format/validate passed; live PostgreSQL unrun |
| Login first with three demo roles and regular form | Auth.js JWT credentials provider, CSRF, managed secret, PBKDF2 password hashes | HTTP smoke checks |
| Google educational login | Disabled explicit UI | Provider/domain/linking setup remains; no fake success |
| Roles/scope/revocation | Current account/version each request, tenant filtering, placement/class scope | Negative domain tests |
| Institution/accounts | Departments/courses, admin account provisioning/role/session revocation, scope grants | Typed server validation; demo IDs protected |
| Multiple classes/code enrollment | Coordinator create/revoke/copy, scoped eligible join | Invalid/expired/revoked/idempotent tests |
| Placements | Real scoped seeded assignments and history | New placement provisioning, transfer/history UI remain |
| Hours policies | Supervisor grants, version checks, snapshotted targets | Migration workflow remains disabled |
| DTR/narratives | Submit/correct, minutes derived, overlap checks/triggers, versioned history | Reported/confirmed separation; PostgreSQL concurrency unrun |
| Optional accuracy confirmation | Assigned supervisor per-entry version confirmation | Repeated confirmation and correction invalidation tested |
| Competencies | Course-configured weekly/monthly student self-assessments, coordinator approval/revision, period DTR context, approved-score trends; earlier baseline/final records retained read-only | Framework administration, real institution rubric, and live PostgreSQL integration remain |
| Documents | Seeded metadata, scoped coordinator decisions | Actual private upload/download/scanning blocked until configured |
| Identified SOS | Reporter/coordinator scope, routing, status/resolution, sensitive access audit | Messages/escalation interfaces and institutional fallback config remain |
| Jobs/applications | Verified company publish, course eligibility, uniqueness, company decisions | Posting edit/archive UI and configurable matching remain |
| Announcements | Admin university or own coordinator class audiences | Department permissions/read receipts/outbox remain |
| Company directory/reviews | Published reviews; formal completion eligibility; coordinator moderation | True completion checklist rules remain unconfigured |
| Portfolio | User-triggered PDF with labels/missing records/scoped data | Private queued/versioned export artifacts remain unconfigured |
| Sample generation/autofill | Separate preview/autofill/replace/undo/manual submit | No role/secrets/signatures/clearance autofill |
| Scaling/operations | Indexes, bounded demo reads; guarded, resumable optional PostgreSQL synthetic-student generator | PostgreSQL cursor pagination, queues, cloud runbook/load measurements remain; generator database run untested |
| App Router/monorepo | App Router root preserved for Sites; pnpm workspace domain/auth/db/validation packages | Hosted Vinext/D1 deviation explicitly documented |
| Role dashboards | Distinct student, coordinator, and Super Admin overviews using scoped records and links to existing workflows | Worker sign-in/render checks pass for all three demo roles; visual browser QA remains unrun |
| RTU-inspired demo theme | Blue and gold interface, diagonal academic band motif, updated favicon and login copy; fictional data remains identified | Build and served CSS checks pass; exact official brand specifications were not supplied and visual browser QA remains unrun |
