CREATE TABLE `msra_cps_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examYear` varchar(10),
	`questionType` enum('SBA','EMQ') NOT NULL,
	`specialty` varchar(255),
	`subSpecialty` varchar(255),
	`topic` varchar(255),
	`difficulty` enum('Easy','Medium','Hard'),
	`question` text,
	`optionA` text,
	`optionB` text,
	`optionC` text,
	`optionD` text,
	`optionE` text,
	`correctAnswer` varchar(10),
	`explanationCorrect` text,
	`explanationA` text,
	`explanationB` text,
	`explanationC` text,
	`explanationD` text,
	`explanationE` text,
	`emqTheme` text,
	`emqLeadStatement` text,
	`emqOptions` json,
	`emqItems` json,
	`reference` text,
	`tags` text,
	`status` varchar(50) DEFAULT 'active',
	`attemptCount` int DEFAULT 0,
	`correctCount` int DEFAULT 0,
	`flagCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `msra_cps_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `msra_flashcards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`specialty` varchar(255),
	`topic` varchar(255),
	`front` text NOT NULL,
	`back` text NOT NULL,
	`status` varchar(50) DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `msra_flashcards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `msra_pd_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionType` enum('RANKING','PICK3') NOT NULL,
	`domain` varchar(255),
	`scenario` text,
	`actionA` text,
	`actionB` text,
	`actionC` text,
	`actionD` text,
	`actionE` text,
	`correctRanking` json,
	`explanationRanking` text,
	`optionA` text,
	`optionB` text,
	`optionC` text,
	`optionD` text,
	`optionE` text,
	`correctOptions` json,
	`explanationOptions` text,
	`reference` text,
	`tags` json,
	`status` varchar(50) DEFAULT 'active',
	`attemptCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `msra_pd_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `msra_waitlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `msra_waitlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `picture360_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`stripeSessionId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `picture360_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plab1_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`specialty` varchar(255) NOT NULL,
	`topic` varchar(100) NOT NULL,
	`subTopic` varchar(100),
	`difficulty` enum('Easy','Medium','Hard') NOT NULL DEFAULT 'Medium',
	`questionType` enum('SBA','EMQ') NOT NULL DEFAULT 'SBA',
	`ukmlaCategoryId` varchar(100),
	`question` text NOT NULL,
	`optionA` text NOT NULL,
	`optionB` text NOT NULL,
	`optionC` text NOT NULL,
	`optionD` text NOT NULL,
	`optionE` text NOT NULL,
	`correctAnswer` varchar(10) NOT NULL,
	`explanationCorrect` text,
	`explanationA` text,
	`explanationB` text,
	`explanationC` text,
	`explanationD` text,
	`explanationE` text,
	`reference` text,
	`imageUrl` varchar(500),
	`imageCaption` varchar(255),
	`imageType` enum('ECG','X-ray','CT','Clinical Photo','Histology','Other'),
	`tags` json,
	`status` varchar(50) DEFAULT 'active',
	`attemptCount` int DEFAULT 0,
	`correctCount` int DEFAULT 0,
	`flagCount` int DEFAULT 0,
	`reportCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plab1_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `question_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `digestUnsubscribed` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `questions` ADD `topic` varchar(100);--> statement-breakpoint
ALTER TABLE `sca_cases` ADD `isFreeTrialCase` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `sca_consultations` ADD `empathyScore` int;--> statement-breakpoint
ALTER TABLE `picture360_access` ADD CONSTRAINT `picture360_access_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plab1_questions` ADD CONSTRAINT `plab1_questions_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `question_flags` ADD CONSTRAINT `question_flags_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;