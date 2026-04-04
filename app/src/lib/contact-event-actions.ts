"use server";

import { db } from "@/db/client";
import { contactEvents, leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const VALID_EVENT_TYPES = [
  "called_client",
  "left_voicemail",
  "emailed_client",
  "sent_text",
  "met_in_person",
  "received_email",
] as const;

type ContactEventType = (typeof VALID_EVENT_TYPES)[number];

const logContactEventSchema = z.object({
  leadId: z.uuid(),
  eventType: z.enum(VALID_EVENT_TYPES),
  notes: z.string().max(2000).optional(),
});

export type LogContactEventResult = { success: true } | { error: string };

/**
 * Log a contact event for a lead.
 * Accepts previous state + FormData from contact-event-form.tsx via useActionState.
 * Returns union type — never throws — for graceful client-side feedback.
 * (Consistent with Phase 06 logCall pattern.)
 */
export async function logContactEvent(
  _prevState: LogContactEventResult | null,
  formData: FormData
): Promise<LogContactEventResult> {
  const leadId = formData.get("leadId");
  const eventType = formData.get("eventType");
  const notes = formData.get("notes");

  const parsed = logContactEventSchema.safeParse({
    leadId: String(leadId ?? ""),
    eventType: String(eventType ?? "") as ContactEventType,
    notes: notes ? String(notes) : undefined,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  // Verify lead exists
  const leadRows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.id, parsed.data.leadId))
    .limit(1);

  if (leadRows.length === 0) {
    return { error: "Lead not found" };
  }

  await db.insert(contactEvents).values({
    leadId: parsed.data.leadId,
    eventType: parsed.data.eventType,
    notes: parsed.data.notes ?? null,
  });

  // Update lastContactedAt on lead
  await db
    .update(leads)
    .set({ lastContactedAt: new Date(), updatedAt: new Date() })
    .where(eq(leads.id, parsed.data.leadId));

  revalidatePath(`/properties`);

  return { success: true };
}
