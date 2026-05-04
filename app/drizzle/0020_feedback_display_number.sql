-- Migration 0020: Feedback display_number (sequential human-friendly ID)

-- 1. Sequence + column. Sequence drives new inserts; backfill below seeds existing rows.
CREATE SEQUENCE IF NOT EXISTS feedback_items_display_number_seq;

ALTER TABLE feedback_items
  ADD COLUMN IF NOT EXISTS display_number integer;

-- 2. Backfill existing rows in created_at order so the oldest item gets #1.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM feedback_items
  WHERE display_number IS NULL
)
UPDATE feedback_items
SET display_number = ordered.rn
FROM ordered
WHERE feedback_items.id = ordered.id;

-- 3. Move the sequence past the highest existing value, then attach it as default.
SELECT setval(
  'feedback_items_display_number_seq',
  COALESCE((SELECT MAX(display_number) FROM feedback_items), 0) + 1,
  false
);

ALTER TABLE feedback_items
  ALTER COLUMN display_number SET DEFAULT nextval('feedback_items_display_number_seq');

ALTER TABLE feedback_items
  ALTER COLUMN display_number SET NOT NULL;

-- 4. Unique constraint + index for fast #000023 lookups.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_feedback_items_display_number'
  ) THEN
    ALTER TABLE feedback_items
      ADD CONSTRAINT uq_feedback_items_display_number UNIQUE (display_number);
  END IF;
END $$;
