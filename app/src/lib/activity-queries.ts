/**
 * activity-queries.ts — Phase 31 unified activity feed
 *
 * Exports:
 *   getActivityFeed(propertyId)  — all sources, sorted by occurredAt desc, max 100
 *   getLastActivity(propertyId) — most recent entry (for card indicator)
 *   getActivityCount(propertyId) — total count across all sources
 *
 * TODO: If a property accumulates 1000+ events, switch source queries to
 * source-specific aggregations rather than JS post-sort.
 */

import { db } from "@/db/client";
import {
  contactEvents,
  leadNotes,
  dealNotes,
  auditLog,
  propertyPhotos,
  contracts,
  ownerContacts,
  leads,
  deals,
  users,
} from "@/db/schema";
import { eq, and, inArray, sql, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// ActivityEntry shape — normalized across all sources
// ---------------------------------------------------------------------------

export type ActivitySource =
  | "contact_event"
  | "lead_note"
  | "deal_note"
  | "audit"
  | "photo_upload"
  | "contract_generated"
  | "skip_trace";

export interface ActivityEntry {
  id: string;
  source: ActivitySource;
  /** Human-readable type: 'call', 'email', 'note', 'status_changed', 'photo_added', etc. */
  type: string;
  occurredAt: Date;
  actorUserId: string | null;
  actorName: string | null;
  /** Pre-formatted one-line description */
  description: string;
  /** Long-form note text or diff JSON — collapsed by default in the UI */
  body: string | null;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal: map contact_event eventType → friendly type
// ---------------------------------------------------------------------------

const EVENT_TYPE_TO_TYPE: Record<string, string> = {
  called_client: "call",
  left_voicemail: "voicemail",
  emailed_client: "email",
  sent_text: "text",
  met_in_person: "meeting",
  received_email: "email_received",
};

const EVENT_TYPE_TO_VERB: Record<string, string> = {
  called_client: "Called owner",
  left_voicemail: "Left voicemail",
  emailed_client: "Emailed owner",
  sent_text: "Sent text",
  met_in_person: "Met in person",
  received_email: "Received email from owner",
};

// Material audit actions surfaced in the activity feed
const MATERIAL_AUDIT_ACTIONS = [
  "deal.terms_updated",
  "lead.status_changed",
  "deal.assignee_changed",
  "deal.status_changed",
  "property.address_edited",
  "lead.assignee_changed",
] as const;

// ---------------------------------------------------------------------------
// getActivityFeed — UNIONs all sources in JS, sorts, caps at 100
// ---------------------------------------------------------------------------

export async function getActivityFeed(propertyId: string): Promise<ActivityEntry[]> {
  // First resolve the lead for this property (needed for contact_events + lead_notes)
  const leadRow = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.propertyId, propertyId))
    .limit(1);

  const leadId = leadRow[0]?.id ?? null;

  // Resolve deal(s) for this property
  const dealRows = await db
    .select({ id: deals.id })
    .from(deals)
    .where(eq(deals.propertyId, propertyId));

  const dealIds = dealRows.map((d) => d.id);

  // Run all source queries in parallel
  const [
    contactEventRows,
    leadNoteRows,
    dealNoteRows,
    auditRows,
    photoRows,
    contractRows,
    skipTraceRows,
  ] = await Promise.all([
    // 1. contact_events
    leadId
      ? db
          .select({
            id: contactEvents.id,
            eventType: contactEvents.eventType,
            notes: contactEvents.notes,
            outcome: contactEvents.outcome,
            actorUserId: contactEvents.actorUserId,
            actorName: users.name,
            occurredAt: contactEvents.occurredAt,
          })
          .from(contactEvents)
          .leftJoin(users, eq(contactEvents.actorUserId, users.id))
          .where(eq(contactEvents.leadId, leadId))
      : Promise.resolve([]),

    // 2. lead_notes
    leadId
      ? db
          .select({
            id: leadNotes.id,
            noteText: leadNotes.noteText,
            noteType: leadNotes.noteType,
            newStatus: leadNotes.newStatus,
            createdAt: leadNotes.createdAt,
          })
          .from(leadNotes)
          .where(eq(leadNotes.leadId, leadId))
      : Promise.resolve([]),

    // 3. deal_notes (from all deals for this property)
    dealIds.length > 0
      ? db
          .select({
            id: dealNotes.id,
            dealId: dealNotes.dealId,
            noteText: dealNotes.noteText,
            noteType: dealNotes.noteType,
            newStatus: dealNotes.newStatus,
            createdAt: dealNotes.createdAt,
          })
          .from(dealNotes)
          .where(inArray(dealNotes.dealId, dealIds))
      : Promise.resolve([]),

    // 4. audit_log — material actions only, filtered to this property's lead/deal
    (async () => {
      if (!leadId && dealIds.length === 0) return [];

      const entityIds: string[] = [];
      if (leadId) entityIds.push(leadId);
      entityIds.push(...dealIds);
      if (entityIds.length === 0) return [];

      return db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          oldValue: auditLog.oldValue,
          newValue: auditLog.newValue,
          actorUserId: auditLog.actorUserId,
          actorName: users.name,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.actorUserId, users.id))
        .where(
          and(
            inArray(auditLog.action, [...MATERIAL_AUDIT_ACTIONS]),
            inArray(auditLog.entityId, entityIds as [string, ...string[]])
          )
        );
    })(),

    // 5. property_photos — group by actor+day to show "uploaded N photos" entries
    db
      .select({
        id: propertyPhotos.id,
        createdAt: propertyPhotos.createdAt,
      })
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, propertyId)),

    // 6. contracts — filter by deals for this property
    dealIds.length > 0
      ? db
          .select({
            id: contracts.id,
            contractType: contracts.contractType,
            dealId: contracts.dealId,
            createdAt: contracts.createdAt,
          })
          .from(contracts)
          .where(inArray(contracts.dealId, dealIds))
      : Promise.resolve([]),

    // 7. owner_contacts — skip-trace entries (tracerfy source)
    db
      .select({
        id: ownerContacts.id,
        source: ownerContacts.source,
        phone: ownerContacts.phone,
        email: ownerContacts.email,
        createdAt: ownerContacts.createdAt,
      })
      .from(ownerContacts)
      .where(
        and(
          eq(ownerContacts.propertyId, propertyId),
          like(ownerContacts.source, "tracerfy%")
        )
      ),
  ]);

  const entries: ActivityEntry[] = [];

  // -- 1. contact_events --
  for (const e of contactEventRows) {
    const type = EVENT_TYPE_TO_TYPE[e.eventType] ?? e.eventType;
    let description = EVENT_TYPE_TO_VERB[e.eventType] ?? e.eventType;
    if (e.actorName) description = `${e.actorName} — ${description.toLowerCase()}`;
    if (e.outcome) description += ` (${e.outcome.replace(/_/g, " ")})`;

    entries.push({
      id: e.id,
      source: "contact_event",
      type,
      occurredAt: e.occurredAt,
      actorUserId: e.actorUserId ?? null,
      actorName: e.actorName ?? null,
      description,
      body: e.notes ?? null,
      metadata: e.outcome ? { outcome: e.outcome } : undefined,
    });
  }

  // -- 2. lead_notes --
  for (const n of leadNoteRows) {
    const isStatus = n.noteType === "status_change";
    entries.push({
      id: n.id,
      source: "lead_note",
      type: isStatus ? "status_changed" : "note",
      occurredAt: n.createdAt,
      actorUserId: null,
      actorName: null,
      description: isStatus
        ? `Lead status changed to ${n.newStatus ?? "unknown"}`
        : "Note added",
      body: n.noteText,
    });
  }

  // -- 3. deal_notes --
  for (const n of dealNoteRows) {
    const isStatus = n.noteType === "status_change";
    entries.push({
      id: n.id,
      source: "deal_note",
      type: isStatus ? "status_changed" : "note",
      occurredAt: n.createdAt,
      actorUserId: null,
      actorName: null,
      description: isStatus
        ? `Deal status changed to ${n.newStatus ?? "unknown"}`
        : "Deal note added",
      body: n.noteText,
    });
  }

  // -- 4. audit_log --
  for (const a of auditRows) {
    const actionLabel = a.action.replace(/\./g, " ").replace(/_/g, " ");
    let description = a.actorName
      ? `${a.actorName} — ${actionLabel}`
      : actionLabel;

    // Build a diff body if old/new values present
    let body: string | null = null;
    if (a.oldValue || a.newValue) {
      const parts: string[] = [];
      if (a.oldValue) parts.push(`Before: ${JSON.stringify(a.oldValue)}`);
      if (a.newValue) parts.push(`After: ${JSON.stringify(a.newValue)}`);
      body = parts.join("\n");
    }

    entries.push({
      id: a.id,
      source: "audit",
      type: a.action,
      occurredAt: a.createdAt,
      actorUserId: a.actorUserId ?? null,
      actorName: a.actorName ?? null,
      description,
      body,
      metadata: {
        entityType: a.entityType,
        entityId: a.entityId,
      },
    });
  }

  // -- 5. photo_uploads — group by day (use first photo of the day as id) --
  if (photoRows.length > 0) {
    // Group by calendar day
    const byDay = new Map<string, typeof photoRows>();
    for (const p of photoRows) {
      const day = p.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(day) ?? [];
      existing.push(p);
      byDay.set(day, existing);
    }
    for (const [, group] of byDay) {
      const first = group[0];
      const n = group.length;
      entries.push({
        id: `photo-${first.id}`,
        source: "photo_upload",
        type: "photo_added",
        occurredAt: first.createdAt,
        actorUserId: null,
        actorName: null,
        description: `${n} photo${n !== 1 ? "s" : ""} uploaded`,
        body: null,
      });
    }
  }

  // -- 6. contracts --
  for (const c of contractRows) {
    const label =
      c.contractType === "purchase_agreement"
        ? "Purchase agreement generated"
        : "Assignment contract generated";
    entries.push({
      id: c.id,
      source: "contract_generated",
      type: "contract_generated",
      occurredAt: c.createdAt,
      actorUserId: null,
      actorName: null,
      description: label,
      body: null,
    });
  }

  // -- 7. skip-trace runs — group all tracerfy contacts added at the same time --
  if (skipTraceRows.length > 0) {
    // Group by day (a skip-trace run creates contacts all at once)
    const byDay = new Map<string, typeof skipTraceRows>();
    for (const r of skipTraceRows) {
      const day = r.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(day) ?? [];
      existing.push(r);
      byDay.set(day, existing);
    }
    for (const [, group] of byDay) {
      const first = group[0];
      const phoneCount = group.filter((r) => r.phone !== null).length;
      const emailCount = group.filter((r) => r.email !== null).length;
      const parts: string[] = [];
      if (phoneCount > 0) parts.push(`${phoneCount} phone${phoneCount !== 1 ? "s" : ""}`);
      if (emailCount > 0) parts.push(`${emailCount} email${emailCount !== 1 ? "s" : ""}`);
      const resultText = parts.length > 0 ? parts.join(", ") + " returned" : "no results";
      entries.push({
        id: `skip-${first.id}`,
        source: "skip_trace",
        type: "skip_trace",
        occurredAt: first.createdAt,
        actorUserId: null,
        actorName: null,
        description: `Skip-traced — ${resultText}`,
        body: null,
      });
    }
  }

  // Sort all entries descending by occurredAt, cap at 100
  entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return entries.slice(0, 100);
}

// ---------------------------------------------------------------------------
// getLastActivity — most recent entry (used by card indicator)
// ---------------------------------------------------------------------------

export async function getLastActivity(propertyId: string): Promise<ActivityEntry | null> {
  const feed = await getActivityFeed(propertyId);
  return feed[0] ?? null;
}

// ---------------------------------------------------------------------------
// getActivityCount — total event count (used by card indicator)
// ---------------------------------------------------------------------------

export async function getActivityCount(propertyId: string): Promise<number> {
  const feed = await getActivityFeed(propertyId);
  return feed.length;
}
