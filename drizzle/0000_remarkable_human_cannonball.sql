CREATE TABLE `travel_clients` (
	`client_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `travel_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`record` text NOT NULL,
	`updated_at` integer NOT NULL
);
