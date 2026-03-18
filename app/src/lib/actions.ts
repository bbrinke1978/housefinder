"use server";

import { db } from "@/db/client";
import { leads, leadNotes, scraperConfig } from "@/db/schema";
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

// -- Target Cities --

const DEFAULT_TARGET_CITIES = ["Price"];

/**
 * Read target cities from scraperConfig.
 * Returns parsed JSON array or default ["Price"] if not set.
 */
export async function getTargetCities(): Promise<string[]> {
  const rows = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, "target_cities"))
    .limit(1);

  if (rows.length === 0) {
    return DEFAULT_TARGET_CITIES;
  }

  try {
    const parsed = JSON.parse(rows[0].value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_TARGET_CITIES;
  } catch {
    return DEFAULT_TARGET_CITIES;
  }
}

const updateTargetCitiesSchema = z.object({
  cities: z.array(z.string().min(1).max(100)).min(1).max(50),
});

/**
 * Upsert target cities in scraperConfig.
 */
export async function updateTargetCities(cities: string[]): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const parsed = updateTargetCitiesSchema.parse({ cities });

  const value = JSON.stringify(parsed.cities);

  // Check if the key already exists
  const existing = await db
    .select({ id: scraperConfig.id })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, "target_cities"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(scraperConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(scraperConfig.key, "target_cities"));
  } else {
    await db.insert(scraperConfig).values({
      key: "target_cities",
      value,
      description: "JSON array of target city names for scraping",
    });
  }

  revalidatePath("/settings");
}
