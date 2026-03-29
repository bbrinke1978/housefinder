"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { OutreachStat } from "@/lib/analytics-queries";

interface AnalyticsOutreachProps {
  data: OutreachStat[];
}

const OUTCOME_COLORS: Record<string, string> = {
  answered: "#10b981",    // emerald-500
  voicemail: "#f59e0b",   // amber-500
  no_answer: "#64748b",   // slate-500
  wrong_number: "#ef4444", // red-500
};

const OUTCOME_LABELS: Record<string, string> = {
  answered: "Answered",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  wrong_number: "Wrong Number",
};

function formatOutcome(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export function AnalyticsOutreach({ data }: AnalyticsOutreachProps) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No call data yet. Log your first call to start tracking outreach effectiveness.
      </p>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const answeredCount = data.find((d) => d.outcome === "answered")?.count ?? 0;
  const contactRate = total > 0 ? Math.round((answeredCount / total) * 1000) / 10 : 0;

  const chartData = data.map((d) => ({
    ...d,
    label: formatOutcome(d.outcome),
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">
        Contact Rate:{" "}
        <span className="text-lg font-bold text-emerald-500">{contactRate}%</span>
        <span className="ml-2 text-xs text-muted-foreground font-normal">
          ({answeredCount} answered of {total} calls)
        </span>
      </p>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 96 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12 }}
            width={90}
          />
          <Tooltip
            formatter={(value) => [value, "Calls"]}
            cursor={{ fill: "hsl(var(--muted))" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.outcome}
                fill={OUTCOME_COLORS[entry.outcome] ?? "#94a3b8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
