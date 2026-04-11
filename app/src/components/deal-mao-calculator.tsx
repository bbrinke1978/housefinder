"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { updateDeal } from "@/lib/deal-actions";
import type { DealWithBuyer } from "@/types";

interface DealMaoCalculatorProps {
  deal: DealWithBuyer;
}

function fmt(n: number): string {
  return "$" + n.toLocaleString();
}

function fmtDiff(n: number): string {
  if (n > 0) return "+" + n.toLocaleString();
  return n.toLocaleString();
}

type DealScore = "Great" | "Good" | "Tight" | "Bad";

function computeDealScore(mao: number, offerPrice: number): DealScore {
  if (mao > offerPrice * 1.1) return "Great";
  if (mao > offerPrice) return "Good";
  if (mao >= offerPrice * 0.95) return "Tight";
  return "Bad";
}

function dealScoreVariant(score: DealScore): "default" | "secondary" | "outline" | "destructive" {
  switch (score) {
    case "Great":
      return "default";
    case "Good":
      return "secondary";
    case "Tight":
      return "outline";
    case "Bad":
      return "destructive";
  }
}

function dealScoreColor(score: DealScore): string {
  switch (score) {
    case "Great":
      return "text-green-600 dark:text-green-400";
    case "Good":
      return "text-emerald-600 dark:text-emerald-400";
    case "Tight":
      return "text-yellow-600 dark:text-yellow-400";
    case "Bad":
      return "text-red-600 dark:text-red-400";
  }
}

export function DealMaoCalculator({ deal }: DealMaoCalculatorProps) {
  const [arv, setArv] = useState(deal.arv ?? 0);
  const [repairs, setRepairs] = useState(deal.repairEstimate ?? 0);
  const [wholesaleFee, setWholesaleFee] = useState(deal.wholesaleFee ?? 15000);
  const [offerPrice, setOfferPrice] = useState(deal.offerPrice ?? 0);
  const [assignmentFee, setAssignmentFee] = useState(deal.assignmentFee ?? 15000);
  const [saving, setSaving] = useState(false);

  // Core MAO calculation
  const mao = Math.round(arv * 0.65 - repairs - wholesaleFee);
  const endBuyerAllIn = offerPrice + assignmentFee + repairs;
  const endBuyerProfit = arv - endBuyerAllIn;
  const endBuyerRoi =
    endBuyerAllIn > 0
      ? Math.round((endBuyerProfit / endBuyerAllIn) * 100)
      : 0;
  const dealScore: DealScore =
    offerPrice > 0 ? computeDealScore(mao, offerPrice) : "Good";

  // Sensitivity analysis rows
  const baseArv = arv;
  const baseRepairs = repairs;

  const arvLow = Math.round(baseArv * 0.9 * 0.65 - baseRepairs - wholesaleFee);
  const repairsHigh = Math.round(baseArv * 0.65 - baseRepairs * 1.2 - wholesaleFee);
  const bothWorse = Math.round(baseArv * 0.9 * 0.65 - baseRepairs * 1.2 - wholesaleFee);

  async function handleSave() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("arv", String(arv));
      fd.set("repairEstimate", String(repairs));
      fd.set("wholesaleFee", String(wholesaleFee));
      fd.set("offerPrice", String(offerPrice));
      fd.set("assignmentFee", String(assignmentFee));
      await updateDeal(deal.id, fd);
    } finally {
      setSaving(false);
    }
  }

  function numInput(
    id: string,
    label: string,
    value: number,
    onChange: (v: number) => void
  ) {
    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            $
          </span>
          <Input
            id={id}
            type="number"
            value={value || ""}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            className="pl-6"
          />
        </div>
      </div>
    );
  }

  function SensRow({
    label,
    adjMao,
  }: {
    label: string;
    adjMao: number;
  }) {
    const diff = adjMao - mao;
    const pass = offerPrice > 0 ? adjMao >= offerPrice : adjMao >= 0;
    return (
      <tr className="border-b last:border-0">
        <td className="py-2 pr-4 text-sm text-muted-foreground">{label}</td>
        <td className="py-2 pr-4 text-sm font-medium">{fmt(adjMao)}</td>
        <td
          className={`py-2 pr-4 text-sm ${diff < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
        >
          {diff < 0 ? (
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              {fmtDiff(diff)}
            </span>
          ) : diff > 0 ? (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {fmtDiff(diff)}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Minus className="h-3 w-3" />0
            </span>
          )}
        </td>
        <td className="py-2 text-sm">
          {pass ? (
            <span className="text-green-600 dark:text-green-400 font-medium">Pass</span>
          ) : (
            <span className="text-red-600 dark:text-red-400 font-medium">Fail</span>
          )}
        </td>
      </tr>
    );
  }

  // Per-sqft metrics (only shown when sqft is available and > 0)
  const sqft = deal.sqft != null && deal.sqft > 0 ? deal.sqft : null;
  const priceSqft = sqft && offerPrice > 0 ? Math.round(offerPrice / sqft) : null;
  const rehabSqft = sqft && repairs > 0 ? Math.round(repairs / sqft) : null;
  const arvSqft = sqft && arv > 0 ? Math.round(arv / sqft) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {numInput("arv", "ARV (After Repair Value)", arv, setArv)}
            {numInput("repairs", "Rehab Estimate", repairs, setRepairs)}
            {numInput("wholesaleFee", "Wholesale Fee", wholesaleFee, setWholesaleFee)}
            {numInput("offerPrice", "Offer Price (to seller)", offerPrice, setOfferPrice)}
            {numInput("assignmentFee", "Assignment Fee (your profit)", assignmentFee, setAssignmentFee)}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">MAO</span>
                <span
                  className={`text-2xl font-bold ${
                    offerPrice > 0
                      ? mao >= offerPrice
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                      : ""
                  }`}
                >
                  {fmt(mao)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                ARV × 70% − Repairs − Wholesale Fee
              </p>
              <p className="text-xs text-muted-foreground">
                {fmt(arv)} × 0.65 − {fmt(repairs)} − {fmt(wholesaleFee)}
              </p>
            </div>

            {offerPrice > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Deal Score</span>
                <Badge
                  variant={dealScoreVariant(dealScore)}
                  className={dealScoreColor(dealScore)}
                >
                  {dealScore}
                </Badge>
              </div>
            )}

            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                End Buyer Analysis
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">All-In Cost</span>
                <span>{fmt(endBuyerAllIn)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">End Buyer Profit</span>
                <span
                  className={
                    endBuyerProfit >= 0
                      ? "font-medium text-green-600 dark:text-green-400"
                      : "font-medium text-red-600 dark:text-red-400"
                  }
                >
                  {fmt(endBuyerProfit)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">End Buyer ROI</span>
                <span
                  className={
                    endBuyerRoi >= 15
                      ? "font-medium text-green-600 dark:text-green-400"
                      : endBuyerRoi >= 8
                        ? "font-medium text-yellow-600 dark:text-yellow-400"
                        : "font-medium text-red-600 dark:text-red-400"
                  }
                >
                  {endBuyerRoi}%
                </span>
              </div>
            </div>

            {/* Per-sqft metrics — only shown when deal has sqft from floor plans */}
            {sqft !== null && (priceSqft !== null || rehabSqft !== null || arvSqft !== null) && (
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Per Sq Ft ({sqft.toLocaleString()} sq ft)
                </p>
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  {priceSqft !== null && (
                    <span className="text-muted-foreground">
                      Price:{" "}
                      <span className="font-medium text-foreground">
                        ${priceSqft}/sqft
                      </span>
                    </span>
                  )}
                  {rehabSqft !== null && (
                    <span className="text-muted-foreground">
                      Rehab:{" "}
                      <span className="font-medium text-foreground">
                        ${rehabSqft}/sqft
                      </span>
                    </span>
                  )}
                  {arvSqft !== null && (
                    <span className="text-muted-foreground">
                      ARV:{" "}
                      <span className="font-medium text-foreground">
                        ${arvSqft}/sqft
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
              {saving ? "Saving..." : "Save Calculator Values"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sensitivity Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            How MAO changes under adverse conditions (base MAO: {fmt(mao)})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">
                    Scenario
                  </th>
                  <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">
                    Adjusted MAO
                  </th>
                  <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">
                    vs Base
                  </th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">
                    vs Offer
                  </th>
                </tr>
              </thead>
              <tbody>
                <SensRow label="ARV 10% Lower" adjMao={arvLow} />
                <SensRow label="Repairs 20% Higher" adjMao={repairsHigh} />
                <SensRow label="Both Worse" adjMao={bothWorse} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
