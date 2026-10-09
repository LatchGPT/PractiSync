# PractiSync tech stack

This describes the stack currently present in the repository. The hosted, fictional demo and the institutional reference schema use different database paths.

## Running demo

| Area | Technology | Use in this project |
| --- | --- | --- |
| Language and runtime | TypeScript 5.9, Node.js 22+ | Application code and local tooling |
| Web framework | Next.js 16 App Router, React 19 | Pages, layouts, route handlers, and UI |
| Build and hosting | Vinext, Vite 8, Cloudflare Workers, Sites | Builds and runs the Next.js application in a Workers-compatible environment |
| Database | Cloudflare D1 (SQLite) | Persistent fictional demo data |
| Data access | Drizzle ORM and direct D1 SQL | Demo schema and queries |
| Authentication | Auth.js (`@auth/core`) credentials provider | Username/password and demo-role sign-in with JWT sessions |
| Styling | Tailwind CSS 4, custom CSS | Interface styling and theme |
| UI components | shadcn-style components, Radix UI, Base UI, Lucide | Controls, dialogs, icons, and other interface elements |
| Forms and validation | React Hook Form, Zod | Form state and typed request validation |
| Charts and exports | Recharts, React PDF | Dashboard charts and downloadable training records |

The configured Sites database binding is `DB`. No R2 bucket is configured in `.openai/hosting.json`; document files are not currently uploaded or stored by the demo.

## Institutional reference schema

The repository also contains a PostgreSQL 17 schema and migration managed with Prisma 6. This is a reference for the intended institutional backend. The current hosted demo uses D1, and the PostgreSQL application integration is not complete. See [the implementation checklist](checklist.md) and [runbook](runbook.md) before treating this as a production stack.

## Development tooling

- **Package management:** pnpm 11 workspace, with packages under `packages/`.
- **Task orchestration:** Turbo.
- **Checks:** TypeScript (`pnpm check`), ESLint (`pnpm lint`), and Vitest (`pnpm test`).
- **Local Cloudflare runtime:** Wrangler and Miniflare.

Primary configuration: [`package.json`](../package.json), [`vite.config.ts`](../vite.config.ts), [`drizzle.config.ts`](../drizzle.config.ts), [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma), and [`.openai/hosting.json`](../.openai/hosting.json).
