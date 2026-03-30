"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { BudgetCategory } from "@/types";

interface BudgetChartsProps {
  categories: BudgetCategory[];
}

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#6366f1",
  "#d946ef",
];

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{payload[0].name}</p>
      <p>{formatDollars(payload[0].value)}</p>
    </div>
  );
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name}>
          {p.name}: {formatDollars(p.value)}
        </p>
      ))}
    </div>
  );
}

/**
 * BudgetCharts — progress bars, pie chart, and grouped bar chart for budget visualization.
 * Charts are in a collapsible section for mobile performance.
 */
export function BudgetCharts({ categories }: BudgetChartsProps) {
  const [chartsOpen, setChartsOpen] = useState(false);

  // Categories with any planned or actual spending
  const activeCategories = categories.filter(
    (c) => c.plannedCents > 0 || c.actualCents > 0
  );

  // For pie chart: only categories with actual spending
  const pieData = categories
    .filter((c) => c.actualCents > 0)
    .map((c) => ({ name: c.name, value: c.actualCents }));

  // For bar chart: categories with planned or actual
  const barData = activeCategories.map((c) => ({
    name: c.name,
    Planned: c.plannedCents,
    Actual: c.actualCents,
  }));

  return (
    <div className="space-y-4">
      {/* Category Progress Bars */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Category Progress
        </h3>
        <div className="space-y-2">
          {activeCategories.map((category) => {
            const isUnplanned = category.plannedCents === 0 && category.actualCents > 0;
            const pct = isUnplanned
              ? 100
              : Math.min(100, Math.round((category.actualCents / category.plannedCents) * 100));

            let barColor = "bg-green-500";
            if (pct >= 100) barColor = "bg-red-500";
            else if (pct >= 80) barColor = "bg-yellow-500";

            const label = isUnplanned
              ? `Unplanned: ${formatDollars(category.actualCents)}`
              : `${formatDollars(category.actualCents)} / ${formatDollars(category.plannedCents)} (${pct}%)`;

            return (
              <div key={category.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate max-w-[45%]">{category.name}</span>
                  <span className="text-muted-foreground text-right">{label}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {activeCategories.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No categories with planned or actual spending yet.
            </p>
          )}
        </div>
      </div>

      {/* Collapsible charts section */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/50 transition-colors"
          onClick={() => setChartsOpen((v) => !v)}
        >
          <span>Charts</span>
          {chartsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {chartsOpen && (
          <div className="p-4 space-y-6 border-t">
            {/* Pie Chart — Spending by Category */}
            {pieData.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-3">Spending by Category</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No expenses recorded yet — pie chart will appear once spending is tracked.
              </p>
            )}

            {/* Bar Chart — Planned vs Actual */}
            {barData.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-3">Planned vs Actual by Category</p>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(200, barData.length * 40)}
                >
                  <BarChart
                    layout="vertical"
                    data={barData}
                    margin={{ top: 4, right: 8, bottom: 4, left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${(v / 100).toLocaleString("en-US", { notation: "compact" })}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip content={<BarTooltip />} cursor={false} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="Planned"
                      fill="hsl(var(--muted-foreground))"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="Actual"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No category data to chart yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
