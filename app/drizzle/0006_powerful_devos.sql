CREATE TYPE "public"."photo_category" AS ENUM('exterior', 'kitchen', 'bathroom', 'living', 'bedroom', 'garage', 'roof', 'foundation', 'yard', 'other');--> statement-breakpoint
CREATE TABLE "property_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"property_id" uuid,
	"is_inbox" boolean DEFAULT false NOT NULL,
	"blob_name" text NOT NULL,
	"blob_url" text NOT NULL,
	"category" "photo_category" DEFAULT 'other' NOT NULL,
	"caption" text,
	"is_cover" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"file_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_property_photos_deal_id" ON "property_photos" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_property_photos_property_id" ON "property_photos" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "idx_property_photos_is_inbox" ON "property_photos" USING btree ("is_inbox");