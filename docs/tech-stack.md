# PractiSync tech stack

## Development and preview runtime

| Area | Technology | Use in this project |
| --- | --- | --- |
| Language and runtime | TypeScript 5.9, Node.js 22+ | Application code and local tooling |
| Web framework | Next.js 16 App Router, React 19 | Pages, layouts, route handlers, and UI |
| Hosting target | Vercel Node.js runtime | Native Next.js development, build, and start commands |
| Database | PostgreSQL 17 | Local fictional demo database and intended Vercel preview database |
| Data access | Prisma 6 and Prisma-managed migrations | PostgreSQL client, schema, migrations, and transactions; existing demo SQL uses a parameterized Prisma bridge during the port |
| Authentication | Auth.js (`@auth/core`) credentials provider | Username/password and four fixed demo sign-ins with JWT sessions |
| Styling | Tailwind CSS 4, custom CSS | Interface styling and theme |
| UI components | shadcn-style components, Radix UI, Base UI, Lucide | Controls, dialogs, icons, and interface elements |
| Forms and validation | React Hook Form, Zod | Form state and typed request validation |
| Charts and exports | Recharts, React PDF | Dashboard charts and downloadable training records |

## Database boundaries

Local development uses the PostgreSQL 17 service in `packages/db/docker-compose.yml`. The demo database is separate from any institutional database. `DEPLOYMENT_MODE=demo` and `DEMO_ENABLED=true` are required for demo reads, writes, authentication, and fixture seeding. Seeding also checks the normalized `Tenant` record and refuses to seed an institutional tenant.

The existing 68-model normalized Prisma schema remains in place for the institutional data design. The current fictional demo is being moved with its existing reduced table shape represented in the same PostgreSQL database and Prisma migration history. The server-side compatibility bridge uses parameterized Prisma raw queries and `$transaction` so existing response shapes and role/resource checks survive the port. Vercel preview validation is required before removing the old Cloudflare deployment files and D1 migrations.

Documents remain fictional metadata; no object storage or real uploads are configured. Google sign-in, email, and institutional use remain disabled.

## Development commands

- `pnpm dev`, `pnpm build`, and `pnpm start` run native Next.js.
- `docker compose -f packages/db/docker-compose.yml up -d` starts the isolated PostgreSQL 17 demo database on local port `5433`.
- `pnpm db:migrate` applies the Prisma migration history.
- `pnpm db:seed` loads the guarded, idempotent demo accounts and fictional fixtures.
- `pnpm check`, `pnpm lint`, and `pnpm test` run the project checks.

Primary configuration: [`package.json`](../package.json), [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma), and [`packages/db/docker-compose.yml`](../packages/db/docker-compose.yml).
