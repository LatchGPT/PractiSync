# HTE approval and final attendance workflow

## Design contract

- Users: external HTE supervisors reviewing assigned interns, students submitting attendance, Super Admin reviewing partner business requests, coordinators reviewing completion and reopening requests.
- Surface: Operate. Preserve `DESIGN.md`: Inter, navy hierarchy, blue primary actions, gold focus treatment, existing status chips and compact tables. Use the established light theme and shared spacing/radius tokens.
- Primary actions: approve a business request; submit/verify one complete DTR; publish the uploaded school form; submit/review the evaluation. Keep editing and rejection actions secondary, with explanations adjacent to the action.
- Content: actual scoped partner details, requested changes, exact submitted attendance, school-supplied questions, decision notes and timestamps. No fabricated questionnaire or metrics.
- States: no company, pending/rejected registration, no requests/no matching requests, unassigned placement, hours not reached, final review pending, rejected/verified attendance, reopening pending/declined, missing school document, draft/published template, evaluation draft/revision/submitted/released, permission denial, pending operation and recoverable inline errors.
- Out of scope: redesigning other modules, changing school policy targets, automatic school scoring, electronic signatures, hosting or email delivery.

## Storage and access

`202610190001_hte_approvals_final_dtr` adds business requests, final DTR snapshots/history, student reopening requests, versioned school PDF templates and evaluation responses/history. PostgreSQL migrations and the local SQLite upgrade use the same workflow tables. Existing approved companies/posts remain approved; old daily confirmation columns remain historical. Read snapshots derive verified hours only from a verified final DTR.

`POST /api/hte-register` accepts only HTE company/contact/credential fields, fixes the tenant and role server-side, hashes passwords, and rate-limits registration. Existing `/api/action` handles authenticated requests with server role/resource checks. Every transition records an audit event. Attendance edits and final transitions serialize on the placement revision; stale versions or duplicate requests fail without partially applying changes.

The final DTR is built server-side from **all** placement entries, independent of the 500-entry dashboard display limit. Its time-only JSON is immutable while under review or verified. Corrections preserve preceding snapshots and evaluations. Reopening an already completed placement restores active status and pending completion; an evaluation must be resubmitted against the newly verified DTR version.

`POST /api/hte-evaluation-template` accepts a valid unencrypted PDF up to 4 MB from Super Admin. It extracts supported fillable fields where present, otherwise creates an empty draft. Super Admin transcribes/checks the school questions, required fields and exact rating/choice labels before publication. Uploaded PDFs are retained; published templates are immutable, and replacements archive the preceding publication. Earlier responses continue using their own template. PDF downloads are authenticated, tenant-scoped, and draft downloads require Super Admin.

The four-dimension sample final-rubric account action is retired. Historical competency records and the pre-existing guest competency-link workflow remain available as separate legacy records; they do not satisfy the new school-evaluation or final DTR completion requirements. Final DTR verification requires a registered, approved supervisor assigned to the same company placement.

## Running and rollout

- Apply `pnpm db:migrate` to the intended fictional PostgreSQL database before starting this version. Do not reset or reseed institutional data. The local demo applies the additive SQLite migration automatically.
- No school document is seeded. Super Admin finds the upload in **Required OJT documents**; HTEs see its status in their portal, students/coordinators in **Competencies**.
- Super Admin uses **HTE requests** for approvals. Students/coordinators use **Attendance → Final attendance review**. Coordinators review school evaluation responses in Competencies or their internship workflow panel.
- Pending school documents intentionally block final evaluation and formal completion. A private host using only a guest link must obtain an approved account and matching supervisor assignment for final DTR verification.
- Verify desktop, intermediate and phone layouts, keyboard focus, long request content and submission/error recovery before deployment. Run lint, typecheck, tests, schema validation and build.

## Verification record

- 92 tests across 13 suites pass, including complete DTR snapshots beyond 500 entries, rejected/resubmitted attendance, reopening after completion, scoped approvals, school-form draft persistence, PDF access and evaluation release.
- TypeScript, Prisma schema validation and the webpack production build pass. The build reports the existing optional BullMQ `@valkey/valkey-glide` warning.
- The new workflow files and updated goal-progress component pass lint. Repository-wide lint still reports pre-existing calendar/script errors and generated files under `.local`; those unrelated files were not rewritten to suppress them.
- Browser review confirmed the HTE portal at desktop, 820px and 390px widths, the Super Admin evaluation placeholder/upload control, and the student final DTR panel. The student target gate disables final submission with a visible explanation; daily confirmation buttons and the daily confirmation column have been removed.
- The PostgreSQL migration was applied to the verified local `practisync_demo` / `DEMO` tenant on October 19. On October 20 Docker was offline; final browser checks used the existing SQLite demo runner with `.local/hte-verification.sqlite`. No PostgreSQL connection settings were changed and no school form was seeded.
