"use server";

import { db } from "@/db/client";
import {
  budgets,
  budgetCategories,
  expenses,
  deals,
} from "@/db/schema";
import { eq, sum } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { DEFAULT_BUDGET_CATEGORIES } from "@/types";

/**
 * createBudget — create a budget for a deal.
 * Auto-populates totalPlannedCents from deal.repairEstimate.
 * Computes contingencyCents as 10% of totalPlannedCents.
 * Seeds DEFAULT_BUDGET_CATEGORIES as budget_categories rows.
 */
export async function createBudget(
  dealId: string
): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // Fetch deal to auto-populate from repairEstimate
  const [deal] = await db
    .select({ repairEstimate: deals.repairEstimate })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!deal) {
    throw new Error("Deal not found");
  }

  // Deal stores whole dollars, budget stores cents — multiply by 100
  const totalPlannedCents = (deal.repairEstimate ?? 0) * 100;
  const contingencyCents = Math.round(totalPlannedCents * 0.1);

  const [inserted] = await db
    .insert(budgets)
    .values({
      dealId,
      totalPlannedCents,
      contingencyCents,
    })
    .returning({ id: budgets.id });

  // Seed default categories
  const categoryValues = DEFAULT_BUDGET_CATEGORIES.map((name, index) => ({
    budgetId: inserted.id,
    name,
    sortOrder: index,
    plannedCents: 0,
  }));

  await db.insert(budgetCategories).values(categoryValues);

  revalidatePath(`/deals/${dealId}`);

  return { id: inserted.id };
}

/**
 * updateCategoryPlanned — update plannedCents for a category.
 * Recalculates budget.totalPlannedCents as SUM of all categories.
 * Recalculates contingencyCents as 10% of new total.
 */
export async function updateCategoryPlanned(
  categoryId: string,
  plannedCents: number,
  dealId: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  // Update the category's planned amount
  await db
    .update(budgetCategories)
    .set({ plannedCents })
    .where(eq(budgetCategories.id, categoryId));

  // Get the budgetId for this category
  const [cat] = await db
    .select({ budgetId: budgetCategories.budgetId })
    .from(budgetCategories)
    .where(eq(budgetCategories.id, categoryId))
    .limit(1);

  if (!cat) return;

  // Recalculate totalPlannedCents as SUM of all categories
  const [totals] = await db
    .select({ total: sum(budgetCategories.plannedCents) })
    .from(budgetCategories)
    .where(eq(budgetCategories.budgetId, cat.budgetId));

  const totalPlannedCents = Number(totals?.total ?? 0);
  const contingencyCents = Math.round(totalPlannedCents * 0.1);

  await db
    .update(budgets)
    .set({ totalPlannedCents, contingencyCents, updatedAt: new Date() })
    .where(eq(budgets.id, cat.budgetId));

  revalidatePath(`/deals/${dealId}`);
}

/**
 * addExpense — insert an expense row.
 */
export async function addExpense(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Not authenticated" };
  }

  const budgetId = formData.get("budgetId") as string;
  const categoryId = formData.get("categoryId") as string;
  const vendor = (formData.get("vendor") as string | null) || null;
  const description = (formData.get("description") as string | null) || null;
  const amountCents = parseInt(formData.get("amountCents") as string, 10);
  const expenseDate = formData.get("expenseDate") as string;
  const notes = (formData.get("notes") as string | null) || null;
  const receiptId = (formData.get("receiptId") as string | null) || null;
  const dealId = formData.get("dealId") as string;

  if (!budgetId || !categoryId || isNaN(amountCents) || !expenseDate) {
    return { error: "Missing required expense fields" };
  }

  try {
    await db.insert(expenses).values({
      budgetId,
      categoryId,
      receiptId: receiptId || null,
      vendor: vendor || null,
      description: description || null,
      amountCents,
      expenseDate,
      notes: notes || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    return { error: `Failed to save expense: ${msg}` };
  }

  revalidatePath(`/deals/${dealId}`);
  return {};
}

/**
 * deleteExpense — delete an expense row by ID.
 */
export async function deleteExpense(
  expenseId: string,
  dealId: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await db.delete(expenses).where(eq(expenses.id, expenseId));

  revalidatePath(`/deals/${dealId}`);
}

/**
 * updateBudgetNotes — update the notes field on a budget.
 */
export async function updateBudgetNotes(
  budgetId: string,
  notes: string,
  dealId: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await db
    .update(budgets)
    .set({ notes, updatedAt: new Date() })
    .where(eq(budgets.id, budgetId));

  revalidatePath(`/deals/${dealId}`);
}
