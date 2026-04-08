"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  PhoneOff,
  Mail,
  MessageSquare,
  Users,
  Megaphone,
  StickyNote,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logBuyerCommEvent } from "@/lib/buyer-actions";
import { cn } from "@/lib/utils";
import type { BuyerTimelineEntry } from "@/types";

interface BuyerTimelineProps {
  buyerId: string;
  entries: BuyerTimelineEntry[];
}

// Events that users can manually log (deal_blast and deal_interaction are auto-logged)
const LOG_EVENT_TYPES = [
  { value: "called_buyer", label: "Called" },
  { value: "left_voicemail", label: "Left Voicemail" },
  { value: "emailed_buyer", label: "Emailed" },
  { value: "sent_text", label: "Sent Text" },
  { value: "met_in_person", label: "Met In Person" },
  { value: "note", label: "Note" },
] as const;

type LogEventType = (typeof LOG_EVENT_TYPES)[number]["value"];

const ALL_FILTER_TYPES = [
  { value: "all", label: "All" },
  { value: "calls", label: "Calls" },
  { value: "messages", label: "Messages" },
  { value: "deals", label: "Deals" },
  { value: "notes", label: "Notes" },
] as const;

type FilterType = (typeof ALL_FILTER_TYPES)[number]["value"];

function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case "called_buyer":
      return "Called buyer";
    case "left_voicemail":
      return "Left voicemail";
    case "emailed_buyer":
      return "Emailed buyer";
    case "sent_text":
      return "Sent text";
    case "met_in_person":
      return "Met in person";
    case "deal_blast":
      return "Deal blasted";
    case "note":
      return "Note";
    default:
      return eventType;
  }
}

function getInteractionStatusLabel(status: string): string {
  switch (status) {
    case "blasted":
      return "Blasted";
    case "interested":
      return "Interested";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

function getIcon(entry: BuyerTimelineEntry) {
  if (entry.type === "deal_interaction") {
    return <Megaphone className="h-3.5 w-3.5" />;
  }
  switch (entry.eventType) {
    case "called_buyer":
      return <Phone className="h-3.5 w-3.5" />;
    case "left_voicemail":
      return <PhoneOff className="h-3.5 w-3.5" />;
    case "emailed_buyer":
      return <Mail className="h-3.5 w-3.5" />;
    case "sent_text":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "met_in_person":
      return <Users className="h-3.5 w-3.5" />;
    case "deal_blast":
      return <Megaphone className="h-3.5 w-3.5" />;
    case "note":
      return <StickyNote className="h-3.5 w-3.5" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
}

function getIconClass(entry: BuyerTimelineEntry): string {
  if (entry.type === "deal_interaction") {
    return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  }
  switch (entry.eventType) {
    case "called_buyer":
    case "left_voicemail":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "emailed_buyer":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "sent_text":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "met_in_person":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "deal_blast":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "note":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getInteractionStatusClass(status: string): string {
  switch (status) {
    case "blasted":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "interested":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "closed":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function matchesFilter(entry: BuyerTimelineEntry, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "calls") {
    return (
      entry.eventType === "called_buyer" ||
      entry.eventType === "left_voicemail"
    );
  }
  if (filter === "messages") {
    return (
      entry.eventType === "emailed_buyer" || entry.eventType === "sent_text"
    );
  }
  if (filter === "deals") {
    return (
      entry.type === "deal_interaction" || entry.eventType === "deal_blast"
    );
  }
  if (filter === "notes") {
    return entry.eventType === "note";
  }
  return true;
}

function TimelineEntry({ entry }: { entry: BuyerTimelineEntry }) {
  const [expanded, setExpanded] = useState(false);
  const notes = entry.notes ?? null;
  const isLong = notes != null && notes.length > 120;

  const displayNotes =
    isLong && !expanded ? notes.slice(0, 120) + "…" : notes;

  const label =
    entry.type === "deal_interaction"
      ? `Deal interaction: ${getInteractionStatusLabel(entry.status ?? "")}`
      : getEventTypeLabel(entry.eventType ?? "");

  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      {/* Vertical connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            getIconClass(entry)
          )}
        >
          {getIcon(entry)}
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(entry.occurredAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Deal link for comm events */}
        {entry.dealId && entry.dealAddress && (
          <div className="mt-0.5">
            <Link
              href={`/deals/${entry.dealId}`}
              className="text-xs text-primary hover:underline"
            >
              Deal: {entry.dealAddress}
            </Link>
            {entry.type === "deal_interaction" && entry.status && (
              <span
                className={cn(
                  "ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  getInteractionStatusClass(entry.status)
                )}
              >
                {getInteractionStatusLabel(entry.status)}
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        {notes && (
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

export function BuyerTimeline({ buyerId, entries }: BuyerTimelineProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [pending, setPending] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const filtered = entries.filter((e) => matchesFilter(e, filter));

  async function handleLogEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set("buyerId", buyerId);
    await logBuyerCommEvent(fd);
    setPending(false);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      {/* Log event form */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5 text-primary" />
          Log Event
        </h2>
        <form key={formKey} onSubmit={handleLogEvent} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Event Type
              </label>
              <select
                name="eventType"
                required
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {LOG_EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="What happened? Any details..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Logging..." : "Log Event"}
          </Button>
        </form>
      </div>

      {/* Timeline header + filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Communication History
          {entries.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({entries.length})
            </span>
          )}
        </h2>
        {entries.length > 0 && (
          <div className="flex gap-1">
            {ALL_FILTER_TYPES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline entries */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? "No communication history yet. Log your first interaction above."
              : "No events match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map((entry) => (
            <TimelineEntry key={`${entry.type}-${entry.id}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
