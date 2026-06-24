ALTER TABLE `flashcards` ADD `specialty` varchar(255);--> statement-breakpoint
ALTER TABLE `flashcards` ADD `pattern` text;--> statement-breakpoint
ALTER TABLE `flashcards` ADD `answer` text;--> statement-breakpoint
ALTER TABLE `flashcards` ADD `explanation` text;--> statement-breakpoint
ALTER TABLE `flashcards` ADD `niceGuideline` varchar(255);--> statement-breakpoint
ALTER TABLE `flashcards` ADD `difficulty` varchar(50) DEFAULT 'Medium';--> statement-breakpoint
ALTER TABLE `flashcards` ADD `status` varchar(50) DEFAULT 'active';