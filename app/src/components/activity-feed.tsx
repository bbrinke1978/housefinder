"use client";

/**
 * ActivityFeed — full unified timeline component for property/lead/deal detail pages.
 *
 * Displays a vertical timeline of ActivityEntry items from all sources.
 * Supports filter modes: 'all' | 'notes_only' | 'comms_only'.
 * Has a "Log Activity" button at top that opens ActivityLogModal.
 *
 * On modal success: calls router.refresh() to revalidate server data.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  Voicemail,
  StickyNote,
  Camera,
  FileText,
  Search,
  Tag,
  Edit,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEntry, ActivitySource } from "@/lib/activity-queries";
import { ActivityLogModal } from "@/components/activity-log-modal";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type FeedFilter = "all" | "notes_only" | "comms_only";

interface ActivityFeedProps {
  propertyId: string;
  leadId: string;
  initialEntries: ActivityEntry[];
  filter?: FeedFilter;
}

// ---------------------------------------------------------------------------
// Icon + color helpers
// ---------------------------------------------------------------------------

function getIcon(entry: ActivityEntry) {
  const cls = "h-3.5 w-3.5";
  switch (entry.type) {
    case "call":
      return <Phone className={cls} />;
    case "voicemail":
      return <Voicemail className={cls} />;
    case "email":
    case "email_received":
      return <Mail className={cls} />;
    case "text":
      return <MessageSquare className={cls} />;
    case "meeting":
      return <Users className={cls} />;
    case "note":
      return <StickyNote className={cls} />;
    case "photo_added":
      return <Camera className={cls} />;
    case "contract_generated":
      return <FileText className={cls} />;
    case "skip_trace":
      return <Search className={cls} />;
    case "status_changed":
      return <Tag className={cls} />;
    default:
      // audit actions
      if (entry.source === "audit") return <Edit className={cls} />;
      return <Clock className={cls} />;
  }
}

function getIconClass(entry: ActivityEntry): string {
  switch (entry.type) {
    case "call":
    case "voicemail":
      return "bg-primary/10 text-primary border-primary/20";
    case "email":
    case "email_received":
      return "bg-primary/10 text-primary border-primary/20";
    case "text":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "meeting":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "note":
      return "bg-muted text-muted-foreground border-border";
    case "photo_added":
      return "bg-violet-500/10 text-violet-500 border-violet-500/20";
    case "contract_generated":
      return "bg-teal-500/10 text-teal-500 border-teal-500/20";
    case "skip_trace":
      return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    case "status_changed":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// ---------------------------------------------------------------------------
// Actor avatar — colored circle with initials
// ---------------------------------------------------------------------------

// Stable color from name string
const AVATAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ActorAvatar({ name }: { name: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
        colorFromName(name)
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filter logic
// ---------------------------------------------------------------------------

function applyFilter(entries: ActivityEntry[], filter: FeedFilter): ActivityEntry[] {
  if (filter === "all") return entries;
  if (filter === "notes_only") {
    return entries.filter(
      (e) =>
        e.source === "lead_note" ||
        e.source === "deal_note" ||
        e.type === "note"
    );
  }
  if (filter === "comms_only") {
    return entries.filter((e) => e.source === "contact_event");
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Single timeline row
// ---------------------------------------------------------------------------

function FeedItem({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = !!entry.body && entry.body.trim().length > 0;
  const isLong = hasBody && entry.body!.length > 140;

  const displayBody =
    hasBody && isLong && !expanded ? entry.body!.slice(0, 140) + "…" : entry.body;

  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      {/* Vertical connector + icon */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border",
            getIconClass(entry)
          )}
        >
          {getIcon(entry)}
        </div>
        <div className="mt-1 flex-1 w-px bg-border" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {entry.actorName && <ActorAvatar name={entry.actorName} />}
          <span className="text-sm font-medium text-foreground">
            {entry.description}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(entry.occurredAt), { addSuffix: true })}
          </span>
        </div>

        {hasBody && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {displayBody}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Show more
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActivityFeed
// ---------------------------------------------------------------------------

export function ActivityFeed({
  propertyId,
  leadId,
  initialEntries,
  filter = "all",
}: ActivityFeedProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = applyFilter(initialEntries, filter);

  function handleModalSuccess() {
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* Log Activity button at top */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {filter === "notes_only"
            ? "Notes"
            : filter === "comms_only"
            ? "Communications"
            : "Activity"}
          {filtered.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold min-w-[18px] h-[18px] px-1">
              {filtered.length > 99 ? "99+" : filtered.length}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Log Activity
        </button>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No activity yet. Click <span className="font-medium">Log Activity</span> to record the first one.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map((entry) => (
            <FeedItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Modal */}
      <ActivityLogModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        propertyId={propertyId}
        leadId={leadId}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
