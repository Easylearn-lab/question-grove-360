CREATE TABLE `note_annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`noteId` int NOT NULL,
	`sectionId` varchar(100) NOT NULL,
	`annotationText` text NOT NULL,
	`highlightColor` varchar(20) DEFAULT 'yellow',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `note_annotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_note_annotation_unique` UNIQUE(`userId`,`noteId`,`sectionId`)
);
--> statement-breakpoint
ALTER TABLE `note_annotations` ADD CONSTRAINT `note_annotations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `note_annotations` ADD CONSTRAINT `note_annotations_noteId_notes_id_fk` FOREIGN KEY (`noteId`) REFERENCES `notes`(`id`) ON DELETE no action ON UPDATE no action;