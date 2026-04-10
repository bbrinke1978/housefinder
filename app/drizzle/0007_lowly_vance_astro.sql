CREATE TYPE "public"."buyer_comm_event_type" AS ENUM('called_buyer', 'left_voicemail', 'emailed_buyer', 'sent_text', 'met_in_person', 'deal_blast', 'note');--> statement-breakpoint
CREATE TYPE "public"."buyer_deal_interaction_status" AS ENUM('blasted', 'interested', 'closed');--> statement-breakpoint
CREATE TABLE "buyer_communication_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"event_type" "buyer_comm_event_type" NOT NULL,
	"notes" text,
	"deal_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_deal_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"status" "buyer_deal_interaction_status" DEFAULT 'blasted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_plan_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"floor_plan_id" uuid NOT NULL,
	"x_pct" double precision NOT NULL,
	"y_pct" double precision NOT NULL,
	"category" text NOT NULL,
	"note" text,
	"budget_category_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"property_id" uuid,
	"floor_label" text DEFAULT 'main' NOT NULL,
	"version" text DEFAULT 'as-is' NOT NULL,
	"source_type" text NOT NULL,
	"blob_name" text,
	"blob_url" text,
	"mime_type" text,
	"sketch_data" text,
	"natural_width" integer,
	"natural_height" integer,
	"total_sqft" integer,
	"share_token" text,
	"share_expires_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "floor_plans_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wholesale_lead_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wholesale_lead_id" uuid NOT NULL,
	"note_text" text NOT NULL,
	"note_type" text DEFAULT 'user' NOT NULL,
	"previous_status" text,
	"new_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wholesale_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"address_normalized" text,
	"city" text,
	"state" text DEFAULT 'UT',
	"zip" text,
	"asking_price" integer,
	"arv" integer,
	"repair_estimate" integer,
	"sqft" integer,
	"beds" integer,
	"baths" text,
	"lot_size" text,
	"year_built" integer,
	"tax_id" text,
	"mao" integer,
	"deal_score" integer,
	"verdict" text,
	"score_breakdown" text,
	"status" text DEFAULT 'new' NOT NULL,
	"wholesaler_id" uuid,
	"source_channel" text,
	"raw_email_text" text,
	"parsed_draft" text,
	"promoted_deal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wholesalers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"company" text,
	"source_channel" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "property_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "buyers" ADD COLUMN "follow_up_date" date;--> statement-breakpoint
ALTER TABLE "buyers" ADD COLUMN "last_contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "sqft" integer;--> statement-breakpoint
ALTER TABLE "buyer_communication_events" ADD CONSTRAINT "buyer_communication_events_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_communication_events" ADD CONSTRAINT "buyer_communication_events_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_deal_interactions" ADD CONSTRAINT "buyer_deal_interactions_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_deal_interactions" ADD CONSTRAINT "buyer_deal_interactions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_tags" ADD CONSTRAINT "buyer_tags_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plan_pins" ADD CONSTRAINT "floor_plan_pins_floor_plan_id_floor_plans_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."floor_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_lead_notes" ADD CONSTRAINT "wholesale_lead_notes_wholesale_lead_id_wholesale_leads_id_fk" FOREIGN KEY ("wholesale_lead_id") REFERENCES "public"."wholesale_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_leads" ADD CONSTRAINT "wholesale_leads_wholesaler_id_wholesalers_id_fk" FOREIGN KEY ("wholesaler_id") REFERENCES "public"."wholesalers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_leads" ADD CONSTRAINT "wholesale_leads_promoted_deal_id_deals_id_fk" FOREIGN KEY ("promoted_deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_buyer_comm_events_buyer_id" ON "buyer_communication_events" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_buyer_comm_events_occurred_at" ON "buyer_communication_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_buyer_deal_interactions_buyer_id" ON "buyer_deal_interactions" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_buyer_deal_interactions_deal_id" ON "buyer_deal_interactions" USING btree ("deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_buyer_deal_interaction" ON "buyer_deal_interactions" USING btree ("buyer_id","deal_id");--> statement-breakpoint
CREATE INDEX "idx_buyer_tags_buyer_id" ON "buyer_tags" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_buyer_tags_tag" ON "buyer_tags" USING btree ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_buyer_tag" ON "buyer_tags" USING btree ("buyer_id","tag");--> statement-breakpoint
CREATE INDEX "idx_floor_plan_pins_plan_id" ON "floor_plan_pins" USING btree ("floor_plan_id");--> statement-breakpoint
CREATE INDEX "idx_floor_plans_deal_id" ON "floor_plans" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_floor_plans_property_id" ON "floor_plans" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "idx_floor_plans_share_token" ON "floor_plans" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "idx_wholesale_lead_notes_lead_id" ON "wholesale_lead_notes" USING btree ("wholesale_lead_id");--> statement-breakpoint
CREATE INDEX "idx_wholesale_leads_status" ON "wholesale_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wholesale_leads_wholesaler_id" ON "wholesale_leads" USING btree ("wholesaler_id");--> statement-breakpoint
CREATE INDEX "idx_wholesale_leads_verdict" ON "wholesale_leads" USING btree ("verdict");--> statement-breakpoint
CREATE INDEX "idx_wholesale_leads_address_normalized" ON "wholesale_leads" USING btree ("address_normalized");--> statement-breakpoint
CREATE INDEX "idx_wholesalers_email" ON "wholesalers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_buyers_follow_up_date" ON "buyers" USING btree ("follow_up_date");