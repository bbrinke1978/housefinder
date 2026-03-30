"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { updateCategoryPlanned } from "@/lib/budget-actions";
import type { BudgetCategory } from "@/types";

interface BudgetCategoryEditorProps {
  category: BudgetCategory;
  dealId: string;
}

function centsToDisplay(cents: number): string {
  if (cents === 0) return "";
  return (cents / 100).toFixed(0);
}

function displayToCents(value: string): number {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

function formatDollars(cents: number): string {
  if (cents === 0) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

export function BudgetCategoryEditor({
  category,
  dealId,
}: BudgetCategoryEditorProps) {
  const [inputValue, setInputValue] = useState(
    centsToDisplay(category.plannedCents)
  );
  const [isPending, startTransition] = useTransition();

  const variance = category.plannedCents - category.actualCents;
  const hasVariance = category.actualCents > 0 || category.plannedCents > 0;

  function handleBlur() {
    const newCents = displayToCents(inputValue);
    if (newCents === category.plannedCents) return;

    startTransition(async () => {
      await updateCategoryPlanned(category.id, newCents, dealId);
    });
  }

  return (
    <div className="grid grid-cols-4 gap-2 items-center px-3 py-2">
      {/* Category name */}
      <span className="col-span-2 text-sm truncate" title={category.name}>
        {category.name}
      </span>

      {/* Planned (editable) */}
      <div className="flex items-center">
        <span className="text-sm text-muted-foreground mr-1">$</span>
        <Input
          type="number"
          min="0"
          step="1"
          className="h-8 text-sm text-right px-1 w-full"
          placeholder="0"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          disabled={isPending}
          aria-label={`Planned amount for ${category.name}`}
        />
      </div>

      {/* Actual + variance */}
      <div className="text-right">
        <span className="text-sm">{formatDollars(category.actualCents)}</span>
        {hasVariance && category.actualCents > 0 && (
          <div
            className={`text-xs ${
              variance >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {variance >= 0 ? "+" : ""}
            {formatDollars(variance)}
          </div>
        )}
      </div>
    </div>
  );
}
