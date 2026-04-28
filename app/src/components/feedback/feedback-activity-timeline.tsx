"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Tag,
  Flag,
  User,
  MessageSquare,
  Paperclip,
} from "lucide-react";

export interface ActivityEntry {
  id: string;
  itemId: string;
  actorId: string;
  actorName: string | null;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

interface FeedbackActivityTimelineProps {
  activities: ActivityEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function formatShipNote(newValue: string | null): string {
  if (!newValue) return "";
  try {
    const parsed = JSON.parse(newValue) as { status?: string; note?: string };
    if (parsed.note) return ` — "${parsed.note}"`;
  } catch {
    // not JSON, ignore
  }
  return "";
}

function describeAction(entry: ActivityEntry): string {
  const actor = entry.actorName ?? "Someone";
  const { action, oldValue, newValue } = entry;

  switch (action) {
    case "created":
      return `${actor} created this item`;
    case "edited":
      if (oldValue === "description" || newValue === "description") {
        return `${actor} edited the description`;
      }
      return `${actor} changed title from "${oldValue}" to "${newValue}"`;
    case "status_changed": {
      const noteStr = formatShipNote(newValue);
      const statusDisplay = (() => {
        try {
          const parsed = JSON.parse(newValue ?? "") as { status?: string };
          return parsed.status ?? newValue ?? "—";
        } catch {
          return newValue ?? "—";
        }
      })();
      return `${actor} changed status from ${oldValue ?? "—"} to ${statusDisplay}${noteStr}`;
    }
    case "priority_changed":
      return `${actor} changed priority from ${oldValue ?? "—"} to ${newValue ?? "—"}`;
    case "assigned":
      if (!newValue) return `${actor} unassigned the item`;
      return `${actor} changed assignee`;
    case "comment_added":
      return `${actor} posted a comment`;
    case "attachment_added":
      return `${actor} added an attachment`;
    case "attachment_removed":
      return `${actor} removed an attachment`;
    case "resolved":
      return newValue === "deleted"
        ? `${actor} deleted this item`
        : `${actor} resolved this item`;
    case "reopened":
      return `${actor} reopened this item`;
    default:
      return `${actor} performed action: ${action}`;
  }
}

type ActionIconName =
  | "created"
  | "edited"
  | "status_changed"
  | "priority_changed"
  | "assigned"
  | "comment_added"
  | "attachment_added"
  | "attachment_removed"
  | "resolved"
  | "reopened";

const ACTION_ICONS: Record<ActionIconName, React.ElementType> = {
  created:            Plus,
  edited:             Pencil,
  status_changed:     Tag,
  priority_changed:   Flag,
  assigned:           User,
  comment_added:      MessageSquare,
  attachment_added:   Paperclip,
  attachment_removed: Paperclip,
  resolved:           Tag,
  reopened:           Tag,
};

function ActivityIcon({ action }: { action: string }) {
  const Icon =
    ACTION_ICONS[action as ActionIconName] ?? Pencil;
  return (
    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center">
      <Icon className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const INITIAL_CAP = 50;
const PAGE_SIZE = 50;

/**
 * FeedbackActivityTimeline — vertical chronological audit log.
 * Shows up to 50 entries initially; "Show more" reveals the rest.
 * Sorted newest-first (data arrives that way from the server query).
 */
export function FeedbackActivityTimeline({
  activities,
}: FeedbackActivityTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_CAP);

  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No activity yet.</p>
    );
  }

  const visible = activities.slice(0, visibleCount);
  const hasMore = visibleCount < activities.length;

  return (
    <div className="flex flex-col gap-0">
      <h3 className="text-sm font-semibold text-foreground mb-3">Activity</h3>

      <div className="relative border-l border-border pl-4 flex flex-col gap-3">
        {visible.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 -ml-[1.1rem]">
            <ActivityIcon action={entry.action} />
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {describeAction(entry)}{" "}
                <span className="text-muted-foreground/60">
                  {relativeTime(entry.createdAt)}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 self-start"
        >
          Show {Math.min(PAGE_SIZE, activities.length - visibleCount)} more
        </button>
      )}
    </div>
  );
}
