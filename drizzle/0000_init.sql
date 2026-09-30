CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text NOT NULL,
	`node` text NOT NULL,
	`at` integer NOT NULL,
	`sentiment` integer,
	`note` text DEFAULT '' NOT NULL,
	`minutes` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_prospect_idx` ON `events` (`prospect_id`,`at`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text,
	`direction` text NOT NULL,
	`from_addr` text DEFAULT '' NOT NULL,
	`to_addr` text DEFAULT '' NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`at` integer NOT NULL,
	`external_id` text,
	`rating` integer,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_external_idx` ON `messages` (`external_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text,
	`vertical_id` text,
	`body` text NOT NULL,
	`is_lesson` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vertical_id`) REFERENCES `verticals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`vertical_id` text NOT NULL,
	`batch_id` text,
	`city` text DEFAULT '' NOT NULL,
	`old_site_url` text DEFAULT '' NOT NULL,
	`demo_url` text DEFAULT '' NOT NULL,
	`references` text DEFAULT '' NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`build` text DEFAULT 'scouted' NOT NULL,
	`build_method` text DEFAULT '' NOT NULL,
	`stage` text,
	`parked` integer DEFAULT false NOT NULL,
	`deal_value` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vertical_id`) REFERENCES `verticals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `prospects_vertical_idx` ON `prospects` (`vertical_id`);--> statement-breakpoint
CREATE INDEX `prospects_batch_idx` ON `prospects` (`batch_id`);--> statement-breakpoint
CREATE TABLE `verticals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hue` integer DEFAULT 80 NOT NULL,
	`playbook` text DEFAULT '' NOT NULL,
	`target` integer DEFAULT 20 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text,
	`kind` text DEFAULT 'build' NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_prospect_idx` ON `work_logs` (`prospect_id`);