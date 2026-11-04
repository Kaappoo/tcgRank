ALTER TABLE `user` ADD `is_guest` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `guest_of_id` text REFERENCES user(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `user` ADD `claim_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_claim_code_unique` ON `user` (`claim_code`);