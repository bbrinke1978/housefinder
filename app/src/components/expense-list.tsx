"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteExpense } from "@/lib/budget-actions";
import type { ExpenseLine } from "@/types";

interface ExpenseListProps {
  expenses: ExpenseLine[];
  dealId: string;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD — parse without timezone conversion
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ExpenseRowProps {
  expense: ExpenseLine;
  dealId: string;
}

function ExpenseRow({ expense, dealId }: ExpenseRowProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete expense of ${formatDollars(expense.amountCents)}? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      await deleteExpense(expense.id, dealId);
    });
  }

  return (
    <>
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_auto_auto] gap-3 items-center px-4 py-3 text-sm">
        <span className="text-muted-foreground">{formatDate(expense.expenseDate)}</span>
        <span className="truncate" title={expense.categoryName}>
          {expense.categoryName}
        </span>
        <span className="truncate text-muted-foreground" title={expense.vendor ?? undefined}>
          {expense.vendor ?? "—"}
        </span>
        <span className="font-medium text-right">{formatDollars(expense.amountCents)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Delete expense"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile card */}
      <div className="md:hidden px-4 py-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs text-muted-foreground">
              {formatDate(expense.expenseDate)}
              {expense.vendor ? ` · ${expense.vendor}` : ""}
            </p>
            <p className="text-sm font-medium truncate">{expense.categoryName}</p>
            {expense.description && (
              <p className="text-xs text-muted-foreground truncate">{expense.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm font-semibold">{formatDollars(expense.amountCents)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
              onClick={handleDelete}
              disabled={isPending}
              aria-label="Delete expense"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function ExpenseList({ expenses, dealId }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-muted-foreground">No expenses yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border divide-y">
      {/* Desktop header */}
      <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_auto_auto] gap-3 items-center px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Date</span>
        <span>Category</span>
        <span>Vendor</span>
        <span className="text-right">Amount</span>
        <span className="w-8" />
      </div>

      {expenses.map((expense) => (
        <ExpenseRow key={expense.id} expense={expense} dealId={dealId} />
      ))}
    </div>
  );
}
