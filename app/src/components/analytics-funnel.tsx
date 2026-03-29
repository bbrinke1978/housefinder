"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { FunnelStage } from "@/lib/analytics-queries";

interface Props {
  data: FunnelStage[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: FunnelStage }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const stage = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-semibold capitalize mb-1">{String(label).replace("_", " ")}</p>
      <p>{stage.count} leads</p>
      {stage.avgDaysInStage !== null && (
        <p className="text-muted-foreground">avg {stage.avgDaysInStage}d at stage</p>
      )}
    </div>
  );
}

export function AnalyticsFunnel({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground text-center px-4">
        No pipeline data yet. Start tracking leads to see conversion rates.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="status"
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => v.replace("_", " ")}
        />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
