# Business Requirements Document (BRD)

## PractiSync: An Outcomes-Based OJT Management System with Competency Tracking, Automated Evaluation, and Industry Feedback

**Institution:** Rizal Technological University (RTU), Institute of Computer Studies
**Project Owner / Business Sponsor:** Cooperative Education Office (COE)
**Project Team:** Abacial, Charles Aeriel F. · Ayhon, Latch Crisford D. · Gabriel, Jericho A. · Torres, Albert B. · Vicente, Leibern R.
**Degree Program:** Bachelor of Science in Information Technology (Capstone Project)

---

## 0. Document Control

| Field | Value |
|---|---|
| Document Title | PractiSync Business Requirements Document |
| Version | 0.1 (Draft for review) |
| Status | Draft |
| Prepared By | PractiSync Capstone Team |
| Reviewers | Capstone Adviser, COE Office, Program Coordinators |
| Source Material | PractiSync Capstone Manuscript (Preliminary Pages, Chapter I, and chapter placeholders) |
| Last Updated | October 2026 |

### 0.1 Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 0.1 | Oct 2026 | Capstone Team | Initial draft derived from Chapter I of the manuscript |

### 0.2 Reading Guide

This document serves three audiences:

- **Capstone panel and adviser:** Sections 1–6, 14, 17, and 18 show the problem, objectives, scope, and traceability back to the manuscript.
- **COE Office and Program Coordinators (the client):** Sections 3, 7, 8, 9, 12, and 19 show the business needs, workflows, and acceptance criteria.
- **Development team:** Sections 9–16 give the requirements, use cases, data, and quality targets to build and test against.

### 0.3 Conventions

- **Requirement IDs:** `BR-` Business Requirement, `FR-` Functional Requirement, `NFR-` Non-Functional Requirement, `UC-` Use Case, `AC-` Acceptance Criterion, `BO-` Business Objective, `R-` Risk, `A-` Assumption, `OQ-` Open Question.
- **Priority (MoSCoW):** **M** Must have, **S** Should have, **C** Could have, **W** Won't have (this release).
- Items marked **[ASSUMPTION]** are not stated in the manuscript. They were inferred and need stakeholder confirmation (see Section 20).

---

## 1. Executive Summary

On-the-Job Training (OJT) is a mandatory practicum where students apply classroom knowledge in a real workplace. At RTU it is coordinated by the Cooperative Education Office (COE) across multiple degree programs and many Host Training Establishments (HTEs). Today it relies on paper documents, separate files, and informal communication, which makes attendance, hours, daily activities, requirements, and evaluations hard to monitor. Students also have little access to past HTE information or industry feedback when choosing placements.

**PractiSync** is a university-wide, multi-tenant web platform that centralizes OJT administration and adds outcomes-based capabilities that existing OJT systems emphasize less: a **dynamic competency framework** with custom rubrics per program, **automated multi-party evaluation** (mid-term and final) by HTE Supervisors, and **competency analytics** that show student strengths, skill gaps, and curriculum-relevant trends.

The platform serves four roles through role-based access control (RBAC): **COE Office (Super Admin)**, **Program Coordinators (Program Admins)**, **HTE Supervisors**, and **Students**. Its feature set covers:

- Digital Daily Time Record (DTR)
- Document Clearance and Document Wallet
- Competency Analytics
- OJT Job Board
- Incident Reporting
- E-Portfolio (automated PDF)
- Broadcast Alerts
- Deadline Calendar and Reminders

The system will be evaluated against four ISO/IEC 25010:2011 quality characteristics: **Functional Suitability, Performance Efficiency, Usability, and Security**.

---

## 2. Project Background and Business Context

### 2.1 Background

OJT lets students complete training hours, submit documents, record activities, and receive evaluations from HTEs. Effective monitoring and management are needed so students finish their practicum requirements, gain relevant experience, and reach the expected learning outcomes.

### 2.2 Problem Statement

OJT management that depends on paper forms, separate files, and informal channels causes these problems:

| # | Problem | Impact |
|---|---|---|
| P1 | Attendance and rendered hours are recorded on paper DTRs | Hard to verify, easy to lose or misreport, slow to consolidate |
| P2 | Daily activities and task logs are not centrally recorded | Little evidence of what students actually did or learned |
| P3 | Requirements and clearances are collected as physical or scattered files | Slow verification, unclear compliance status, repeated resubmission |
| P4 | Evaluations are not standardized across programs or HTEs | Inconsistent measurement of learning outcomes |
| P5 | Industry feedback is not structured or reusable | Weak basis for curriculum improvement |
| P6 | Information on previous HTEs and placement opportunities is limited | Students cannot make informed OJT decisions |
| P7 | Communication happens through informal channels | Missed deadlines, unclear announcements, delayed incident response |
| P8 | Separate systems per department would be needed for differing rubrics | Duplicated effort, no university-wide view |

### 2.3 Related Work and Gap

The manuscript cites existing digital approaches to OJT management:

- **Cabalbag and Ontiveros (2024):** a Management Information System for tracking OJT trainees, with document submission, monitoring, announcements, and feedback.
- **Castro (2024):** a mobile-based internship monitoring system for recording attendance, tasks, and forms, with faculty and partner-agency monitoring and evaluation.
- **Aban et al. (2025), *Trackternship*:** internship tracking, document management, progress monitoring, reporting, and employability prediction.

**Identified gap:** Existing systems show the value of centralization but give less emphasis to **student competencies, structured industry feedback, and outcome-based evaluation**. PractiSync addresses this gap by integrating the major OJT processes with a configurable competency framework.

### 2.4 Business Opportunity

A single platform managed by the COE Office can reduce administrative workload, standardize evaluation across programs, give students a verified record of achievements, and give the university data-backed insight into competency trends.

---

## 3. Business Objectives and Success Measures

### 3.1 General Objective (from manuscript)

Develop, implement, and evaluate PractiSync, a university-wide, multi-tenant OJT management system that centralizes OJT administration, facilitates automated multi-disciplinary evaluations, and tracks student competencies for RTU under the management of the COE Office.

### 3.2 Business Objectives

| ID | Business Objective | Manuscript Source |
|---|---|---|
| BO-1 | Provide a multi-tenant platform with RBAC for COE Office, Program Coordinators, HTE Supervisors, and Students across different courses | Specific Objective 1 |
| BO-2 | Enable Program Coordinators to create, assign, and manage custom evaluation rubrics per degree program through a dynamic Competency-Based Analytics module | Specific Objective 2 |
| BO-3 | Integrate OJT management tools (Digital DTR, Document Wallet, OJT Job Board, Incident Reporting) to streamline monitoring and safety | Specific Objective 3 |
| BO-4 | Evaluate software quality using ISO/IEC 25010:2011 (Functional Suitability, Performance Efficiency, Usability, Security) through end-user assessment | Specific Objective 4 |
| BO-5 | Reduce administrative workload through digital verification and centralized records | Significance of the Study |
| BO-6 | Give the university data-backed insight into competencies, skill gaps, and industry trends | Significance of the Study |
| BO-7 | Give students a verified, portable record of skills, certificates, and OJT documents | Significance of the Study |

### 3.3 Success Measures (Proposed KPIs) **[ASSUMPTION]**

The manuscript sets no numeric targets. The values below are proposed baselines for the panel and COE to confirm or adjust.

| KPI | Measure | Proposed Target |
|---|---|---|
| Adoption | Share of enrolled OJT students with an active account and at least one DTR entry | ≥ 95% of the pilot cohort |
| DTR digitization | Share of DTR entries recorded in-system versus paper | ≥ 90% |
| Verification turnaround | Median time from document submission to coordinator decision | ≤ 2 working days |
| Evaluation completion | Share of mid-term and final evaluations submitted by HTE Supervisors before deadline | ≥ 85% |
| Competency coverage | Share of students with a complete competency profile at end of OJT | ≥ 90% |
| Software quality | Mean rating on each ISO 25010 characteristic from end users | ≥ 4.0 / 5.0 ("Very Good" or better) |
| Availability (pilot) | Uptime during the OJT evaluation period | ≥ 99% |
| Admin workload | Self-reported reduction in manual record handling by COE/Coordinators | ≥ 30% |

---

## 4. Scope

### 4.1 In Scope

1. **Multi-tenant architecture** that separates data, users, and access by organizational unit (program/department) under the COE Office.
2. **Role-Based Access Control** for four roles: COE Super Admin, Program Admin (Program Coordinator), HTE Supervisor, Student.
3. **Dynamic Competency Framework:** configurable competencies, skills, and rubrics per program.
4. **Digital DTR:** electronic logging of attendance and rendered hours, with HTE Supervisor verification.
5. **Daily Activity and Task Logs:** recorded by students, reviewed by HTE Supervisors.
6. **Mid-term and Final Performance Evaluations** by HTE Supervisors using standardized digital rubrics (automated evaluation).
7. **Competency Analytics:** individual, cohort, program, and university views.
8. **Document Clearance:** digital submission, verification, and clearance processing of OJT requirements.
9. **Document Wallet:** centralized secure storage of student OJT documents.
10. **OJT Job Board:** HTE-related opportunities and information visible to students.
11. **Incident Reporting:** secure reporting and tracking of workplace incidents.
12. **E-Portfolio:** verified electronic portfolio with **automated PDF export**.
13. **Broadcast Alerts:** announcements from the COE and Coordinators to targeted groups.
14. **Deadline Calendar and Reminders.**
15. **Industry Feedback** capture through HTE Supervisor evaluations and feedback fields.
16. **Software quality evaluation** per ISO/IEC 25010:2011 (Functional Suitability, Performance Efficiency, Usability, Security).

### 4.2 Out of Scope (Limitations from the manuscript)

| # | Exclusion |
|---|---|
| X1 | Biometric devices or dedicated biometric hardware |
| X2 | Any other physical hardware integration |
| X3 | GPS-based geofencing or location monitoring to verify attendance or OJT location |
| X4 | Automated grading through physical hardware or specialized equipment |
| X5 | Processes outside the defined OJT management scope |
| X6 | Guarantee that analytics fully represent a student's actual skills or performance (insights depend on submitted data and evaluations) |

### 4.3 Out of Scope for This Release **[ASSUMPTION]**

- Native mobile applications (a responsive web app is assumed).
- Integration with the university's student information system or payroll (manual or CSV import is assumed; see OQ-4).
- Payment processing, allowances, or stipend management.
- Employability prediction (cited in related work but not in PractiSync's stated scope).

### 4.4 Dependencies on User Behavior

Effectiveness depends on accurate data entry, user compliance, available devices, and network connectivity. These are accepted limitations, not defects.

---

## 5. Stakeholders

| Stakeholder | Role in Project | Interest / Needs | Influence |
|---|---|---|---|
| COE Office (Super Admin) | Business sponsor, system owner | University-wide oversight, user and record management, consolidated reporting | High |
| Program Coordinators (Program Admins) | Primary operational users | Verify documents, monitor compliance, customize rubrics per degree program | High |
| HTE Supervisors | External evaluators | Review task logs, verify hours, submit evaluations with minimal effort | Medium |
| Students | Primary beneficiaries | Track hours and requirements, build e-portfolio, find OJT opportunities | Medium |
| University Administration | Beneficiary | Data for curriculum updates and program improvement | Medium |
| Capstone Adviser and Panel | Academic oversight | Rigor, objectives met, quality evaluated per ISO 25010 | High |
| Development Team | Builders | Clear, testable requirements | High |
| Future Researchers | Secondary | Reference for further study | Low |

---

## 6. User Roles and Access Model

### 6.1 Role Definitions

| Role | Definition |
|---|---|
| **COE Super Admin** | Manages the whole platform: tenants (programs), users, HTE records, system settings, and university-wide reports. |
| **Program Admin (Program Coordinator)** | Manages one or more program tenants: students, documents, rubrics and competencies, evaluations, and compliance for that program. |
| **HTE Supervisor** | Reviews task logs, verifies rendered hours, and submits mid-term and final evaluations for assigned students. |
| **Student** | Submits requirements, records DTR and activities, monitors progress, manages the e-portfolio, and uses the job board. |

> **Note on terminology:** The manuscript uses "OJT Coordinators" in the narrative and "Program Coordinators (Program Admins)" in the objectives. This BRD treats them as the same role. Please confirm (OQ-1).

### 6.2 Permission Matrix

Legend: **C** create · **R** read · **U** update · **D** delete · **A** approve/verify · **—** no access · *own* = own records only · *program* = own program tenant only · *assigned* = assigned students only

| Capability | COE Super Admin | Program Admin | HTE Supervisor | Student |
|---|---|---|---|---|
| Manage tenants (programs) | CRUD | — | — | — |
| Manage user accounts | CRUD (all) | CRU (program) | — | U (own profile) |
| Manage HTE records | CRUD | R / propose | R (own HTE) | R |
| Student-HTE assignment | CRUD | CRUD (program) | R (assigned) | R (own) |
| Competency framework and rubrics | R (all) | CRUD (program) | R (assigned) | R (own) |
| Digital DTR | R (all) | R (program) | R / A (assigned) | CRU (own) |
| Daily task logs | R (all) | R (program) | R / A (assigned) | CRU (own) |
| Mid-term / final evaluation | R (all) | R (program) | C / U (assigned) | R (own, once released) |
| Document submission | R (all) | R / A (program) | R (assigned) | C / R (own) |
| Document Clearance | R / A (all) | R / A (program) | — | R (own status) |
| Document Wallet | R (all) | R (program) | R (assigned, limited) | CRUD (own) |
| OJT Job Board | CRUD | CRUD (program) | C / U (own HTE posts) | R |
| Incident Reports | R (all) | R / manage (program) | C / R (assigned) | C / R (own) |
| E-Portfolio | R (all) | R (program) | — | CRU (own) |
| Broadcast Alerts | C (all) | C (program) | — | R |
| Deadline Calendar | CRUD (global) | CRUD (program) | R | R |
| Competency Analytics | R (university) | R (program) | R (assigned) | R (own) |
| Audit logs | R | R (program) | — | — |

---

## 7. Business Process Overview

### 7.1 As-Is (Current State)

1. The student secures an HTE (often informally) and collects paper requirements.
2. The Coordinator checks documents manually and tracks status in spreadsheets or folders.
3. The student keeps a paper DTR and activity record, signed by the HTE supervisor.
4. The Coordinator consolidates hours and evaluation forms at the end of the term.
5. Announcements go through chats or posted notices.
6. Incidents are reported verbally or by message with no formal tracking.
7. No consolidated competency data exists for curriculum review.

### 7.2 To-Be (Future State with PractiSync)

```
 COE Super Admin ──► creates Program tenants, accounts, HTE records
        │
 Program Admin ──► configures competencies and rubrics, assigns students to HTEs,
        │           sets deadlines, broadcasts alerts
        ▼
     Student ──► submits documents ─► Coordinator verifies ─► Clearance issued
        │
        ├──► logs DTR and daily tasks ─► HTE Supervisor verifies
        │
        ├──► reports incidents ─► routed to Coordinator / COE
        │
        ├──► browses OJT Job Board
        │
 HTE Supervisor ──► submits mid-term and final evaluations (rubric-based)
        │
        ▼
 Competency Analytics (per student / cohort / program / university)
        │
        ▼
 E-Portfolio (automated PDF)  ·  Reports for curriculum review
```

### 7.3 OJT Lifecycle States **[ASSUMPTION]**

| State | Description | Entry Condition | Exit Condition |
|---|---|---|---|
| Registered | Account and program enrollment created | Admin creates or imports student | Requirements started |
| Pre-Deployment | Submitting and clearing requirements | Registered | Clearance approved |
| Deployed | Assigned to HTE, logging hours | Clearance approved and HTE assigned | Required hours reached or term end |
| Mid-Term Evaluated | Mid-term evaluation submitted | Supervisor submits | Continues training |
| Completed | Hours met and final evaluation submitted | Final evaluation locked | Post-OJT clearance |
| Cleared | All post-OJT requirements verified | Coordinator approves | — |

---

## 8. Business Requirements

High-level needs the system must satisfy. Each is decomposed into functional requirements in Section 9.

| ID | Business Requirement | Objective | Priority |
|---|---|---|---|
| BR-01 | The university shall manage OJT for multiple degree programs on one platform with logical separation of data, users, and access. | BO-1 | M |
| BR-02 | Access to functions and data shall depend strictly on user role. | BO-1 | M |
| BR-03 | Program Coordinators shall define evaluation rubrics and competencies that match their program's degree requirements without needing a separate system. | BO-2 | M |
| BR-04 | HTE Supervisors shall evaluate students against standardized digital rubrics at mid-term and final stages. | BO-2 | M |
| BR-05 | The system shall produce competency analytics identifying strengths, skill gaps, and trends. | BO-2, BO-6 | M |
| BR-06 | Students shall record attendance and rendered hours electronically, and supervisors shall verify them. | BO-3, BO-5 | M |
| BR-07 | Students shall record daily activities and task logs that supervisors can review. | BO-3 | M |
| BR-08 | The system shall process OJT requirements and clearances digitally. | BO-3, BO-5 | M |
| BR-09 | Students shall have a secure central repository for OJT documents. | BO-3, BO-7 | M |
| BR-10 | Students shall be able to discover OJT opportunities and HTE information. | BO-3 | S |
| BR-11 | Students, supervisors, and coordinators shall be able to report and track workplace incidents securely. | BO-3 | M |
| BR-12 | Students shall have a verified e-portfolio exportable as PDF. | BO-7 | S |
| BR-13 | The COE and Coordinators shall broadcast announcements to targeted audiences. | BO-5 | S |
| BR-14 | Users shall see deadlines and receive reminders. | BO-5 | S |
| BR-15 | The system shall capture structured industry feedback from HTE Supervisors. | BO-2, BO-6 | M |
| BR-16 | The system shall meet defined levels of Functional Suitability, Performance Efficiency, Usability, and Security. | BO-4 | M |
| BR-17 | The system shall protect personal data and keep an auditable record of key actions. | BO-4 | M |

---

## 9. Functional Requirements

### 9.1 Module A: Multi-Tenancy, Accounts, and RBAC

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-A01 | The system shall let the COE Super Admin create, edit, deactivate, and archive program tenants. | M | BR-01 |
| FR-A02 | Each tenant's data (students, rubrics, evaluations, documents) shall be logically isolated; users shall access only tenants they are authorized for. | M | BR-01, BR-02 |
| FR-A03 | The system shall support four roles with the permissions in Section 6.2. | M | BR-02 |
| FR-A04 | The COE Super Admin and Program Admins shall create user accounts individually and in bulk (CSV import). | M | BR-02 |
| FR-A05 | Users shall authenticate with unique credentials; passwords shall meet a defined complexity policy. | M | BR-17 |
| FR-A06 | The system shall support password reset through verified email. | M | BR-17 |
| FR-A07 | HTE Supervisor accounts shall be invited by Admins and limited to their HTE and assigned students. | M | BR-02 |
| FR-A08 | A Program Admin may manage multiple program tenants if granted by the COE. | S | BR-01 |
| FR-A09 | Sessions shall expire after a period of inactivity. | M | BR-17 |
| FR-A10 | The system shall maintain an audit log of logins, role changes, record approvals, evaluation submissions, and deletions. | M | BR-17 |
| FR-A11 | The COE Super Admin shall manage HTE records (name, address, contact person, industry, status). | M | BR-10 |
| FR-A12 | The Program Admin shall assign students to HTEs and supervisors, and reassign them with history retained. | M | BR-01 |

### 9.2 Module B: Dynamic Competency Framework and Rubrics

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-B01 | A Program Admin shall create, edit, and archive **competencies** for their program (name, description, category). | M | BR-03 |
| FR-B02 | A Program Admin shall define **skills/indicators** under each competency. | M | BR-03 |
| FR-B03 | A Program Admin shall create **evaluation rubrics** with criteria, rating scale, descriptors per level, and weights. | M | BR-03 |
| FR-B04 | Rubrics shall be assignable per program and per evaluation stage (mid-term, final). | M | BR-03, BR-04 |
| FR-B05 | Rubric criteria shall map to one or more competencies. | M | BR-03, BR-05 |
| FR-B06 | The system shall validate that rubric weights total 100%. | M | BR-03 |
| FR-B07 | Rubrics shall be versioned. Editing a rubric used in a past evaluation shall create a new version and leave past results unchanged. | M | BR-03 |
| FR-B08 | The COE Super Admin shall be able to publish template rubrics that Program Admins can clone and modify. | C | BR-03 |
| FR-B09 | Rubrics shall be previewable before publishing. | S | BR-03 |
| FR-B10 | Competency and rubric configuration shall need no code changes or redeployment. | M | BR-03 |

### 9.3 Module C: Digital DTR and Daily Task Logs

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-C01 | A Student shall record time-in and time-out for each OJT day. | M | BR-06 |
| FR-C02 | The system shall time-stamp entries server-side and compute rendered hours per day, week, and cumulative total. | M | BR-06 |
| FR-C03 | The system shall show the remaining required hours and projected completion date based on the required hours of the program. | M | BR-06 |
| FR-C04 | A Student may submit a **manual or late entry** with a reason; it is flagged for supervisor review. **[ASSUMPTION]** | S | BR-06 |
| FR-C05 | The system shall prevent overlapping or duplicate entries and flag implausible durations (e.g., over a configurable daily maximum). | M | BR-06 |
| FR-C06 | An HTE Supervisor shall approve, return, or reject DTR entries for assigned students, with remarks. | M | BR-06 |
| FR-C07 | Only supervisor-approved hours shall count toward verified rendered hours. | M | BR-06 |
| FR-C08 | Approved DTR entries shall be locked; changes require a logged correction request. | M | BR-06, BR-17 |
| FR-C09 | A Student shall log a **daily task/activity entry** (date, description, skills used, optional competency tags, optional attachment). | M | BR-07 |
| FR-C10 | A Supervisor shall review and comment on task logs. | M | BR-07 |
| FR-C11 | Task logs shall be searchable and filterable by date and competency. | S | BR-07 |
| FR-C12 | The Program Admin shall view DTR and task-log compliance per student (hours, missing days, pending approvals). | M | BR-06, BR-07 |
| FR-C13 | The system shall export DTR summaries as PDF and CSV. | S | BR-06 |
| FR-C14 | The system shall **not** use biometric devices, GPS, or geofencing for attendance (Section 4.2). | M | Scope |

### 9.4 Module D: Evaluation and Industry Feedback

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-D01 | The system shall open mid-term and final evaluation windows per student on dates set by the Program Admin. | M | BR-04 |
| FR-D02 | Assigned HTE Supervisors shall be notified when an evaluation is due. | M | BR-04, BR-14 |
| FR-D03 | A Supervisor shall complete the evaluation using the assigned rubric and enter ratings per criterion with optional comments. | M | BR-04 |
| FR-D04 | The system shall **automatically compute** criterion scores, weighted total, and competency-level scores from the ratings. | M | BR-04, BR-05 |
| FR-D05 | The system shall convert the weighted total to the program's configured grade or equivalent, with the conversion table set by the Program Admin. **[ASSUMPTION]** | S | BR-04 |
| FR-D06 | A Supervisor shall save an evaluation as draft and submit it; submitted evaluations are locked. | M | BR-04 |
| FR-D07 | The system shall capture **industry feedback**: overall comments, recommended skills for improvement, and readiness or hiring-interest indicators. | M | BR-15 |
| FR-D08 | The system shall notify the Coordinator when evaluations are submitted or overdue. | M | BR-04 |
| FR-D09 | The Program Admin shall control when a Student sees released evaluation results. | S | BR-04 |
| FR-D10 | Corrections to a submitted evaluation shall require Program Admin approval and keep the original in history. | S | BR-17 |
| FR-D11 | The system shall support the **same competencies** across mid-term and final evaluations so progress can be compared. | M | BR-05 |

### 9.5 Module E: Competency Analytics

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-E01 | The system shall show each Student a competency profile (scores per competency, strengths, gaps, mid-term vs. final progress). | M | BR-05 |
| FR-E02 | The Program Admin shall view cohort and program analytics (average per competency, distribution of scores, lowest-scoring competencies). | M | BR-05 |
| FR-E03 | The COE Super Admin shall view university-wide analytics across programs and HTEs. | M | BR-05 |
| FR-E04 | Analytics shall filter by term/school year, program, HTE, and competency. | M | BR-05 |
| FR-E05 | The system shall highlight **skill gaps** where average scores fall below a configurable threshold. | S | BR-05 |
| FR-E06 | The system shall aggregate industry feedback themes for curriculum review. | S | BR-15, BR-05 |
| FR-E07 | Analytics shall show the number of evaluations and responses behind each metric, to avoid over-reading small samples. | S | BR-05 |
| FR-E08 | Analytics shall export as PDF and CSV. | S | BR-05 |
| FR-E09 | The system shall display a notice that insights derive from submitted records and do not guarantee full representation of actual skills (Section 4.2, X6). | M | Scope |
| FR-E10 | HTE Supervisors shall see analytics for their assigned students only. | S | BR-02 |

### 9.6 Module F: Document Clearance and Document Wallet

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-F01 | The Program Admin shall define the **requirement checklist** per program and stage (pre-deployment, during OJT, post-OJT). | M | BR-08 |
| FR-F02 | A Student shall upload documents per checklist item (accepted file types and size limits configurable). | M | BR-08 |
| FR-F03 | The Program Admin shall approve, reject (with remarks), or request resubmission for each document. | M | BR-08 |
| FR-F04 | Each Student shall see the status of every requirement (Not submitted, Pending, Approved, Rejected, Expired). | M | BR-08 |
| FR-F05 | The system shall issue a **digital clearance** record when all required items are approved, and track the clearance stage and approver. | M | BR-08 |
| FR-F06 | Document Wallet: each Student shall have a secure personal repository for OJT-related documents (e.g., endorsement, MOA, certificates), with categories and tags. | M | BR-09 |
| FR-F07 | Wallet documents shall be access-controlled, so only the owner and authorized staff can view them. | M | BR-09, BR-17 |
| FR-F08 | The system shall scan or validate uploads (type, size) and keep versions of resubmitted files. | S | BR-17 |
| FR-F09 | Documents with an expiry date shall trigger reminders before expiry. | C | BR-14 |
| FR-F10 | The system shall allow bulk status review and filtering by status, program, and HTE for Coordinators. | S | BR-08 |

### 9.7 Module G: OJT Job Board

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-G01 | Admins (and HTE representatives where permitted) shall post OJT opportunities (title, HTE, description, required skills, slots, location, deadline, eligible programs). | S | BR-10 |
| FR-G02 | Posts shall be reviewed and approved by a Program Admin or the COE before becoming visible. **[ASSUMPTION]** | S | BR-10 |
| FR-G03 | Students shall browse and filter by program, skills, location, and HTE. | S | BR-10 |
| FR-G04 | Students shall express interest or apply through the board; applicants are visible to the Admin who manages the post. **[ASSUMPTION]** | C | BR-10 |
| FR-G05 | HTE profiles shall show past placements and aggregated industry feedback (no individual student data). | C | BR-10, BR-15 |
| FR-G06 | Expired or filled posts shall close automatically. | S | BR-10 |

### 9.8 Module H: Incident Reporting

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-H01 | A Student, Supervisor, or Coordinator shall file an incident report (date, HTE, category, severity, description, optional attachments). | M | BR-11 |
| FR-H02 | Incident reports shall be visible only to the reporter, the relevant Program Admin, and the COE Super Admin. | M | BR-11, BR-17 |
| FR-H03 | The system shall notify the responsible Admin immediately on submission, with higher visibility for high-severity reports. | M | BR-11 |
| FR-H04 | Admins shall track status (Open, Under Review, Action Taken, Resolved, Closed) and add internal notes and actions. | M | BR-11 |
| FR-H05 | Students shall see the status of their own reports. | M | BR-11 |
| FR-H06 | The system shall keep incident history and allow filtering and export by program, HTE, category, and period. | S | BR-11 |
| FR-H07 | Incident data shall be excluded from the E-Portfolio and from analytics visible to HTEs. | M | BR-17 |

### 9.9 Module I: E-Portfolio

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-I01 | Each Student shall have an e-portfolio showing profile, OJT summary, verified hours, competencies and skills, certificates, and selected documents. | S | BR-12 |
| FR-I02 | Only **verified** data (approved hours, submitted evaluations, approved documents) shall display as verified. | S | BR-12 |
| FR-I03 | The Student shall choose which items to include in the exported portfolio. | S | BR-12 |
| FR-I04 | The system shall generate the portfolio as a **PDF** automatically, with a consistent university template. | S | BR-12 |
| FR-I05 | Each generated PDF shall carry a generation date and a verification reference. **[ASSUMPTION]** | C | BR-12 |
| FR-I06 | Evaluator comments shall appear in the portfolio only if released by the Program Admin. | C | BR-12 |

### 9.10 Module J: Broadcast Alerts, Deadline Calendar, and Reminders

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-J01 | The COE and Program Admins shall create announcements targeted by role, program, HTE, or individual. | S | BR-13 |
| FR-J02 | Announcements shall appear in-app and be delivered by email. **[ASSUMPTION]** | S | BR-13 |
| FR-J03 | Users shall see read/unread status, and Admins shall see delivery and read counts. | C | BR-13 |
| FR-J04 | Admins shall define deadlines (document submission, evaluation windows, term milestones) on a calendar. | S | BR-14 |
| FR-J05 | Users shall see a calendar with the deadlines relevant to their role. | S | BR-14 |
| FR-J06 | The system shall send automatic reminders at configurable intervals before a deadline and when items become overdue. | S | BR-14 |
| FR-J07 | Users shall be able to manage their notification preferences, except for mandatory alerts. | C | BR-14 |

### 9.11 Module K: Administration, Reports, and Data Management

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| FR-K01 | The COE shall configure school years, terms, program-specific required OJT hours, and system parameters. | M | BR-01 |
| FR-K02 | The system shall provide standard reports: student status, hours summary, requirement compliance, evaluation completion, incident summary. | M | BR-05, BR-08 |
| FR-K03 | Reports shall export as PDF and CSV. | S | BR-05 |
| FR-K04 | The system shall support archiving of completed terms without deleting data. | S | BR-17 |
| FR-K05 | Data retention and deletion shall follow the university's policy and the Data Privacy Act (see Section 12.3). | M | BR-17 |
| FR-K06 | A feedback/survey function shall be available to collect ISO 25010 ratings from end users for the study's evaluation. **[ASSUMPTION]** | C | BR-16 |

---

## 10. Use Cases

### UC-01: Record Daily Time and Task Log (Student)

| Field | Detail |
|---|---|
| Actor | Student |
| Goal | Record attendance, hours, and a task entry for the day |
| Preconditions | Student has an active account, an approved HTE assignment, and cleared pre-deployment requirements |
| Trigger | Student begins or ends the day at the HTE |

**Main flow**
1. Student logs in and opens **DTR**.
2. Student selects **Time In**. The system records a server timestamp.
3. At day end, Student selects **Time Out**. The system computes hours rendered.
4. Student adds the **daily task log** (description, skills used, competency tags).
5. Student submits. The entry status becomes *Pending Verification*.
6. The system notifies the assigned HTE Supervisor.

**Alternate flows**
- *A1: Forgot to time out.* Student submits a late entry with a reason (FR-C04); flagged for review.
- *A2: Duplicate/overlapping entry.* System rejects it and shows the existing entry (FR-C05).

**Postconditions:** A pending DTR and task entry exists. Cumulative unverified hours are updated.

**Acceptance criteria**
- **AC-01.1** Given a student who has timed in, when they time out, then hours are computed from server timestamps and displayed.
- **AC-01.2** Given an existing entry for the date, when the student tries to create an overlapping entry, then the system blocks it and shows the conflict.
- **AC-01.3** Given a submitted entry, then the assigned Supervisor receives a notification within 5 minutes. **[ASSUMPTION]**
- **AC-01.4** Given any entry, then only the owning student, assigned supervisor, and authorized admins can view it.

---

### UC-02: Verify DTR and Review Task Logs (HTE Supervisor)

| Field | Detail |
|---|---|
| Actor | HTE Supervisor |
| Goal | Verify rendered hours and review task logs of assigned students |
| Preconditions | Supervisor is assigned to the student; entries are Pending |

**Main flow**
1. Supervisor opens the **Verification Queue**.
2. Supervisor selects a student and views DTR entries and task logs.
3. Supervisor approves, returns (with remarks), or rejects each entry.
4. The system updates verified hours and notifies the student.

**Alternate flows**
- *A1: Bulk approval.* Supervisor approves multiple entries at once.
- *A2: Dispute.* Student contests a rejection. A correction request goes to the Program Admin.

**Acceptance criteria**
- **AC-02.1** Only approved entries count toward verified hours.
- **AC-02.2** Approved entries are locked; edits require a logged correction request.
- **AC-02.3** A Supervisor cannot see students not assigned to them.
- **AC-02.4** Every approval, return, or rejection is recorded in the audit log with user and timestamp.

---

### UC-03: Configure Competencies and Rubric (Program Admin)

| Field | Detail |
|---|---|
| Actor | Program Admin |
| Goal | Create a rubric tailored to the program's degree requirements |
| Preconditions | Program tenant exists; Admin has rights to it |

**Main flow**
1. Admin opens **Competency Framework**.
2. Admin creates competencies and skills/indicators.
3. Admin creates a rubric: criteria, rating scale, level descriptors, weights, and competency mapping.
4. System validates that weights total 100%.
5. Admin previews and publishes the rubric, assigning it to mid-term and/or final evaluation.

**Alternate flows**
- *A1: Clone from a COE template* (FR-B08), then customize.
- *A2: Edit a published rubric already used.* System creates a new version (FR-B07).

**Acceptance criteria**
- **AC-03.1** The system blocks publishing when weights do not total 100%.
- **AC-03.2** Editing a used rubric does not change submitted evaluation results.
- **AC-03.3** A rubric created in one program is not visible to or editable by another program's Admin, unless it is a COE template.
- **AC-03.4** Configuration needs no code change or redeployment.

---

### UC-04: Submit Mid-Term / Final Evaluation (HTE Supervisor)

| Field | Detail |
|---|---|
| Actor | HTE Supervisor |
| Goal | Evaluate a student's performance and give industry feedback |
| Preconditions | Evaluation window is open; rubric assigned |

**Main flow**
1. Supervisor receives a reminder and opens the evaluation.
2. Supervisor rates each criterion and adds optional comments.
3. Supervisor fills in industry feedback (comments, recommended skills, readiness).
4. System computes weighted score and competency-level scores.
5. Supervisor reviews the summary and submits. The evaluation locks.
6. System notifies the Coordinator and updates analytics.

**Alternate flows**
- *A1: Save draft and resume later.*
- *A2: Window closed.* System shows the evaluation as overdue and notifies the Coordinator.

**Acceptance criteria**
- **AC-04.1** All required criteria must be rated before submission.
- **AC-04.2** Scores are computed by the system, with no manual calculation by users.
- **AC-04.3** Submitted evaluations cannot be edited by the Supervisor.
- **AC-04.4** Student results display only after the Program Admin releases them (FR-D09).
- **AC-04.5** Analytics reflect the submitted evaluation within 1 minute. **[ASSUMPTION]**

---

### UC-05: Submit and Clear Requirements

| Field | Detail |
|---|---|
| Actors | Student, Program Admin |
| Goal | Complete required documents and obtain clearance |
| Preconditions | Requirement checklist defined for the program |

**Main flow**
1. Student opens **Requirements** and sees the checklist with statuses.
2. Student uploads the document for an item.
3. Program Admin reviews and approves, or rejects with remarks.
4. When all required items are approved, the system issues a digital clearance.
5. Student sees the clearance status and can download a clearance summary.

**Alternate flows**
- *A1: Rejected document.* Student corrects and resubmits; versions are retained.
- *A2: Invalid file.* System rejects wrong type or oversize files at upload.

**Acceptance criteria**
- **AC-05.1** Clearance cannot be issued while any required item is unapproved.
- **AC-05.2** Rejections must include remarks.
- **AC-05.3** Previous versions of resubmitted files remain accessible to authorized staff.

---

### UC-06: File and Manage an Incident Report

| Field | Detail |
|---|---|
| Actors | Student, HTE Supervisor, Program Admin, COE Super Admin |
| Goal | Report an incident and track it to resolution |

**Main flow**
1. Reporter selects **Report Incident** and fills in the form (category, severity, description, attachments).
2. System saves it and notifies the responsible Program Admin (and COE for high severity).
3. Admin reviews, adds notes, and updates status.
4. Reporter views status updates.
5. Admin marks the report Resolved, then Closed.

**Acceptance criteria**
- **AC-06.1** Only the reporter, the relevant Program Admin, and the COE can view the report.
- **AC-06.2** A notification is generated on submission for the responsible Admin.
- **AC-06.3** Status changes are logged with user and timestamp.
- **AC-06.4** Incident data never appears in the E-Portfolio or HTE-facing analytics.

---

### UC-07: View Competency Analytics

| Field | Detail |
|---|---|
| Actors | Student, Program Admin, COE Super Admin, HTE Supervisor |
| Goal | See competency results at the level their role allows |

**Main flow**
1. User opens **Analytics**.
2. System shows the dashboard scoped to the user's role.
3. User applies filters (term, program, HTE, competency).
4. System updates charts and tables, and shows sample sizes.
5. Admin optionally exports the view as PDF or CSV.

**Acceptance criteria**
- **AC-07.1** A Student sees only their own data.
- **AC-07.2** A Program Admin sees only their program's data.
- **AC-07.3** The COE sees university-wide aggregates.
- **AC-07.4** Each metric shows its sample size (FR-E07).
- **AC-07.5** The dashboard displays the disclaimer in FR-E09.

---

### UC-08: Generate E-Portfolio (PDF)

| Field | Detail |
|---|---|
| Actor | Student |
| Goal | Produce a verified PDF portfolio |
| Preconditions | At least some verified OJT data exists |

**Main flow**
1. Student opens **E-Portfolio** and reviews the auto-populated sections.
2. Student selects items to include.
3. Student selects **Generate PDF**.
4. System compiles the PDF from the template and offers it for download.

**Acceptance criteria**
- **AC-08.1** Verified and unverified items are labeled differently.
- **AC-08.2** The PDF generates within 30 seconds for a typical portfolio. **[ASSUMPTION]**
- **AC-08.3** Incident data and non-selected items are excluded.

---

### UC-09: Broadcast an Alert and Manage Deadlines

| Field | Detail |
|---|---|
| Actors | COE Super Admin, Program Admin; Students and Supervisors as recipients |

**Main flow**
1. Admin creates an announcement and selects the audience (role, program, HTE).
2. Admin sends immediately or schedules it.
3. Recipients see it in-app and by email.
4. Admin adds a deadline to the calendar; the system sends reminders at configured intervals.

**Acceptance criteria**
- **AC-09.1** Only intended recipients receive the alert.
- **AC-09.2** Reminders are sent at the configured intervals before the deadline and when overdue.
- **AC-09.3** Admins can see delivery and read counts (if enabled).

---

### UC-10: Manage Tenants, Users, and HTEs (COE Super Admin)

**Main flow**
1. COE creates a program tenant and designates a Program Admin.
2. COE or Program Admin imports students by CSV.
3. COE creates HTE records and invites HTE Supervisors.
4. Program Admin assigns students to HTEs and supervisors.

**Acceptance criteria**
- **AC-10.1** CSV import reports row-level errors without discarding valid rows.
- **AC-10.2** Users cannot access any tenant they are not assigned to.
- **AC-10.3** Deactivated users cannot log in, and their historical records remain.

---

### UC-11: Browse the OJT Job Board (Student)

**Main flow**
1. Student opens the Job Board and filters by program, skills, or location.
2. Student opens a posting and views HTE information.
3. Student expresses interest (if enabled).

**Acceptance criteria**
- **AC-11.1** Only approved, open postings eligible for the student's program are shown.
- **AC-11.2** Expired postings disappear automatically.

---

## 11. Business Rules

| ID | Rule |
|---|---|
| BRU-01 | Only supervisor-approved DTR hours count toward verified rendered hours. |
| BRU-02 | Required OJT hours are set per program by the COE or Program Admin. |
| BRU-03 | Rubric weights must total 100%. |
| BRU-04 | Submitted evaluations and approved DTR entries are locked; changes require approval and are logged. |
| BRU-05 | A Student may have only one active HTE assignment per term, unless approved otherwise. **[ASSUMPTION]** |
| BRU-06 | Clearance is issued only when all required items for the stage are approved. |
| BRU-07 | A Supervisor may access only assigned students. A Program Admin may access only their program tenant(s). |
| BRU-08 | Incident reports are confidential and excluded from portfolios and HTE-facing analytics. |
| BRU-09 | Analytics use only verified and submitted data. |
| BRU-10 | Historical records are never hard-deleted during retention periods; they are archived. |
| BRU-11 | Attendance is recorded without biometrics, GPS, or geofencing. |

---

## 12. Non-Functional Requirements (ISO/IEC 25010:2011)

The manuscript commits to evaluating four characteristics. Targets below are proposed and should be confirmed (see OQ-8).

### 12.1 Functional Suitability

| ID | Requirement |
|---|---|
| NFR-FS-01 | **Completeness:** All Must-have functional requirements in Section 9 shall be implemented. |
| NFR-FS-02 | **Correctness:** Hour totals, weighted scores, and competency scores shall be computed accurately; test cases must show 100% agreement with manual calculation on defined samples. |
| NFR-FS-03 | **Appropriateness:** Each role's workflow shall be completable without features outside that role's needs. |

### 12.2 Performance Efficiency

| ID | Requirement | Proposed Target |
|---|---|---|
| NFR-PE-01 | Typical page load (dashboard, DTR, lists) | ≤ 3 seconds on a standard broadband connection |
| NFR-PE-02 | Standard form submission response | ≤ 2 seconds |
| NFR-PE-03 | PDF portfolio generation | ≤ 30 seconds |
| NFR-PE-04 | Concurrent users supported | ≥ 500 concurrent users **[ASSUMPTION]**, scaled to the pilot population |
| NFR-PE-05 | Analytics dashboard refresh | ≤ 5 seconds for program-level views |
| NFR-PE-06 | Resource use | System shall run within the limits of the chosen hosting plan without degradation at peak load |

### 12.3 Security and Privacy

| ID | Requirement |
|---|---|
| NFR-SE-01 | **Confidentiality:** Data in transit shall be encrypted (HTTPS/TLS). Sensitive data at rest (credentials, documents) shall be protected. |
| NFR-SE-02 | **Authentication:** Passwords stored only as salted hashes; account lockout or throttling after repeated failed logins. |
| NFR-SE-03 | **Authorization:** RBAC enforced on the server side for every request; tenant isolation tested. |
| NFR-SE-04 | **Integrity:** Locked records protected from silent modification; changes tracked. |
| NFR-SE-05 | **Accountability:** Audit log of security-relevant events, viewable by authorized admins. |
| NFR-SE-06 | **Input protection:** Defense against common web vulnerabilities (e.g., injection, XSS, CSRF, insecure file upload). |
| NFR-SE-07 | **File handling:** Uploads restricted by type and size, stored outside public paths, and served through authorization checks. |
| NFR-SE-08 | **Privacy compliance:** The system shall comply with the Data Privacy Act of 2012 (RA 10173): collect only necessary data, record consent/privacy notice acknowledgment, and support access, correction, and retention rules. |
| NFR-SE-09 | **Backup and recovery:** Regular automated backups with a tested restore procedure. **[ASSUMPTION]** |

### 12.4 Usability

| ID | Requirement |
|---|---|
| NFR-US-01 | **Learnability:** A new Student shall complete time-in, a task log, and a document upload without training, following on-screen guidance. |
| NFR-US-02 | **Operability:** HTE Supervisors shall complete an evaluation in a reasonable time (target ≤ 10 minutes per student **[ASSUMPTION]**). |
| NFR-US-03 | **Responsive design:** Fully usable on desktop, tablet, and mobile browsers. |
| NFR-US-04 | **Error handling:** Clear, non-technical messages with guidance for correction. |
| NFR-US-05 | **Accessibility:** Aim for WCAG 2.1 AA-aligned practices (contrast, labels, keyboard navigation). **[ASSUMPTION]** |
| NFR-US-06 | **Consistency:** Uniform navigation and terminology across modules, aligned with university branding. |
| NFR-US-07 | **Language:** English interface. **[ASSUMPTION]** |

### 12.5 Other Quality Needs

| ID | Requirement |
|---|---|
| NFR-OT-01 | **Availability:** ≥ 99% uptime during the evaluation period, with maintenance outside peak OJT hours. |
| NFR-OT-02 | **Compatibility:** Support current versions of major browsers (Chrome, Edge, Firefox, Safari). |
| NFR-OT-03 | **Maintainability:** Modular design, documented code, and configuration-driven rubrics and competencies. |
| NFR-OT-04 | **Scalability:** Add programs (tenants) without code changes. |
| NFR-OT-05 | **Connectivity tolerance:** The system shall fail gracefully (clear errors, no data loss on form submit) when connectivity is poor. |

---

## 13. Data Requirements

### 13.1 Core Entities

| Entity | Key Attributes (summary) |
|---|---|
| Tenant (Program) | Program name, code, required OJT hours, status |
| User | Name, email, role, status, tenant assignment(s) |
| Student Profile | Student number, program, year/section, contact, OJT status |
| HTE | Name, address, industry, contact person, status |
| HTE Supervisor | User link, HTE, position |
| Assignment | Student, HTE, Supervisor, term, start/end dates, status |
| DTR Entry | Student, date, time-in, time-out, computed hours, status, remarks, reason (if manual) |
| Task Log | Student, date, description, skills, competency tags, status, supervisor comment |
| Competency / Skill | Program, name, description, category, status |
| Rubric / Criterion | Program, stage, criteria, scale, weights, version |
| Evaluation | Student, supervisor, stage, rubric version, ratings, computed scores, comments, status |
| Industry Feedback | Evaluation link, comments, recommended skills, readiness indicator |
| Requirement Item | Program, stage, name, mandatory flag, expiry rule |
| Student Document | Student, requirement, file, version, status, remarks |
| Clearance | Student, stage, status, issuing admin, date |
| Job Post | HTE, title, description, skills, slots, deadline, status |
| Incident Report | Reporter, HTE, category, severity, description, status, notes |
| Announcement | Author, audience, content, schedule, delivery status |
| Deadline | Scope, title, date, reminder rules |
| Notification | Recipient, type, content, read status |
| Portfolio Export | Student, selected items, generated date, reference |
| Audit Log | User, action, entity, timestamp, before/after summary |

### 13.2 Data Quality, Retention, and Privacy

- Mandatory fields and format validation on all forms.
- Student data are personal information; HTE contact data are limited to what is needed.
- Retention periods shall be set with the COE and the university's records policy (OQ-9).
- Exports containing personal data are limited to authorized roles and logged.

---

## 14. Reporting and Analytics Requirements

| ID | Report / View | Audience | Contents |
|---|---|---|---|
| RPT-01 | Student OJT Status | Program Admin, COE | Hours, requirements, evaluation status |
| RPT-02 | DTR Summary | Program Admin, Supervisor, Student | Daily/weekly/cumulative hours, pending approvals |
| RPT-03 | Requirement Compliance | Program Admin, COE | Completion by item and student |
| RPT-04 | Evaluation Completion | Program Admin, COE | Submitted, pending, overdue by HTE |
| RPT-05 | Competency Profile | Student, Program Admin | Scores per competency, mid-term vs. final |
| RPT-06 | Program Competency Summary | Program Admin | Averages, distributions, lowest-scoring competencies |
| RPT-07 | University Competency Trends | COE | Cross-program and term-over-term trends |
| RPT-08 | Industry Feedback Themes | Program Admin, COE | Aggregated recommended skills and readiness |
| RPT-09 | Incident Summary | COE, Program Admin | Counts by category, severity, status |
| RPT-10 | HTE Overview | COE, Program Admin | Placements, evaluation results, feedback summary |

---

## 15. Assumptions, Constraints, and Dependencies

### 15.1 Assumptions

| ID | Assumption |
|---|---|
| A-01 | RTU's COE will sponsor and own the system and designate an administrator. |
| A-02 | Students, Coordinators, and HTE Supervisors have internet-connected devices (as noted in the manuscript's limitations). |
| A-03 | HTE Supervisors will cooperate by evaluating students and verifying DTR in the system. |
| A-04 | Program Coordinators can define rubrics and competencies aligned with their curriculum. |
| A-05 | Student and program data can be provided to the team (CSV) for the pilot. |
| A-06 | The system will be a responsive web application. |
| A-07 | Email delivery is available for notifications. |

### 15.2 Constraints

| ID | Constraint |
|---|---|
| C-01 | No biometric or other hardware integration. |
| C-02 | No GPS-based geofencing or location monitoring. |
| C-03 | No hardware-based automated grading. |
| C-04 | Capstone timeline and a student-team resource base limit scope and effort. |
| C-05 | Quality evaluation limited to four selected ISO/IEC 25010:2011 characteristics. |
| C-06 | Hosting and budget are to be confirmed (OQ-6). |

### 15.3 Dependencies

- COE and Program Coordinator participation in requirements validation and UAT.
- HTE onboarding (accounts, supervisor invitations).
- Approval from the university to conduct the study and collect evaluation data (Appendix A: request letter).
- Email service and hosting infrastructure.

---

## 16. Risks and Mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Low HTE Supervisor participation | Medium | High | Simple evaluation UI, email reminders, onboarding guide, Coordinator follow-up dashboard |
| R-02 | Without GPS/biometrics, attendance could be misreported | Medium | Medium | Supervisor verification, audit log, anomaly flags (FR-C05), approved-hours-only counting |
| R-03 | Inaccurate or incomplete data lowers analytics quality | High | Medium | Mandatory fields, supervisor verification, sample-size display, disclaimer (FR-E07, FR-E09) |
| R-04 | Cross-tenant data leakage | Low | High | Server-side tenant checks, dedicated security tests, code review |
| R-05 | Personal data privacy breach | Low | High | Encryption, least-privilege RBAC, audit logs, privacy notice, consent |
| R-06 | Scope creep given many modules | High | High | MoSCoW prioritization, phased delivery (Section 18), change control |
| R-07 | Rubric configuration too complex for Coordinators | Medium | Medium | Templates, preview, guided builder, training session |
| R-08 | Poor connectivity at HTE sites | Medium | Medium | Lightweight pages, clear errors, draft saving |
| R-09 | Low user adoption by students and coordinators | Medium | High | Training, orientation, COE mandate, simple UX |
| R-10 | Capstone timeline slippage | Medium | High | Gantt tracking (Appendix A of the manuscript), weekly reviews, MVP-first plan |
| R-11 | Insufficient evaluation respondents for ISO 25010 study | Medium | Medium | Early sampling plan, pilot with multiple programs |

---

## 17. Traceability Matrix

### 17.1 Objectives to Business Requirements to Functional Modules

| Business Objective | Business Requirements | Functional Modules / Requirements |
|---|---|---|
| BO-1 Multi-tenant RBAC platform | BR-01, BR-02 | Module A (FR-A01 to A12) |
| BO-2 Dynamic competency and rubrics | BR-03, BR-04, BR-05, BR-15 | Modules B, D, E (FR-B01 to B10, D01 to D11, E01 to E10) |
| BO-3 Integrated OJT tools (DTR, Wallet, Job Board, Incident Reporting) | BR-06 to BR-11 | Modules C, F, G, H |
| BO-4 ISO/IEC 25010 evaluation | BR-16, BR-17 | Section 12 (NFRs), FR-K06 |
| BO-5 Reduce admin workload | BR-06, BR-08, BR-13, BR-14 | Modules C, F, J, K |
| BO-6 Data-driven university insight | BR-05, BR-15 | Module E, Section 14 |
| BO-7 Verified student record | BR-09, BR-12 | Modules F, I |

### 17.2 Features Named in the Manuscript to Requirements

| Manuscript Feature | Where Covered |
|---|---|
| Digital DTR | Module C |
| Document Clearance | Module F (FR-F01 to F05, F10) |
| Competency Analytics | Module E |
| OJT Job Board | Module G |
| Incident Reporting | Module H |
| E-Portfolio / automated PDF portfolios | Module I |
| Document Wallet | Module F (FR-F06 to F08) |
| Broadcast Alerts | Module J (FR-J01 to J03) |
| Deadline Calendar and Reminders | Module J (FR-J04 to J07) |
| Mid-term and final evaluations | Module D |
| Multi-Tenant Architecture | Module A |
| Dynamic Competency Framework | Module B |
| RBAC | Module A, Section 6 |

---

## 18. Implementation and Validation Approach

### 18.1 Suggested Delivery Phases **[ASSUMPTION]**

| Phase | Focus | Modules |
|---|---|---|
| 1 | Foundation | A (tenants, RBAC, accounts, audit), K (settings) |
| 2 | Core OJT operations | C (DTR, task logs), F (clearance, wallet) |
| 3 | Outcomes engine | B (competencies, rubrics), D (evaluations, industry feedback) |
| 4 | Insight and engagement | E (analytics), J (alerts, calendar), I (e-portfolio) |
| 5 | Extended tools | G (job board), H (incident reporting), reports polish |
| 6 | Evaluation and rollout | Pilot, ISO 25010 survey, fixes, final documentation |

> If time is tight, Phases 1 to 4 plus H are the minimum that still delivers the manuscript's stated objectives, and G can be reduced to a basic listing.

### 18.2 Testing Strategy

| Test Type | Purpose |
|---|---|
| Unit and integration testing | Verify calculations (hours, weighted scores) and module interactions |
| Role and permission testing | Verify the matrix in Section 6.2 and tenant isolation |
| Functional / UAT | Each use case and acceptance criterion in Section 10 executed by representative users |
| Security testing | Authentication, authorization, upload handling, common web vulnerabilities |
| Performance testing | Load against targets in Section 12.2 |
| Usability testing | Task-based sessions with Students, Coordinators, and Supervisors |

### 18.3 ISO/IEC 25010 End-User Evaluation **[ASSUMPTION]**

- **Respondents:** Students, Program Coordinators, COE staff, and HTE Supervisors (sample sizes to be set with the adviser).
- **Instrument:** Questionnaire (Appendix B of the manuscript) using a 5-point Likert scale across Functional Suitability, Performance Efficiency, Usability, and Security.
- **Interpretation:** Weighted mean with verbal interpretation. Target ≥ 4.0 on each characteristic.

### 18.4 Acceptance and Sign-Off

The BRD is accepted when the COE Office, Capstone Adviser, and project team sign off on scope and priorities. System acceptance requires: all Must-have requirements passing UAT, no open critical or high-severity defects, and the ISO 25010 evaluation completed.

| Role | Name | Signature | Date |
|---|---|---|---|
| COE Office Representative | | | |
| Capstone Adviser | | | |
| Program Coordinator Representative | | | |
| Project Team Lead | | | |

---

## 19. Glossary

| Term | Definition |
|---|---|
| BRD | Business Requirements Document |
| COE | Cooperative Education Office, the university office overseeing OJT programs and industry partnerships |
| Competency-Based Analytics | Module tracking student skills and achievements based on custom rubrics, industry feedback, and degree requirements |
| DTR | Daily Time Record, a log of attendance and rendered hours |
| E-Portfolio | Electronic collection of a student's verified achievements, skills, certificates, and OJT documents |
| HTE | Host Training Establishment, the organization hosting the student |
| ISO/IEC 25010:2011 | International standard for software product quality models |
| Multi-Tenant Architecture | Architecture that logically separates data, users, and access for different units sharing one system |
| OJT | On-the-Job Training |
| Outcome-Based Evaluation | Assessment of workplace performance and competency through standardized rubrics and supervisor feedback |
| RBAC | Role-Based Access Control |
| Rubric | A set of criteria, rating levels, and weights used to evaluate performance |
| Tenant | An isolated organizational unit (here, a degree program) within the platform |
| UAT | User Acceptance Testing |

---

## 20. Open Questions and Items Needing Confirmation

| ID | Question | Why it matters | Owner |
|---|---|---|---|
| OQ-1 | Are "OJT Coordinators" and "Program Coordinators (Program Admins)" the same role? Chapter I uses both terms. | Role model and permission matrix | Team / COE |
| OQ-2 | Is the OJT population university-wide or IT only? The Definition of Terms says OJT immerses *Information Technology* students, while the objectives say university-wide and multi-program. | Scope, tenant count, sample size | Adviser / COE |
| OQ-3 | The title uses "Outcomes-Based OJT Management System with Competency Tracking, Automated Evaluation, and Industry Feedback"; Chapter I uses "Competency-Based Analytics" as a subtitle. Which is the official system name? | Documentation consistency | Team |
| OQ-4 | Will student data come from the university's student information system or CSV import only? | Integration scope | COE / ICT office |
| OQ-5 | What does "automated evaluation" cover in addition to rubric-based score computation (e.g., auto-aggregation, threshold alerts, auto grade equivalents)? | Defines FR-D04, D05 depth | Adviser |
| OQ-6 | What are the hosting, budget, and deployment constraints (cloud, university server)? | Performance and security design | Adviser / COE |
| OQ-7 | Should HTEs be able to post to the Job Board directly or only through Admins? Should students be able to apply in-system? | FR-G01 to G04 | COE |
| OQ-8 | Are the proposed KPI and performance targets acceptable? | Success criteria | Adviser / COE |
| OQ-9 | What data retention periods apply to student, evaluation, and incident records? | Compliance, FR-K05 | COE / Data Protection Officer |
| OQ-10 | What are the required OJT hours per program, and do they vary? | FR-C03, BRU-02 | Program Coordinators |
| OQ-11 | Should students see evaluation results and supervisor comments? When? | FR-D09, FR-I06 | COE |
| OQ-12 | Should notifications be email only, or also SMS/push? | Cost and scope | Team |
| OQ-13 | Is the "Month & Year" on the title page the planned defense date (needed for the schedule)? | Planning | Team |

---

## Appendix A: Items From the Manuscript Still To Be Completed

The preliminary pages and Chapters II to V in the uploaded file are placeholders. This BRD can feed the following sections:

| Manuscript Section | How This BRD Helps |
|---|---|
| Chapter II: Review of Related Literature and Systems | Section 2.3 gives a starting synthesis (Cabalbag & Ontiveros, 2024; Castro, 2024; Aban et al., 2025). Further sources are needed for competency-based assessment, multi-tenant systems, and ISO 25010. |
| Chapter III: Design and Methodology | Sections 6, 9, 12, 13, and 18 map to Functional and Non-Functional Requirements, Design, Testing, and Ethical Considerations. |
| Chapter IV: Results and Discussions | Sections 3 and 18.3 define the objective-based result sections and the ISO 25010 evaluation. |
| Appendices | Section 18.3 supports the Survey Questionnaire. The Gantt Chart follows Section 18.1. |

## Appendix B: Requirement Counts Summary

| Category | Count |
|---|---|
| Business Objectives | 7 |
| Business Requirements | 17 |
| Functional Requirements | ~110 across 11 modules |
| Non-Functional Requirements | 5 groups (ISO 25010 plus other) |
| Use Cases | 11 with acceptance criteria |
| Business Rules | 11 |
| Risks | 11 |
| Open Questions | 13 |

*End of document*
