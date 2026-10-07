# PractiSync

Login-first cooperative education / OJT workspace for one university with multiple departments. This repository includes the complete PostgreSQL/Prisma reference schema and a working, isolated fictional demo built for Sites.

## Start here

- `docs/build-brief.md` — original requirements
- `docs/assumptions.md` — explicit defaults and hosted runtime adaptations
- `docs/permissions.md` — server-enforced resource/action matrix
- `docs/checklist.md` — implemented vs remaining work
- `docs/runbook.md` — setup, isolation, services, and verification boundaries
- `docs/model-map.md` — 67-model institutional schema
- `docs/validation.md` — actual verification results

The app opens on a sign-in page with credentials and four demo role choices. Google is visibly unconfigured. All demo state is fictional and separate from institutional data. Demo identity is server-issued via Auth.js, not browser role state. Each protected operation reloads active account/session version and checks tenant plus resource scope.

## Checks

```
pnpm install
pnpm check
pnpm test
pnpm lint
pnpm build
node tests/worker-smoke.mjs
```

PostgreSQL reference commands: `pnpm db:validate`, `pnpm db:generate`, `pnpm db:migrate`. Use `packages/db/docker-compose.yml` for disposable PostgreSQL. A PostgreSQL service was not available during this build; institutional runtime integration and production services are still incomplete. See checklist before considering real student data.

## Working demo flows

Attendance and corrections, coordinator confirmation, multiple coordinator classes and enrollment codes, versioned course hour policies, fictional document review, identified coordinator-routed SOS, version-compatible competencies, verified company postings and applications, scoped announcements, company directory and eligible reviews, labeled Record of Training PDF, administrator accounts and institution structure. Forms offer separate sample preview and autofill actions with replacement/undo and manual submission.
