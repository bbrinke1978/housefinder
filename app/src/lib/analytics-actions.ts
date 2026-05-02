"use server";

import { db } from "@/db/client";
import { contactEvents } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { auth } from "@/auth";

const VALID_OUTCOMES = ["answered", "voicemail", "no_answer", "wrong_number"] as const;
type CallOutcome = (typeof VALID_OUTCOMES)[number];

const logCallSchema = z.object({
  leadId: z.uuid(),
  outcome: z.enum(VALID_OUTCOMES),
  notes: z.string().max(2000).optional(),
});

export type LogCallResult = { success: true } | { error: string };

/**
 * Log a call outcome as a contact_event (event_type='called_client').
 * Accepts FormData from call-log-form.tsx.
 */
export async function logCall(formData: FormData): Promise<LogCallResult> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };
  const actorUserId = (session.user as { id?: string } | undefined)?.id ?? null;

  const leadId = formData.get("leadId");
  const outcome = formData.get("outcome");
  const notes = formData.get("notes");

  const parsed = logCallSchema.safeParse({
    leadId: String(leadId ?? ""),
    outcome: String(outcome ?? "") as CallOutcome,
    notes: notes ? String(notes) : undefined,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid form data" };
  }

  try {
    await db.insert(contactEvents).values({
      leadId: parsed.data.leadId,
      eventType: "called_client",
      outcome: parsed.data.outcome,
      notes: parsed.data.notes ?? null,
      actorUserId: actorUserId ?? undefined,
    });

    revalidatePath("/analytics");
    return { success: true };
  } catch (err) {
    console.error("logCall error:", err);
    return { error: "Failed to save call log. Please try again." };
  }
}
