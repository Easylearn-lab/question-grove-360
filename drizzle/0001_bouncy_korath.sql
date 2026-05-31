CREATE TABLE `admin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` text,
	`targetUserId` int,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemId` int,
	`itemType` varchar(50),
	`examId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coach_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messages` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `coach_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int,
	`usedAt` timestamp DEFAULT (now()),
	CONSTRAINT `coupon_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`discountType` varchar(50),
	`discountValue` decimal(10,2),
	`maxUsageCount` int,
	`usageCount` int DEFAULT 0,
	`expiryDate` date,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(50),
	`description` text,
	`passMark` decimal(5,2),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exams_id` PRIMARY KEY(`id`),
	CONSTRAINT `exams_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `free_trials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`examId` int NOT NULL,
	`assignedBy` int,
	`trialStart` timestamp,
	`trialEnd` timestamp,
	`used` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `free_trials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mock_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mockId` int NOT NULL,
	`examId` int NOT NULL,
	`score` int,
	`totalQuestions` int,
	`percentage` decimal(5,2),
	`timeTaken` int,
	`passed` boolean,
	`answers` json,
	`specialtyBreakdown` json,
	`domainBreakdown` json,
	`completedAt` timestamp DEFAULT (now()),
	`emailSent` boolean DEFAULT false,
	CONSTRAINT `mock_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`questionIds` json,
	`timeLimit` int,
	`questionCount` int,
	`passMark` decimal(5,2),
	`isActive` boolean DEFAULT true,
	`rotationDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`specialty` varchar(255) NOT NULL,
	`title` text,
	`content` text,
	`highYieldCount` int DEFAULT 0,
	`curriculumVersion` varchar(50),
	`lastUpdated` timestamp DEFAULT (now()),
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pattern_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`specialty` varchar(255) NOT NULL,
	`prompt` text NOT NULL,
	`answer` text NOT NULL,
	`briefExplanation` text,
	`difficulty` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pattern_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` text,
	`avatarUrl` text,
	`specialty` varchar(255),
	`trainingYear` varchar(50),
	`targetExam` varchar(255),
	`targetExamDate` date,
	`country` varchar(100),
	`currency` varchar(10) DEFAULT 'GBP',
	`dailyQuestionGoal` int DEFAULT 30,
	`weeklyHourGoal` int DEFAULT 10,
	`leaderboardOptIn` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examId` int NOT NULL,
	`domain` varchar(255),
	`specialty` varchar(255),
	`subSpecialty` varchar(255),
	`difficulty` enum('Easy','Medium','Hard'),
	`question` text NOT NULL,
	`optionA` text NOT NULL,
	`optionB` text NOT NULL,
	`optionC` text NOT NULL,
	`optionD` text NOT NULL,
	`optionE` text,
	`correctAnswer` varchar(10) NOT NULL,
	`explanationCorrect` text,
	`explanationA` text,
	`explanationB` text,
	`explanationC` text,
	`explanationD` text,
	`explanationE` text,
	`reference` text,
	`tags` json,
	`status` varchar(50) DEFAULT 'active',
	`attemptCount` int DEFAULT 0,
	`correctCount` int DEFAULT 0,
	`flagCount` int DEFAULT 0,
	`reportCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sca_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text,
	`category` varchar(255),
	`difficulty` varchar(50),
	`patientName` varchar(255),
	`patientAge` int,
	`patientGender` varchar(50),
	`presentingComplaint` text,
	`backgroundContext` text,
	`aiPatientPersona` text,
	`markSheet` json,
	`examinationFindings` text,
	`investigationResults` json,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sca_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sca_consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseId` int NOT NULL,
	`caseTitle` varchar(255),
	`mode` varchar(50),
	`mockSessionId` int,
	`transcript` json,
	`duration` int,
	`domain1Score` int,
	`domain2Score` int,
	`domain3Score` int,
	`totalScore` int,
	`passed` boolean,
	`aiFeedback` json,
	`completedAt` timestamp DEFAULT (now()),
	`emailSent` boolean DEFAULT false,
	CONSTRAINT `sca_consultations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`examId` int,
	`sessionType` varchar(50),
	`questionsAnswered` int DEFAULT 0,
	`correctAnswers` int DEFAULT 0,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planType` varchar(50) NOT NULL,
	`examId` int,
	`status` varchar(50) NOT NULL,
	`paymentProvider` varchar(50),
	`stripeSubscriptionId` varchar(255),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`trialEnd` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`examId` int NOT NULL,
	`specialty` varchar(255),
	`selectedAnswer` varchar(10),
	`isCorrect` boolean,
	`timeTaken` int,
	`mode` varchar(50),
	`sessionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_pattern_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cardId` int NOT NULL,
	`masteryLevel` varchar(50) DEFAULT 'learning',
	`lastReviewed` timestamp,
	`reviewCount` int DEFAULT 0,
	CONSTRAINT `user_pattern_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_performance_model` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`examId` int,
	`specialtyScores` json,
	`weakAreas` json,
	`strongAreas` json,
	`predictedPassProbability` decimal(5,2),
	`lastCalculated` timestamp DEFAULT (now()),
	CONSTRAINT `user_performance_model_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_question_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`noteText` text,
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `user_question_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_logs` ADD CONSTRAINT `admin_logs_adminId_users_id_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookmarks` ADD CONSTRAINT `bookmarks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coach_conversations` ADD CONSTRAINT `coach_conversations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `free_trials` ADD CONSTRAINT `free_trials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `free_trials` ADD CONSTRAINT `free_trials_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `free_trials` ADD CONSTRAINT `free_trials_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mock_results` ADD CONSTRAINT `mock_results_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mock_results` ADD CONSTRAINT `mock_results_mockId_mocks_id_fk` FOREIGN KEY (`mockId`) REFERENCES `mocks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mock_results` ADD CONSTRAINT `mock_results_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mocks` ADD CONSTRAINT `mocks_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pattern_cards` ADD CONSTRAINT `pattern_cards_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sca_consultations` ADD CONSTRAINT `sca_consultations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sca_consultations` ADD CONSTRAINT `sca_consultations_caseId_sca_cases_id_fk` FOREIGN KEY (`caseId`) REFERENCES `sca_cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD CONSTRAINT `study_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_attempts` ADD CONSTRAINT `user_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_attempts` ADD CONSTRAINT `user_attempts_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_attempts` ADD CONSTRAINT `user_attempts_examId_exams_id_fk` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_pattern_progress` ADD CONSTRAINT `user_pattern_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_pattern_progress` ADD CONSTRAINT `user_pattern_progress_cardId_pattern_cards_id_fk` FOREIGN KEY (`cardId`) REFERENCES `pattern_cards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_performance_model` ADD CONSTRAINT `user_performance_model_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_question_notes` ADD CONSTRAINT `user_question_notes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_question_notes` ADD CONSTRAINT `user_question_notes_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;