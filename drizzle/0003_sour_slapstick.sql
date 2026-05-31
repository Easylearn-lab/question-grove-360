ALTER TABLE `profiles` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `profiles` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `profiles` ADD `subscriptionStatus` varchar(50) DEFAULT 'inactive';--> statement-breakpoint
ALTER TABLE `profiles` ADD `subscriptionPlan` varchar(50);--> statement-breakpoint
ALTER TABLE `profiles` ADD `trialEndsAt` timestamp;