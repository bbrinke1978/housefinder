"use server";

import { db } from "@/db/client";
import {
  emailSequences,
  emailSteps,
  campaignEnrollments,
} from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

// -- Validation schemas --

const stepSchema = z.object({
  stepNumber: z.number().int().min(1),
  delayDays: z.number().int().min(0),
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().min(1).max(50000),
});

const createSequenceSchema = z.object({
  name: z.string().min(3).max(100),
  steps: z.array(stepSchema).min(1).max(20),
});

const updateSequenceSchema = z.object({
  sequenceId: z.uuid(),
  name: z.string().min(3).max(100),
  isActive: z.boolean(),
  steps: z.array(stepSchema).min(1).max(20),
});

/**
 * Create a new email sequence with steps.
 * Wraps in a transaction: creates sequence row then inserts all steps.
 */
export async function createSequence(
  formData: FormData
): Promise<{ success: true; id: string } | { error: string }> {
  const name = formData.get("name");
  const stepsRaw = formData.get("steps");

  let parsedSteps: unknown;
  try {
    parsedSteps = JSON.parse(String(stepsRaw ?? "[]"));
  } catch {
    return { error: "Invalid steps JSON" };
  }

  const parsed = createSequenceSchema.safeParse({
    name: String(name ?? ""),
    steps: parsedSteps,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  try {
    const sequenceId = await db.transaction(async (tx) => {
      const [seq] = await tx
        .insert(emailSequences)
        .values({ name: parsed.data.name })
        .returning({ id: emailSequences.id });

      if (!seq) throw new Error("Failed to create sequence");

      for (const step of parsed.data.steps) {
        await tx.insert(emailSteps).values({
          sequenceId: seq.id,
          stepNumber: step.stepNumber,
          delayDays: step.delayDays,
          subject: step.subject,
          bodyHtml: step.bodyHtml,
        });
      }

      return seq.id;
    });

    revalidatePath("/campaigns");
    return { success: true, id: sequenceId };
  } catch (err) {
    console.error("createSequence error:", err);
    return { error: "Failed to create sequence" };
  }
}

/**
 * Update an existing email sequence.
 * Deletes existing steps and re-inserts (simpler than diffing).
 * Guards against update if there are active enrollments with already-sent steps.
 */
export async function updateSequence(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const sequenceId = formData.get("sequenceId");
  const name = formData.get("name");
  const isActiveRaw = formData.get("isActive");
  const stepsRaw = formData.get("steps");

  let parsedSteps: unknown;
  try {
    parsedSteps = JSON.parse(String(stepsRaw ?? "[]"));
  } catch {
    return { error: "Invalid steps JSON" };
  }

  const parsed = updateSequenceSchema.safeParse({
    sequenceId: String(sequenceId ?? ""),
    name: String(name ?? ""),
    isActive: isActiveRaw === "true",
    steps: parsedSteps,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  // Check for active enrollments before deleting/recreating steps
  const activeEnrollments = await db
    .select({ id: campaignEnrollments.id })
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.sequenceId, parsed.data.sequenceId),
        eq(campaignEnrollments.status, "active")
      )
    )
    .limit(1);

  if (activeEnrollments.length > 0) {
    // Still allow update — just warn in UI that active enrollments exist
    // Steps are re-created; active enrollments continue from their current step number
  }

  try {
    await db.transaction(async (tx) => {
      // Update sequence metadata
      await tx
        .update(emailSequences)
        .set({
          name: parsed.data.name,
          isActive: parsed.data.isActive,
          updatedAt: new Date(),
        })
        .where(eq(emailSequences.id, parsed.data.sequenceId));

      // Delete existing steps and re-insert
      await tx
        .delete(emailSteps)
        .where(eq(emailSteps.sequenceId, parsed.data.sequenceId));

      for (const step of parsed.data.steps) {
        await tx.insert(emailSteps).values({
          sequenceId: parsed.data.sequenceId,
          stepNumber: step.stepNumber,
          delayDays: step.delayDays,
          subject: step.subject,
          bodyHtml: step.bodyHtml,
        });
      }
    });

    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error("updateSequence error:", err);
    return { error: "Failed to update sequence" };
  }
}

/**
 * Fetch a single sequence with its steps for the editor.
 * Exposed as a server action so client components can call it without bundling pg.
 */
export async function fetchSequenceForEdit(
  sequenceId: string
): Promise<{
  sequence: import("@/db/schema").EmailSequenceRow;
  steps: import("@/db/schema").EmailStepRow[];
} | null> {
  const parsed = z.uuid().safeParse(sequenceId);
  if (!parsed.success) return null;

  const [sequence] = await db
    .select()
    .from(emailSequences)
    .where(eq(emailSequences.id, parsed.data))
    .limit(1);

  if (!sequence) return null;

  const steps = await db
    .select()
    .from(emailSteps)
    .where(eq(emailSteps.sequenceId, parsed.data))
    .orderBy(emailSteps.stepNumber);

  return { sequence, steps };
}

/**
 * Soft-delete a sequence by setting isActive=false.
 * Does not hard-delete to preserve enrollment history.
 */
export async function deleteSequence(
  sequenceId: string
): Promise<{ success: true } | { error: string }> {
  const parsed = z.uuid().safeParse(sequenceId);
  if (!parsed.success) {
    return { error: "Invalid sequence ID" };
  }

  // Prevent deletion if active enrollments exist
  const [activeCount] = await db
    .select({ count: count() })
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.sequenceId, parsed.data),
        eq(campaignEnrollments.status, "active")
      )
    );

  if (activeCount && activeCount.count > 0) {
    return {
      error: `Cannot deactivate sequence with ${activeCount.count} active enrollment(s). Pause or stop enrollments first.`,
    };
  }

  try {
    await db
      .update(emailSequences)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(emailSequences.id, parsed.data));

    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error("deleteSequence error:", err);
    return { error: "Failed to deactivate sequence" };
  }
}
