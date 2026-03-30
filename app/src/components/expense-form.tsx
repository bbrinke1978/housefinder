"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addExpense } from "@/lib/budget-actions";
import type { BudgetCategory } from "@/types";

interface ExpenseFormProps {
  budgetId: string;
  categories: BudgetCategory[];
  dealId: string;
  onSuccess?: () => void;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function ExpenseForm({
  budgetId,
  categories,
  dealId,
  onSuccess,
}: ExpenseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [amountDisplay, setAmountDisplay] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Convert dollar amount to cents
    const amountStr = amountDisplay.replace(/[^0-9.]/g, "");
    const amountFloat = parseFloat(amountStr);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    const amountCents = Math.round(amountFloat * 100);

    formData.set("amountCents", String(amountCents));
    formData.set("budgetId", budgetId);
    formData.set("dealId", dealId);
    // Remove the display amount field
    formData.delete("amountDisplay");

    startTransition(async () => {
      try {
        await addExpense(formData);
        form.reset();
        setAmountDisplay("");
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add expense.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border p-4 space-y-4 bg-card"
    >
      <h4 className="text-sm font-semibold">Add Expense</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-1">
          <Label htmlFor="expense-category" className="text-sm">
            Category <span className="text-red-500">*</span>
          </Label>
          <select
            id="expense-category"
            name="categoryId"
            required
            className="w-full min-h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select category…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <Label htmlFor="expense-amount" className="text-sm">
            Amount <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="expense-amount"
              name="amountDisplay"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
              className="min-h-12 pl-7 text-sm"
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.target.value)}
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <Label htmlFor="expense-date" className="text-sm">
            Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="expense-date"
            name="expenseDate"
            type="date"
            required
            defaultValue={todayString()}
            className="min-h-12 text-sm"
          />
        </div>

        {/* Vendor */}
        <div className="space-y-1">
          <Label htmlFor="expense-vendor" className="text-sm">
            Vendor
          </Label>
          <Input
            id="expense-vendor"
            name="vendor"
            type="text"
            placeholder="Home Depot, contractor, etc."
            className="min-h-12 text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="expense-description" className="text-sm">
            Description
          </Label>
          <Input
            id="expense-description"
            name="description"
            type="text"
            placeholder="What was purchased or done"
            className="min-h-12 text-sm"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="expense-notes" className="text-sm">
            Notes
          </Label>
          <Textarea
            id="expense-notes"
            name="notes"
            placeholder="Any additional notes"
            rows={2}
            className="resize-none text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="min-h-12">
          {isPending ? "Adding..." : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
