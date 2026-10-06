# PractiSync Development Roadmap

Created: October 6, 2026  
Status: Team planning baseline; institutional policies still require client validation.

## Objective and agreed defaults

Prepare an honest working prototype for adviser/client review, then develop the agreed core system for a controlled capstone pilot. Priorities follow dependencies and acceptance gates, without invented dates or estimates.

- First complete presentation preparation: disable misleading controls, rehearse the demo, prepare a status table, and disclose missing outcomes features.
- The first pilot uses fictional records for one client-selected program and all four roles. A separate synthetic program supports isolation tests.
- Conflicts between the BRD and earlier build brief require a recorded client decision before dependent implementation. Preserve current behavior meanwhile.
- Disable and label unsupported controls rather than implementing all security features before the presentation.
- Real-data use is a separate readiness and authorization gate.
- Owners remain unassigned until the team allocates tasks. No hosting provider, budget, institutional rule, or deadline is assumed.

Sources: [BRD](PractiSync_BRD.md), [build brief](build-brief.md), [implementation checklist](checklist.md), [permissions](permissions.md), [assumptions](assumptions.md), and [verification history](validation.md).

This document records planned work. Creating it does not complete any milestone or change application APIs, types, database schemas, or policies.

## Current baseline

| Area | Existing evidence | Remaining work or limitation |
|---|---|---|
| Roles and authentication | Four demo roles, credentials sign-in, server-enforced scopes | Institutional onboarding, recovery, and agreed program permissions |
| Attendance | Manual entry, calculated hours, overlap prevention, corrections, optional confirmation | Reconcile BRD approval/locking policy; richer task logs |
| Coordinator monitoring | Class management, section filters, student profiles, progress cards | Accurate aggregates beyond snapshot limits; enrollment integrity |
| Evaluations | Fixed four-dimension student baseline and supervisor final assessment | Dynamic rubrics, supervisor mid-term, weighted scoring, feedback, release controls |
| Documents | Fictional metadata and scoped review decisions | Real private files, versions, configurable checklists, clearance |
| Incidents and announcements | Student-to-coordinator reports and scoped announcements | Approved escalation/access rules, delivery, deadlines, reminders |
| Portfolio | User-triggered PDF training record | Selected items, approved template, richer verified competency evidence |
| Backend | Running D1 demo; PostgreSQL reference schema and migration | Institutional repository integration and live migration/concurrency verification |
| Verification | Latest merge: 33 tests, type check, build, lint with warnings, four-role HTTP sign-in/render checks | Visual/browser workflow QA, load measurements, client UAT |

Baseline evidence is historical, not a claim that future changes pass. A schema definition, visible control, or successful build alone does not prove workflow completion. The implementation checklist must be reconciled with the latest code, especially enrollment approval.

## Milestone tracker

Use `Not started`, `In progress`, `Blocked`, or `Verified`. Mark a milestone `Verified` only after its completion criteria pass and evidence is linked. Marking a task complete requires the intended behavior, not just code being written.

| Priority | Milestone | Status | Owner | Evidence | Pending decisions |
|---|---|---|---|---|---|
| 0 | Presentation readiness | Not started | Unassigned | Pending | Presentation date and participants |
| 1 | Requirements baseline | Not started | Unassigned | Pending | Policy conflicts, pilot scope and materials |
| 2 | Institutional backend and reliable records | Not started | Unassigned | Pending | Runtime/database approach and permissions |
| 3 | Attendance and daily tasks | Not started | Unassigned | Pending | Verification, corrections, duration rules |
| 4 | Outcomes-based evaluation | Not started | Unassigned | Pending | Rubrics, scoring, release and correction rules |
| 5 | Document wallet and clearance | Not started | Unassigned | Pending | Checklists, file rules, lifecycle conditions |
| 6 | Incident response and communications | Not started | Unassigned | Pending | Escalation, audiences, delivery rules |
| 7 | Analytics, reports and portfolios | Not started | Unassigned | Pending | Report definitions and export template |
| 8 | Fictional-data capstone pilot | Not started | Unassigned | Pending | Participants, targets, evaluation instrument |
| 9 | Real-data readiness | Not started | Unassigned | Pending | Institutional authorization and operational policies |
| 10 | Lower-priority improvements | Not started | Unassigned | Pending | Client-approved backlog ordering |

The order is the default execution sequence. Independent preparation may proceed early, but policy-dependent work must wait for its decisions. Promote any later feature required by the accepted pilot scope before milestone 8; do not silently defer a Must-have requirement.

## 0. Presentation readiness

**Purpose:** Complete the four agreed preparation items before presenting.  
**References:** NFR-FS-03, NFR-US-04, NFR-US-06, and BRD section 18.  
**Prerequisites:** None; use fictional data only.

- [ ] Audit settings and other controls for claims unsupported by server behavior.
- [ ] Disable and label unavailable password changes, two-factor authentication, session revocation, email delivery, reminders, and other unfinished capabilities.
- [ ] Remove unsupported success messages and active/synced/operational claims, including defaults and saved browser preferences that imply protection exists.
- [ ] Retain working appearance preferences with accurate browser-local labeling.
- [ ] Prepare a requirement status table: working, partial, planned, and awaiting decision; include evidence and limitations.
- [ ] Rehearse student attendance -> coordinator monitoring/document review -> supervisor confirmation/current assessment using fictional records.
- [ ] Explicitly identify the current assessment as a demo; disclose missing dynamic rubrics, supervisor mid-term evaluation, and structured feedback.
- [ ] Prepare questions and requests for actual rubrics, requirement checklists, DTR templates, clearance rules, and report examples.

**Completion gate:** The walkthrough succeeds; unsupported controls cannot claim success; presentation materials match inspected behavior.  
**Evidence:** Walkthrough checklist, control audit, status table, and meeting agenda linked in the tracker.

## 1. Agreed requirements baseline

**Purpose:** Establish one consistent, traceable basis for implementation.  
**References:** Modules A-D, F, H, K; business rules; BRD sections 18.4 and 20.  
**Prerequisites:** Milestone 0 review materials prepared; client/adviser decisions required for dependent work.

- [ ] Resolve the decision register below with the appropriate client/adviser representative.
- [ ] Confirm rubric ownership, evaluation stages, scoring, result release, and approved correction procedures.
- [ ] Confirm placement eligibility, pre-deployment clearance, academic periods, and formal completion rules.
- [ ] Record each decision with source, date, affected requirement IDs, and validation status.
- [ ] Reconcile the BRD, build brief, permissions, assumptions, and implementation checklist.
- [ ] Confirm the pilot program and representative participants.
- [ ] Define accepted Must-have pilot requirements and explicitly deferred Should/Could-have work.
- [ ] Map each accepted requirement to an implementation task and acceptance scenario.

| Decision | BRD position | Earlier brief/current behavior | Resolution |
|---|---|---|---|
| Organizational isolation | Program tenant | University tenant with departments/courses; coordinator class scope | Pending client decision |
| DTR workflow | Verification queue, approved entries locked | Reported progress immediately; optional confirmation; corrections invalidate confirmation | Pending client decision |
| Required-hours ownership | COE or Program Admin | Explicitly authorized supervisors | Pending client decision |
| Incident reporting/access | Multiple reporter roles; COE access | Student reporting; narratives restricted to reporter and coordinator | Pending client decision |
| Enrollment | Not clearly specified | Brief: immediate eligible joining; current implementation: approval request | Pending client decision |

**Completion gate:** Policies needed by the next milestone are agreed; unresolved items explicitly block their dependent work. Draft assumptions are never labeled client-approved.  
**Evidence:** Decision log, approved scope, updated requirements, and traceability table.

## 2. Institutional backend and reliable core records

**Purpose:** Build dependable records and authorization before extending core features.  
**References:** Module A, FR-K01, NFR-SE-03/04, NFR-OT-03/04.  
**Prerequisites:** Relevant milestone 1 decisions; confirmed institutional runtime/database approach.

- [ ] Confirm runtime/database integration before substantial new work on the reduced demo adapter.
- [ ] Integrate PostgreSQL repositories with authentication and domain workflows; preserve demo/institutional separation.
- [ ] Verify committed migrations and reproducible fictional seeding on a fresh database.
- [ ] Implement the agreed program/class/assigned-student permission model and server-backed session revocation.
- [ ] Complete student-HTE-supervisor assignment and reassignment with history retained.
- [ ] Limit enrollment approval to the intended active placement/period; preserve history and recheck eligibility at approval.
- [ ] Validate representative membership on the server.
- [ ] Replace snapshot-derived overall totals with scoped server aggregates; paginate detail lists.
- [ ] Complete account import/onboarding required by the accepted pilot scope.
- [ ] Refactor touched dashboard and action code into focused modules where needed to keep these changes reviewable.

**Completion gate:** Fresh setup works; forbidden access fails; aggregates remain correct beyond list limits; enrollment/reassignment preserves history.  
**Evidence:** Setup instructions, migration results, permission tests, historical-record tests, and aggregate fixtures.

## 3. Attendance and daily task workflows

**Purpose:** Complete the agreed operational record of OJT work.  
**References:** Module C; approved amendments to DTR requirements.  
**Prerequisites:** Milestone 2 and agreed attendance policies.

- [ ] Implement agreed verification, corrections, and locking behavior.
- [ ] Clearly distinguish reported and verified hours.
- [ ] Implement agreed duration limits and manual/late-entry handling without inventing institutional values.
- [ ] Add task skills/competency tags and supervisor comments; tags depend on milestone 4 competency definitions.
- [ ] Preserve revision and audit history.

**Completion gate:** Known examples produce correct totals; overlap, invalid dates, stale updates, unauthorized access, and corrections follow agreed rules.  
**Evidence:** Calculation fixtures, access/concurrency tests, and student/supervisor walkthroughs. Competency tags may finish alongside milestone 4.

## 4. Outcomes-based evaluation

**Purpose:** Deliver the capstone's central outcomes-based contribution.  
**References:** Modules B and D; BR-03, BR-04, BR-15.  
**Prerequisites:** Milestone 2; approved rubrics, scoring, and evaluation policies.

- [ ] Let coordinators configure competencies, indicators, descriptors, weights, and program/stage assignments.
- [ ] Support rubric preview, publication, and immutable historical versions.
- [ ] Block publication when weights do not total 100%.
- [ ] Add supervisor mid-term/final windows, draft saving, submission, and locking.
- [ ] Compute weighted totals and competency scores on the server.
- [ ] Capture structured industry feedback.
- [ ] Implement agreed result release and approved correction workflows.

**Completion gate:** Coordinator publishes rubric -> supervisor evaluates -> server computes scores -> coordinator releases results -> student views progress. Rubric changes never alter historical results.  
**Evidence:** Manual calculation comparisons, version-preservation tests, authorization tests, and complete workflow demonstration.

## 5. Document wallet, clearance, and lifecycle

**Purpose:** Replace sample metadata with a complete requirement-to-clearance workflow.  
**References:** Module F and approved lifecycle/completion rules.  
**Prerequisites:** Milestone 2; approved checklist, storage/file rules, and clearance conditions.

- [ ] Configure requirement checklists by program and stage.
- [ ] Implement private uploads, authorized downloads, file validation, and resubmission history.
- [ ] Support review decisions with required remarks.
- [ ] Issue clearance only when agreed conditions are met.
- [ ] Derive lifecycle progress from authoritative records and approved rules.

**Completion gate:** Upload -> review -> resubmission -> clearance works; missing requirements block clearance; unauthorized file access fails.  
**Evidence:** File-handling tests, version history, clearance tests, and student/coordinator walkthrough.

## 6. Incident response and communications

**Purpose:** Support timely, confidential coordination.  
**References:** Modules H and J; FR-D02/D08.  
**Prerequisites:** Milestone 2 and approved incident/audience/delivery rules; integrate with milestones 4-5.

- [ ] Implement agreed reporter roles, categories, severity, access, escalation, notes, and history.
- [ ] Add deadline calendars and evaluation/document reminders.
- [ ] Add targeted announcements, notifications, delivery tracking, and supported preferences.
- [ ] Keep confidential incidents out of portfolios and HTE-facing analytics.

**Completion gate:** Intended recipients receive notifications; retries avoid duplicates; reminders use agreed schedules; incident access follows the approved matrix.  
**Evidence:** Delivery/retry tests, audience tests, incident audit/access tests, and deadline walkthrough.

## 7. Analytics, reports, and portfolios

**Purpose:** Turn verified operational/evaluation data into useful evidence.  
**References:** Modules E and I; FR-K02/K03.  
**Prerequisites:** Relevant workflows in milestones 3-6 and approved report definitions/template.

- [ ] Add student, cohort, program, and university views with permitted filters.
- [ ] Show sample sizes, missing data, compatible rubric versions, and configurable skill-gap indicators.
- [ ] Produce evaluation-completion and requirement-compliance reports.
- [ ] Aggregate structured industry feedback.
- [ ] Add PDF/CSV exports and selectable portfolio items with accurate verification labels.

**Completion gate:** Metrics match fixtures; capped lists do not distort totals; exports contain only authorized, selected information.  
**Evidence:** Aggregate tests, known report examples, exported PDF/CSV inspection, and confidentiality tests.

## 8. Fictional-data capstone pilot

**Purpose:** Validate the accepted system with representative users before real-data use.  
**References:** BRD section 18; approved NFR targets.  
**Prerequisites:** Accepted Must-have workflows verified; program, participants, targets, and instrument agreed.

- [ ] Execute accepted requirements/use cases with representative users across all four roles.
- [ ] Verify program isolation using a second synthetic program.
- [ ] Test desktop/mobile usability, keyboard access, and interrupted submissions.
- [ ] Measure performance against agreed targets; report actual results.
- [ ] Conduct the adviser-approved ISO 25010 evaluation.
- [ ] Record defects; fix critical/high-severity issues and retest.
- [ ] Compile evidence, user feedback, deferred requirements, and limitations for adviser/client review.

**Completion gate:** Accepted pilot requirements pass; unresolved limitations are disclosed; adviser/client reviews the evidence.  
**Evidence:** UAT results, performance measurements, usability findings, survey analysis, defect/retest log, and review record.

## 9. Real-data readiness

**Purpose:** Establish a separate institutional-use gate. Fictional pilot completion does not authorize real records.  
**References:** Module A, FR-K05, NFR-SE-01 through SE-09.  
**Prerequisites:** Pilot review and approved operational/privacy decisions.

- [ ] Complete account recovery, supervisor invitations, and required security workflows.
- [ ] Verify private storage protections and production authorization/configuration.
- [ ] Configure monitoring and backups; test restoration.
- [ ] Obtain approved privacy, retention, hosting, and incident-escalation decisions.
- [ ] Verify demo isolation from institutional records.
- [ ] Obtain explicit institutional authorization before introducing real records.

**Completion gate:** Operational/security evidence and authorization are recorded; no outstanding critical/high-severity defects remain.  
**Evidence:** Recovery/restore tests, configuration review, approved policies, monitoring checks, and authorization record.

## 10. Lower-priority improvements

**Purpose:** Expand beyond the accepted core without distracting from pilot delivery.  
**References:** Module G and deferred Should/Could-have requirements.  
**Prerequisites:** Accepted pilot core complete; reprioritize anything needed for acceptance earlier.

- [ ] Expand job search, posting management, automatic expiration, and application workflows.
- [ ] Add rubric templates, richer feedback themes, and report refinements.
- [ ] Add optional conveniences and further visual polish.
- [ ] Expand to more programs after isolation and distinct program workflows pass.

**Completion gate:** Each enhancement passes its agreed acceptance scenarios and preserves existing workflows.  
**Evidence:** Enhancement-specific tests, updated traceability, and user review.

## Verification and change control

- Test security and data integrity within each milestone, not only at pilot time.
- Run appropriate type, lint, unit/integration, build, and workflow checks. Record warnings and verification limits.
- Add browser tests for critical journeys. Use real PostgreSQL for institutional migration and concurrency evidence.
- Verify exported documents visually and compare calculations against known examples.
- Keep unsupported functionality disabled until implemented and verified.
- Link evidence before marking tasks/milestones verified; record blocked dependencies and next actions.
- Reorder work only for a documented dependency or approved scope change. Update requirements and acceptance scenarios together.
- Never invent completion, approval, survey findings, capacity, or institutional policy.

## Progress entry template

Copy this entry beneath the relevant milestone when work advances:

```text
Date:
Milestone / requirement IDs:
Owner:
Status:
Completed behavior:
Verification and evidence:
Warnings / limitations:
Pending decisions / blockers:
Next action:
```
