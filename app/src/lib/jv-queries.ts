// app/src/lib/jv-queries.ts
// Plain server-side query helpers — NOT "use server".
// Callable from server components and server actions.

import { db } from "@/db/client";
import { jvLeads, properties, users } from "@/db/schema";
import { eq, asc, ne } from "drizzle-orm";
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
