// app/src/lib/jv-queries.ts
// Plain server-side query helpers — NOT "use server".
// Callable from server components and server actions.

import { db } from "@/db/client";
import { jvLeads, jvLeadMilestones, properties, users } from "@/db/schema";
import { eq, asc, ne, desc, inArray, sql, isNull, lte, and } from "drizzle-orm";
import { generateJvLeadSasUrl } from "@/lib/blob-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JvTriageRow {
  id: string;
  address: string;
  addressNormalized: string;
  conditionNotes: string | null;
  photoBlobName: string | null;
  photoSasUrl: string | null; // pre-generated server-side (1-hour SAS)
  submitterName: string;
  submitterEmail: string;
  createdAt: Date;
  dedupHint: {
    matchesProperty: boolean;     // true if any properties.address normalizes to same value
    matchesPriorJvLead: boolean;  // true if another (non-pending) jv_leads row has same address_normalized
    priorJvLeadIds: string[];     // IDs of prior accepted/rejected jv_leads for click-through
  };
}

// ---------------------------------------------------------------------------
// Inline address normalizer
// Same rules as normalizeAddress() in jv-actions.ts and normalizeForMatchInline() in jv-actions.ts.
// Duplicated here intentionally — project convention is per-file copies, not shared util.
// ---------------------------------------------------------------------------

function normalizeForMatch(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\bboulevard\b/g, "blvd");
}

// ---------------------------------------------------------------------------
// getJvLeadsForTriage
// Returns all pending jv_leads rows, oldest first, with:
//   - Photo SAS URLs generated server-side
//   - Dedup hints (3 total round-trips: jv_leads+users JOIN, all properties.address, non-pending jv dupes)
// ---------------------------------------------------------------------------

export async function getJvLeadsForTriage(): Promise<JvTriageRow[]> {
  // 1. Fetch all pending jv_leads + submitter join, oldest first
  const rows = await db
    .select({
      id: jvLeads.id,
      address: jvLeads.address,
      addressNormalized: jvLeads.addressNormalized,
      conditionNotes: jvLeads.conditionNotes,
      photoBlobName: jvLeads.photoBlobName,
      createdAt: jvLeads.createdAt,
      submitterName: users.name,
      submitterEmail: users.email,
    })
    .from(jvLeads)
    .innerJoin(users, eq(jvLeads.submitterUserId, users.id))
    .where(eq(jvLeads.status, "pending"))
    .orderBy(asc(jvLeads.createdAt));

  if (rows.length === 0) return [];

  const norms = new Set(rows.map((r) => r.addressNormalized));

  // 2. Load all properties.address and check JS-side for dedup
  // For 5-user internal tool with ~3,300 properties × ~50 chars = 165KB — trivial in RAM.
  const allProps = await db
    .select({ address: properties.address })
    .from(properties);

  const propNormSet = new Set(
    allProps
      .filter((p): p is { address: string } => p.address !== null)
      .map((p) => normalizeForMatch(p.address))
  );

  // 3. Self-match against other jv_leads (accepted/rejected only — exclude pending to avoid noise)
  const jvDupes = await db
    .select({ id: jvLeads.id, addressNormalized: jvLeads.addressNormalized })
    .from(jvLeads)
    .where(ne(jvLeads.status, "pending"));

  // Filter to only those matching any of the pending rows' normalized addresses
  const jvDupesFiltered = jvDupes.filter((d) => norms.has(d.addressNormalized));

  // 4. Compose return rows with photoSasUrl + dedupHint
  return rows.map((r) => ({
    ...r,
    photoSasUrl: r.photoBlobName ? generateJvLeadSasUrl(r.photoBlobName) : null,
    dedupHint: {
      matchesProperty: propNormSet.has(r.addressNormalized),
      matchesPriorJvLead: jvDupesFiltered.some(
        (d) => d.addressNormalized === r.addressNormalized
      ),
      priorJvLeadIds: jvDupesFiltered
        .filter((d) => d.addressNormalized === r.addressNormalized)
        .map((d) => d.id),
    },
  }));
}

// ---------------------------------------------------------------------------
// getJvLeadById
// Returns a single jv_leads row or null. Used by acceptJvLead/rejectJvLead
// for the "before" snapshot in audit log.
// ---------------------------------------------------------------------------

export async function getJvLeadById(id: string) {
  const [row] = await db
    .select()
    .from(jvLeads)
    .where(eq(jvLeads.id, id))
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// JvLedgerLead — shape returned by getJvLedgerForUser
// ---------------------------------------------------------------------------

export interface JvLedgerLead {
  jvLeadId: string;
  address: string;
  submittedAt: Date;
  status: "pending" | "accepted" | "rejected";
  rejectedReason: string | null;
  photoSasUrl: string | null;
  milestones: {
    id: string;
    type: "qualified" | "active_follow_up" | "deal_closed";
    amountCents: number;
    earnedAt: Date;
    paidAt: Date | null;
    paymentMethod: string | null;
  }[];
  earnedTotalCents: number;
  paidTotalCents: number;
  currentMonthOwedCents: number; // earned in current calendar month, not yet paid
}

// ---------------------------------------------------------------------------
// listJvPartners — Owner-only: list all jv_partner users for the partner picker.
// Includes deactivated users (Section 7: deactivated partners must still be auditable).
// ---------------------------------------------------------------------------

export async function listJvPartners(): Promise<
  { id: string; name: string; email: string; isActive: boolean }[]
> {
  return db
    .select({ id: users.id, name: users.name, email: users.email, isActive: users.isActive })
    .from(users)
    .where(sql`${users.roles} @> ARRAY['jv_partner']::text[]`)
    .orderBy(asc(users.name));
}

// ---------------------------------------------------------------------------
// getJvLedgerForUser — returns all jv_leads for a user with milestone details.
// Used by both jv_partner self-view and owner-as-overseer view.
// ---------------------------------------------------------------------------

export async function getJvLedgerForUser(userId: string): Promise<JvLedgerLead[]> {
  // 1. Fetch user's jv_leads, newest first
  const leadsRows = await db
    .select()
    .from(jvLeads)
    .where(eq(jvLeads.submitterUserId, userId))
    .orderBy(desc(jvLeads.createdAt));

  if (leadsRows.length === 0) return [];

  const leadIds = leadsRows.map((r) => r.id);

  // 2. Fetch all milestones for these leads in a single round-trip
  const milestonesRows = await db
    .select()
    .from(jvLeadMilestones)
    .where(inArray(jvLeadMilestones.jvLeadId, leadIds));

  // 3. Compute calendar-month bounds for "current month owed" calculation
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 4. Group milestones by lead and compute per-lead totals
  return leadsRows.map((lead) => {
    const ms = milestonesRows
      .filter((m) => m.jvLeadId === lead.id)
      .map((m) => ({
        id: m.id,
        type: m.milestoneType as "qualified" | "active_follow_up" | "deal_closed",
        amountCents: m.amountCents,
        earnedAt: m.earnedAt,
        paidAt: m.paidAt,
        paymentMethod: m.paymentMethod,
      }));

    const earnedTotalCents = ms.reduce((sum, m) => sum + m.amountCents, 0);
    const paidTotalCents = ms
      .filter((m) => m.paidAt !== null)
      .reduce((sum, m) => sum + m.amountCents, 0);
    const currentMonthOwedCents = ms
      .filter(
        (m) =>
          m.paidAt === null &&
          m.earnedAt >= monthStart &&
          m.earnedAt < monthEnd
      )
      .reduce((sum, m) => sum + m.amountCents, 0);

    return {
      jvLeadId: lead.id,
      address: lead.address,
      submittedAt: lead.createdAt,
      status: lead.status as "pending" | "accepted" | "rejected",
      rejectedReason: lead.rejectedReason,
      photoSasUrl: lead.photoBlobName ? generateJvLeadSasUrl(lead.photoBlobName) : null,
      milestones: ms,
      earnedTotalCents,
      paidTotalCents,
      currentMonthOwedCents,
    };
  });
}

// ---------------------------------------------------------------------------
// JvPaymentRunPartner — shape returned by getJvPaymentRun
// ---------------------------------------------------------------------------

export interface JvPaymentRunPartner {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  jvPaymentMethod: string | null; // pre-fills the payment method form field
  unpaidMilestones: {
    id: string;
    jvLeadId: string;
    address: string;
    milestoneType: "qualified" | "active_follow_up" | "deal_closed";
    amountCents: number;
    earnedAt: Date;
  }[];
  unpaidTotalCents: number;
}

// ---------------------------------------------------------------------------
// getJvPaymentRun — per-partner unpaid milestones earned ≤ end of given month.
// Defaults to current calendar month. Partners with no unpaid milestones are
// included (unpaidMilestones: [], unpaidTotalCents: 0) so Brian sees the full list.
// ---------------------------------------------------------------------------

export async function getJvPaymentRun(
  asOf: Date = new Date()
): Promise<JvPaymentRunPartner[]> {
  // 1. List all jv_partner users (active and inactive — termination clause)
  const partners = await listJvPartners();
  if (partners.length === 0) return [];

  // 2. Pull jv_payment_method for each partner
  const partnerSettings = await db
    .select({ id: users.id, jvPaymentMethod: users.jvPaymentMethod })
    .from(users)
    .where(inArray(users.id, partners.map((p) => p.id)));
  const methodById = new Map(partnerSettings.map((p) => [p.id, p.jvPaymentMethod ?? null]));

  // 3. Fetch all unpaid milestones earned ≤ asOf, joined with their leads
  const rows = await db
    .select({
      milestoneId: jvLeadMilestones.id,
      jvLeadId: jvLeadMilestones.jvLeadId,
      milestoneType: jvLeadMilestones.milestoneType,
      amountCents: jvLeadMilestones.amountCents,
      earnedAt: jvLeadMilestones.earnedAt,
      submitterUserId: jvLeads.submitterUserId,
      address: jvLeads.address,
    })
    .from(jvLeadMilestones)
    .innerJoin(jvLeads, eq(jvLeads.id, jvLeadMilestones.jvLeadId))
    .where(
      and(
        isNull(jvLeadMilestones.paidAt),
        lte(jvLeadMilestones.earnedAt, asOf)
      )
    )
    .orderBy(asc(jvLeadMilestones.earnedAt));

  // 4. Group milestones by partner
  return partners.map((p) => {
    const ms = rows
      .filter((r) => r.submitterUserId === p.id)
      .map((r) => ({
        id: r.milestoneId,
        jvLeadId: r.jvLeadId,
        address: r.address,
        milestoneType: r.milestoneType as JvPaymentRunPartner["unpaidMilestones"][number]["milestoneType"],
        amountCents: r.amountCents,
        earnedAt: r.earnedAt,
      }));
    return {
      userId: p.id,
      name: p.name,
      email: p.email,
      isActive: p.isActive,
      jvPaymentMethod: methodById.get(p.id) ?? null,
      unpaidMilestones: ms,
      unpaidTotalCents: ms.reduce((sum, m) => sum + m.amountCents, 0),
    };
  });
}
