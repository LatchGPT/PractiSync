# Assumptions and runtime boundaries

## Visual theme

The demo uses a blue-and-gold palette and diagonal band motif inspired by Rizal Technological University's public [gold-and-blue language](https://www.rtu.edu.ph/wp-content/uploads/2025/07/APRIL-2025-Diario-Rizalia.pdf), [Pandayang Rizalia ethos](https://www.rtu.edu.ph/about/), and [academic sablay](https://www.rtu.edu.ph/rtu-debuts-sablay-in-its-52nd-commencement-exercises/). The interface colors are design approximations; no official color specifications or seal usage is claimed. Greenfield University, its people, policies, and records remain fictional demo content.

Confirmed product requirements remain in build-brief.md. One university is a tenant; departments and courses are separate. Classes are section/period scoped. Student progress is self-reported unless optionally confirmed; completion is a separate decision. Supervisor policy scope is explicit and company verification does not confer global access. Policy targets are placement snapshots. Identified SOS cases are visible only to their reporter and class coordinator; Super Admin and supervisors cannot read narratives.

All demo names, companies, hours, rubric scales, documents, reviews, and university identity are fictional. Demo course targets are 480 hours IT and 400 hours Business/Education; these are never represented as university requirements. The synthetic framework uses 1–5 solely for demonstration. Document metadata describes labeled samples and does not imply a real medical clearance. Unknown production rules block dependent work.

## Stack and architecture decision

UI: Next.js App Router/React 19, TypeScript strict, Tailwind 4, Shadcn primitives, Lucide, Recharts, React Hook Form/Zod. The hosted build executes via Vinext 1.0.0-beta.5 on Workers because Sites does not host a Node/PostgreSQL TCP server. This is a documented experimental runtime difference, not a claim that Next.js production compatibility is proven.

Institutional reference schema: Prisma 6.19.3 / PostgreSQL 17, normalized models and committed generated migration. Prisma 6 is a deliberately pinned release. PostgreSQL remains the required institutional backend. No PostgreSQL service or cloud provider was supplied, so live migration, concurrency and load results are unrun.

Hosted demo: an independent, Site-scoped D1 database with a reduced normalized demo adapter. This is an explicit hosting adaptation. It does not replace the PostgreSQL institution design, and the institutional runtime intentionally fails closed until its repository integration is complete. No real institutional records can be inserted into this demo. It is not the production deployment described in the brief. Source remains at repository root to preserve Sites build tooling; packages hold db/auth/domain/validation boundaries rather than moving the starter to apps/web.

Authentication uses Auth.js @auth/core 0.41.3 with JWT sessions; credentials require JWT (not database sessions). This is the maintained core package, marked experimental by its upstream docs. Registry next-auth v5 is 5.0.0-beta.32 (prerelease); we use core directly with standard Request/Response route handlers, not an invented v5 API. Each protected operation reloads the active account and session version. Demo role selection maps only to four fixed seeded demo IDs, never arbitrary roles. Username/password uses Node-compatible OpenSSL PBKDF2-SHA256, 600,000 iterations, random 16-byte salts, constant-time hash comparison. Auth.js CSRF remains enabled. Google is visibly unavailable until credentials, verified-domain allowlist, provisioned-account matching and deliberate linking are configured.

## Services and limitations

Google, Resend, private object storage/scanning, durable export queue, password recovery, initial real admin bootstrap and formal completion rules are not configured. Actual file upload/download, emails, real clearance and bulk PDF jobs must remain disabled. Demo PDF generation is an authenticated user-initiated export of current scoped fictional records; it is not completion certification. No official templates or institutional policy are fabricated.

Demo state is durable in the separate demo database. Changes are shared by the four demo identities. Seed is idempotent; no automatic destructive reset. Demo accounts cannot be deactivated or reassigned through the demo UI. Institutions must use separate deployment/database and set DEPLOYMENT_MODE=institutional, DEMO_ENABLED=false. This hosted adapter refuses institutional mode rather than bypassing missing authorization.
