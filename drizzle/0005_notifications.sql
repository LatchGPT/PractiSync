CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`created_at` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text NOT NULL,
	`resource_type` text DEFAULT '',
	`resource_id` text DEFAULT '',
	`link_page` text DEFAULT '',
	`read_at` text
);--> statement-breakpoint
CREATE INDEX `notifications_user` ON `notifications` (`tenant_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_unread` ON `notifications` (`tenant_id`,`user_id`,`read_at`);
