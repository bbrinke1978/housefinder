"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import type { TrendPoint } from "@/lib/analytics-queries";

interface Props {
  data: TrendPoint[];
}

// Palette for up to 8 cities
const CITY_COLORS = [
  "hsl(var(--primary))",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

type WeekMap = Record<string, Record<string, number>>;
type ChartRow = Record<string, string | number>;

function transformData(raw: TrendPoint[]): {
  rows: ChartRow[];
  cities: string[];
} {
  const weekMap: WeekMap = {};
  const citySet = new Set<string>();

  for (const pt of raw) {
    citySet.add(pt.city);
    if (!weekMap[pt.week]) weekMap[pt.week] = {};
    weekMap[pt.week][pt.city] = pt.count;
  }

  const cities = Array.from(citySet).sort();
  const rows: ChartRow[] = Object.keys(weekMap)
    .sort()
    .map((week) => {
      const row: ChartRow = { week };
      for (const city of cities) {
        row[city] = weekMap[week][city] ?? 0;
      }
      return row;
    });

  return { rows, cities };
}

export function AnalyticsTrends({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-sm text-muted-foreground text-center px-4">
        Not enough trend data yet. Weekly property volumes will appear after a few weeks of scraping.
      </div>
    );
  }

  const { rows, cities } = transformData(data);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => {
            try {
              return format(new Date(v), "MMM d");
            } catch {
              return v;
            }
          }}
        />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={(v) => {
            try {
              return format(new Date(String(v)), "MMM d, yyyy");
            } catch {
              return String(v);
            }
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {cities.map((city, i) => (
          <Line
            key={city}
            type="monotone"
            dataKey={city}
            stroke={CITY_COLORS[i % CITY_COLORS.length]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
