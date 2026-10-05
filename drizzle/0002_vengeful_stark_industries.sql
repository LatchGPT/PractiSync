ALTER TABLE `users` ADD `supervisor_verified` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `can_post` integer DEFAULT 0 NOT NULL;