CREATE TABLE `flashcards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`category` varchar(255),
	`front` text NOT NULL,
	`back` text NOT NULL,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_srs_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`flashcardId` int NOT NULL,
	`interval` int DEFAULT 1,
	`easeFactor` decimal(5,2) DEFAULT '2.5',
	`repetitions` int DEFAULT 0,
	`dueDate` date,
	`lastReviewed` timestamp,
	CONSTRAINT `user_srs_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_srs_progress` ADD CONSTRAINT `user_srs_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_srs_progress` ADD CONSTRAINT `user_srs_progress_flashcardId_flashcards_id_fk` FOREIGN KEY (`flashcardId`) REFERENCES `flashcards`(`id`) ON DELETE no action ON UPDATE no action;