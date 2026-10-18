# Runbook and verification

## Local fictional demo

The app uses native Next.js on Node.js and PostgreSQL 17. Start the dedicated demo database on port `5433`:

```powershell
docker compose -f packages/db/docker-compose.yml up -d
Copy-Item .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed
docker compose -f infrastructure/documents/compose.yml up -d
# In a second terminal:
pnpm documents:worker
# In a third terminal:
pnpm dev
```

The default local `DATABASE_URL` points to `practisync_demo`, a separate database from any institutional database. The demo requires `DEPLOYMENT_MODE=demo` and `DEMO_ENABLED=true`. The seed upserts the fixed fictional `DEMO` tenant and refuses to seed if that tenant is already marked institutional. Keep the institutional database in a separate environment and connection string.

Word document previews require the Redis and converter containers plus the separate `documents:worker` process. Starting only `pnpm dev` leaves preview jobs waiting until they time out. Keep the worker connected to the same PostgreSQL database and Redis as the web app.

Fictional sign-ins:

- `demo.student` / `Demo@2026!`
- `demo.coordinator` / `Demo@2026!`
- `demo.admin` / `Demo@2026!`
- HTE Supervisor can use the HTE quick sign-in card or the normal username/password form: `demo.supervisor` / `Demo@2026!`.

The four fixed quick sign-ins are Student, Coordinator, Super Admin, and HTE Supervisor. The HTE identity remains limited to its assigned company workflows and placements. Seeding is idempotent and adds the existing fictional users, classes, placements, DTR history, documents, evaluations, companies, applications, announcements, cases, policies, join requests, and notifications. It does not copy edits from the existing D1 demo.

Coordinators configure weekly/monthly competency assessment cadence per course. Students submit one self-assessment per enabled calendar period; coordinators approve it or request a revision with a note. The HTE demo portal covers verified company posts, assigned applicants/placements, time-only DTR confirmation, and a final evidence-based rubric; university approval remains required. Coordinators confirm a placement after an HTE selection and activate planned placements on/after the start date. A host without an account is recorded privately by a coordinator and receives only a one-use guest evaluation link plus a separate access code. Super Admins can publish Word document templates for student completion and upload PDF templates for download. The final competency self-assessment and OJT exit survey unlock after reported hours reach the target; they remain separate from the coordinator's formal completion decision.

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
Host `documents:worker` as a separate long-running service with access to the same PostgreSQL database, Redis, and converter as the deployed web app. The web deployment alone cannot process Word preview jobs.

Word sources and uploaded PDFs are stored in PostgreSQL, not in the deployment filesystem. Keep `DATABASE_URL` pointed at persistent storage across redeployments. A new hosted database will start without files uploaded to the local demo database; transfer those records as part of deployment if they must appear there. The PDF list includes older uploads from `custom_document_templates`, and Super Admin can add more PDFs in Required OJT documents.
PDF and Word uploads are limited to 4 MB so their requests fit within Vercel's 4.5 MB Function payload limit. Larger documents require a direct storage upload flow before increasing this limit.

## Data and service boundaries

Only fictional records are in scope. Google account linking, password recovery, email delivery, private student file upload/scanning, durable background exports, and institution bootstrap are not configured. Admin PDF template uploads are stored in the database. Document rows are sample metadata; they are not real clearances. Do not use this deployment for real student records.
