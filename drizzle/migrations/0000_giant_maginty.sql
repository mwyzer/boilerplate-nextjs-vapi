CREATE TABLE `Booking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bookingId` text NOT NULL,
	`name` text NOT NULL,
	`resourceId` integer NOT NULL,
	`date` text NOT NULL,
	`startTime` text NOT NULL,
	`duration` integer NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`resourceId`) REFERENCES `Resource`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Booking_bookingId_unique` ON `Booking` (`bookingId`);--> statement-breakpoint
CREATE INDEX `Booking_resourceId_status_idx` ON `Booking` (`resourceId`,`status`);--> statement-breakpoint
CREATE INDEX `Booking_resourceId_start_end_idx` ON `Booking` (`resourceId`,`start`,`end`);--> statement-breakpoint
CREATE TABLE `Resource` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'MEETING_ROOM' NOT NULL,
	`capacity` integer DEFAULT 4 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
