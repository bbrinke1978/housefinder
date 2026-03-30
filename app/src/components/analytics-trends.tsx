"use client";

import { useState, useCallback } from "react";
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

// Palette for up to 8 cities — violet primary series, semantic semantic colors for others
const CITY_COLORS = [
  "#8b5cf6", // violet-500 — primary series
  "#a78bfa", // violet-400
  "#6d28d9", // violet-700
  "#c4b5fd", // violet-300
  "#10b981", // emerald-500 — positive
  "#f59e0b", // amber-500 — caution
  "#ef4444", // red-500 — alert
  "#06b6d4", // cyan-500 — extra
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
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLegendEnter = useCallback((o: any) => {
    setHoveredCity(String(o?.dataKey ?? o?.value ?? ""));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLegendLeave = useCallback((_o: any) => {
    setHoveredCity(null);
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-sm text-muted-foreground text-center px-4">
        Not enough trend data yet. Weekly property volumes will appear after a few weeks of scraping.
      </div>
    );
  }

  const { rows, cities } = transformData(data);

  return (
    <ResponsiveContainer width="100%" height={400}>
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
        <Legend
          wrapperStyle={{ fontSize: 13, cursor: "pointer", paddingTop: 8 }}
          onMouseEnter={handleLegendEnter}
          onMouseLeave={handleLegendLeave}
        />
        {cities.map((city, i) => (
          <Line
            key={city}
            type="monotone"
            dataKey={city}
            stroke={CITY_COLORS[i % CITY_COLORS.length]}
            dot={false}
            strokeWidth={hoveredCity === city ? 4 : hoveredCity ? 1 : 2}
            strokeOpacity={hoveredCity === null ? 1 : hoveredCity === city ? 1 : 0.15}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
