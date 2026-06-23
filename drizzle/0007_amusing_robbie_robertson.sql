CREATE TABLE `user_note_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`noteId` int NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`isBookmarked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_note_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_note_unique` UNIQUE(`userId`,`noteId`)
);
--> statement-breakpoint
ALTER TABLE `user_note_progress` ADD CONSTRAINT `user_note_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_note_progress` ADD CONSTRAINT `user_note_progress_noteId_notes_id_fk` FOREIGN KEY (`noteId`) REFERENCES `notes`(`id`) ON DELETE no action ON UPDATE no action;