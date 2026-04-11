/**
 * Targeted migration for Phase 19 (Wholesale Leads)
 * Creates: wholesalers, wholesale_leads, wholesale_lead_notes tables
 * Alters: deals table (adds lead_source column)
 *
 * Usage: cd app && set -a && source .env.local && set +a && npx tsx scripts/migrate-phase-19.ts
 * PowerShell: see README instructions
 */

import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

const statements = [
  // 1. Wholesalers table (must come first — FK target)
  `CREATE TABLE IF NOT EXISTS "wholesalers" (
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
  )`,

  // 2. Wholesale leads table
  `CREATE TABLE IF NOT EXISTS "wholesale_leads" (
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
  )`,

  // 3. Wholesale lead notes table
  `CREATE TABLE IF NOT EXISTS "wholesale_lead_notes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "wholesale_lead_id" uuid NOT NULL,
    "note_text" text NOT NULL,
    "note_type" text DEFAULT 'user' NOT NULL,
    "previous_status" text,
    "new_status" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  // 4. Foreign keys (use IF NOT EXISTS pattern via DO block)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_lead_notes_wholesale_lead_id_wholesale_leads_id_fk') THEN
      ALTER TABLE "wholesale_lead_notes" ADD CONSTRAINT "wholesale_lead_notes_wholesale_lead_id_wholesale_leads_id_fk"
        FOREIGN KEY ("wholesale_lead_id") REFERENCES "public"."wholesale_leads"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_leads_wholesaler_id_wholesalers_id_fk') THEN
      ALTER TABLE "wholesale_leads" ADD CONSTRAINT "wholesale_leads_wholesaler_id_wholesalers_id_fk"
        FOREIGN KEY ("wholesaler_id") REFERENCES "public"."wholesalers"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_leads_promoted_deal_id_deals_id_fk') THEN
      ALTER TABLE "wholesale_leads" ADD CONSTRAINT "wholesale_leads_promoted_deal_id_deals_id_fk"
        FOREIGN KEY ("promoted_deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
    END IF;
  END $$`,

  // 5. Indexes
  `CREATE INDEX IF NOT EXISTS "idx_wholesale_lead_notes_lead_id" ON "wholesale_lead_notes" USING btree ("wholesale_lead_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_wholesale_leads_status" ON "wholesale_leads" USING btree ("status")`,
  `CREATE INDEX IF NOT EXISTS "idx_wholesale_leads_wholesaler_id" ON "wholesale_leads" USING btree ("wholesaler_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_wholesale_leads_verdict" ON "wholesale_leads" USING btree ("verdict")`,
  `CREATE INDEX IF NOT EXISTS "idx_wholesale_leads_address_normalized" ON "wholesale_leads" USING btree ("address_normalized")`,
  `CREATE INDEX IF NOT EXISTS "idx_wholesalers_email" ON "wholesalers" USING btree ("email")`,

  // 6. Add lead_source to deals (Phase 19-04)
  `ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "lead_source" text`,
];

async function main() {
  await client.connect();
  console.log("Connected to database\n");

  let success = 0;
  let skipped = 0;

  for (const sql of statements) {
    const label = sql.slice(0, 60).replace(/\s+/g, " ").trim();
    try {
      await client.query(sql);
      console.log(`  ✓ ${label}...`);
      success++;
    } catch (err: any) {
      if (err.code === "42P07" || err.code === "42710") {
        // table/constraint already exists
        console.log(`  - ${label}... (already exists)`);
        skipped++;
      } else {
        console.error(`  ✗ ${label}...`);
        console.error(`    ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }
  }

  console.log(`\nDone: ${success} applied, ${skipped} skipped`);
  await client.end();
}

main();
