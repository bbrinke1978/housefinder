import { db } from "@/db/client";
import { contactEvents, leadNotes, emailSendLog, emailSteps } from "@/db/schema";
import { eq, inArray, sql, desc } from "drizzle-orm";
import type { TimelineEntry } from "@/types";

/**
 * Returns a unified chronological timeline for a lead, combining:
 * - Contact events (called_client, left_voicemail, etc.)
 * - Lead notes (user notes + status changes)
 * - Email send log entries
 *
 * Sorted descending by occurredAt (newest first).
 */
export async function getLeadTimeline(
  leadId: string
): Promise<TimelineEntry[]> {
  // Fetch all three sources in parallel
  const [events, notes, emails] = await Promise.all([
    db
      .select({
        id: contactEvents.id,
        eventType: contactEvents.eventType,
        notes: contactEvents.notes,
        occurredAt: contactEvents.occurredAt,
      })
      .from(contactEvents)
      .where(eq(contactEvents.leadId, leadId))
      .orderBy(desc(contactEvents.occurredAt)),

    db
      .select({
        id: leadNotes.id,
        noteText: leadNotes.noteText,
        noteType: leadNotes.noteType,
        newStatus: leadNotes.newStatus,
        createdAt: leadNotes.createdAt,
      })
      .from(leadNotes)
      .where(eq(leadNotes.leadId, leadId))
      .orderBy(desc(leadNotes.createdAt)),

    db
      .select({
        id: emailSendLog.id,
        subject: emailSteps.subject,
        sentAt: emailSendLog.sentAt,
        status: emailSendLog.status,
      })
      .from(emailSendLog)
      .innerJoin(emailSteps, eq(emailSendLog.stepId, emailSteps.id))
      .where(eq(emailSendLog.leadId, leadId))
      .orderBy(desc(emailSendLog.sentAt)),
  ]);

  const CONTACT_EVENT_LABELS: Record<string, string> = {
    called_client: "Called client",
    left_voicemail: "Left voicemail",
    emailed_client: "Emailed client",
    sent_text: "Sent text",
    met_in_person: "Met in person",
    received_email: "Received email",
  };

  const entries: TimelineEntry[] = [];

  // Contact events
  for (const e of events) {
    entries.push({
      id: e.id,
      type: e.eventType as TimelineEntry["type"],
      label: CONTACT_EVENT_LABELS[e.eventType] ?? e.eventType,
      notes: e.notes,
      occurredAt: e.occurredAt,
    });
  }

  // Lead notes
  for (const n of notes) {
    const isStatusChange = n.noteType === "status_change";
    entries.push({
      id: n.id,
      type: isStatusChange ? "status_change" : "note",
      label: isStatusChange
        ? `Status changed to ${n.newStatus ?? "unknown"}`
        : "Note",
      notes: n.noteText,
      occurredAt: n.createdAt,
    });
  }

  // Email send log
  for (const e of emails) {
    entries.push({
      id: e.id,
      type: "email_sent",
      label: `Email: ${e.subject}`,
      notes: e.status !== "sent" ? `Status: ${e.status}` : null,
      occurredAt: e.sentAt,
    });
  }

  // Sort all entries descending by occurredAt
  entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return entries;
}

/**
 * Returns a Map of leadId → contact event count for efficient dashboard lookup.
 * Only counts contactEvents (not notes or emails).
 */
export async function getLeadTouchpointCounts(
  leadIds: string[]
): Promise<Map<string, number>> {
  if (leadIds.length === 0) return new Map();

  const rows = await db
    .select({
      leadId: contactEvents.leadId,
      count: sql<number>`count(*)::int`,
    })
    .from(contactEvents)
    .where(inArray(contactEvents.leadId, leadIds))
    .groupBy(contactEvents.leadId);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.leadId, row.count);
  }
  return map;
}
