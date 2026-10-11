CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"author_id" text NOT NULL,
	"class_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" text NOT NULL,
	"status" text DEFAULT 'PUBLISHED' NOT NULL
);

CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"job_id" text NOT NULL,
	"student_id" text NOT NULL,
	"cover_letter" text NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL
);

CREATE UNIQUE INDEX "application_job_student" ON "applications" ("tenant_id","job_id","student_id");

CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"placement_id" text NOT NULL,
	"supervisor_id" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX "assignment_pair" ON "assignments" ("tenant_id","placement_id","supervisor_id");

CREATE TABLE "audit" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_id" text NOT NULL,
	"reason" text
);

CREATE INDEX "audit_tenant_date" ON "audit" ("tenant_id","created_at");

CREATE TABLE "case_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"case_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL
);

CREATE INDEX "case_message_case" ON "case_messages" ("tenant_id","case_id");

CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"name" text NOT NULL,
	"section" text NOT NULL,
	"course_id" text NOT NULL,
	"coordinator_id" text NOT NULL,
	"period" text NOT NULL,
	"code_hash" text NOT NULL,
	"code_label" text NOT NULL,
	"expires_at" text,
	"revoked" integer DEFAULT 0 NOT NULL
);

CREATE INDEX "classes_coordinator" ON "classes" ("tenant_id","coordinator_id");

CREATE UNIQUE INDEX "classes_code" ON "classes" ("code_hash");

CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"location" text NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"can_post" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "completion" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"placement_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"reason" text
);

CREATE UNIQUE INDEX "completion_placement" ON "completion" ("tenant_id","placement_id");

CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"department_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL
);

CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL
);

CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"placement_id" text NOT NULL,
	"name" text NOT NULL,
	"filename" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"reviewer_id" text
);

CREATE INDEX "documents_placement" ON "documents" ("tenant_id","placement_id");

CREATE TABLE "enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"class_id" text NOT NULL,
	"student_id" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX "enrollment_class_student" ON "enrollments" ("tenant_id","class_id","student_id");

CREATE INDEX "enrollment_student" ON "enrollments" ("tenant_id","student_id");

CREATE TABLE "entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"placement_id" text NOT NULL,
	"date" text NOT NULL,
	"narrative" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"confirmed_version" integer,
	"confirmed_by" text
);

CREATE INDEX "entries_placement_date" ON "entries" ("tenant_id","placement_id","date");

CREATE TABLE "evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"placement_id" text NOT NULL,
	"evaluator_id" text NOT NULL,
	"kind" text NOT NULL,
	"framework_version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL
);

CREATE TABLE "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"placement_id" text NOT NULL,
	"student_id" text NOT NULL,
	"coordinator_id" text NOT NULL,
	"subject" text NOT NULL,
	"narrative" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"resolution" text
);

CREATE INDEX "incident_coordinator" ON "incidents" ("tenant_id","coordinator_id");

CREATE INDEX "incident_student" ON "incidents" ("tenant_id","student_id");

CREATE TABLE "intervals" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"entry_id" text NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"minutes" integer NOT NULL,
	CONSTRAINT "interval_order" CHECK("ends_at">"starts_at"),
	CONSTRAINT "interval_minutes" CHECK("minutes">0 AND "break_minutes">=0)
);

CREATE INDEX "interval_entry" ON "intervals" ("tenant_id","entry_id");

CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"company_id" text NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"course_id" text NOT NULL,
	"skills" text NOT NULL,
	"openings" integer NOT NULL,
	"status" text DEFAULT 'PUBLISHED' NOT NULL
);

CREATE TABLE "placements" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"student_id" text NOT NULL,
	"company_id" text NOT NULL,
	"class_id" text NOT NULL,
	"course_id" text NOT NULL,
	"period" text NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"required_minutes" integer,
	"policy_version" integer,
	"status" text NOT NULL
);

CREATE INDEX "placement_student" ON "placements" ("tenant_id","student_id");

CREATE INDEX "placement_class" ON "placements" ("tenant_id","class_id");

CREATE TABLE "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"course_id" text NOT NULL,
	"period" text NOT NULL,
	"required_minutes" integer NOT NULL,
	"version" integer NOT NULL,
	"author_id" text NOT NULL,
	CONSTRAINT "positive_policy" CHECK("required_minutes">0)
);

CREATE UNIQUE INDEX "policy_course_version" ON "policies" ("tenant_id","course_id","period","version");

CREATE TABLE "policy_scopes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"supervisor_id" text NOT NULL,
	"course_id" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX "scope_supervisor_course" ON "policy_scopes" ("tenant_id","supervisor_id","course_id");

CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
  "window_start" bigint NOT NULL
);

CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"company_id" text NOT NULL,
	"student_id" text NOT NULL,
	"placement_id" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	CONSTRAINT "rating_range" CHECK("rating" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX "review_placement_student" ON "reviews" ("tenant_id","placement_id","student_id");

CREATE TABLE "revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"entry_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"previous_version" integer NOT NULL,
	"narrative" text NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"break_minutes" integer NOT NULL,
	"reason" text NOT NULL
);

CREATE UNIQUE INDEX "revision_entry_version" ON "revisions" ("tenant_id","entry_id","previous_version");

CREATE TABLE "scores" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"evaluation_id" text NOT NULL,
	"dimension" text NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "demo_score_range" CHECK("score" BETWEEN 1 AND 5)
);

CREATE TABLE "seed_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"password_hash" text,
	"session_version" integer DEFAULT 1 NOT NULL,
	"is_demo" integer DEFAULT 0 NOT NULL,
	"course_id" text,
	"company_id" text,
	CONSTRAINT "valid_role" CHECK("role" IN ('SUPER_ADMIN','COORDINATOR','SUPERVISOR','STUDENT'))
);

CREATE UNIQUE INDEX "users_username" ON "users" ("username");

CREATE INDEX "users_tenant_role" ON "users" ("tenant_id","role");

CREATE UNIQUE INDEX single_primary_class ON enrollments(tenant_id,student_id) WHERE active=1;

ALTER TABLE "users" ADD "supervisor_verified" integer DEFAULT 0 NOT NULL;

ALTER TABLE "users" ADD "can_post" integer DEFAULT 0 NOT NULL;
ALTER TABLE "classes" ADD "class_rep_id" text;

ALTER TABLE "classes" ADD "vice_class_rep_id" text;

CREATE TABLE "join_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"class_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"note" text
);

CREATE INDEX "join_requests_class" ON "join_requests" ("tenant_id","class_id");

CREATE INDEX "join_requests_student" ON "join_requests" ("tenant_id","student_id");

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"resource_type" text DEFAULT '',
	"resource_id" text DEFAULT '',
	"link_page" text DEFAULT '',
	"read_at" text
);

CREATE INDEX IF NOT EXISTS "notifications_user" ON "notifications" ("tenant_id","user_id","created_at");

CREATE INDEX IF NOT EXISTS "notifications_unread" ON "notifications" ("tenant_id","user_id","read_at");

CREATE TABLE "assessment_schedules" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "created_at" text NOT NULL,
  "course_id" text NOT NULL,
  "cadence" text NOT NULL CHECK ("cadence" IN ('WEEKLY','MONTHLY','BOTH')),
  "updated_at" text NOT NULL,
  "configured_by" text,
  "version" integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX "assessment_schedule_course" ON "assessment_schedules" ("tenant_id","course_id");

ALTER TABLE "evaluations" ADD "period_start" text;

ALTER TABLE "evaluations" ADD "period_end" text;

ALTER TABLE "evaluations" ADD "version" integer NOT NULL DEFAULT 1;

ALTER TABLE "evaluations" ADD "review_note" text;

ALTER TABLE "evaluations" ADD "reviewed_by" text;

ALTER TABLE "evaluations" ADD "reviewed_at" text;

CREATE UNIQUE INDEX "evaluation_period_once" ON "evaluations" ("tenant_id","placement_id","kind","period_start");

CREATE TABLE "evaluation_revisions" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "created_at" text NOT NULL,
  "evaluation_id" text NOT NULL,
  "actor_id" text NOT NULL,
  "previous_version" integer NOT NULL,
  "scores_json" text NOT NULL,
  "review_note" text
);

CREATE UNIQUE INDEX "evaluation_revision_version" ON "evaluation_revisions" ("tenant_id","evaluation_id","previous_version");

INSERT INTO "assessment_schedules" ("id","tenant_id","created_at","course_id","cadence","updated_at","version")
SELECT 'schedule-' || "id", "tenant_id", CURRENT_TIMESTAMP::text, "id", 'WEEKLY', CURRENT_TIMESTAMP::text, 1 FROM "courses" ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION practisync_validate_tenant_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE reference_id text; relation_exists boolean;
BEGIN
  reference_id := to_jsonb(NEW) ->> TG_ARGV[1];
  IF reference_id IS NOT NULL THEN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 AND tenant_id = $2)', TG_ARGV[0]) INTO relation_exists USING reference_id, NEW.tenant_id;
    IF NOT relation_exists THEN RAISE EXCEPTION 'Invalid scoped relationship'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER scope_courses_department_id_insert BEFORE INSERT ON "courses" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('departments', 'department_id');

CREATE TRIGGER scope_courses_department_id_update BEFORE UPDATE ON "courses" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('departments', 'department_id');

CREATE TRIGGER scope_classes_course_id_insert BEFORE INSERT ON "classes" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_classes_course_id_update BEFORE UPDATE ON "classes" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_classes_coordinator_id_insert BEFORE INSERT ON "classes" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'coordinator_id');

CREATE TRIGGER scope_classes_coordinator_id_update BEFORE UPDATE ON "classes" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'coordinator_id');

CREATE TRIGGER scope_enrollments_class_id_insert BEFORE INSERT ON "enrollments" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('classes', 'class_id');

CREATE TRIGGER scope_enrollments_class_id_update BEFORE UPDATE ON "enrollments" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('classes', 'class_id');

CREATE TRIGGER scope_enrollments_student_id_insert BEFORE INSERT ON "enrollments" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_enrollments_student_id_update BEFORE UPDATE ON "enrollments" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_policies_course_id_insert BEFORE INSERT ON "policies" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_policies_course_id_update BEFORE UPDATE ON "policies" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_policies_author_id_insert BEFORE INSERT ON "policies" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'author_id');

CREATE TRIGGER scope_policies_author_id_update BEFORE UPDATE ON "policies" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'author_id');

CREATE TRIGGER scope_placements_student_id_insert BEFORE INSERT ON "placements" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_placements_student_id_update BEFORE UPDATE ON "placements" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_placements_company_id_insert BEFORE INSERT ON "placements" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('companies', 'company_id');

CREATE TRIGGER scope_placements_company_id_update BEFORE UPDATE ON "placements" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('companies', 'company_id');

CREATE TRIGGER scope_placements_class_id_insert BEFORE INSERT ON "placements" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('classes', 'class_id');

CREATE TRIGGER scope_placements_class_id_update BEFORE UPDATE ON "placements" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('classes', 'class_id');

CREATE TRIGGER scope_placements_course_id_insert BEFORE INSERT ON "placements" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_placements_course_id_update BEFORE UPDATE ON "placements" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_assignments_placement_id_insert BEFORE INSERT ON "assignments" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_assignments_placement_id_update BEFORE UPDATE ON "assignments" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_assignments_supervisor_id_insert BEFORE INSERT ON "assignments" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'supervisor_id');

CREATE TRIGGER scope_assignments_supervisor_id_update BEFORE UPDATE ON "assignments" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'supervisor_id');

CREATE TRIGGER scope_entries_placement_id_insert BEFORE INSERT ON "entries" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_entries_placement_id_update BEFORE UPDATE ON "entries" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_intervals_entry_id_insert BEFORE INSERT ON "intervals" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('entries', 'entry_id');

CREATE TRIGGER scope_intervals_entry_id_update BEFORE UPDATE ON "intervals" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('entries', 'entry_id');

CREATE TRIGGER scope_documents_placement_id_insert BEFORE INSERT ON "documents" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_documents_placement_id_update BEFORE UPDATE ON "documents" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_incidents_placement_id_insert BEFORE INSERT ON "incidents" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_incidents_placement_id_update BEFORE UPDATE ON "incidents" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_incidents_student_id_insert BEFORE INSERT ON "incidents" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_incidents_student_id_update BEFORE UPDATE ON "incidents" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_incidents_coordinator_id_insert BEFORE INSERT ON "incidents" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'coordinator_id');

CREATE TRIGGER scope_incidents_coordinator_id_update BEFORE UPDATE ON "incidents" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'coordinator_id');

CREATE TRIGGER scope_jobs_company_id_insert BEFORE INSERT ON "jobs" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('companies', 'company_id');

CREATE TRIGGER scope_jobs_company_id_update BEFORE UPDATE ON "jobs" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('companies', 'company_id');

CREATE TRIGGER scope_jobs_course_id_insert BEFORE INSERT ON "jobs" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_jobs_course_id_update BEFORE UPDATE ON "jobs" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_jobs_author_id_insert BEFORE INSERT ON "jobs" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'author_id');

CREATE TRIGGER scope_jobs_author_id_update BEFORE UPDATE ON "jobs" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'author_id');

CREATE TRIGGER scope_applications_job_id_insert BEFORE INSERT ON "applications" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('jobs', 'job_id');

CREATE TRIGGER scope_applications_job_id_update BEFORE UPDATE ON "applications" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('jobs', 'job_id');

CREATE TRIGGER scope_applications_student_id_insert BEFORE INSERT ON "applications" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_applications_student_id_update BEFORE UPDATE ON "applications" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_evaluations_placement_id_insert BEFORE INSERT ON "evaluations" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_evaluations_placement_id_update BEFORE UPDATE ON "evaluations" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_evaluations_evaluator_id_insert BEFORE INSERT ON "evaluations" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'evaluator_id');

CREATE TRIGGER scope_evaluations_evaluator_id_update BEFORE UPDATE ON "evaluations" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'evaluator_id');

CREATE TRIGGER scope_scores_evaluation_id_insert BEFORE INSERT ON "scores" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('evaluations', 'evaluation_id');

CREATE TRIGGER scope_scores_evaluation_id_update BEFORE UPDATE ON "scores" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('evaluations', 'evaluation_id');

CREATE TRIGGER scope_reviews_placement_id_insert BEFORE INSERT ON "reviews" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_reviews_placement_id_update BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_reviews_company_id_insert BEFORE INSERT ON "reviews" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('companies', 'company_id');

CREATE TRIGGER scope_reviews_company_id_update BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('companies', 'company_id');

CREATE TRIGGER scope_reviews_student_id_insert BEFORE INSERT ON "reviews" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_reviews_student_id_update BEFORE UPDATE ON "reviews" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'student_id');

CREATE TRIGGER scope_completion_placement_id_insert BEFORE INSERT ON "completion" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_completion_placement_id_update BEFORE UPDATE ON "completion" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('placements', 'placement_id');

CREATE TRIGGER scope_policy_scopes_supervisor_id_insert BEFORE INSERT ON "policy_scopes" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'supervisor_id');

CREATE TRIGGER scope_policy_scopes_supervisor_id_update BEFORE UPDATE ON "policy_scopes" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('users', 'supervisor_id');

CREATE TRIGGER scope_policy_scopes_course_id_insert BEFORE INSERT ON "policy_scopes" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE TRIGGER scope_policy_scopes_course_id_update BEFORE UPDATE ON "policy_scopes" FOR EACH ROW EXECUTE FUNCTION practisync_validate_tenant_reference('courses', 'course_id');

CREATE OR REPLACE FUNCTION practisync_prevent_overlapping_intervals() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE placement text; has_overlap boolean;
BEGIN
  SELECT placement_id INTO placement FROM entries WHERE id = NEW.entry_id AND tenant_id = NEW.tenant_id;
  SELECT EXISTS (SELECT 1 FROM intervals i JOIN entries old_entry ON old_entry.id = i.entry_id AND old_entry.tenant_id = i.tenant_id WHERE i.tenant_id = NEW.tenant_id AND old_entry.placement_id = placement AND i.id <> NEW.id AND i.starts_at::timestamptz < NEW.ends_at::timestamptz AND i.ends_at::timestamptz > NEW.starts_at::timestamptz) INTO has_overlap;
  IF has_overlap THEN RAISE EXCEPTION 'Attendance overlap'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER intervals_overlap_insert BEFORE INSERT ON "intervals" FOR EACH ROW EXECUTE FUNCTION practisync_prevent_overlapping_intervals();

CREATE TRIGGER intervals_overlap_update BEFORE UPDATE ON "intervals" FOR EACH ROW EXECUTE FUNCTION practisync_prevent_overlapping_intervals();

CREATE OR REPLACE FUNCTION practisync_application_final_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('ACCEPTED', 'REJECTED') AND NEW.status <> OLD.status THEN RAISE EXCEPTION 'Application final decision is immutable'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER application_final_decision_immutable BEFORE UPDATE OF status ON "applications" FOR EACH ROW EXECUTE FUNCTION practisync_application_final_immutable();
