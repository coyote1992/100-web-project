ALTER TABLE "sites" ADD COLUMN "phone_owner" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "contact_role" text DEFAULT 'unknown' NOT NULL;