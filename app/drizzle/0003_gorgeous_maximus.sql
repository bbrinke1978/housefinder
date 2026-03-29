CREATE TYPE "public"."call_outcome" AS ENUM('answered', 'voicemail', 'no_answer', 'wrong_number');--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"outcome" "call_outcome" NOT NULL,
	"source" text,
	"duration_seconds" integer,
	"notes" text,
	"called_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "comps" text;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "arv_notes" text;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_call_logs_lead_id" ON "call_logs" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_call_logs_called_at" ON "call_logs" USING btree ("called_at");