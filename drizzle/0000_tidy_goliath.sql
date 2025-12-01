CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`content` text,
	`type` text DEFAULT 'text' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
