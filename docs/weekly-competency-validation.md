# Weekly competency implementation and checks

Development only; the Obsidian vault and capstone paper were not edited.

## Implemented

- Student weekly reports with structured prompts, private image evidence, draft persistence, common/course question cards and one atomic final report/answer submission.
- Course/week questionnaire snapshots, explicit publishing, and Super Admin grants to assigned course coordinators.
- Individual student/assigned-coordinator access, approved breaks, overdue/late labeling, and aggregate-only Super Admin analytics with score suppression below three distinct students.
- Local image decoding/re-encoding, metadata removal, five-file/5 MB limits, and authenticated reads/deletes. PostgreSQL attachment guards serialize uploads/deletes with final submission.
- PostgreSQL migrations and Prisma models; the local SQLite runtime installs the portable tables automatically.

## Evidence

- Full Vitest suite: 233 tests passed across 26 files, including 8 new weekly-report cases and privacy Route Handler coverage.
- TypeScript check and Prisma schema validation passed.
- Full ESLint completed with zero errors and 21 existing warnings in other workspace code; the new weekly-report code has no lint warnings.
- Production Next.js build passed, including all three new API routes.
- A temporary, independently migrated PostgreSQL verification database passed draft creation, question pinning, stale-write rejection, combined submission and aggregate-only reads. It was dropped after verification.
- `scripts/check-weekly-reports.mjs` exercised 16 browser checks on a dedicated local SQLite server: required prompts, failed-save input retention, private upload, draft/answer resumption, modal focus, final submission, coordinator report access, denied admin image access, aggregate-only responses and 390/820/1440px layouts. Evidence is in `.local/weekly-ui-evidence`. A tablet overflow and duplicate heading were corrected during review.

## Setup and limits

Apply migrations, then open Super Admin → Competency Analytics → Question sets and publishing. Publish the reviewed general set and a set for each course. Course question authors require a grant and a current class assignment. No institution-approved questionnaire is silently created by the feature.

The browser script is destructive only to the dedicated `.local/weekly-ui.sqlite` fixture; run a local demo server on port 3106 with that exact database, and a separate `.next-weekly-ui` build directory. It does not target the persistent demo server. Images are stored privately in the configured local image directory.

Hosted storage, institutional questionnaire approval, real respondent evaluation and Obsidian/paper updates remain outside this development verification. Weekly self-ratings are not verified workplace performance or study findings.
