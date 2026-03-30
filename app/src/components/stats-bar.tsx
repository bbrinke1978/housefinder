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
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  {
    label: "Critical",
    key: "critical" as const,
    icon: AlertTriangle,
    href: "/?tier=critical",
    iconBg: "bg-red-100 dark:bg-red-950/40",
    iconColor: "text-red-700",
  },
  {
    label: "Hot Leads",
    key: "hot" as const,
    icon: Flame,
    href: "/?hot=true",
    iconBg: "bg-orange-100 dark:bg-orange-950/40",
    iconColor: "text-orange-500",
  },
  {
    label: "Warm Leads",
    key: "warm" as const,
    icon: ThermometerSun,
    href: "/?tier=warm",
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-500",
  },
  {
    label: "New Today",
    key: "newToday" as const,
    icon: Sparkles,
    href: "/?sort=date",
    iconBg: "bg-blue-100 dark:bg-blue-950/40",
    iconColor: "text-blue-500",
  },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.key}
            href={card.href}
            className="card-elevated flex flex-col items-center text-center py-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer no-underline"
          >
            <div className={`w-14 h-14 rounded-full ${card.iconBg} flex items-center justify-center mb-3 shadow-sm`}>
              <Icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
            <p
              className="text-4xl font-bold tabular-nums text-foreground"
            >
              {stats[card.key]}
            </p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
              {card.label}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
