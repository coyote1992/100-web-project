CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"from_addr" text DEFAULT '' NOT NULL,
	"to_addr" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"vertical_id" uuid NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"old_site_url" text DEFAULT '' NOT NULL,
	"demo_url" text DEFAULT '' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"stage_at" timestamp with time zone DEFAULT now() NOT NULL,
	"build" text DEFAULT 'todo' NOT NULL,
	"question_variant" text DEFAULT '' NOT NULL,
	"call_at" timestamp with time zone,
	"call_notes" text DEFAULT '' NOT NULL,
	"lost_reason" text DEFAULT '' NOT NULL,
	"deal_value" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid,
	"title" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"due_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verticals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hue" integer DEFAULT 75 NOT NULL,
	"reference1" text DEFAULT '' NOT NULL,
	"reference2" text DEFAULT '' NOT NULL,
	"target" integer DEFAULT 20 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracts" ADD CONSTRAINT "extracts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracts" ADD CONSTRAINT "extracts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_vertical_id_verticals_id_fk" FOREIGN KEY ("vertical_id") REFERENCES "public"."verticals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_site_idx" ON "events" USING btree ("site_id","at");--> statement-breakpoint
CREATE INDEX "extracts_site_idx" ON "extracts" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "lessons_site_idx" ON "lessons" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "messages_site_idx" ON "messages" USING btree ("site_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_external_idx" ON "messages" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "sites_vertical_idx" ON "sites" USING btree ("vertical_id");--> statement-breakpoint
CREATE INDEX "sites_email_idx" ON "sites" USING btree ("email");