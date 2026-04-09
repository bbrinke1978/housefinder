import Link from "next/link";
import { Activity, Flame, Sparkles, AlertTriangle, ThermometerSun } from "lucide-react";
import type { DashboardStats } from "@/lib/queries";

interface StatsBarProps {
  stats: DashboardStats;
}

const statCards = [
  {
    label: "Total Leads",
    key: "total" as const,
    icon: Activity,
    href: "/",
    iconColor: "text-muted-foreground",
  },
  {
    label: "Critical",
    key: "critical" as const,
    icon: AlertTriangle,
    href: "/?tier=critical",
    iconColor: "text-red-500",
  },
  {
    label: "Hot Leads",
    key: "hot" as const,
    icon: Flame,
    href: "/?hot=true",
    iconColor: "text-orange-500",
  },
  {
    label: "Warm Leads",
    key: "warm" as const,
    icon: ThermometerSun,
    href: "/?tier=warm",
    iconColor: "text-amber-500",
  },
  {
    label: "New Today",
    key: "newToday" as const,
    icon: Sparkles,
    href: "/?sort=date",
    iconColor: "text-primary",
  },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.key}
            href={card.href}
            className="flex-shrink-0 flex items-center gap-2.5 rounded-xl bg-card border border-border px-4 py-3 hover:bg-accent hover:border-primary/30 transition-colors group no-underline"
          >
            <Icon className={`h-4 w-4 ${card.iconColor} group-hover:scale-110 transition-transform`} />
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {stats[card.key]}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {card.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
