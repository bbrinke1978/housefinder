"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";
import { updateDeal } from "@/lib/deal-actions";
import type { DealWithBuyer } from "@/types";

interface DealMaoCalculatorProps {
  deal: DealWithBuyer;
}

function fmt(n: number): string {
  return "$" + n.toLocaleString();
}

function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

export function DealMaoCalculator({ deal }: DealMaoCalculatorProps) {
  // Primary inputs (seeded from deal prop)
  const [arv, setArv] = useState(deal.arv ?? 0);
  const [repairs, setRepairs] = useState(deal.repairEstimate ?? 0);
  const [buyClosingCosts, setBuyClosingCosts] = useState(3000);

  // Sell-side cost percentages
  const [buyersAgentPct, setBuyersAgentPct] = useState(3.0);
  const [sellingAgentPct, setSellingAgentPct] = useState(3.0);
  const [closingTitlePct, setClosingTitlePct] = useState(1.5);

  // Hard money loan parameters
  const [hmlRate, setHmlRate] = useState(12.0);
  const [hmlPoints, setHmlPoints] = useState(2.0);
  const [hmlLtv, setHmlLtv] = useState(70.0);
  const [holdMonths, setHoldMonths] = useState(6);

  // Monthly carry costs
  const [monthlyCarry, setMonthlyCarry] = useState(500);

  // Buyer/flipper profit targets
  const [minProfit, setMinProfit] = useState(20000);
  const [maxProfit, setMaxProfit] = useState(40000);

  // Save-related
  const [offerPrice, setOfferPrice] = useState(deal.offerPrice ?? 0);
  const [assignmentFee, setAssignmentFee] = useState(deal.assignmentFee ?? 15000);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"buyer" | "wholesaler">("buyer");

  // ── Math engine ──────────────────────────────────────────────────────────

  // Sell-side
  const sellSidePct = (buyersAgentPct + sellingAgentPct + closingTitlePct) / 100;
  const sellSideCost = Math.round(arv * sellSidePct);
  const netProceeds = arv - sellSideCost;

  // Core MAO before financing (no HML yet)
  const maoNoHml = netProceeds - repairs - buyClosingCosts;

  // Iterative convergence for HML
  function convergeMao(targetProfit: number): {
    mao: number;
    loanAmt: number;
    hmlTotal: number;
  } {
    let mao = maoNoHml - targetProfit;
    for (let i = 0; i < 20; i++) {
      const loanAmt = mao * (hmlLtv / 100);
      const interestCost = loanAmt * (hmlRate / 100 / 12) * holdMonths;
      const pointsCost = loanAmt * (hmlPoints / 100);
      const carryCost = monthlyCarry * holdMonths;
      const hmlTotal = Math.round(interestCost + pointsCost + carryCost);
      const newMao =
        netProceeds - repairs - buyClosingCosts - targetProfit - hmlTotal;
      if (Math.abs(newMao - mao) < 1) {
        return {
          mao: Math.round(newMao),
          loanAmt: Math.round(newMao * (hmlLtv / 100)),
          hmlTotal,
        };
      }
      mao = newMao;
    }
    const loanAmt = Math.round(mao * (hmlLtv / 100));
    const interestCost = loanAmt * (hmlRate / 100 / 12) * holdMonths;
    const pointsCost = loanAmt * (hmlPoints / 100);
    const carryCost = monthlyCarry * holdMonths;
    return {
      mao: Math.round(mao),
      loanAmt,
      hmlTotal: Math.round(interestCost + pointsCost + carryCost),
    };
  }

  const {
    mao: maoBest,
    loanAmt: loanAmtBest,
    hmlTotal: hmlTotalBest,
  } = convergeMao(minProfit);
  const { mao: maoWorst } = convergeMao(maxProfit);
  const maoPctOfArv =
    arv > 0 ? ((maoBest / arv) * 100).toFixed(1) : "—";

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("arv", String(arv));
      fd.set("repairEstimate", String(repairs));
      fd.set("wholesaleFee", String(assignmentFee)); // kept for compatibility
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

  function pctInput(
    id: string,
    label: string,
    value: number,
    onChange: (v: number) => void
  ) {
    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <div className="relative mt-1">
          <Input
            id={id}
            type="number"
            step="0.1"
            value={value || ""}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="pr-7"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            %
          </span>
        </div>
      </div>
    );
  }

  // ── Wholesaler math (all derived from maoBest) ───────────────────────────
  const maxPurchaseFromSeller = maoBest - assignmentFee;
  const endBuyerOutOfPocket = maoBest + buyClosingCosts;
  const wholesalerSpread = assignmentFee;
  const wholesalerRoi =
    maxPurchaseFromSeller > 0
      ? Math.round((assignmentFee / maxPurchaseFromSeller) * 100)
      : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeView === "buyer" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("buyer")}
        >
          Buyer / Flipper
        </Button>
        <Button
          variant={activeView === "wholesaler" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("wholesaler")}
        >
          Wholesaler
        </Button>
      </div>

      {/* Row 1: Primary Inputs + Sell-Side Costs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              Primary Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {numInput("arv", "ARV (After Repair Value)", arv, setArv)}
            {numInput("repairs", "Rehab Estimate", repairs, setRepairs)}
            {numInput(
              "buyClosingCosts",
              "Buy-Side Closing Costs",
              buyClosingCosts,
              setBuyClosingCosts
            )}
            {numInput(
              "offerPrice",
              "Offer Price (to seller)",
              offerPrice,
              setOfferPrice
            )}
            {numInput(
              "assignmentFee",
              "Assignment Fee",
              assignmentFee,
              setAssignmentFee
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-2"
            >
              {saving ? "Saving..." : "Save Calculator Values"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sell-Side Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pctInput(
              "buyersAgentPct",
              "Buyer's Agent",
              buyersAgentPct,
              setBuyersAgentPct
            )}
            {pctInput(
              "sellingAgentPct",
              "Selling Agent",
              sellingAgentPct,
              setSellingAgentPct
            )}
            {pctInput(
              "closingTitlePct",
              "Closing / Title",
              closingTitlePct,
              setClosingTitlePct
            )}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Sell-Side</span>
                <span className="font-medium">
                  {fmt(sellSideCost)} ({fmtPct(sellSidePct * 100)})
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Proceeds</span>
                <span className="font-semibold text-foreground">
                  {fmt(netProceeds)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Hard Money Loan + Buyer/Flipper MAO Results (buyer view only) */}
      {activeView === "buyer" && (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hard Money Loan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pctInput("hmlRate", "Annual Rate", hmlRate, setHmlRate)}
            {pctInput("hmlPoints", "Points", hmlPoints, setHmlPoints)}
            {pctInput("hmlLtv", "LTV", hmlLtv, setHmlLtv)}
            <div>
              <Label htmlFor="holdMonths">Hold Time (months)</Label>
              <Input
                id="holdMonths"
                type="number"
                value={holdMonths || ""}
                onChange={(e) =>
                  setHoldMonths(parseInt(e.target.value, 10) || 0)
                }
                className="mt-1"
              />
            </div>
            {numInput(
              "monthlyCarry",
              "Monthly Carry (tax+ins+util)",
              monthlyCarry,
              setMonthlyCarry
            )}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Loan Amount</span>
                <span className="font-medium">{fmt(loanAmtBest)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HML + Carry</span>
                <span className="font-semibold text-foreground">
                  {fmt(hmlTotalBest)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buyer / Flipper View</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {numInput("minProfit", "Min Profit Target", minProfit, setMinProfit)}
            {numInput("maxProfit", "Max Profit Target", maxProfit, setMaxProfit)}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3 mt-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  MAO Range
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    At min profit
                  </span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {fmt(maoBest)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    At max profit
                  </span>
                  <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {fmt(maoWorst)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm text-muted-foreground">
                  MAO % of ARV
                </span>
                <Badge variant="outline" className="font-mono">
                  {maoPctOfArv}%
                </Badge>
              </div>
              {offerPrice > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Offer vs MAO
                  </span>
                  <span
                    className={
                      offerPrice <= maoBest
                        ? "text-sm font-medium text-green-600 dark:text-green-400"
                        : offerPrice <= maoBest * 1.05
                          ? "text-sm font-medium text-yellow-600 dark:text-yellow-400"
                          : "text-sm font-medium text-red-600 dark:text-red-400"
                    }
                  >
                    {offerPrice <= maoBest
                      ? "Under MAO"
                      : offerPrice <= maoBest * 1.05
                        ? "Tight"
                        : "Over MAO"}
                  </span>
                </div>
              )}
            </div>

            {/* Per-sqft metrics */}
            {(() => {
              const sqft =
                deal.sqft != null && deal.sqft > 0 ? deal.sqft : null;
              const priceSqft =
                sqft && offerPrice > 0 ? Math.round(offerPrice / sqft) : null;
              const rehabSqft =
                sqft && repairs > 0 ? Math.round(repairs / sqft) : null;
              const arvSqft =
                sqft && arv > 0 ? Math.round(arv / sqft) : null;
              if (!sqft || (!priceSqft && !rehabSqft && !arvSqft)) return null;
              return (
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Per Sq Ft ({sqft.toLocaleString()} sqft)
                  </p>
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    {priceSqft && (
                      <span className="text-muted-foreground">
                        Price:{" "}
                        <span className="font-medium text-foreground">
                          ${priceSqft}/sqft
                        </span>
                      </span>
                    )}
                    {rehabSqft && (
                      <span className="text-muted-foreground">
                        Rehab:{" "}
                        <span className="font-medium text-foreground">
                          ${rehabSqft}/sqft
                        </span>
                      </span>
                    )}
                    {arvSqft && (
                      <span className="text-muted-foreground">
                        ARV:{" "}
                        <span className="font-medium text-foreground">
                          ${arvSqft}/sqft
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Wholesaler panel (wholesaler view only) */}
      {activeView === "wholesaler" && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Left: Wholesaler Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Wholesaler Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {numInput("assignmentFee-ws", "Assignment Fee", assignmentFee, setAssignmentFee)}
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Closing Costs Note</p>
                <p>In a standard Utah assignment, the end buyer pays their own closing costs (~1–2%). Your assignment fee is your entire spread — no deduction needed.</p>
              </div>
              {numInput("minProfit-ws", "End Buyer Min Profit", minProfit, setMinProfit)}
              <p className="text-xs text-muted-foreground">Adjusting end buyer min profit recalculates max purchase price from seller.</p>
            </CardContent>
          </Card>

          {/* Right: Wholesaler Results */}
          <Card>
            <CardHeader>
              <CardTitle>Wholesaler Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">End Buyer MAO</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">End buyer can pay up to</span>
                    <span className="text-xl font-bold">{fmt(maoBest)}</span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Your Numbers</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max pay to seller</span>
                    <span className={`font-semibold ${maxPurchaseFromSeller >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {fmt(maxPurchaseFromSeller)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your spread (assignment fee)</span>
                    <span className="font-semibold">{fmt(wholesalerSpread)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Wholesaler ROI</span>
                    <span className={`font-medium ${wholesalerRoi >= 15 ? "text-green-600 dark:text-green-400" : wholesalerRoi >= 8 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                      {wholesalerRoi}%
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">End Buyer Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total out-of-pocket</span>
                    <span className="font-medium">{fmt(endBuyerOutOfPocket)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Includes buy-side closing costs of {fmt(buyClosingCosts)}</p>
                </div>
              </div>

              {offerPrice > 0 && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Your offer vs max purchase price</span>
                  <span className={`text-sm font-medium ${offerPrice <= maxPurchaseFromSeller ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {offerPrice <= maxPurchaseFromSeller ? "Under max" : "Over max"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
