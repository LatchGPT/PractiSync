CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`author_id` text NOT NULL,
	`class_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`audience` text NOT NULL,
	`status` text DEFAULT 'PUBLISHED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`job_id` text NOT NULL,
	`student_id` text NOT NULL,
	`cover_letter` text NOT NULL,
	`status` text DEFAULT 'SUBMITTED' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_job_student` ON `applications` (`tenant_id`,`job_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`placement_id` text NOT NULL,
	`supervisor_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assignment_pair` ON `assignments` (`tenant_id`,`placement_id`,`supervisor_id`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_id` text NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE INDEX `audit_tenant_date` ON `audit` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `case_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`case_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `case_message_case` ON `case_messages` (`tenant_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`name` text NOT NULL,
	`section` text NOT NULL,
	`course_id` text NOT NULL,
	`coordinator_id` text NOT NULL,
	`period` text NOT NULL,
	`code_hash` text NOT NULL,
	`code_label` text NOT NULL,
	`expires_at` text,
	`revoked` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `classes_coordinator` ON `classes` (`tenant_id`,`coordinator_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `classes_code` ON `classes` (`code_hash`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`name` text NOT NULL,
	`industry` text NOT NULL,
	`location` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`can_post` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `completion` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`placement_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `completion_placement` ON `completion` (`tenant_id`,`placement_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`department_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`placement_id` text NOT NULL,
	`name` text NOT NULL,
	`filename` text NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	`version` integer DEFAULT 1 NOT NULL,
	`reviewer_id` text
);
--> statement-breakpoint
CREATE INDEX `documents_placement` ON `documents` (`tenant_id`,`placement_id`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_class_student` ON `enrollments` (`tenant_id`,`class_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `enrollment_student` ON `enrollments` (`tenant_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`placement_id` text NOT NULL,
	`date` text NOT NULL,
	`narrative` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`confirmed_version` integer,
	`confirmed_by` text
);
--> statement-breakpoint
CREATE INDEX `entries_placement_date` ON `entries` (`tenant_id`,`placement_id`,`date`);--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`placement_id` text NOT NULL,
	`evaluator_id` text NOT NULL,
	`kind` text NOT NULL,
	`framework_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'SUBMITTED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`placement_id` text NOT NULL,
	`student_id` text NOT NULL,
	`coordinator_id` text NOT NULL,
	`subject` text NOT NULL,
	`narrative` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`resolution` text
);
--> statement-breakpoint
CREATE INDEX `incident_coordinator` ON `incidents` (`tenant_id`,`coordinator_id`);--> statement-breakpoint
CREATE INDEX `incident_student` ON `incidents` (`tenant_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `intervals` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`entry_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`break_minutes` integer DEFAULT 0 NOT NULL,
	`minutes` integer NOT NULL,
	CONSTRAINT "interval_order" CHECK("intervals"."ends_at">"intervals"."starts_at"),
	CONSTRAINT "interval_minutes" CHECK("intervals"."minutes">0 AND "intervals"."break_minutes">=0)
);
--> statement-breakpoint
CREATE INDEX `interval_entry` ON `intervals` (`tenant_id`,`entry_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`company_id` text NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`location` text NOT NULL,
	`course_id` text NOT NULL,
	`skills` text NOT NULL,
	`openings` integer NOT NULL,
	`status` text DEFAULT 'PUBLISHED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `placements` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`student_id` text NOT NULL,
	`company_id` text NOT NULL,
	`class_id` text NOT NULL,
	`course_id` text NOT NULL,
	`period` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`required_minutes` integer,
	`policy_version` integer,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `placement_student` ON `placements` (`tenant_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `placement_class` ON `placements` (`tenant_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`course_id` text NOT NULL,
	`period` text NOT NULL,
	`required_minutes` integer NOT NULL,
	`version` integer NOT NULL,
	`author_id` text NOT NULL,
	CONSTRAINT "positive_policy" CHECK("policies"."required_minutes">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_course_version` ON `policies` (`tenant_id`,`course_id`,`period`,`version`);--> statement-breakpoint
CREATE TABLE `policy_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`supervisor_id` text NOT NULL,
	`course_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scope_supervisor_course` ON `policy_scopes` (`tenant_id`,`supervisor_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`company_id` text NOT NULL,
	`student_id` text NOT NULL,
	`placement_id` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	CONSTRAINT "rating_range" CHECK("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_placement_student` ON `reviews` (`tenant_id`,`placement_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`entry_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`previous_version` integer NOT NULL,
	`narrative` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`break_minutes` integer NOT NULL,
	`reason` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revision_entry_version` ON `revisions` (`tenant_id`,`entry_id`,`previous_version`);--> statement-breakpoint
CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`evaluation_id` text NOT NULL,
	`dimension` text NOT NULL,
	`score` integer NOT NULL,
	CONSTRAINT "demo_score_range" CHECK("scores"."score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE `seed_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`name` text NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`password_hash` text,
	`session_version` integer DEFAULT 1 NOT NULL,
	`is_demo` integer DEFAULT 0 NOT NULL,
	`course_id` text,
	`company_id` text,
	CONSTRAINT "valid_role" CHECK("users"."role" IN ('SUPER_ADMIN','COORDINATOR','SUPERVISOR','STUDENT'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_tenant_role` ON `users` (`tenant_id`,`role`);