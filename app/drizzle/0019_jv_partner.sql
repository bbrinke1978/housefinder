-- Migration 0019: JV Partner Lead Pipeline (Phase 34)

-- 1. jv_leads — one row per partner submission
CREATE TABLE IF NOT EXISTS jv_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_user_id uuid NOT NULL REFERENCES users(id),
  address text NOT NULL,
  address_normalized text NOT NULL,
  condition_notes text,
  photo_blob_name text,
  status text NOT NULL DEFAULT 'pending',
  property_id uuid REFERENCES properties(id),
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES users(id),
  rejected_at timestamptz,
  rejected_by_user_id uuid REFERENCES users(id),
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jv_leads_submitter ON jv_leads (submitter_user_id);
CREATE INDEX IF NOT EXISTS idx_jv_leads_status ON jv_leads (status);
CREATE INDEX IF NOT EXISTS idx_jv_leads_property_id ON jv_leads (property_id);
CREATE INDEX IF NOT EXISTS idx_jv_leads_address_normalized ON jv_leads (address_normalized);

-- 2. jv_lead_milestones — max 3 rows per jv_lead (qualified, active_follow_up, deal_closed)
CREATE TABLE IF NOT EXISTS jv_lead_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jv_lead_id uuid NOT NULL REFERENCES jv_leads(id),
  milestone_type text NOT NULL,
  amount_cents integer NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_by_user_id uuid REFERENCES users(id),
  payment_method text,
  CONSTRAINT uq_jv_lead_milestone UNIQUE (jv_lead_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_jv_milestones_jv_lead_id ON jv_lead_milestones (jv_lead_id);
CREATE INDEX IF NOT EXISTS idx_jv_milestones_unpaid ON jv_lead_milestones (paid_at) WHERE paid_at IS NULL;

-- 3. users.jv_payment_method — per-partner free-text payment instruction (Venmo/Zelle/check)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS jv_payment_method text;
