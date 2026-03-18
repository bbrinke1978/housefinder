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
