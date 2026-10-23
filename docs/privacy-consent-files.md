# Privacy consent source-file manifest

This manifest lists 104 source/configuration/documentation files added or changed for the consent task, including the approved baseline repairs. Generated test databases, reports, screenshots and build outputs are excluded.

Pre-existing unrelated changes in `packages/db/demo.ts` were preserved and are not listed as task changes. `app/page.tsx` contained pre-existing edits that were retained while adding redirect handling. Existing video/output/scratch artifacts were left untouched.

The approved baseline fixes corrected callback/nullability types and stale test setup/expectations. Application lint rules remain enabled; generated toolkit and video artifacts are ignored.

## Storage, notices and privacy services

- `packages/db/isolation-sqlite.ts` (modified)
- `packages/db/local-demo.ts` (modified)
- `packages/db/prisma/migrations/202610240001_privacy_consent/migration.sql` (added)
- `packages/db/prisma/migrations/202610240001_privacy_consent/sqlite.sql` (added)
- `packages/db/prisma/schema.prisma` (modified)
- `packages/db/seed.ts` (modified)
- `packages/privacy/api-guard.ts` (added)
- `packages/privacy/consent.ts` (added)
- `packages/privacy/history.ts` (added)
- `packages/privacy/http.ts` (added)
- `packages/privacy/initial-policy.ts` (added)
- `packages/privacy/page-guard.ts` (added)
- `packages/privacy/paths.ts` (added)
- `packages/privacy/publish.ts` (added)
- `packages/privacy/worker-consent.ts` (added)
- `packages/validation/consent.ts` (added)
- `scripts/publish-privacy-policy.ts` (added)

## API routes

- `app/api/action/route.ts` (modified)
- `app/api/consent/history/route.ts` (added)
- `app/api/consent/route.ts` (added)
- `app/api/consent/status/route.ts` (added)
- `app/api/data/route.ts` (modified)
- `app/api/extract-evaluation-scores/route.ts` (modified)
- `app/api/guest-evaluation/[token]/route.ts` (modified)
- `app/api/hte-evaluation-template/[id]/file/route.ts` (modified)
- `app/api/hte-evaluation-template/route.ts` (modified)
- `app/api/native-documents/files/[id]/route.ts` (modified)
- `app/api/native-documents/import/route.ts` (modified)
- `app/api/native-documents/preview/route.ts` (modified)
- `app/api/native-documents/route.ts` (modified)
- `app/api/pdf-templates/[id]/file/route.ts` (modified)
- `app/api/pdf-templates/route.ts` (modified)
- `app/api/queue/route.ts` (modified)
- `app/api/student-accounts/route.ts` (modified)
- `app/api/student-verification/class-code/route.ts` (modified)
- `app/api/student-verification/review/route.ts` (modified)
- `app/api/student-verification/route.ts` (modified)

## Pages and UI

- `app/assessment-workspace.tsx` (modified)
- `app/consent/consent-form.tsx` (added)
- `app/consent/notice.tsx` (added)
- `app/consent/page.tsx` (added)
- `app/consent/privacy.css` (added)
- `app/consent/session.ts` (added)
- `app/dashboard/[role]/page.tsx` (modified)
- `app/dashboard/layout.tsx` (added)
- `app/evaluate/[token]/page.tsx` (modified)
- `app/login/complete/page.tsx` (modified)
- `app/login/page.tsx` (modified)
- `app/page.tsx` (modified)
- `app/practisync.tsx` (modified)
- `app/privacy-settings.module.css` (added)
- `app/privacy-settings.tsx` (added)
- `app/privacy/page.tsx` (added)
- `app/server-identity.ts` (modified)
- `app/settings-view.tsx` (modified)
- `app/settings/privacy/page.tsx` (added)
- `app/student-verification/page.tsx` (modified)
- `app/supervisor-portal.tsx` (modified)

## Authentication, domain and workers

- `packages/auth/auth.ts` (modified)
- `packages/documents/native-queue.ts` (modified)
- `packages/documents/native-reference.ts` (modified)
- `packages/documents/native-render-job.ts` (added)
- `packages/documents/native-worker.ts` (modified)
- `packages/domain/actions.ts` (modified)
- `packages/domain/read.ts` (modified)
- `packages/domain/reminders.ts` (modified)
- `proxy.ts` (added)

## Tests and verification tools

- `playwright.config.ts` (added)
- `scripts/check-privacy-consent.mjs` (added)
- `scripts/check-privacy-settings.mjs` (added)
- `scripts/privacy-e2e-data.ts` (added)
- `scripts/privacy-e2e-server.mjs` (added)
- `tests/account-lifecycle.test.ts` (modified)
- `tests/consent-api.test.ts` (added)
- `tests/consent-fixture.ts` (added)
- `tests/consent-paths.test.ts` (added)
- `tests/consent-route-coverage.test.ts` (added)
- `tests/consent.test.ts` (added)
- `tests/curriculum-analytics.test.ts` (modified)
- `tests/domain.test.ts` (modified)
- `tests/e2e/environment.ts` (added)
- `tests/e2e/privacy-consent.spec.ts` (added)
- `tests/e2e/privacy-fixtures.ts` (added)
- `tests/hte-workflows.test.ts` (modified)
- `tests/native-document-queue.test.ts` (modified)
- `tests/native-document-routes.test.ts` (modified)
- `tests/native-document-worker.test.ts` (added)
- `tests/outcome-evaluation.test.ts` (modified)
- `tests/privacy-policy.test.ts` (added)
- `tests/recruitment.test.ts` (modified)
- `tests/runtime-fixture.ts` (modified)
- `tests/self-assessment.test.ts` (modified)
- `tests/student-goal.test.ts` (modified)
- `tests/student-verification.test.ts` (modified)

## Configuration and documentation

- `.gitignore` (modified)
- `DESIGN.md` (modified)
- `PRODUCT.md` (modified)
- `docs/privacy-consent-design.md` (added)
- `docs/privacy-consent-files.md` (added)
- `docs/privacy-consent-validation.md` (added)
- `docs/privacy-policy.md` (added)
- `eslint.config.mjs` (modified)
- `next.config.ts` (modified)
- `package.json` (modified)
