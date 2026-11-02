ALTER TABLE "sites" ADD COLUMN "call_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "seen_at" timestamp with time zone;