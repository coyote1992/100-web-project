-- Hundred: database setup. Paste into Supabase → SQL Editor → Run. Safe to run again.

do $do$ begin CREATE TABLE "events" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "site_id" uuid NOT NULL, "stage" text NOT NULL, "at" timestamp with time zone NOT NULL, "note" text DEFAULT '' NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE TABLE "extracts" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "site_id" uuid NOT NULL, "kind" text NOT NULL, "text" text NOT NULL, "message_id" uuid, "created_at" timestamp with time zone DEFAULT now() NOT NULL); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE TABLE "lessons" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "site_id" uuid NOT NULL, "body" text NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE TABLE "messages" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "site_id" uuid NOT NULL, "direction" text NOT NULL, "from_addr" text DEFAULT '' NOT NULL, "to_addr" text DEFAULT '' NOT NULL, "subject" text DEFAULT '' NOT NULL, "body" text DEFAULT '' NOT NULL, "at" timestamp with time zone NOT NULL, "external_id" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE TABLE "settings" ("key" text PRIMARY KEY NOT NULL, "value" text NOT NULL); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE TABLE "sites" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "name" text NOT NULL, "vertical_id" uuid NOT NULL, "city" text DEFAULT '' NOT NULL, "old_site_url" text DEFAULT '' NOT NULL, "demo_url" text DEFAULT '' NOT NULL, "contact_name" text DEFAULT '' NOT NULL, "email" text DEFAULT '' NOT NULL, "phone" text DEFAULT '' NOT NULL, "stage" text DEFAULT 'new' NOT NULL, "stage_at" timestamp with time zone DEFAULT now() NOT NULL, "build" text DEFAULT 'todo' NOT NULL, "question_variant" text DEFAULT '' NOT NULL, "call_at" timestamp with time zone, "call_notes" text DEFAULT '' NOT NULL, "lost_reason" text DEFAULT '' NOT NULL, "deal_value" integer, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE TABLE "tasks" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "site_id" uuid, "title" text NOT NULL, "note" text DEFAULT '' NOT NULL, "due_at" timestamp with time zone, "done_at" timestamp with time zone, "source" text DEFAULT 'manual' NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE TABLE "verticals" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "name" text NOT NULL, "hue" integer DEFAULT 75 NOT NULL, "reference1" text DEFAULT '' NOT NULL, "reference2" text DEFAULT '' NOT NULL, "target" integer DEFAULT 20 NOT NULL, "sort_order" integer DEFAULT 0 NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin ALTER TABLE "events" ADD CONSTRAINT "events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action; exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin ALTER TABLE "extracts" ADD CONSTRAINT "extracts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action; exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin ALTER TABLE "extracts" ADD CONSTRAINT "extracts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action; exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin ALTER TABLE "lessons" ADD CONSTRAINT "lessons_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action; exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin ALTER TABLE "messages" ADD CONSTRAINT "messages_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action; exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin ALTER TABLE "sites" ADD CONSTRAINT "sites_vertical_id_verticals_id_fk" FOREIGN KEY ("vertical_id") REFERENCES "public"."verticals"("id") ON DELETE cascade ON UPDATE no action; exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin ALTER TABLE "tasks" ADD CONSTRAINT "tasks_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action; exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE INDEX "events_site_idx" ON "events" USING btree ("site_id","at"); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE INDEX "extracts_site_idx" ON "extracts" USING btree ("site_id"); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE INDEX "lessons_site_idx" ON "lessons" USING btree ("site_id"); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE INDEX "messages_site_idx" ON "messages" USING btree ("site_id","at"); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE UNIQUE INDEX "messages_external_idx" ON "messages" USING btree ("external_id"); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE INDEX "sites_vertical_idx" ON "sites" USING btree ("vertical_id"); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;
do $do$ begin CREATE INDEX "sites_email_idx" ON "sites" USING btree ("email"); exception when duplicate_table or duplicate_object or duplicate_column then null; end $do$;

-- Nothing is readable with the public key: only the server's service key gets in.
alter table public."events" enable row level security;
alter table public."extracts" enable row level security;
alter table public."lessons" enable row level security;
alter table public."messages" enable row level security;
alter table public."settings" enable row level security;
alter table public."sites" enable row level security;
alter table public."tasks" enable row level security;
alter table public."verticals" enable row level security;

-- Lets the app run its SQL over HTTPS (Supabase's REST API) instead of a direct database connection.
-- Only the service_role key can call it; the public anon key cannot.
create or replace function public.hundred_exec(query text, params jsonb default '[]'::jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  parts text[];
  idx int[];
  q text;
  i int;
  lit text;
  result json;
  returns_rows boolean;
begin
  -- Fill $1, $2 … in a single pass, so a value that happens to contain "$2" is left alone.
  parts := regexp_split_to_array(query, '\$[0-9]+');
  idx := array(select (m)[1]::int from regexp_matches(query, '\$([0-9]+)', 'g') as m);
  q := parts[1];
  for i in 1 .. coalesce(array_length(idx, 1), 0) loop
    if idx[i] < 1 or idx[i] > jsonb_array_length(params) then
      raise exception 'parameter $% was not supplied', idx[i];
    end if;
    if jsonb_typeof(params -> (idx[i] - 1)) = 'null' then
      lit := 'NULL';
    else
      lit := quote_literal(params ->> (idx[i] - 1));
    end if;
    q := q || lit || parts[i + 1];
  end loop;

  -- Decided on the query text before values go in, so a value containing the word "returning" can't confuse it.
  returns_rows := query ~* '^\s*(select|with)\M' or query ~* '\mreturning\M';
  if returns_rows then
    execute 'with t as (' || q || ') select coalesce(json_agg(t), ''[]''::json) from t' into result;
  else
    execute q;
    result := '[]'::json;
  end if;
  return result;
end
$fn$;

revoke all on function public.hundred_exec(text, jsonb) from public, anon, authenticated;
grant execute on function public.hundred_exec(text, jsonb) to service_role;
