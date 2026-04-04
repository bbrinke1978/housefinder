import { Phone } from "lucide-react";

interface TouchpointBadgeProps {
  count: number;
}

/**
 * Compact pill badge showing the number of contact touchpoints logged for a lead.
 * Returns null when count is 0 (no badge shown for uncalled leads).
 */
export function TouchpointBadge({ count }: TouchpointBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      title={`${count} contact event${count === 1 ? "" : "s"} logged`}
      className="inline-flex items-center gap-0.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 border border-border"
    >
      <Phone className="h-2.5 w-2.5 flex-shrink-0" />
      {count}
    </span>
  );
}
