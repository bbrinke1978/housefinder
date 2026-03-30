"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BudgetCategoryEditor } from "@/components/budget-category-editor";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList } from "@/components/expense-list";
import { BudgetAlertBanner } from "@/components/budget-alerts";
import { BudgetCharts } from "@/components/budget-charts";
import { ReceiptUpload } from "@/components/receipt-upload";
import { createBudget } from "@/lib/budget-actions";
import type { DealWithBuyer } from "@/types";
import type { BudgetSummary, ExpenseLine } from "@/types";

interface BudgetTabProps {
  deal: DealWithBuyer;
  budget: BudgetSummary | null;
  expenses: ExpenseLine[];
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function BudgetTab({ deal, budget, expenses }: BudgetTabProps) {
  const [isPending, startTransition] = useTransition();
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  function handleCreateBudget() {
    startTransition(async () => {
      await createBudget(deal.id);
    });
  }

  // No budget yet — show create flow
  if (!budget) {
    const repairDisplay =
      deal.repairEstimate != null
        ? `$${deal.repairEstimate.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
        : "$0";

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="text-muted-foreground text-sm space-y-1">
          <p className="font-medium text-foreground">No budget yet</p>
          {deal.repairEstimate != null && deal.repairEstimate > 0 && (
            <p>
              Will auto-populate from repair estimate:{" "}
              <span className="font-medium">{repairDisplay}</span>
            </p>
          )}
          <p className="text-xs">Seeds 19 default rehab categories + 10% contingency reserve</p>
        </div>
        <Button onClick={handleCreateBudget} disabled={isPending}>
          {isPending ? "Creating..." : "Create Budget"}
        </Button>
      </div>
    );
  }

  // Budget exists — show full UI
  const totalWithContingency = budget.totalPlannedCents + budget.contingencyCents;

  // Percent used color
  let percentColor = "text-green-600 dark:text-green-400";
  if (budget.percentUsed >= 100) {
    percentColor = "text-red-600 dark:text-red-400";
  } else if (budget.percentUsed >= 80) {
    percentColor = "text-yellow-600 dark:text-yellow-400";
  }

  // Profit indicator
  let profitBadge: React.ReactNode = null;
  if (deal.repairEstimate != null && deal.repairEstimate > 0) {
    const profitGap = deal.repairEstimate - budget.totalSpentCents;
    if (budget.totalSpentCents < deal.repairEstimate) {
      profitBadge = (
        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
          Profitable — {formatDollars(profitGap)} under estimate
        </Badge>
      );
    } else if (budget.totalSpentCents === deal.repairEstimate) {
      profitBadge = (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
          Break Even
        </Badge>
      );
    } else {
      profitBadge = (
        <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30">
          Loss — {formatDollars(Math.abs(profitGap))} over estimate
        </Badge>
      );
    }
  }

  // Contingency warning: eating into contingency if spent > totalPlannedCents (excl contingency)
  const eatingContingency = budget.totalSpentCents > budget.totalPlannedCents;

  return (
    <div className="space-y-6">
      {/* Alert banner (shown above KPI header when approaching/over budget) */}
      <BudgetAlertBanner
        percentUsed={budget.percentUsed}
        remainingCents={budget.remainingCents}
        contingencyCents={budget.contingencyCents}
        totalPlannedCents={budget.totalPlannedCents}
        totalSpentCents={budget.totalSpentCents}
      />

      {/* KPI Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Total Budget</p>
          <p className="text-lg font-semibold">{formatDollars(totalWithContingency)}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-lg font-semibold">{formatDollars(budget.totalSpentCents)}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-lg font-semibold">{formatDollars(budget.remainingCents)}</p>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">% Used</p>
          <p className={`text-lg font-semibold ${percentColor}`}>{budget.percentUsed}%</p>
        </div>
      </div>

      {/* Profit indicator */}
      {profitBadge && <div>{profitBadge}</div>}

      {/* Contingency reserve */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">10% Contingency Reserve:</span>
        <span className="font-medium">{formatDollars(budget.contingencyCents)}</span>
        {eatingContingency && (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 text-xs">
            Eating into contingency
          </Badge>
        )}
      </div>

      {/* Category editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Budget Categories
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={`/api/export?type=budget&dealId=${deal.id}`}
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </a>
          </div>
        </div>
        <div className="rounded-lg border divide-y">
          {/* Header row */}
          <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span className="col-span-2">Category</span>
            <span className="text-right">Planned</span>
            <span className="text-right">Actual</span>
          </div>
          {budget.categories.map((category) => (
            <BudgetCategoryEditor
              key={category.id}
              category={category}
              dealId={deal.id}
            />
          ))}
        </div>
      </div>

      {/* Budget charts: progress bars + collapsible pie/bar charts */}
      <BudgetCharts categories={budget.categories} />

      {/* Expense section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Expenses
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={`/api/export?type=expenses&dealId=${deal.id}`}
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Download className="h-3 w-3" />
              Export
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExpenseForm((v) => !v)}
            >
              {showExpenseForm ? "Cancel" : "Add Expense"}
            </Button>
          </div>
        </div>

        {showExpenseForm && (
          <ExpenseForm
            budgetId={budget.id}
            categories={budget.categories}
            dealId={deal.id}
            onSuccess={() => setShowExpenseForm(false)}
          />
        )}

        {/* Receipt upload — scan receipt and auto-fill expense form */}
        <ReceiptUpload
          budgetId={budget.id}
          categories={budget.categories}
          dealId={deal.id}
        />

        <ExpenseList expenses={expenses} dealId={deal.id} />
      </div>
    </div>
  );
}
