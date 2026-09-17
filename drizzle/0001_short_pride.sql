CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`r2_key` text NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`extracted_text` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `exams` ADD `document_id` text REFERENCES documents(id);