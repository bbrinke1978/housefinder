import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MIGRATION_KEY = process.env.WEBSITE_LEAD_API_KEY;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key !== MIGRATION_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Migration 0007: nullable lead property_id
    try {
      await db.execute(sql`ALTER TABLE "leads" ALTER COLUMN "property_id" DROP NOT NULL`);
      results.push("0007: leads.property_id now nullable");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0007: skipped (${msg})`);
    }

    // Migration 0008: floor plans
    try {
      await db.execute(sql`ALTER TABLE deals ADD COLUMN sqft integer`);
      results.push("0008a: deals.sqft added");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0008a: skipped (${msg})`);
    }

    try {
      await db.execute(sql`
        CREATE TABLE floor_plans (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          deal_id uuid REFERENCES deals(id),
          property_id uuid REFERENCES properties(id),
          floor_label text NOT NULL DEFAULT 'main',
          version text NOT NULL DEFAULT 'as-is',
          source_type text NOT NULL,
          blob_name text,
          blob_url text,
          mime_type text,
          sketch_data text,
          natural_width integer,
          natural_height integer,
          total_sqft integer,
          share_token text UNIQUE,
          share_expires_at timestamptz,
          sort_order integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX idx_floor_plans_deal_id ON floor_plans(deal_id)`);
      await db.execute(sql`CREATE INDEX idx_floor_plans_property_id ON floor_plans(property_id)`);
      await db.execute(sql`CREATE INDEX idx_floor_plans_share_token ON floor_plans(share_token)`);
      results.push("0008b: floor_plans table created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0008b: skipped (${msg})`);
    }

    try {
      await db.execute(sql`
        CREATE TABLE floor_plan_pins (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          floor_plan_id uuid NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
          x_pct double precision NOT NULL,
          y_pct double precision NOT NULL,
          category text NOT NULL,
          note text,
          budget_category_id uuid,
          sort_order integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX idx_floor_plan_pins_plan_id ON floor_plan_pins(floor_plan_id)`);
      results.push("0008c: floor_plan_pins table created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0008c: skipped (${msg})`);
    }

    // Migration 0009: buyer CRM
    try {
      await db.execute(sql`
        CREATE TYPE buyer_comm_event_type AS ENUM (
          'called_buyer', 'left_voicemail', 'emailed_buyer',
          'sent_text', 'met_in_person', 'deal_blast', 'note'
        )
      `);
      results.push("0009a: buyer_comm_event_type enum created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0009a: skipped (${msg})`);
    }

    try {
      await db.execute(sql`
        CREATE TYPE buyer_deal_interaction_status AS ENUM (
          'blasted', 'interested', 'closed'
        )
      `);
      results.push("0009b: buyer_deal_interaction_status enum created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0009b: skipped (${msg})`);
    }

    try {
      await db.execute(sql`ALTER TABLE buyers ADD COLUMN follow_up_date date`);
      await db.execute(sql`ALTER TABLE buyers ADD COLUMN last_contacted_at timestamptz`);
      await db.execute(sql`CREATE INDEX idx_buyers_follow_up_date ON buyers (follow_up_date)`);
      results.push("0009c: buyers columns added");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0009c: skipped (${msg})`);
    }

    try {
      await db.execute(sql`
        CREATE TABLE buyer_communication_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          buyer_id uuid NOT NULL REFERENCES buyers(id),
          event_type buyer_comm_event_type NOT NULL,
          notes text,
          deal_id uuid REFERENCES deals(id),
          occurred_at timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX idx_buyer_comm_events_buyer_id ON buyer_communication_events (buyer_id)`);
      await db.execute(sql`CREATE INDEX idx_buyer_comm_events_occurred_at ON buyer_communication_events (occurred_at)`);
      results.push("0009d: buyer_communication_events table created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0009d: skipped (${msg})`);
    }

    try {
      await db.execute(sql`
        CREATE TABLE buyer_deal_interactions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          buyer_id uuid NOT NULL REFERENCES buyers(id),
          deal_id uuid NOT NULL REFERENCES deals(id),
          status buyer_deal_interaction_status NOT NULL DEFAULT 'blasted',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX idx_buyer_deal_interactions_buyer_id ON buyer_deal_interactions (buyer_id)`);
      await db.execute(sql`CREATE INDEX idx_buyer_deal_interactions_deal_id ON buyer_deal_interactions (deal_id)`);
      await db.execute(sql`CREATE UNIQUE INDEX uq_buyer_deal_interaction ON buyer_deal_interactions (buyer_id, deal_id)`);
      results.push("0009e: buyer_deal_interactions table created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0009e: skipped (${msg})`);
    }

    try {
      await db.execute(sql`
        CREATE TABLE buyer_tags (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          buyer_id uuid NOT NULL REFERENCES buyers(id),
          tag text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX idx_buyer_tags_buyer_id ON buyer_tags (buyer_id)`);
      await db.execute(sql`CREATE INDEX idx_buyer_tags_tag ON buyer_tags (tag)`);
      await db.execute(sql`CREATE UNIQUE INDEX uq_buyer_tag ON buyer_tags (buyer_id, tag)`);
      results.push("0009f: buyer_tags table created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`0009f: skipped (${msg})`);
    }

    return NextResponse.json({ success: true, results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, results }, { status: 500 });
  }
}
