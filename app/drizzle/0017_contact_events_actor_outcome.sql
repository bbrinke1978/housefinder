-- Migration 0017: Add actor_user_id and outcome columns to contact_events
-- These are nullable so all existing rows are unaffected.

ALTER TABLE contact_events
  ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS outcome text;

CREATE INDEX IF NOT EXISTS idx_contact_events_actor ON contact_events (actor_user_id);
