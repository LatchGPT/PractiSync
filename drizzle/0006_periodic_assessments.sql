CREATE TABLE `assessment_schedules` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL,
  `created_at` text NOT NULL,
  `course_id` text NOT NULL,
  `cadence` text NOT NULL CHECK (`cadence` IN ('WEEKLY','MONTHLY','BOTH')),
  `updated_at` text NOT NULL,
  `configured_by` text,
  `version` integer NOT NULL DEFAULT 1
);--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_schedule_course` ON `assessment_schedules` (`tenant_id`,`course_id`);--> statement-breakpoint
CREATE TRIGGER scope_assessment_schedule_course_insert BEFORE INSERT ON assessment_schedules BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;--> statement-breakpoint
CREATE TRIGGER scope_assessment_schedule_course_update BEFORE UPDATE ON assessment_schedules BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NOT EXISTS (SELECT 1 FROM courses WHERE id=NEW.course_id AND tenant_id=NEW.tenant_id); END;--> statement-breakpoint
ALTER TABLE `evaluations` ADD `period_start` text;--> statement-breakpoint
ALTER TABLE `evaluations` ADD `period_end` text;--> statement-breakpoint
ALTER TABLE `evaluations` ADD `version` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `evaluations` ADD `review_note` text;--> statement-breakpoint
ALTER TABLE `evaluations` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `evaluations` ADD `reviewed_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_period_once` ON `evaluations` (`tenant_id`,`placement_id`,`kind`,`period_start`);--> statement-breakpoint
CREATE TABLE `evaluation_revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL,
  `created_at` text NOT NULL,
  `evaluation_id` text NOT NULL,
  `actor_id` text NOT NULL,
  `previous_version` integer NOT NULL,
  `scores_json` text NOT NULL,
  `review_note` text
);--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_revision_version` ON `evaluation_revisions` (`tenant_id`,`evaluation_id`,`previous_version`);--> statement-breakpoint
CREATE TRIGGER scope_evaluation_revision_insert BEFORE INSERT ON evaluation_revisions BEGIN SELECT RAISE(ABORT, 'Invalid scoped relationship') WHERE NOT EXISTS (SELECT 1 FROM evaluations WHERE id=NEW.evaluation_id AND tenant_id=NEW.tenant_id) OR NOT EXISTS (SELECT 1 FROM users WHERE id=NEW.actor_id AND tenant_id=NEW.tenant_id); END;--> statement-breakpoint
INSERT OR IGNORE INTO `assessment_schedules` (`id`,`tenant_id`,`created_at`,`course_id`,`cadence`,`updated_at`,`version`)
SELECT 'schedule-' || `id`, `tenant_id`, datetime('now'), `id`, 'WEEKLY', datetime('now'), 1 FROM `courses`;
