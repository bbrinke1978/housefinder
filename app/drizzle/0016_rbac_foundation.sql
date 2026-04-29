-- Migration 0016: RBAC Foundation
-- Adds roles + is_active to users, assignee FKs to deals/leads,
-- and creates audit_log + audit_log_archive tables.
-- All statements use IF NOT EXISTS — migration is idempotent.

-- users gain roles + is_active
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active);

-- deals gain three assignee FKs
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS acquisition_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS disposition_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS coordinator_user_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_deals_acquisition_user ON deals (acquisition_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_disposition_user ON deals (disposition_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_coordinator_user ON deals (coordinator_user_id);

-- leads gain lead manager FK + creator FK
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_manager_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_leads_lead_manager ON leads (lead_manager_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads (created_by_user_id);

-- audit log (active 30-day window)
CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     uuid,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created ON audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);

-- audit log archive (rows >30 days, queryable but cold)
CREATE TABLE IF NOT EXISTS audit_log_archive (LIKE audit_log INCLUDING ALL);
