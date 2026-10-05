# PractiSync — download quick start

This ZIP contains the source of the published fictional demo, PostgreSQL reference schema, migrations, tests, original build brief, and implementation notes.

## Requirements

Node.js 22.13 or newer (Node 24 recommended), pnpm 11.25, and a terminal. The downloaded copy removes the build environment’s absolute pnpm cache path. Dependencies and generated build output are intentionally excluded.

## Run the isolated demo locally

1. Extract the ZIP and open the `PractiSync` directory in your editor.
2. Run `pnpm install`.
3. Run `pnpm build` to generate the local Worker configuration.
4. Create `dist/server/.dev.vars` with the following values. Generate your own secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

   ```env
   DEPLOYMENT_MODE=demo
   DEMO_ENABLED=true
   AUTH_SECRET=your-generated-secret
   ```

   Keep this file private. It is excluded from Git by the `/dist/` rule.

5. Apply the four demo migrations to a fresh local D1 database, in order:

   ```sh
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fat_solo.sql
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_scoped_constraints.sql
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_vengeful_stark_industries.sql
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_application_finality.sql
   ```

6. Run `pnpm start` and open the local URL printed by Wrangler. The app starts at the login page. First demo sign-in seeds the fictional records automatically.

For live development, put the same values in `.dev.vars` at the project root and use `pnpm dev`. Build again before testing the compiled Worker.

## Demo login

Use the Student, Coordinator, Supervisor, or Super Admin button on the login page. To test the form, use `demo.student`, `demo.coordinator`, `demo.supervisor`, or `demo.admin` with the fictional password `Demo@2026!`.

## Checks

```sh
pnpm check
pnpm test
pnpm lint
node tests/worker-smoke.mjs
```

The Worker smoke script uses its own disposable database and non-production test secret. It requires a successful build. Browser visual QA and browser PDF export verification have not been completed.

## PostgreSQL foundation

The institutional reference schema is `packages/db/prisma/schema.prisma`. It contains 67 models and a committed PostgreSQL migration. Optional disposable PostgreSQL setup uses `packages/db/docker-compose.yml`. Set DATABASE_URL as described in `.env.example`, then run `pnpm db:validate`, `pnpm db:generate`, and `pnpm db:migrate`.

The hosted app currently uses a separate D1 demo adapter and the Vinext runtime. Institutional PostgreSQL repository integration, Google sign-in, actual private file storage/scanning, email, recovery and durable export jobs are unfinished. No PostgreSQL runtime or concurrency pass is claimed. See `docs/checklist.md`, `docs/assumptions.md`, and `docs/runbook.md` before planning production usage.

The `.openai/hosting.json` file identifies your existing hosted Site and contains no secrets. This download does not alter the published Site.
