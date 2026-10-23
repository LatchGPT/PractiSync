-- Additive: preserve existing companies, approved posts, and applications.
ALTER TABLE "companies" ADD COLUMN "contact_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "companies" ADD COLUMN "contact_email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "companies" ADD COLUMN "contact_phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "companies" ADD COLUMN "contact_position" TEXT NOT NULL DEFAULT '';
ALTER TABLE "companies" ADD COLUMN "website" TEXT NOT NULL DEFAULT '';
-- [] means the legacy course_id remains the single eligible program.
ALTER TABLE "jobs" ADD COLUMN "required_courses_json" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "applications" ADD COLUMN "contact_phone" TEXT NOT NULL DEFAULT '';
