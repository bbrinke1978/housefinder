import { Activity, Flame, Sparkles, Clock, Search } from "lucide-react";
import type { DashboardStats } from "@/lib/queries";

interface StatsBarProps {
  stats: DashboardStats;
}

const statCards = [
  {
    label: "Total Leads",
    key: "total" as const,
    icon: Activity,
    iconBg: "bg-warm-200 dark:bg-dark-700",
    iconColor: "text-dark-600 dark:text-dark-300",
  },
  {
    label: "Hot Leads",
    key: "hot" as const,
    icon: Flame,
    iconBg: "bg-red-100 dark:bg-red-950/40",
    iconColor: "text-red-500",
  },
  {
    label: "New Today",
    key: "newToday" as const,
    icon: Sparkles,
    iconBg: "bg-blue-100 dark:bg-blue-950/40",
    iconColor: "text-blue-500",
  },
  {
    label: "Needs Follow-up",
    key: "needsFollowUp" as const,
    icon: Clock,
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-500",
  },
  {
    label: "Skip Trace",
    key: "needsSkipTrace" as const,
    icon: Search,
    iconBg: "bg-orange-100 dark:bg-orange-950/40",
    iconColor: "text-orange-500",
  },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="card-warm flex flex-col items-center text-center py-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className={`w-14 h-14 rounded-full ${card.iconBg} flex items-center justify-center mb-3 shadow-sm`}>
              <Icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
            <p
              style={{ fontFamily: "var(--font-display)" }}
              className="text-4xl text-dark-950 dark:text-dark-100"
            >
              {stats[card.key]}
            </p>
            <p className="text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider mt-1">
              {card.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
