CREATE TABLE `jamb_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_text` text NOT NULL,
	`option_a` varchar(500) NOT NULL,
	`option_b` varchar(500) NOT NULL,
	`option_c` varchar(500) NOT NULL,
	`option_d` varchar(500) NOT NULL,
	`correct_answer` varchar(1) NOT NULL,
	`explanation` text,
	`subject` varchar(100) NOT NULL,
	`topic` varchar(200),
	`country` varchar(100) DEFAULT 'Nigeria',
	`region` varchar(100) DEFAULT 'West Africa',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jamb_questions_id` PRIMARY KEY(`id`)
);
