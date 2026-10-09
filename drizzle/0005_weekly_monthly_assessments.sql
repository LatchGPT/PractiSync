ALTER TABLE `courses` ADD `assessment_cadence` text DEFAULT 'BOTH' NOT NULL;--> statement-breakpoint
ALTER TABLE `evaluations` ADD `period` text;--> statement-breakpoint
ALTER TABLE `evaluations` ADD `reason` text;
