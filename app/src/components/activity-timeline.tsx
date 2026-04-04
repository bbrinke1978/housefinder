"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  Voicemail,
  Mail,
  MessageSquare,
  Users,
  Inbox,
  StickyNote,
  Send,
  ArrowUpDown,
  Clock,
} from "lucide-react";
import type { TimelineEntry } from "@/types";

interface ActivityTimelineProps {
  entries: TimelineEntry[];
}

function getEntryIcon(type: TimelineEntry["type"]) {
  switch (type) {
    case "called_client":
      return <Phone className="h-3.5 w-3.5" />;
    case "left_voicemail":
      return <Voicemail className="h-3.5 w-3.5" />;
    case "emailed_client":
      return <Mail className="h-3.5 w-3.5" />;
    case "sent_text":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "met_in_person":
      return <Users className="h-3.5 w-3.5" />;
    case "received_email":
      return <Inbox className="h-3.5 w-3.5" />;
    case "note":
      return <StickyNote className="h-3.5 w-3.5" />;
    case "email_sent":
      return <Send className="h-3.5 w-3.5" />;
    case "status_change":
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
}

function getEntryIconClass(type: TimelineEntry["type"]): string {
  switch (type) {
    case "called_client":
    case "left_voicemail":
      return "bg-violet-500/10 text-violet-500 border-violet-500/20";
    case "emailed_client":
    case "email_sent":
      return "bg-primary/10 text-primary border-primary/20";
    case "sent_text":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "met_in_person":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "received_email":
      return "bg-teal-500/10 text-teal-500 border-teal-500/20";
    case "note":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    case "status_change":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasNotes = !!entry.notes;
  const isLong = hasNotes && entry.notes!.length > 120;

  const displayNotes =
    hasNotes && isLong && !expanded
      ? entry.notes!.slice(0, 120) + "…"
      : entry.notes;

  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      {/* Vertical connector line (not shown on last item) */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border ${getEntryIconClass(entry.type)}`}
        >
          {getEntryIcon(entry.type)}
        </div>
        {/* line below icon (connects to next item) */}
        <div className="mt-1 flex-1 w-px bg-border last-of-type:hidden" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {entry.label}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(entry.occurredAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {hasNotes && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {displayNotes}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-0.5 text-xs text-primary hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No activity logged yet. Use the form above to log your first contact.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry) => (
        <TimelineItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
