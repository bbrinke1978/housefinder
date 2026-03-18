import { Card, CardContent } from "@/components/ui/card";
import { Activity, Flame, Sparkles, Clock } from "lucide-react";
import type { DashboardStats } from "@/lib/queries";

interface StatsBarProps {
  stats: DashboardStats;
}

const statCards = [
  {
    label: "Total Leads",
    key: "total" as const,
    icon: Activity,
    color: "text-foreground",
    bg: "bg-muted/50",
  },
  {
    label: "Hot Leads",
    key: "hot" as const,
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    label: "New Today",
    key: "newToday" as const,
    icon: Sparkles,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    label: "Needs Follow-up",
    key: "needsFollowUp" as const,
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} size="sm">
            <CardContent className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats[card.key]}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
