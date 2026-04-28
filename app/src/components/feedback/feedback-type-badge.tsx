import { Badge } from "@/components/ui/badge";
import { Bug, Lightbulb, Sparkles, HelpCircle } from "lucide-react";

type FeedbackType = "bug" | "feature" | "idea" | "question";

interface FeedbackTypeBadgeProps {
  type: string;
}

const TYPE_CONFIG: Record<FeedbackType, { label: string; className: string; Icon: React.ElementType }> = {
  bug:      { label: "Bug",      className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800",    Icon: Bug },
  feature:  { label: "Feature",  className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800", Icon: Sparkles },
  idea:     { label: "Idea",     className: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800", Icon: Lightbulb },
  question: { label: "Question", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",  Icon: HelpCircle },
};

export function FeedbackTypeBadge({ type }: FeedbackTypeBadgeProps) {
  const config = TYPE_CONFIG[type as FeedbackType] ?? { label: type, className: "bg-gray-100 text-gray-700 border-gray-200", Icon: HelpCircle };
  const { label, className, Icon } = config;
  return (
    <Badge variant="outline" className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
