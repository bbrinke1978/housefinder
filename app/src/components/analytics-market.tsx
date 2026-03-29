"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MarketStat } from "@/lib/analytics-queries";

interface Props {
  data: MarketStat[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: MarketStat }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const stat = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-semibold mb-1">{label}</p>
      <p>{stat.totalLeads} total leads</p>
      <p>{stat.hotLeads} hot leads</p>
      <p className="text-muted-foreground">{stat.conversionRate}% conversion</p>
    </div>
  );
}

export function AnalyticsMarket({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-sm text-muted-foreground text-center px-4">
        No market data yet. Properties from multiple cities will show comparison stats.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="city" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="totalLeads"
          name="Total Leads"
          fill="hsl(var(--muted-foreground))"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="hotLeads"
          name="Hot Leads"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
