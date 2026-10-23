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
# After the document scanner is available, install the published Word template:
pnpm documents:template
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

After migrations and `pnpm db:seed`, start the document scanner and run `pnpm documents:template` once against the persistent fictional-demo PostgreSQL database. This installs the packaged published Recommendation Letter DOCX and its 16 configured fields only when that active template is missing; it preserves any existing database version and later admin edits. Students see it once it is published. A Git push alone does not transfer database uploads. Keep `DATABASE_URL` pointed at persistent storage across redeployments. The PDF list includes older uploads from `custom_document_templates`, and Super Admin can add more PDFs in Required OJT documents.
PDF and Word uploads are limited to 4 MB so their requests fit within Vercel's 4.5 MB Function payload limit. Larger documents require a direct storage upload flow before increasing this limit.

## Data and service boundaries

Only fictional records are in scope. RTU Google sign-in, explicit identity invitations, local recovery, account email delivery and initial-admin bootstrap have prepared implementations; authorized institutional configuration and live-provider acceptance remain outstanding. Private student file upload/scanning and durable background exports have separate operational requirements. Admin PDF template uploads are stored in the database. Sample document rows and generated downloads do not establish submitted or approved clearances. Do not use this demonstration deployment for real student records.

## Deadline and account worker

Run a separate process beside the web app, using the same database, deployment flags, tenant and `AUTH_SECRET`:

```powershell
pnpm workflows:worker
# One operational check, then exit:
pnpm workflows:worker --once
```

For the SQLite `pnpm dev:demo` runner, use `pnpm workflows:demo` instead. That variant reads the runner's `.local/auth-secret` and uses its local database. Do not mix the SQLite worker with a PostgreSQL web app. After applying migrations, restart web and worker processes so PostgreSQL prepared statements and schema assumptions are refreshed.

The worker reconciles COE Office reservations every five seconds and checks email and document reminders every 60 seconds. Uncalled reservations become missed at the end of their five-minute slot; a consultation already in progress continues until an admin finishes it. The queue uses the cached Philippine public holiday feed plus active university-wide holiday events. Public holiday data refreshes daily; a saved calendar remains usable during a feed outage. A year without a saved calendar blocks reservations until it can be synced. Document deadlines use 09:00 Asia/Manila three days and one day before the due date; date-only deadlines end at 23:59 Manila. Policies, slots, recipient deliveries and heartbeat are persisted. Repeated reminder checks deduplicate delivery. After downtime, expired queue reservations are reconciled before display or mutation.

Calendar deadline controls can link a published form by its stable template ID. Only a genuine submitted/approved response suppresses the linked obligation; a correction request allows remaining future slots. An unlinked deadline is a general notice. Generated Word/PDF downloads and seeded document metadata never count as submission. FEAT-04 must connect any new wallet/clearance evidence through this resolver before claiming that integration.

Coordinators and Super Admin see scoped reminder processing state and failed-slot retry controls in Calendar. Account email state and eligible failed-email retry are visible to Super Admin in Settings. Retries remain subject to live eligibility and token expiry. Automatic account email delivery stops after three failed attempts, with backoff between attempts; inspect sender configuration before retrying. Account email's provider-accepted state is not proof of arrival in a person's inbox. In-app reminder delivery does not send reminder email.

## Prepared institutional account integration

Keep `INSTITUTIONAL_ENABLED=false` in the demonstration environment. An authorized institutional installation needs its own PostgreSQL database, the committed migrations, an explicitly provisioned Prisma `Tenant` row with mode `INSTITUTIONAL`, and an approved university ID distinct from the fixed demo tenant. There is no public university onboarding endpoint. Never seed fictional demo records into that database.

Configure `DEPLOYMENT_MODE=institutional`, `DEMO_ENABLED=false`, `INSTITUTIONAL_TENANT_ID`, `INSTITUTIONAL_ENABLED=true`, a strong `AUTH_SECRET`, and the approved HTTPS `APP_ORIGIN` only for the authorized integration test environment. Configure `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` for an authorized RTU Google Workspace OAuth client, with callback `<APP_ORIGIN>/api/auth/callback/google`. Auth.js validates the OIDC response; application admission additionally checks the Google issuer, stable subject, exact verified RTU email and hosted-domain claim. An email suffix alone never links an existing account.

New RTU student identities receive a fresh registration gate. Existing users require an explicit invitation to bind their provider identity. Staff roles and university/class scope are preassigned by the office; the first Google login never grants administrator authority. HTEs and explicitly authorized student domain exceptions use local activation/recovery. Google manages recovery for SSO accounts. Local activation/invitation links last 24 hours; local recovery links last 30 minutes. Both are single use, and password reset or account deactivation invalidates previous sessions. Settings also provides actual self-session revocation, including the current browser; application MFA is not configured.

For account email, configure `MAIL_TRANSPORT=resend`, an authorized `RESEND_API_KEY`, and a verified `MAIL_FROM`. Sender authorization, receipt and expiry/reuse acceptance must be checked using approved test identities. Outbox content is encrypted using a key derived from `AUTH_SECRET`; rotating that secret requires reissuing outstanding account mail. Never copy secret values or invitation links into Obsidian or the manuscript. The demo-only `MAIL_TRANSPORT=test` captures messages inside its server process for tests and has no public inbox endpoint.

After the institution, provider and sender are configured, the authorized operator can create the first preassigned administrator invitation:

```powershell
pnpm accounts:bootstrap --name "Authorized staff name" --email authorized.staff@rtu.edu.ph
```

This CLI queues an invitation and refuses a university that already has a Super Admin; it does not link an identity or activate an account before acceptance. Keep the worker running to process that invitation. Subsequent invitations use the Super Admin account tools. Bootstrap and live OAuth/email were not executed for an institution during FEAT-05–08 verification.

See [the scope contract](backlog-5-8-contract.md) and [dated verification evidence](backlog-5-8-evidence.md). Full institutional release remains gated on live provider/delivery checks and isolation acceptance after FEAT-01–04 integration.
