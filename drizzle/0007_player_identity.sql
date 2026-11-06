CREATE TABLE `earned_tiers` (
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`tier` integer NOT NULL,
	`earned_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `achievement_id`, `tier`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `player_style` (
	`user_id` text PRIMARY KEY NOT NULL,
	`avatar` text NOT NULL,
	`sleeve_colour` text NOT NULL,
	`banner` text DEFAULT 'card-zones' NOT NULL,
	`banner_colour` text,
	`partner_card_id` text,
	`partner_name` text,
	`partner_set_name` text,
	`partner_image_url` text,
	`title_id` text,
	`showcase` text DEFAULT '[]' NOT NULL,
	`featured_deck_id` text,
	`achievements_seen_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`featured_deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
-- Uploaded profile photos are gone: every surface shows the avatar. better-auth keeps the column.
UPDATE `user` SET `image` = NULL;