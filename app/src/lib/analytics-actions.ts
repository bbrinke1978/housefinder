"use server";

import { db } from "@/db/client";
import { callLogs } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const VALID_OUTCOMES = ["answered", "voicemail", "no_answer", "wrong_number"] as const;
type CallOutcome = (typeof VALID_OUTCOMES)[number];

const logCallSchema = z.object({
  leadId: z.uuid(),
  outcome: z.enum(VALID_OUTCOMES),
  source: z.string().min(1).max(100).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

export type LogCallResult = { success: true } | { error: string };

/**
 * Log a call outcome for a lead.
 * Accepts FormData from call-log-form.tsx.
 */
export async function logCall(formData: FormData): Promise<LogCallResult> {
  const leadId = formData.get("leadId");
  const outcome = formData.get("outcome");
  const source = formData.get("source") || "manual";
  const durationMinutesRaw = formData.get("durationMinutes");
  const notes = formData.get("notes");

  // Convert duration from minutes to seconds
  let durationSeconds: number | undefined;
  if (durationMinutesRaw && String(durationMinutesRaw).trim() !== "") {
    const mins = parseFloat(String(durationMinutesRaw));
    if (!isNaN(mins) && mins >= 0) {
      durationSeconds = Math.round(mins * 60);
    }
  }

  const parsed = logCallSchema.safeParse({
    leadId: String(leadId ?? ""),
    outcome: String(outcome ?? "") as CallOutcome,
    source: source ? String(source) : undefined,
    durationSeconds,
    notes: notes ? String(notes) : undefined,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid form data" };
  }

  try {
    await db.insert(callLogs).values({
      leadId: parsed.data.leadId,
      outcome: parsed.data.outcome,
      source: parsed.data.source ?? "manual",
      durationSeconds: parsed.data.durationSeconds ?? null,
      notes: parsed.data.notes ?? null,
    });

    revalidatePath("/analytics");
    return { success: true };
  } catch (err) {
    console.error("logCall error:", err);
    return { error: "Failed to save call log. Please try again." };
  }
}
