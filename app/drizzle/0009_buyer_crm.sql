-- Migration 0009: Buyers List CRM Extension
-- Adds buyer communication events, buyer-deal interactions, buyer tags tables
-- and extends buyers table with follow_up_date and last_contacted_at columns

-- New enums
CREATE TYPE buyer_comm_event_type AS ENUM (
  'called_buyer',
  'left_voicemail',
  'emailed_buyer',
  'sent_text',
  'met_in_person',
  'deal_blast',
  'note'
);

CREATE TYPE buyer_deal_interaction_status AS ENUM (
  'blasted',
  'interested',
  'closed'
);

-- Extend buyers table
ALTER TABLE buyers
  ADD COLUMN follow_up_date date,
  ADD COLUMN last_contacted_at timestamptz;

CREATE INDEX idx_buyers_follow_up_date ON buyers (follow_up_date);

-- Buyer communication events
CREATE TABLE buyer_communication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES buyers(id),
  event_type buyer_comm_event_type NOT NULL,
  notes text,
  deal_id uuid REFERENCES deals(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_comm_events_buyer_id ON buyer_communication_events (buyer_id);
CREATE INDEX idx_buyer_comm_events_occurred_at ON buyer_communication_events (occurred_at);

-- Buyer-deal interactions
CREATE TABLE buyer_deal_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES buyers(id),
  deal_id uuid NOT NULL REFERENCES deals(id),
  status buyer_deal_interaction_status NOT NULL DEFAULT 'blasted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_deal_interactions_buyer_id ON buyer_deal_interactions (buyer_id);
CREATE INDEX idx_buyer_deal_interactions_deal_id ON buyer_deal_interactions (deal_id);
CREATE UNIQUE INDEX uq_buyer_deal_interaction ON buyer_deal_interactions (buyer_id, deal_id);

-- Buyer tags
CREATE TABLE buyer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES buyers(id),
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buyer_tags_buyer_id ON buyer_tags (buyer_id);
CREATE INDEX idx_buyer_tags_tag ON buyer_tags (tag);
CREATE UNIQUE INDEX uq_buyer_tag ON buyer_tags (buyer_id, tag);
