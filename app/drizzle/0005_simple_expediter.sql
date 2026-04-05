CREATE TYPE "public"."contract_lifecycle_status" AS ENUM('draft', 'sent', 'seller_signed', 'countersigned', 'executed', 'expired', 'voided', 'amended');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('purchase_agreement', 'assignment');--> statement-breakpoint
CREATE TABLE "contract_signers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"signer_order" integer NOT NULL,
	"signer_role" text NOT NULL,
	"signer_name" text NOT NULL,
	"signer_email" text NOT NULL,
	"signing_token" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"signature_data" text,
	"signature_type" text,
	"ip_address" text,
	"user_agent" text,
	"document_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_signers_signing_token_unique" UNIQUE("signing_token")
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"contract_type" "contract_type" NOT NULL,
	"status" "contract_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"property_address" text NOT NULL,
	"city" text NOT NULL,
	"county" text,
	"parcel_id" text,
	"seller_name" text,
	"buyer_name" text,
	"purchase_price" integer,
	"arv" integer,
	"assignment_fee" integer,
	"earnest_money" integer DEFAULT 100,
	"inspection_period_days" integer DEFAULT 10,
	"closing_days" integer DEFAULT 30,
	"clauses" text,
	"signed_pdf_blob_name" text,
	"signed_pdf_url" text,
	"document_hash" text,
	"sent_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contract_signers" ADD CONSTRAINT "contract_signers_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contract_signers_contract_id" ON "contract_signers" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_contract_signer_order" ON "contract_signers" USING btree ("contract_id","signer_order");--> statement-breakpoint
CREATE INDEX "idx_contracts_deal_id" ON "contracts" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_status" ON "contracts" USING btree ("status");