import { Badge } from "@/components/ui/badge";

type FeedbackPriority = "low" | "medium" | "high" | "critical";

interface FeedbackPriorityBadgeProps {
  priority: string;
}

const PRIORITY_CONFIG: Record<FeedbackPriority, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse" },
  high:     { label: "High",     className: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
  medium:   { label: "Medium",   className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  low:      { label: "Low",      className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" },
};

export function FeedbackPriorityBadge({ priority }: FeedbackPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority as FeedbackPriority] ?? { label: priority, className: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
