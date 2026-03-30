import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getPropertiesForExport,
  getDealsForExport,
  getBuyersForExport,
} from "@/lib/analytics-queries";
import { getBudgetByDealId, getExpenses } from "@/lib/budget-queries";
import { getDeal } from "@/lib/deal-queries";

export const dynamic = "force-dynamic";

function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");

  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        return JSON.stringify(val == null ? "" : val);
      })
      .join(",")
  );

  return [headerLine, ...dataLines].join("\n");
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let rows: Record<string, unknown>[];
  let filename: string;

  switch (type) {
    case "leads": {
      const data = await getPropertiesForExport();
      rows = data as unknown as Record<string, unknown>[];
      filename = `leads-${today}.csv`;
      break;
    }
    case "deals": {
      const data = await getDealsForExport();
      rows = data as unknown as Record<string, unknown>[];
      filename = `deals-${today}.csv`;
      break;
    }
    case "buyers": {
      const data = await getBuyersForExport();
      rows = data as unknown as Record<string, unknown>[];
      filename = `buyers-${today}.csv`;
      break;
    }
    case "budget": {
      const dealId = searchParams.get("dealId");
      if (!dealId) {
        return new NextResponse("Missing dealId", { status: 400 });
      }
      const [deal, budgetSummary] = await Promise.all([
        getDeal(dealId),
        getBudgetByDealId(dealId),
      ]);
      if (!budgetSummary) {
        return new NextResponse("No budget found for this deal", { status: 404 });
      }
      const dealAddress = deal?.address ?? dealId;
      const safeAddress = dealAddress.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").toLowerCase();

      const totalActual = budgetSummary.categories.reduce((sum, c) => sum + c.actualCents, 0);
      const totalPlanned = budgetSummary.totalPlannedCents;
      const totalVariance = totalActual - totalPlanned;
      const totalVariancePct = totalPlanned > 0
        ? ((totalVariance / totalPlanned) * 100).toFixed(1) + "%"
        : "N/A";

      const categoryRows: Record<string, unknown>[] = budgetSummary.categories.map((c) => {
        const variance = c.actualCents - c.plannedCents;
        const variancePct = c.plannedCents > 0
          ? ((variance / c.plannedCents) * 100).toFixed(1) + "%"
          : "N/A";
        return {
          Category: c.name,
          Planned: (c.plannedCents / 100).toFixed(2),
          Actual: (c.actualCents / 100).toFixed(2),
          Variance: (variance / 100).toFixed(2),
          "Variance %": variancePct,
        };
      });

      // Contingency row
      categoryRows.push({
        Category: "Contingency (10%)",
        Planned: (budgetSummary.contingencyCents / 100).toFixed(2),
        Actual: "",
        Variance: "",
        "Variance %": "",
      });

      // Total row
      categoryRows.push({
        Category: "TOTAL",
        Planned: (totalPlanned / 100).toFixed(2),
        Actual: (totalActual / 100).toFixed(2),
        Variance: (totalVariance / 100).toFixed(2),
        "Variance %": totalVariancePct,
      });

      rows = categoryRows;
      filename = `budget-summary-${safeAddress}.csv`;
      break;
    }
    case "expenses": {
      const dealId = searchParams.get("dealId");
      if (!dealId) {
        return new NextResponse("Missing dealId", { status: 400 });
      }
      const [deal, budgetSummary] = await Promise.all([
        getDeal(dealId),
        getBudgetByDealId(dealId),
      ]);
      if (!budgetSummary) {
        return new NextResponse("No budget found for this deal", { status: 404 });
      }
      const dealAddress = deal?.address ?? dealId;
      const safeAddress = dealAddress.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").toLowerCase();

      const expenseList = await getExpenses(budgetSummary.id);
      rows = expenseList.map((e) => ({
        Date: e.expenseDate,
        Category: e.categoryName,
        Vendor: e.vendor ?? "",
        Description: e.description ?? "",
        Amount: (e.amountCents / 100).toFixed(2),
        Notes: e.notes ?? "",
      }));
      filename = `expenses-${safeAddress}.csv`;
      break;
    }
    default:
      return new NextResponse("Invalid export type", { status: 400 });
  }

  const csv = buildCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
