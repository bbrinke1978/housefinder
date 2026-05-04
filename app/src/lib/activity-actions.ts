"use server";

/**
 * activity-actions.ts — Phase 31 unified activity logging server action
 *
 * logActivity(input) — routes by type:
 *   - 'note' → lead_notes (noteType='user')
 *   - all others → contact_events with appropriate eventType
 *
 * Auth gate: userCan(roles, 'lead.edit_status') — same as addLeadNote.
 * All current 4 users have owner or lead_manager roles, so everyone passes.
 *
 * Always writes an audit_log entry via logAudit().
 * Revalidates /, /properties, /leads, /deals.
 */

import { db } from "@/db/client";
import { contactEvents, leadNotes, jvLeads, leads as leadsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createActiveFollowUpMilestone } from "@/lib/jv-milestones";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { userCan } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const logActivitySchema = z.object({
  leadId: z.uuid(),
  type: z.enum(["call", "email", "text", "meeting", "voicemail", "note"]),
  notes: z.string().max(5000).optional(),
  // call only
  outcome: z
    .enum(["answered", "voicemail", "no_answer", "wrong_number", "disconnected"])
    .optional(),
  // email only
  emailSubject: z.string().max(500).optional(),
});

export type LogActivityInput = z.infer<typeof logActivitySchema>;

// ---------------------------------------------------------------------------
// Type → contact_event eventType mapping
// ---------------------------------------------------------------------------

const TYPE_TO_EVENT_TYPE: Record<string, string> = {
  call: "called_client",
  email: "emailed_client",
  text: "sent_text",
  meeting: "met_in_person",
  voicemail: "left_voicemail",
};

// Outbound contact_event types — these trigger the JV active_follow_up milestone.
// 'received_email' is INBOUND (owner → us) and per Section 4 of the JV agreement
// does not count as "Brian makes contact with the property owner".
const OUTBOUND_CONTACT_EVENT_TYPES = new Set([
  "called_client",
  "left_voicemail",
  "emailed_client",
  "sent_text",
  "met_in_person",
]);

// ---------------------------------------------------------------------------
// logActivity
// ---------------------------------------------------------------------------

export async function logActivity(
  input: LogActivityInput
): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "lead.edit_status")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = logActivitySchema.parse(input);
  const actorUserId = (session.user as { id?: string }).id ?? null;

  let newId: string;

  if (parsed.type === "note") {
    // Validate note has content
    if (!parsed.notes || parsed.notes.trim().length === 0) {
      throw new Error("Note text is required");
    }

    const [row] = await db
      .insert(leadNotes)
      .values({
        leadId: parsed.leadId,
        noteText: parsed.notes.trim(),
        noteType: "user",
      })
      .returning({ id: leadNotes.id });

    newId = row.id;

    await logAudit({
      actorUserId,
      action: "activity.logged",
      entityType: "lead",
      entityId: parsed.leadId,
      newValue: { type: "note", noteId: newId },
    });
  } else {
    // contact_events path
    const eventType = TYPE_TO_EVENT_TYPE[parsed.type] as
      | "called_client"
      | "emailed_client"
      | "sent_text"
      | "met_in_person"
      | "left_voicemail";

    // Combine emailSubject into notes if present
    let notesText = parsed.notes ?? null;
    if (parsed.type === "email" && parsed.emailSubject) {
      notesText = `Subject: ${parsed.emailSubject}${notesText ? `\n\n${notesText}` : ""}`;
    }

    const [row] = await db
      .insert(contactEvents)
      .values({
        leadId: parsed.leadId,
        eventType,
        notes: notesText,
        actorUserId,
        outcome: parsed.outcome ?? null,
      })
      .returning({ id: contactEvents.id });

    newId = row.id;

    await logAudit({
      actorUserId,
      action: "activity.logged",
      entityType: "lead",
      entityId: parsed.leadId,
      newValue: {
        type: parsed.type,
        eventType,
        outcome: parsed.outcome ?? null,
        contactEventId: newId,
      },
    });

    // ── JV milestone hook: $15 active_follow_up on first outbound contact for a JV-linked property ──
    // Section 4 of the JV agreement: paid when Brian "makes contact with the property owner and opens
    // a negotiation file". Idempotent via UNIQUE(jv_lead_id, milestone_type) — re-logging contact events
    // for the same lead does NOT double-pay.
    if (OUTBOUND_CONTACT_EVENT_TYPES.has(eventType)) {
      try {
        // Find an accepted jv_lead linked to the same property as this lead
        const linkedJvLead = await db
          .select({ id: jvLeads.id })
          .from(jvLeads)
          .innerJoin(leadsTable, eq(leadsTable.propertyId, jvLeads.propertyId))
          .where(and(
            eq(leadsTable.id, parsed.leadId),
            eq(jvLeads.status, "accepted"),
          ))
          .limit(1);
        if (linkedJvLead[0]) {
          await createActiveFollowUpMilestone(linkedJvLead[0].id, actorUserId);
          // Note: createActiveFollowUpMilestone is itself idempotent and fire-and-forget audit-logged.
          // We do NOT branch on result.created here — Plan 05's notification logic owns the email side.
        }
      } catch (err) {
        // Milestone hook failures must NOT block the contact event from being logged
        console.error("[logActivity] JV milestone hook failed:", err);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath("/leads");
  revalidatePath("/deals");

  return { id: newId };
}
