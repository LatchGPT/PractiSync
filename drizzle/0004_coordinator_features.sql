ALTER TABLE `classes` ADD `class_rep_id` text;--> statement-breakpoint
ALTER TABLE `classes` ADD `vice_class_rep_id` text;--> statement-breakpoint
CREATE TABLE `join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`note` text
);--> statement-breakpoint
CREATE INDEX `join_requests_class` ON `join_requests` (`tenant_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `join_requests_student` ON `join_requests` (`tenant_id`,`student_id`);
