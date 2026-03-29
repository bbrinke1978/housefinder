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
import type { AttributionStat } from "@/lib/analytics-queries";

interface Props {
  data: AttributionStat[];
}

function formatSignalType(raw: string): string {
  const map: Record<string, string> = {
    nod: "NOD",
    tax_lien: "Tax Lien",
    tax_delinquent: "Tax Delinquent",
    code_violation: "Code Violation",
    probate: "Probate",
    foreclosure: "Foreclosure",
    vacant: "Vacant",
  };
  return (
    map[raw] ??
    raw
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-semibold mb-1">{formatSignalType(String(label))}</p>
      {payload.map((p) => (
        <p key={p.name}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function AnalyticsAttribution({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground text-center px-4">
        No attribution data yet. As leads convert to deals, signal effectiveness will appear.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatSignalType(d.signalType),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 8, bottom: 4, left: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12 }}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="totalLeads"
          name="Total Leads"
          fill="hsl(var(--muted-foreground))"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="convertedDeals"
          name="Converted Deals"
          fill="hsl(var(--primary))"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
