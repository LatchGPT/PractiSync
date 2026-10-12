# PractiSync

Login-first cooperative education / OJT workspace for one university with multiple departments. The current development demo runs as a native Next.js application on Node.js with a dedicated PostgreSQL 17 database. All demo accounts and records are fictional.

## Start local development

```powershell
docker compose -f packages/db/docker-compose.yml up -d
Copy-Item .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The local PostgreSQL demo listens on `localhost:5433`. The `.env` file contains the demo-only database URL and flags; do not replace it with an institutional database URL.

## Documentation

- `docs/build-brief.md` — original requirements
- `docs/assumptions.md` — product and service boundaries
- `docs/permissions.md` — server-enforced resource/action matrix
- `docs/checklist.md` — implemented vs remaining work
- `docs/runbook.md` — setup, isolation, services, and verification boundaries
- `docs/model-map.md` — Prisma schema and demo model map
- `docs/validation.md` — verification status

The app provides three quick demo sign-ins: Student, Coordinator, and Super Admin. HTE Supervisors use the normal username/password form (`demo.supervisor` / `Demo@2026!`). HTE access is limited to a verified company, that company’s published posts and applicants, assigned active placements, and time-only DTR confirmation. Coordinators or Super Admins review company posts; HTE selection does not create a placement until a university coordinator confirms it. Placements become active only after coordinator activation on or after the start date.

Students can rate a company after formal placement completion. HTE users see only anonymous approved feedback after five distinct placements in the same academic period; university staff can identify the author. Placements at hosts without company accounts use a coordinator-only private host record and a one-use evaluation link with a separate access code. Students also complete two separate university forms after reported DTR reaches the target; a coordinator still makes the formal completion decision. Demo fixtures are idempotently seeded in PostgreSQL; existing D1 edits are not migrated.

## Checks

```powershell
pnpm check
pnpm lint
pnpm test
pnpm build
```

Database commands: `pnpm db:validate`, `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed`. The Vercel preview and the final Cloudflare path retirement still require a configured Vercel project and dedicated preview database.
