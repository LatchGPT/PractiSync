# Latch revision plan

Status: implemented and verified locally, October 22, 2026. The original plan and its accepted implementation defaults are retained below.

## Scope

Implement only the eight tasks assigned to Latch in the supplied task images. Lei's and Gab's lists are context and do not authorize their separate revisions. Shared recruitment components may need changes across student, Industry Partner, coordinator, and Super Admin views to complete Latch's flow.

Keep the existing registration approval, posting approval, applicant selection, and university placement responsibilities. Do not remove the COE Verify control, redesign other dashboards, remove modules, or revise attendance, evaluations, calendars, and coordinator communication.

## Current implementation

- `app/hte-registration.tsx` and `/api/hte-register` already create a company and supervisor account pending Super Admin approval.
- Registration already collects company name, industry, location, description, contact name, work email, username, and password. Company phone, contact designation, and website fields are absent.
- `app/supervisor-portal.tsx` already supports post creation, requested edits/closures, and applicant selection.
- Jobs already store an integer `openings` and one `courseId`. Multiple required programs need a data change, application eligibility checks, and placement confirmation changes.
- `app/practisync.tsx` currently renders the Internship Board as a searchable card grid with companies and applications tabs. Its global toolbar uses unrelated academic-period filters.
- Approved company posts already reach the student's board. Strengthen and verify this existing path rather than create a second posting source.
- Applicant snapshots currently expose names and cover letters but omit the applicant email in partner-facing results.
- The application uses both PostgreSQL migrations and a local SQLite upgrade path. Both need compatible additive changes.

## Task coverage and acceptance criteria

| Latch task | Planned change | Acceptance criteria |
| --- | --- | --- |
| 1. Rename HTE to Industry Partners throughout the system | Use **Industry Partners** for directories/groups, **Industry Partner** for an individual company, and **Industry Partner Supervisor** for the role. Update current labels, help, forms, notifications, validation messages, and generated application content. | Users encounter consistent terminology across roles. Preserve internal action keys, stored role values, historical audit records, and old route aliases for compatibility. |
| 2. Develop registration and required company information | Extend the existing registration and company-profile request workflow. Proposed required fields: company name, industry, office address, company description, contact person, designation, contact email, and contact phone. Website is optional. Preserve credential requirements. | Required information is validated by the server, saved, available to the approval reviewer, retained on errors, and editable through the existing correction/approval workflow. New required fields do not invalidate existing approved accounts. |
| 3. Number of interns and required programs/courses | Reuse `openings`, label it **Number of interns needed**, and allow selection of multiple institutional programs on a posting. | A positive whole-number count and at least one valid program are required. All selected programs appear in the post, application eligibility follows them, and placement confirmation uses the applicant's actual program and policy. Existing posts keep their original course. |
| 4. Revise the Internship Board | Use **OJT Recruitment** as the navigation/page name and **Intern recruitment** for partner posting tools. Update related headings and links. | The recruitment screen is recognizable and reachable from each relevant role; existing bookmarks continue working. |
| 5. JobStreet-style application interface | Build a focused listing/detail layout with a compact opportunity list, selected post details, employer information, requirements, intern count, and one primary Apply action. Stack the layout on phones. | Students can inspect a full post, apply, and see submission status. Long content, empty results, pending operations, errors, and already-applied/ineligible states remain usable. Retain RTU's current blue, gold, typography, and components. |
| 6. Categorized browsing | Make program and industry categories the main entry points; add useful location filtering and a reset action. Search is supplementary. Use actual institutional programs and existing industry data. | Students can find opportunities without typing a search. Filters combine correctly, distinguish no postings from no matching results, and persist in the URL. Remove the generic academic-period toolbar from recruitment. |
| 7. Integrate approved company posts into the RTU board | Keep the existing source of truth and approval workflow. Verify pending posts stay hidden, approval publishes, approved edits replace prior content, and approved closure removes the opening. | Students see only published posts from approved companies. Rejected/pending edits never replace approved content. Company and university boundaries remain enforced. |
| 8. Applicant contact/email and direct communication | Show applicant email and an optional applicant-supplied phone on application details for authorized viewers. Add an **Email applicant** link with the position in the subject. | An approved partner can access contacts only for applicants to its own posts; university staff remain scoped. Students do not receive other applicants' contacts. The link opens the user's email app and never claims a message was sent. |

## Design contract

- Product and users: RTU students finding OJT opportunities, partners recruiting interns, and university staff reviewing postings and placements.
- Surface: Operate; reuse `DESIGN.md` and current components/tokens.
- Primary action: students submit an application; partners submit a post for approval; reviewers approve or return a request with a reason.
- Content: real scoped company details, position, industry, location, selected programs, skills, description, intern count, publication/approval status, and application status.
- Hierarchy: position and company first, program/location/count second, detailed requirements and the relevant action next.
- Required states: first-use empty, filtered empty, long text, pending submission, validation/server failure with preserved input, success, duplicate application, ineligible program, missing contact data, pending partner approval, and permission denial.
- Responsive behavior: list/detail columns on desktop; a single readable flow with clear return-to-list navigation on smaller screens. Preserve keyboard focus and label every filter/control.
- Out of scope: Lei's and Gab's revisions; copying JobStreet branding; external email delivery, hosting, or institutional activation.

## Implementation order

1. **Data and workflow foundation (tasks 2, 3, 7, 8):** add compatible migrations and validation; extend registration/profile approvals; support multi-program eligibility and applicant contacts; test role and tenant boundaries.
2. **Terminology and registration (tasks 1, 2, 4):** apply current user-facing names, expose the new fields, and retain existing links/action identifiers.
3. **Recruitment experience (tasks 3–7):** extract recruitment out of the large application component; implement categories, URL-backed filters, listing/details, posting fields, and application states.
4. **Applicant communication and verification (task 8 and regression):** add scoped contact details and email links; complete integration and responsive checks.

## Verification

- Registration: required fields, malformed contact details, duplicate account, pending/rejected/corrected/approved registration, and older approved company records.
- Recruitment: positive intern counts, multiple/invalid/foreign-tenant programs, eligible and ineligible applicants, duplicate applications, and correct program-specific placement policies.
- Publication: pending, approved, rejected, edit-pending, edit-approved, closure-pending, and closure-approved transitions.
- Privacy: pending partner cannot read applicants; partner A cannot read partner B's applicant contacts; student cannot read another applicant; coordinator scope and university tenancy remain intact.
- UI: desktop, intermediate, and phone sizes; keyboard/focus, long names/descriptions, many categories, no results, errors, and successful application/contact actions.
- Run relevant automated tests, TypeScript, lint, Prisma validation, and a production compilation. Report pre-existing failures separately. Apply deployment migrations only to an explicitly identified target database; local test databases can exercise them independently.

## Proposed defaults

- Board name: **OJT Recruitment**.
- Multiple required programs belong to each post; company identity belongs to registration/profile.
- Categories use program and industry data, avoiding a separate unmaintained taxonomy.
- Applicant phone is optional and supplied during application; it does not require redesigning the student profile.
- Direct email opens the user's email app. Sending within PractiSync would be a separate integration requiring a configured email provider.

These defaults were used for implementation. No external email service was added or used.

## Implementation and verification record

All eight Latch tasks have corresponding implementation changes. The recruitment list and posting editor now live in dedicated components with scoped styles. Existing registration and dashboard URLs remain compatible; the public registration link uses `/register/industry-partner` and its matching API alias. Internal `HTE` identifiers and historical records remain compatible; current user-facing terminology uses Industry Partner.

The additive `202610220002_industry_partner_recruitment` migration adds company contacts, website, job program requirements, and optional applicant phone. Both Prisma/Drizzle metadata and SQLite upgrade support are included. Existing posts default to their original program. No deployment PostgreSQL database was migrated as part of local verification; run the repository's migration deployment command against the intended environment before running the updated application there.

Verification performed:

- **127 tests across 18 suites pass**, including seven new recruitment integration tests. These cover required registration fields, contact correction and staged approval, invalid counts/programs, multi-program posting approval/edit/rejection/closure, secondary-program eligibility and placement policies, duplicate applications, contact privacy, tenancy, legacy records, and email link construction.
- TypeScript and Prisma schema validation pass.
- Repository-wide ESLint reports **zero errors** and three existing warnings in the unrelated evaluation-score extraction route/helper. Updated recruitment files have no lint warnings.
- The Next.js webpack production compilation passes. It retains the existing optional BullMQ `@valkey/valkey-glide` resolution warning.
- Browser checks used a separate `.local/latch-recruitment.sqlite` database. They exercised actual registration, mismatch recovery, pending-account restrictions, applicant submission with recoverable validation errors, partner posting, Super Admin approval, student publication, scoped email links, filtering, no results, and keyboard focus.
- Visual inspection covered 1440px desktop, 820px intermediate, and 390px phone widths. A phone tab overflow was corrected. Registration and partner views were also checked at small widths; the posting dialog scrolls within the viewport.
- Stress checks covered 28 opportunities with pagination, a 160-character unbroken position title, long descriptions, and responsive layout. Temporary stress records were removed from the isolated test database.

Browser screenshots and local lint output are under `.local/latch-recruitment-review/` and `.local/latch-eslint.json`; these are local verification artifacts, not deployment assets.
