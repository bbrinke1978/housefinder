-- Migration 0014: Separate property situs from owner mailing address.
--
-- Background: properties.address/city/zip have been receiving owner mailing
-- addresses from slco-tax-delinquent (TAX_SALE_ADDRESS = mailing) and
-- emery-tax-roll (column priority pulls "City" instead of "PropertyCity").
-- This migration adds dedicated mailing-address columns and relaxes the
-- NOT NULL constraints on situs columns so backfill can clear contaminated
-- data and let UGRC / re-scrape repopulate it.
--
-- Reversible: yes (mailing columns can be dropped; NOT NULL can be re-added
-- once all rows have non-null situs).

-- Statement 1: Add nullable owner mailing address columns.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS owner_mailing_address text,
  ADD COLUMN IF NOT EXISTS owner_mailing_city text,
  ADD COLUMN IF NOT EXISTS owner_mailing_state text,
  ADD COLUMN IF NOT EXISTS owner_mailing_zip text;

-- Statement 2: Drop NOT NULL on situs columns so backfill can clear them.
-- Existing rows are unaffected; new rows can now insert empty/null situs
-- if the source only provides mailing address (UGRC enrichment fills situs later).
ALTER TABLE properties ALTER COLUMN address DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN city DROP NOT NULL;

-- Statement 3: Index for out-of-state-owner queries (Brian's todo).
CREATE INDEX IF NOT EXISTS idx_properties_owner_mailing_state
  ON properties (owner_mailing_state)
  WHERE owner_mailing_state IS NOT NULL;
