import type { WholesaleScoreBreakdown } from "@/types";

/**
 * computeWholesaleScore — pure function, no DB, no side effects.
 *
 * Scoring formula (3 factors):
 *   Factor 1 (40%): MAO spread ratio — how much cushion exists above asking
 *   Factor 2 (30%): Equity % of ARV — spread as percent of after-repair value
 *   Factor 3 (30%): End-buyer ROI — all-in return for the eventual buyer/rehabber
 *
 * Verdict: >=7 green, >=4 yellow, <4 red
 */
export function computeWholesaleScore(
  arv: number,
  repairEstimate: number,
  askingPrice: number,
  wholesaleFee: number = 15000
): WholesaleScoreBreakdown {
  // MAO = ARV * 0.70 - repairs - wholesaleFee
  const mao = Math.round(arv * 0.7 - repairEstimate - wholesaleFee);
  const spreadDollars = mao - askingPrice;

  // Factor 1 (40%): MAO spread ratio
  const spreadRatio = mao > 0 ? spreadDollars / mao : -Infinity;
  let maoSpreadPts: number;
  if (spreadRatio >= 0.15) {
    maoSpreadPts = 10;
  } else if (spreadRatio >= 0.05) {
    maoSpreadPts = 7;
  } else if (spreadRatio >= 0) {
    maoSpreadPts = 5;
  } else if (spreadRatio >= -0.05) {
    maoSpreadPts = 2;
  } else {
    maoSpreadPts = 0;
  }

  // Factor 2 (30%): Equity % of ARV
  const spreadPct = arv > 0 ? spreadDollars / arv : -Infinity;
  let equityPctPts: number;
  if (spreadPct >= 0.15) {
    equityPctPts = 10;
  } else if (spreadPct >= 0.1) {
    equityPctPts = 7;
  } else if (spreadPct >= 0.05) {
    equityPctPts = 4;
  } else {
    equityPctPts = 0;
  }

  // Factor 3 (30%): End-buyer ROI
  const endBuyerAllIn = askingPrice + repairEstimate;
  const endBuyerProfit = arv - endBuyerAllIn;
  const endBuyerRoi =
    endBuyerAllIn > 0 ? (endBuyerProfit / endBuyerAllIn) * 100 : 0;
  let endBuyerRoiPts: number;
  if (endBuyerRoi >= 20) {
    endBuyerRoiPts = 10;
  } else if (endBuyerRoi >= 15) {
    endBuyerRoiPts = 7;
  } else if (endBuyerRoi >= 10) {
    endBuyerRoiPts = 4;
  } else {
    endBuyerRoiPts = 0;
  }

  // Weighted total, clamped 1-10
  const rawTotal = maoSpreadPts * 0.4 + equityPctPts * 0.3 + endBuyerRoiPts * 0.3;
  const total = Math.min(10, Math.max(1, Math.round(rawTotal)));

  // Verdict
  let verdict: "green" | "yellow" | "red";
  if (total >= 7) {
    verdict = "green";
  } else if (total >= 4) {
    verdict = "yellow";
  } else {
    verdict = "red";
  }

  return {
    maoSpreadPts,
    equityPctPts,
    endBuyerRoiPts,
    total,
    verdict,
    mao,
    spreadDollars,
    endBuyerProfit,
    endBuyerRoi,
  };
}
