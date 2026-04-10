"use client";

import { computeWholesaleScore } from "@/lib/wholesale-score";

interface WholesaleAnalysisProps {
  arv: number | null | undefined;
  repairEstimate: number | null | undefined;
  askingPrice: number | null | undefined;
  wholesaleFee?: number | null;
  className?: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function ProgressBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function WholesaleAnalysis({
  arv,
  repairEstimate,
  askingPrice,
  wholesaleFee,
  className,
}: WholesaleAnalysisProps) {
  if (!arv || !askingPrice) return null;

  const breakdown = computeWholesaleScore(
    arv,
    repairEstimate ?? 0,
    askingPrice,
    wholesaleFee ?? 15000
  );

  const { total, verdict, mao, spreadDollars, endBuyerRoi, maoSpreadPts, equityPctPts, endBuyerRoiPts } = breakdown;

  const verdictColors = {
    green: { dot: "bg-green-500", text: "text-green-600", label: "Strong Deal" },
    yellow: { dot: "bg-yellow-500", text: "text-yellow-600", label: "Marginal" },
    red: { dot: "bg-red-500", text: "text-red-600", label: "Pass" },
  };
  const vc = verdictColors[verdict];

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-4 ${className ?? ""}`}>
      {/* Traffic light + score row */}
      <div className="flex items-center gap-4">
        {/* Traffic light */}
        <div className="flex flex-col gap-1.5">
          {(["green", "yellow", "red"] as const).map((color) => (
            <div
              key={color}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                verdict === color
                  ? color === "green"
                    ? "bg-green-500 border-green-500"
                    : color === "yellow"
                    ? "bg-yellow-500 border-yellow-500"
                    : "bg-red-500 border-red-500"
                  : "bg-transparent border-border"
              }`}
            />
          ))}
        </div>

        {/* Score + label */}
        <div>
          <p className="text-3xl font-bold tabular-nums leading-none">
            {total}
            <span className="text-lg font-normal text-muted-foreground">/10</span>
          </p>
          <p className={`text-sm font-semibold mt-0.5 ${vc.text}`}>{vc.label}</p>
        </div>

        {/* Spread / profit */}
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Your Spread</p>
          <p className={`text-xl font-bold tabular-nums ${spreadDollars >= 0 ? "text-green-600" : "text-red-600"}`}>
            {fmt(spreadDollars)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            MAO: <span className="font-medium text-foreground">{fmt(mao)}</span>
          </p>
        </div>
      </div>

      {/* Expandable breakdown */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none list-none flex items-center gap-1">
          <span className="group-open:hidden">Show breakdown</span>
          <span className="hidden group-open:inline">Hide breakdown</span>
          <svg className="w-3 h-3 transition-transform group-open:rotate-180" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>

        <div className="mt-3 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">MAO Spread</span>
              <span className="font-medium">{maoSpreadPts}/10</span>
            </div>
            <ProgressBar value={maoSpreadPts} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Equity %</span>
              <span className="font-medium">{equityPctPts}/10</span>
            </div>
            <ProgressBar value={equityPctPts} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">End Buyer ROI</span>
              <span className="font-medium">{endBuyerRoiPts}/10</span>
            </div>
            <ProgressBar value={endBuyerRoiPts} />
            <p className="text-xs text-muted-foreground mt-1">
              End buyer ROI: <span className="font-medium text-foreground">{endBuyerRoi.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
