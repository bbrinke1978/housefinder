CREATE TYPE "public"."owner_type" AS ENUM('individual', 'llc', 'trust', 'estate', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."signal_status" AS ENUM('active', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('nod', 'tax_lien', 'lis_pendens', 'probate', 'code_violation', 'vacant');--> statement-breakpoint
CREATE TABLE "alert_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"run_date" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distress_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"signal_type" "signal_type" NOT NULL,
	"status" "signal_status" DEFAULT 'active' NOT NULL,
	"recorded_date" date,
	"source_url" text,
	"raw_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"new_lead_status" text DEFAULT 'new' NOT NULL,
	"distress_score" integer DEFAULT 0 NOT NULL,
	"is_hot" boolean DEFAULT false NOT NULL,
	"alert_sent" boolean DEFAULT false NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_property_id_unique" UNIQUE("property_id")
);
--> statement-breakpoint
CREATE TABLE "owner_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"phone" text,
	"email" text,
	"source" text NOT NULL,
	"is_manual" boolean DEFAULT false NOT NULL,
	"needs_skip_trace" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcel_id" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text DEFAULT 'UT' NOT NULL,
	"zip" text,
	"county" text NOT NULL,
	"owner_name" text,
	"owner_type" "owner_type" DEFAULT 'unknown',
	"property_type" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_parcel_id_unique" UNIQUE("parcel_id")
);
--> statement-breakpoint
CREATE TABLE "scraper_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scraper_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "scraper_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"county" text NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_result_count" integer DEFAULT 0,
	"consecutive_zero_results" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scraper_health_county_unique" UNIQUE("county")
);
--> statement-breakpoint
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distress_signals" ADD CONSTRAINT "distress_signals_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_contacts" ADD CONSTRAINT "owner_contacts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_alert_history" ON "alert_history" USING btree ("lead_id","channel","run_date");--> statement-breakpoint
CREATE INDEX "idx_alert_history_lead_id" ON "alert_history" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_distress_signals_property_id" ON "distress_signals" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "idx_distress_signals_signal_type" ON "distress_signals" USING btree ("signal_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_distress_signal_dedup" ON "distress_signals" USING btree ("property_id","signal_type","recorded_date");--> statement-breakpoint
CREATE INDEX "idx_leads_hot_status" ON "leads" USING btree ("is_hot","status");--> statement-breakpoint
CREATE INDEX "idx_leads_new_lead_status" ON "leads" USING btree ("new_lead_status");--> statement-breakpoint
CREATE INDEX "idx_owner_contacts_property_id" ON "owner_contacts" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_owner_contacts_property_source" ON "owner_contacts" USING btree ("property_id","source");--> statement-breakpoint
CREATE INDEX "idx_properties_city" ON "properties" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_properties_county" ON "properties" USING btree ("county");