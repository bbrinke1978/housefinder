import { db } from "@/db/client";
import { budgets, budgetCategories, expenses, receipts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { BudgetSummary, BudgetCategory, ExpenseLine } from "@/types";

/**
 * getBudgetByDealId — fetch a budget with categories and computed actuals.
 * Uses LEFT JOIN on expenses to compute actualCents per category via SUM.
 * Returns null if no budget exists for this deal.
 */
export async function getBudgetByDealId(
  dealId: string
): Promise<BudgetSummary | null> {
  // Fetch the budget row
  const budgetRows = await db
    .select()
    .from(budgets)
    .where(eq(budgets.dealId, dealId))
    .limit(1);

  if (budgetRows.length === 0) return null;
  const budget = budgetRows[0];

  // Fetch categories with actual spending via LEFT JOIN on expenses
  const categoryRows = await db
    .select({
      id: budgetCategories.id,
      name: budgetCategories.name,
      sortOrder: budgetCategories.sortOrder,
      plannedCents: budgetCategories.plannedCents,
      actualCents: sql<number>`COALESCE(SUM(${expenses.amountCents}), 0)`.as(
        "actual_cents"
      ),
    })
    .from(budgetCategories)
    .leftJoin(expenses, eq(expenses.categoryId, budgetCategories.id))
    .where(eq(budgetCategories.budgetId, budget.id))
    .groupBy(
      budgetCategories.id,
      budgetCategories.name,
      budgetCategories.sortOrder,
      budgetCategories.plannedCents
    )
    .orderBy(budgetCategories.sortOrder);

  const categories: BudgetCategory[] = categoryRows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sortOrder,
    plannedCents: r.plannedCents,
    actualCents: Number(r.actualCents),
  }));

  const totalSpentCents = categories.reduce(
    (sum, c) => sum + c.actualCents,
    0
  );
  const totalWithContingency =
    budget.totalPlannedCents + budget.contingencyCents;
  const remainingCents = totalWithContingency - totalSpentCents;
  const percentUsed =
    totalWithContingency > 0
      ? Math.round((totalSpentCents / totalWithContingency) * 100)
      : 0;

  return {
    id: budget.id,
    dealId: budget.dealId,
    totalPlannedCents: budget.totalPlannedCents,
    contingencyCents: budget.contingencyCents,
    totalSpentCents,
    remainingCents,
    percentUsed,
    categories,
    notes: budget.notes,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

/**
 * getExpenses — fetch all expenses for a budget with category name from JOIN.
 * Ordered by expenseDate DESC.
 */
export async function getExpenses(budgetId: string): Promise<ExpenseLine[]> {
  const rows = await db
    .select({
      id: expenses.id,
      budgetId: expenses.budgetId,
      categoryId: expenses.categoryId,
      categoryName: budgetCategories.name,
      receiptId: expenses.receiptId,
      vendor: expenses.vendor,
      description: expenses.description,
      amountCents: expenses.amountCents,
      expenseDate: expenses.expenseDate,
      notes: expenses.notes,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .innerJoin(budgetCategories, eq(expenses.categoryId, budgetCategories.id))
    .where(eq(expenses.budgetId, budgetId))
    .orderBy(sql`${expenses.expenseDate} DESC`);

  return rows.map((r) => ({
    id: r.id,
    budgetId: r.budgetId,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    receiptId: r.receiptId,
    vendor: r.vendor,
    description: r.description,
    amountCents: r.amountCents,
    expenseDate: r.expenseDate,
    notes: r.notes,
    createdAt: r.createdAt,
  }));
}

/**
 * getReceipts — fetch non-deleted receipts for a budget.
 * Ordered by createdAt DESC.
 */
export async function getReceipts(budgetId: string) {
  return db
    .select()
    .from(receipts)
    .where(eq(receipts.budgetId, budgetId))
    .orderBy(sql`${receipts.createdAt} DESC`);
}
