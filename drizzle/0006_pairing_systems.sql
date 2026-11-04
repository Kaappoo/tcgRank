ALTER TABLE `event_players` ADD `seed` integer;--> statement-breakpoint
ALTER TABLE `event_players` ADD `schedule_position` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `pairing_system` text DEFAULT 'swiss' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `top_cut` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `top_cut_size` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `top_cut_round_minutes` integer;--> statement-breakpoint
ALTER TABLE `matches` ADD `bracket_slot` integer;--> statement-breakpoint
ALTER TABLE `rounds` ADD `elimination` integer DEFAULT false NOT NULL;