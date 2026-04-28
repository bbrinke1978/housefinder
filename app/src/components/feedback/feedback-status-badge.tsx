import { Badge } from "@/components/ui/badge";

type FeedbackStatus = "new" | "planned" | "in_progress" | "shipped" | "wontfix" | "duplicate";

interface FeedbackStatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; className: string }> = {
  new:         { label: "New",         className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  planned:     { label: "Planned",     className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800" },
  in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800" },
  shipped:     { label: "Shipped",     className: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-800" },
  wontfix:     { label: "Won't Fix",   className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" },
  duplicate:   { label: "Duplicate",  className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" },
};

export function FeedbackStatusBadge({ status }: FeedbackStatusBadgeProps) {
  const config = STATUS_CONFIG[status as FeedbackStatus] ?? { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
