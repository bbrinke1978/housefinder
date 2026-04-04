CREATE TYPE "public"."contact_event_type" AS ENUM('called_client', 'left_voicemail', 'emailed_client', 'sent_text', 'met_in_person', 'received_email');--> statement-breakpoint
CREATE TABLE "budget_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"planned_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"total_planned_cents" integer DEFAULT 0 NOT NULL,
	"contingency_cents" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_deal_id_unique" UNIQUE("deal_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"sequence_id" uuid NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"next_send_at" timestamp with time zone,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone,
	"stop_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"event_type" "contact_event_type" NOT NULL,
	"notes" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_send_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"to_email" text NOT NULL,
	"resend_email_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"receipt_id" uuid,
	"vendor" text,
	"description" text,
	"amount_cents" integer NOT NULL,
	"expense_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"blob_url" text NOT NULL,
	"blob_name" text NOT NULL,
	"ocr_raw_json" text,
	"vendor" text,
	"receipt_date" date,
	"total_cents" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lead_source" text DEFAULT 'scraping';--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "building_sqft" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "year_built" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "assessed_value" integer;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "lot_acres" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_enrollments" ADD CONSTRAINT "campaign_enrollments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_enrollments" ADD CONSTRAINT "campaign_enrollments_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_log" ADD CONSTRAINT "email_send_log_enrollment_id_campaign_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."campaign_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_log" ADD CONSTRAINT "email_send_log_step_id_email_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."email_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_log" ADD CONSTRAINT "email_send_log_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_steps" ADD CONSTRAINT "email_steps_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_budget_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_budget_categories_budget_id" ON "budget_categories" USING btree ("budget_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_budget_category_name" ON "budget_categories" USING btree ("budget_id","name");--> statement-breakpoint
CREATE INDEX "idx_campaign_enrollments_lead_id" ON "campaign_enrollments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_enrollments_next_send_at" ON "campaign_enrollments" USING btree ("next_send_at");--> statement-breakpoint
CREATE INDEX "idx_contact_events_lead_id" ON "contact_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_contact_events_occurred_at" ON "contact_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_email_steps_sequence_step" ON "email_steps" USING btree ("sequence_id","step_number");--> statement-breakpoint
CREATE INDEX "idx_expenses_budget_id" ON "expenses" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_category_id" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_receipt_id" ON "expenses" USING btree ("receipt_id");