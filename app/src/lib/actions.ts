"use server";

import { db } from "@/db/client";
import { leads, leadNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

/**
 * Mark a lead as viewed (updates lastViewedAt timestamp).
 * Clears the "new" badge on the dashboard.
 */
export async function markLeadViewed(propertyId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await db
    .update(leads)
    .set({
      lastViewedAt: new Date(),
      newLeadStatus: "unreviewed",
      updatedAt: new Date(),
    })
    .where(eq(leads.propertyId, propertyId));
}

const addNoteSchema = z.object({
  leadId: z.uuid(),
  noteText: z.string().min(1).max(2000),
});

/**
 * Add a user note to a lead.
 */
export async function addLeadNote(
  leadId: string,
  noteText: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const parsed = addNoteSchema.parse({ leadId, noteText });

  await db.insert(leadNotes).values({
    leadId: parsed.leadId,
    noteText: parsed.noteText,
    noteType: "user",
  });

  revalidatePath("/properties");
}

const VALID_STATUSES = ["new", "contacted", "follow_up", "closed", "dead"] as const;

const updateLeadStatusSchema = z.object({
  leadId: z.uuid(),
  status: z.enum(VALID_STATUSES),
  note: z.string().optional(),
});

/**
 * updateLeadStatus — server action to change a lead's status.
 * Auto-logs the status change as a note. Optionally adds a user note.
 */
export async function updateLeadStatus(
  leadId: string,
  status: string,
  note?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const parsed = updateLeadStatusSchema.parse({ leadId, status, note });

  // Fetch current lead to record previous status
  const [existing] = await db
    .select({ status: leads.status })
    .from(leads)
    .where(eq(leads.id, parsed.leadId))
    .limit(1);

  if (!existing) {
    throw new Error("Lead not found");
  }

  const previousStatus = existing.status;

  // Update lead status (and lastContactedAt if moving to "contacted")
  const updateData: Record<string, unknown> = {
    status: parsed.status,
    updatedAt: new Date(),
  };
  if (parsed.status === "contacted") {
    updateData.lastContactedAt = new Date();
  }

  await db.update(leads).set(updateData).where(eq(leads.id, parsed.leadId));

  // Auto-log the status change
  if (previousStatus !== parsed.status) {
    await db.insert(leadNotes).values({
      leadId: parsed.leadId,
      noteText: `Status changed from ${previousStatus} to ${parsed.status}`,
      noteType: "status_change",
      previousStatus,
      newStatus: parsed.status,
    });
  }

  // If a user note was provided, add it separately
  if (parsed.note && parsed.note.trim().length > 0) {
    await db.insert(leadNotes).values({
      leadId: parsed.leadId,
      noteText: parsed.note.trim(),
      noteType: "user",
    });
  }

  revalidatePath("/pipeline");
}
