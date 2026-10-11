CREATE TABLE IF NOT EXISTS `industry_feedback` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL,
  `created_at` text NOT NULL,
  `placement_id` text NOT NULL,
  `company_id` text NOT NULL,
  `supervisor_id` text NOT NULL,
  `course_id` text NOT NULL,
  `academic_period` text NOT NULL,
  `framework_version` integer DEFAULT 1 NOT NULL,
  `workplace_readiness` integer NOT NULL,
  `competency_relevance` integer NOT NULL,
  `supervision_support` integer NOT NULL,
  `curriculum_alignment` integer NOT NULL,
  `technical_gaps` text,
  `soft_skill_gaps` text,
  `recommendations` text NOT NULL,
  `status` text DEFAULT 'SUBMITTED' NOT NULL
);

CREATE INDEX IF NOT EXISTS `industry_feedback_placement` ON `industry_feedback` (`tenant_id`, `placement_id`);
CREATE INDEX IF NOT EXISTS `industry_feedback_course_period` ON `industry_feedback` (`tenant_id`, `course_id`, `academic_period`);
CREATE INDEX IF NOT EXISTS `industry_feedback_company` ON `industry_feedback` (`tenant_id`, `company_id`);
