-- Migration: Floor Plans & Pins tables + deals.sqft column
-- Phase 15 Plan 01

-- Add sqft column to deals table
ALTER TABLE deals ADD COLUMN sqft integer;

-- Create floor_plans table
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
);

-- Indexes for floor_plans
CREATE INDEX idx_floor_plans_deal_id ON floor_plans(deal_id);
CREATE INDEX idx_floor_plans_property_id ON floor_plans(property_id);
CREATE INDEX idx_floor_plans_share_token ON floor_plans(share_token);

-- Create floor_plan_pins table
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
);

-- Index for floor_plan_pins
CREATE INDEX idx_floor_plan_pins_plan_id ON floor_plan_pins(floor_plan_id);
