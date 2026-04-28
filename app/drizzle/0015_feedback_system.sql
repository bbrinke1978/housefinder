-- Migration 0015: User Feedback System — four tables + four enums.
--
-- Background: Phase 28 adds an internal Jira-style bug + feature-request tracker
-- built into No BS Workbench. This migration creates the persistence layer for:
--   feedback_items      — the main ticket (bug / feature / idea / question)
--   feedback_comments   — threaded markdown comments on items
--   feedback_attachments — image uploads (paste-from-clipboard + file picker)
--   feedback_activity   — immutable audit log of every state change
--
-- Reversibility: ADDITIVE ONLY — this migration creates nothing that touches
-- existing tables. Fully reversible with:
--   DROP TABLE IF EXISTS feedback_activity, feedback_attachments, feedback_comments, feedback_items CASCADE;
--   DROP TYPE IF EXISTS feedback_activity_action, feedback_priority, feedback_status, feedback_type;

-- Statement 1: Create feedback_type enum (idempotent via DO block).
DO $$ BEGIN
  CREATE TYPE feedback_type AS ENUM ('bug', 'feature', 'idea', 'question');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Statement 2: Create feedback_status enum (idempotent via DO block).
DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM ('new', 'planned', 'in_progress', 'shipped', 'wontfix', 'duplicate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Statement 3: Create feedback_priority enum (idempotent via DO block).
DO $$ BEGIN
  CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Statement 4: Create feedback_activity_action enum (idempotent via DO block).
DO $$ BEGIN
  CREATE TYPE feedback_activity_action AS ENUM (
    'created', 'status_changed', 'priority_changed', 'assigned',
    'comment_added', 'attachment_added', 'attachment_removed',
    'resolved', 'reopened', 'edited'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Statement 5: Create feedback_items table.
CREATE TABLE IF NOT EXISTS feedback_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            feedback_type NOT NULL,
  title           text NOT NULL CHECK (length(title) <= 200),
  description     text,
  status          feedback_status NOT NULL DEFAULT 'new',
  priority        feedback_priority NOT NULL DEFAULT 'medium',
  reporter_id     uuid NOT NULL REFERENCES users(id),
  assignee_id     uuid REFERENCES users(id),
  property_id     uuid REFERENCES properties(id),
  deal_id         uuid REFERENCES deals(id),
  url_context     text,
  browser_context text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  deleted_at      timestamptz
);

-- Statement 6: Indexes on feedback_items.
CREATE INDEX IF NOT EXISTS idx_feedback_items_status
  ON feedback_items (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_items_assignee
  ON feedback_items (assignee_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_items_reporter
  ON feedback_items (reporter_id) WHERE deleted_at IS NULL;

-- Statement 7: GIN full-text search index on title + description.
CREATE INDEX IF NOT EXISTS idx_feedback_items_search
  ON feedback_items USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')))
  WHERE deleted_at IS NULL;

-- Statement 8: Create feedback_comments table.
CREATE TABLE IF NOT EXISTS feedback_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES feedback_items(id),
  author_id   uuid NOT NULL REFERENCES users(id),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- Statement 9: Index on feedback_comments.
CREATE INDEX IF NOT EXISTS idx_feedback_comments_item
  ON feedback_comments (item_id, created_at) WHERE deleted_at IS NULL;

-- Statement 10: Create feedback_attachments table.
-- CHECK constraint enforces that each attachment belongs to either an item or a comment.
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid REFERENCES feedback_items(id),
  comment_id   uuid REFERENCES feedback_comments(id),
  blob_name    text NOT NULL UNIQUE,
  mime_type    text NOT NULL,
  size_bytes   integer NOT NULL,
  uploaded_by  uuid NOT NULL REFERENCES users(id),
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CHECK ((item_id IS NOT NULL) OR (comment_id IS NOT NULL))
);

-- Statement 11: Indexes on feedback_attachments.
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_item
  ON feedback_attachments (item_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_attachments_comment
  ON feedback_attachments (comment_id) WHERE deleted_at IS NULL;

-- Statement 12: Create feedback_activity table.
-- No deleted_at — this is an immutable audit log; rows are never deleted.
CREATE TABLE IF NOT EXISTS feedback_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES feedback_items(id),
  actor_id    uuid NOT NULL REFERENCES users(id),
  action      feedback_activity_action NOT NULL,
  old_value   text,
  new_value   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Statement 13: Index on feedback_activity.
CREATE INDEX IF NOT EXISTS idx_feedback_activity_item
  ON feedback_activity (item_id, created_at);
