-- Migration 0012: Add court_intake_runs audit table for XChange court record intake
-- Additive migration — no existing tables modified
CREATE TABLE IF NOT EXISTS court_intake_runs (
  id SERIAL PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  county TEXT,
  cases_processed INTEGER NOT NULL DEFAULT 0,
  properties_matched INTEGER NOT NULL DEFAULT 0,
  signals_created INTEGER NOT NULL DEFAULT 0,
  new_hot_leads INTEGER NOT NULL DEFAULT 0,
  unmatched_cases TEXT,
  agent_notes TEXT
);
