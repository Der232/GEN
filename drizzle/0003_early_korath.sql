CREATE INDEX `idx_attempt_answers_attempt_id` ON `attempt_answers` (`attempt_id`);--> statement-breakpoint
CREATE INDEX `idx_attempts_user_id` ON `attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_attempts_exam_id` ON `attempts` (`exam_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_user_id` ON `documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_exams_user_id` ON `exams` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_exams_created_at` ON `exams` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_questions_exam_id` ON `questions` (`exam_id`);--> statement-breakpoint
CREATE INDEX `idx_rate_limits_lookup` ON `rate_limits` (`key`,`action`,`created_at`);