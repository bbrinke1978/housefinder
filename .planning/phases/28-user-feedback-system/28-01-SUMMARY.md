---
phase: 28-user-feedback-system
plan: "01"
subsystem: database
tags: [postgres, drizzle, migration, feedback, schema]
dependency_graph:
  requires: []
  provides: [feedback-schema, feedback-migration]
  affects: [app/src/db/schema.ts]
tech_stack:
  added: []
  patterns: [drizzle pgTable, drizzle pgEnum, drizzle check(), dollar-quote-aware SQL splitting]
key_files:
  created:
    - app/drizzle/0015_feedback_system.sql
    - app/scripts/migrate-0015-feedback-system.ts
  modified:
    - app/src/db/schema.ts
decisions:
  - "Dollar-quote-aware statement splitter required — naive ;\\n split breaks inside DO $$ blocks"
  - "check() helper from drizzle-orm/pg-core used for attachments_target_check constraint"
  - "sql import from drizzle-orm added to schema.ts for check() expressions"
metrics:
  duration: "~3min"
  completed: "2026-04-26"
  tasks_completed: 3
  files_changed: 3
---

# Phase 28 Plan 01: Feedback System Schema Summary

Four `feedback_*` tables + four enums now exist in production Postgres and in Drizzle schema.

## What Was Built

**Migration SQL** (`app/drizzle/0015_feedback_system.sql`):
- Four pgEnums: `feedback_type`, `feedback_status`, `feedback_priority`, `feedback_activity_action`
- Four tables: `feedback_items`, `feedback_comments`, `feedback_attachments`, `feedback_activity`
- GIN full-text search index on `feedback_items (title || description)`
- `CHECK ((item_id IS NOT NULL) OR (comment_id IS NOT NULL))` constraint on `feedback_attachments`
- All DDL idempotent (`CREATE TABLE IF NOT EXISTS` + DO block guards for enums)

**Migration Runner** (`app/scripts/migrate-0015-feedback-system.ts`):
- Dollar-quote-aware statement splitter handles `DO $$ ... $$` blocks correctly
- Verifies all 4 tables exist via `information_schema.tables` after run
- 16 statements ran cleanly; migration applied successfully to production

**Drizzle Schema** (`app/src/db/schema.ts`):
- Four `pgEnum` exports: `feedbackTypeEnum`, `feedbackStatusEnum`, `feedbackPriorityEnum`, `feedbackActivityActionEnum`
- Four `pgTable` exports: `feedbackItems`, `feedbackComments`, `feedbackAttachments`, `feedbackActivity`
- Four `InferSelectModel` type exports: `FeedbackItemRow`, `FeedbackCommentRow`, `FeedbackAttachmentRow`, `FeedbackActivityRow`
- `check` and `sql` imports added from `drizzle-orm/pg-core` and `drizzle-orm`
- `npx tsc --noEmit` passes clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dollar-quote-aware statement splitter**
- **Found during:** Task 2 execution (running migration against production)
- **Issue:** The `;\s*\n` split regex broke inside `DO $$ BEGIN ... END $$;` blocks — the semicolon after `THEN null` was treated as a statement terminator, producing a truncated statement: `unterminated dollar-quoted string`
- **Fix:** Replaced the naive regex split with a `splitStatements()` function that tracks `$$` dollar-quote state and only splits on `;` when not inside a dollar-quoted block
- **Files modified:** `app/scripts/migrate-0015-feedback-system.ts`
- **Commit:** 4fdda94

## Production Verification

Migration output confirmed:
- 16 statements executed, all OK
- 4 tables verified in `information_schema.tables`
- `Migration 0015 applied successfully.` printed

## Self-Check: PASSED

Files created:
- app/drizzle/0015_feedback_system.sql — FOUND
- app/scripts/migrate-0015-feedback-system.ts — FOUND
- app/src/db/schema.ts modified with feedbackItems export — FOUND

Commits:
- 4b82dcd: chore(28-01): add SQL migration for feedback system tables + enums
- a80f606: chore(28-01): add migration runner script for feedback system (0015)
- 0474ea0: feat(28-01): add Drizzle types for feedback system to schema.ts
- 4fdda94: fix(28-01): use dollar-quote-aware statement splitter in migration runner
