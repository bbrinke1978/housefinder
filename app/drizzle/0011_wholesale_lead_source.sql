-- Migration 0011: Add leadSource to deals table and wholesale leads schema
-- leadSource = "wholesale" when a deal is promoted from a wholesale lead

ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_source text;
