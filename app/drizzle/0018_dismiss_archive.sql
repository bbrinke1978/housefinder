-- Migration 0018: dismiss-leads + archive-deals + dismissed_parcels suppression list
-- Phase 32: dismiss-archive

-- Add dismiss columns to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_by_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS dismissed_reason text,
  ADD COLUMN IF NOT EXISTS dismissed_notes text;

CREATE INDEX IF NOT EXISTS idx_leads_dismissed_at ON leads (dismissed_at) WHERE dismissed_at IS NOT NULL;

-- Add archive columns to deals
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS idx_deals_archived_at ON deals (archived_at) WHERE archived_at IS NOT NULL;

-- Parcel suppression list: dismissed parcels won't be re-scraped
CREATE TABLE IF NOT EXISTS dismissed_parcels (
  parcel_id text PRIMARY KEY,
  dismissed_by_user_id uuid REFERENCES users(id),
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  notes text
);
