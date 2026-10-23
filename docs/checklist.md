# Requirements and honest implementation status

| Requirement | Implementation | Verification / remainder |
|---|---|---|
| Database first | PostgreSQL 17, Prisma client/migrations, demo-compatible mapped tables, guarded fixture seed | Fresh local migration applied; full PostgreSQL workflow checks recorded in `validation.md` |
| Login first with four demo roles and regular form | Auth.js JWT credentials provider, CSRF, managed secret, PBKDF2 password hashes | HTTP smoke checks |
| Google educational login | Disabled explicit UI | Provider/domain/linking setup remains; no fake success |
| Roles/scope/revocation | Current account/version each request, tenant filtering, placement/class scope | Negative domain tests |
| Institution/accounts | Departments/courses, admin account provisioning/role/session revocation, scope grants | Typed server validation; demo IDs protected |
| Multiple classes/code enrollment | Coordinator create/revoke/copy, scoped eligible join | Invalid/expired/revoked/idempotent tests |
| Placements | Scoped seeded assignments; HTE-selected applications require coordinator confirmation; coordinator activates planned placement on/after its start date | Placement transfer/history UI and automated future activation remain |
| Hours policies | Supervisor grants, version checks, snapshotted targets | Migration workflow remains disabled |
| DTR/narratives | Submit/correct, minutes derived, overlap checks/triggers, versioned history | Reported/confirmed separation preserved; PostgreSQL overlap and transaction checks recorded in `validation.md` |
| Optional accuracy confirmation | Assigned HTE supervisor can confirm only time on its active placements; no narrative or document access | Assignment removal and role-scoped reads tested |
| Competencies | Course-configured weekly/monthly student self-assessments; HTE final 1–5 rubric with evidence; coordinator review/revision and release; period DTR context | Configurable outcome frameworks/rubrics, weighted analytics, and live PostgreSQL integration remain |
| Documents | Seeded sample metadata and original Word document generation | Private document storage and scanning remain unconfigured |
| Identified SOS | Reporter/coordinator scope, routing, status/resolution, sensitive access audit | Messages/escalation interfaces and institutional fallback config remain |
| Company and internship workflow | HTE creates company profile; Super Admin verifies it; HTE submits posts; university approves each post; HTE shortlists/declines; coordinator confirms placement | Profile/post editing and institutional registry verification remain |
| Applications | Student course eligibility and duplicate prevention; HTE sees applicants only for own published company posts | Configurable matching and application withdrawal remain |
| Announcements | Admin university or own coordinator class audiences | Department permissions/read receipts/outbox remain |
| Company directory/reviews | Student reviews after formal completion; coordinator moderation; HTE sees anonymous approved feedback only after five distinct placements in the same period | PII detection in free-text comments and true institutional completion checklist remain |
| HTE without a profile | Coordinator-only private host record and separate-code, expiring, revocable, single-use rubric link; coordinator reviews before student release | Email delivery and real HTE identity verification remain unconfigured |
| Internship completion forms | Final competency self-assessment and internship exit survey unlock at the reported DTR target; coordinator review is available; both submitted forms remain required for completion | Institution-approved question sets/versioning and live PostgreSQL verification remain |
| Sample generation/autofill | Separate preview/autofill/replace/undo/manual submit | No role/secrets/signatures/clearance autofill |
| Scaling/operations | Indexes, bounded demo reads; guarded, resumable optional PostgreSQL synthetic-student generator | PostgreSQL cursor pagination, queues, cloud runbook/load measurements remain; generator database run untested |
| App Router/monorepo | Native Next.js root, pnpm workspace domain/auth/db/validation packages | Local Next/PostgreSQL verification recorded in `validation.md`; Vercel preview remains to be configured before retiring the previous Cloudflare deployment path |
| Role dashboards | Distinct student, coordinator, Super Admin, and limited HTE portal using scoped records and links to existing workflows | HTTP smoke passed for original three roles; HTE flow domain checks added; visual browser QA remains unrun |
| RTU-inspired demo theme | Blue and gold interface, diagonal academic band motif, updated favicon and login copy; fictional data remains identified | Build and served CSS checks pass; exact official brand specifications were not supplied and visual browser QA remains unrun |
