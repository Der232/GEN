CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
