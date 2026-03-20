import Link from "next/link";
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
    href: "/",
    iconBg: "bg-warm-200 dark:bg-dark-700",
    iconColor: "text-dark-600 dark:text-dark-300",
  },
  {
    label: "Hot Leads",
    key: "hot" as const,
    icon: Flame,
    href: "/?hot=true",
    iconBg: "bg-red-100 dark:bg-red-950/40",
    iconColor: "text-red-500",
  },
  {
    label: "New Today",
    key: "newToday" as const,
    icon: Sparkles,
    href: "/?sort=date",
    iconBg: "bg-blue-100 dark:bg-blue-950/40",
    iconColor: "text-blue-500",
  },
  {
    label: "Needs Follow-up",
    key: "needsFollowUp" as const,
    icon: Clock,
    href: "/?status=follow_up",
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-500",
  },
  {
    label: "Skip Trace",
    key: "needsSkipTrace" as const,
    icon: Search,
    href: "/?skipTrace=true",
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
          <Link
            key={card.key}
            href={card.href}
            className="card-warm flex flex-col items-center text-center py-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer no-underline"
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
          </Link>
        );
      })}
    </div>
  );
}
