CREATE TABLE "buyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"buy_box" text,
	"min_price" integer,
	"max_price" integer,
	"funding_type" text,
	"target_areas" text,
	"rehab_tolerance" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"note_text" text NOT NULL,
	"note_type" text DEFAULT 'user' NOT NULL,
	"previous_status" text,
	"new_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text DEFAULT 'UT' NOT NULL,
	"seller_name" text,
	"seller_phone" text,
	"condition" text,
	"timeline" text,
	"motivation" text,
	"asking_price" integer,
	"arv" integer,
	"repair_estimate" integer,
	"wholesale_fee" integer DEFAULT 15000,
	"mao" integer,
	"offer_price" integer,
	"status" text DEFAULT 'lead' NOT NULL,
	"assigned_buyer_id" uuid,
	"assignment_fee" integer,
	"closing_date" date,
	"contract_status" text,
	"earnest_money" integer DEFAULT 100,
	"inspection_deadline" date,
	"earnest_money_refundable" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_buyer_id_buyers_id_fk" FOREIGN KEY ("assigned_buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deal_notes_deal_id" ON "deal_notes" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_deals_status" ON "deals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deals_property_id" ON "deals" USING btree ("property_id");