# Runbook and verification

## Local fictional demo

The app uses native Next.js on Node.js and PostgreSQL 17. Start the dedicated demo database on port `5433`:

```powershell
docker compose -f packages/db/docker-compose.yml up -d
Copy-Item .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The default local `DATABASE_URL` points to `practisync_demo`, a separate database from any institutional database. The demo requires `DEPLOYMENT_MODE=demo` and `DEMO_ENABLED=true`. The seed upserts the fixed fictional `DEMO` tenant and refuses to seed if that tenant is already marked institutional. Keep the institutional database in a separate environment and connection string.

Fictional sign-ins:

- `demo.student` / `Demo@2026!`
- `demo.coordinator` / `Demo@2026!`
- `demo.admin` / `Demo@2026!`
- HTE Supervisor can use the HTE quick sign-in card or the normal username/password form: `demo.supervisor` / `Demo@2026!`.

The four fixed quick sign-ins are Student, Coordinator, Super Admin, and HTE Supervisor. The HTE identity remains limited to its assigned company workflows and placements. Seeding is idempotent and adds the existing fictional users, classes, placements, DTR history, documents, evaluations, companies, applications, announcements, cases, policies, join requests, and notifications. It does not copy edits from the existing D1 demo.

Coordinators configure weekly/monthly competency assessment cadence per course. Students submit one self-assessment per enabled calendar period; coordinators approve it or request a revision with a note. The HTE demo portal covers verified company posts, assigned applicants/placements, time-only DTR confirmation, and a final evidence-based rubric; university approval remains required. Coordinators confirm a placement after an HTE selection and activate planned placements on/after the start date. A host without an account is recorded privately by a coordinator and receives only a one-use guest evaluation link plus a separate access code. Students submit two different end-of-OJT forms after reported hours reach the target; coordinator review is still required for formal completion.

## Commands

```powershell
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm start
```

`pnpm db:seed` and automatic sign-in seeding both require the demo environment flags. `pnpm db:migrate` applies the committed Prisma migrations. The Postgres service stores its data in the Docker volume `practisync-pg`; do not delete that volume if you need to retain local demo edits.

## Vercel preview

Use a dedicated fictional-demo PostgreSQL database for Vercel Preview. Set `DATABASE_URL`, `AUTH_SECRET`, `DEPLOYMENT_MODE=demo`, and `DEMO_ENABLED=true` in Preview only. Apply Prisma migrations before the first sign-in. Do not point Preview at the future institutional database. Run all four quick sign-ins, the HTE username/password sign-in, and the demo acceptance flows before retiring the previously hosted Cloudflare build. No Vercel project connection or hosted database credentials are configured in this checkout, so preview deployment remains outstanding.

## Data and service boundaries

Only fictional records are in scope. Google account linking, password recovery, email delivery, private file upload/scanning, durable background exports, and institution bootstrap are not configured. Document rows are sample metadata; they are not real clearances. Do not use this deployment for real student records.
