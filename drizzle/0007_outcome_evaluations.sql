CREATE TABLE IF NOT EXISTS `outcome_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`placement_id` text NOT NULL,
	`coordinator_id` text NOT NULL,
	`decision` text NOT NULL,
	`rationale` text NOT NULL,
	`rubric_version` integer DEFAULT 1 NOT NULL,
	`calculated_score` real,
	`calculated_status` text NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `outcome_decisions_placement` ON `outcome_decisions` (`tenant_id`,`placement_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `outcome_decisions_coordinator` ON `outcome_decisions` (`tenant_id`,`coordinator_id`);
