# Model map

The primary schema is PostgreSQL and is managed through Prisma migrations. It contains:

- 68 normalized institutional models covering tenant identity, memberships, courses, placements, attendance, competencies, documents, cases, jobs, announcements, completion, notifications, auditing, and infrastructure.
- A reduced set of mapped `Demo*` Prisma models for the current fictional demo workflows. They preserve the existing demo records and action/query contracts while the domain layer moves off D1.
- Additional demo models for guest HTE evaluation links, private host contact records, and the two completion-form response types. Guest access codes and URL tokens are stored only as hashes; issued access codes are returned once.

Both model sets live in the same local PostgreSQL database. Demo access is tenant-scoped and disabled unless the explicit demo environment flags are enabled. Demo seeding checks that the normalized tenant is marked `DEMO` and refuses institutional tenants.

The demo data is clean-seeded on a new database. Existing D1 demo edits are not copied.
