"use client";

/**
 * ActivityCardIndicator — compact activity summary row for property cards.
 *
 * Shows "No activity yet +" or "<icon> <last action description> · N events +"
 * The + button opens the Log Activity modal (via onLogClick).
 */

import { Phone, Mail, MessageSquare, Users, Voicemail, StickyNote, Camera, FileText, Search, Tag, Edit, Clock, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/activity-queries";

interface ActivityCardIndicatorProps {
  lastActivity: ActivityEntry | null;
  totalCount: number;
  onLogClick: () => void;
}

function getCompactIcon(entry: ActivityEntry) {
  const cls = "h-3 w-3 flex-shrink-0";
  switch (entry.type) {
    case "call": return <Phone className={cls} />;
    case "voicemail": return <Voicemail className={cls} />;
    case "email":
    case "email_received": return <Mail className={cls} />;
    case "text": return <MessageSquare className={cls} />;
    case "meeting": return <Users className={cls} />;
    case "note": return <StickyNote className={cls} />;
    case "photo_added": return <Camera className={cls} />;
    case "contract_generated": return <FileText className={cls} />;
    case "skip_trace": return <Search className={cls} />;
    case "status_changed": return <Tag className={cls} />;
    default:
      if (entry.source === "audit") return <Edit className={cls} />;
      return <Clock className={cls} />;
  }
}

export function ActivityCardIndicator({
  lastActivity,
  totalCount,
  onLogClick,
}: ActivityCardIndicatorProps) {
  return (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/60">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {totalCount === 0 || !lastActivity ? (
          <span className="text-[10px] text-muted-foreground">No activity yet</span>
        ) : (
          <>
            <span className="text-muted-foreground/70">{getCompactIcon(lastActivity)}</span>
            <span className="text-[10px] text-muted-foreground truncate">
              {lastActivity.description}
            </span>
            <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
              · {formatDistanceToNow(new Date(lastActivity.occurredAt), { addSuffix: false })}
            </span>
            <span className="text-[10px] text-muted-foreground/50 flex-shrink-0 ml-0.5">
              · {totalCount} event{totalCount !== 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>

      {/* Log Activity + button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLogClick();
        }}
        className={cn(
          "flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full",
          "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground",
          "transition-colors border border-border/60"
        )}
        title="Log activity"
        aria-label="Log activity"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
