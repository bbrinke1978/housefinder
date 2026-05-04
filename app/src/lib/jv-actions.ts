"use server";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { jvLeads, jvLeadMilestones, properties, leads, users } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { userCan, type Role } from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";
import { createQualifiedMilestone } from "@/lib/jv-milestones";
import { eq, and, inArray, isNull } from "drizzle-orm";
import {
  notifyJvLeadSubmitted,
  notifyJvLeadAccepted,
  notifyJvLeadRejected,
  notifyJvPaymentIssued,
} from "@/lib/email-actions";

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bboulevard\b/g, 'blvd');
}

const submitJvLeadSchema = z.object({
  address: z.string().trim().min(5).max(500),
  conditionNotes: z.string().trim().max(2000).optional(),
});

export async function submitJvLead(
  input: z.infer<typeof submitJvLeadSchema>
): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "jv.submit_lead")) throw new Error("Forbidden");

  const parsed = submitJvLeadSchema.parse(input);
  const submitterUserId = session.user.id as string;

  const [row] = await db.insert(jvLeads).values({
    submitterUserId,
    address: parsed.address,
    addressNormalized: normalizeAddress(parsed.address),
    conditionNotes: parsed.conditionNotes ?? null,
    status: "pending",
  }).returning({ id: jvLeads.id });

  await logAudit({
    actorUserId: submitterUserId,
    action: "jv_lead.submitted",
    entityType: "jv_lead",
    entityId: row.id,
    newValue: { address: parsed.address },
  });

  revalidatePath("/jv-leads");
  revalidatePath("/jv-ledger");

  await notifyJvLeadSubmitted({
    submitterName: session.user.name ?? "?",
    submitterEmail: session.user.email ?? "",
    address: parsed.address,
    conditionNotes: parsed.conditionNotes ?? null,
  });

  return { id: row.id };
}

// ---------------------------------------------------------------------------
// acceptJvLead
// ---------------------------------------------------------------------------

const acceptJvLeadSchema = z.object({
  jvLeadId: z.string().uuid(),
});

export async function acceptJvLead(
  input: z.infer<typeof acceptJvLeadSchema>
): Promise<{
  jvLeadId: string;
  propertyId: string;
  leadId: string;
  milestoneCreated: boolean;
  alreadyAccepted: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "jv.triage")) throw new Error("Forbidden");
  const actorUserId = session.user.id as string;
  const { jvLeadId } = acceptJvLeadSchema.parse(input);

  const [lead] = await db
    .select()
    .from(jvLeads)
    .where(eq(jvLeads.id, jvLeadId))
    .limit(1);
  if (!lead) throw new Error("JV lead not found");

  // Idempotency: already accepted → no-op, return existing linkage
  if (lead.status === "accepted" && lead.propertyId) {
    const [existingLead] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.propertyId, lead.propertyId))
      .limit(1);
    return {
      jvLeadId,
      propertyId: lead.propertyId,
      leadId: existingLead?.id ?? "",
      milestoneCreated: false,
      alreadyAccepted: true,
    };
  }
  if (lead.status === "rejected") throw new Error("Cannot accept a rejected lead");
  if (!lead.photoBlobName)
    throw new Error(
      "Cannot accept — no photo on file (Section 3 disqualifies photoless submissions)"
    );

  // 1. Find or create property (JS-side fuzzy match against all properties.address)
  const norm = lead.addressNormalized;
  const allProps = await db
    .select({ id: properties.id, address: properties.address })
    .from(properties);
  const matched = allProps.find(
    (p) => p.address !== null && normalizeForMatchInline(p.address) === norm
  );

  let propertyId: string;
  if (matched) {
    propertyId = matched.id;
  } else {
    // Synthetic parcel_id pattern: 'jv-{jv_lead_id}' — clearly distinguishable from real parcels
    const [created] = await db
      .insert(properties)
      .values({
        parcelId: `jv-${jvLeadId}`,
        address: lead.address,
        county: "Unknown", // Brian can edit later in property detail; NOT NULL column
        state: "UT",
      })
      .returning({ id: properties.id });
    propertyId = created.id;
  }

  // 2. Find or create lead row
  const [existingLeadByProp] = await db
    .select({ id: leads.id, leadSource: leads.leadSource })
    .from(leads)
    .where(eq(leads.propertyId, propertyId))
    .limit(1);

  let leadId: string;
  if (existingLeadByProp) {
    leadId = existingLeadByProp.id;
    // Update lead_source to 'jv_partner' only if currently 'scraping' (don't clobber other sources)
    await db
      .update(leads)
      .set({ leadSource: "jv_partner", updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.leadSource, "scraping")));
  } else {
    const [createdLead] = await db
      .insert(leads)
      .values({
        propertyId,
        leadSource: "jv_partner",
        status: "new",
        newLeadStatus: "new",
        createdByUserId: actorUserId,
      })
      .returning({ id: leads.id });
    leadId = createdLead.id;
  }

  // 3. Update jv_leads row
  await db
    .update(jvLeads)
    .set({
      status: "accepted",
      propertyId,
      acceptedAt: new Date(),
      acceptedByUserId: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(jvLeads.id, jvLeadId));

  // 4. Create $10 qualified milestone (idempotent — returns { created: boolean })
  const { created: milestoneCreated } = await createQualifiedMilestone(
    jvLeadId,
    actorUserId
  );

  // 5. Audit
  await logAudit({
    actorUserId,
    action: "jv_lead.accepted",
    entityType: "jv_lead",
    entityId: jvLeadId,
    oldValue: { status: lead.status },
    newValue: { status: "accepted", propertyId, leadId, milestoneCreated },
  });

  // 6. Revalidate
  revalidatePath("/jv-leads");
  revalidatePath("/jv-ledger");
  revalidatePath(`/properties/${propertyId}`);

  // 7. Notify partner (fire-and-forget)
  try {
    const [partnerUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, lead.submitterUserId))
      .limit(1);
    if (partnerUser) {
      await notifyJvLeadAccepted({
        partnerEmail: partnerUser.email,
        address: lead.address,
        conditionNotes: lead.conditionNotes,
      });
    }
  } catch (emailErr) {
    console.error("[acceptJvLead] email notify failed:", emailErr);
  }

  return { jvLeadId, propertyId, leadId, milestoneCreated, alreadyAccepted: false };
}

// ---------------------------------------------------------------------------
// rejectJvLead
// ---------------------------------------------------------------------------

const rejectJvLeadSchema = z.object({
  jvLeadId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

export async function rejectJvLead(
  input: z.infer<typeof rejectJvLeadSchema>
): Promise<{
  jvLeadId: string;
  alreadyRejected: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "jv.triage")) throw new Error("Forbidden");
  const actorUserId = session.user.id as string;
  const { jvLeadId, reason } = rejectJvLeadSchema.parse(input);

  const [lead] = await db
    .select()
    .from(jvLeads)
    .where(eq(jvLeads.id, jvLeadId))
    .limit(1);
  if (!lead) throw new Error("JV lead not found");

  if (lead.status === "rejected") {
    return { jvLeadId, alreadyRejected: true };
  }
  if (lead.status === "accepted") throw new Error("Cannot reject an accepted lead");

  await db
    .update(jvLeads)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      rejectedByUserId: actorUserId,
      rejectedReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(jvLeads.id, jvLeadId));

  await logAudit({
    actorUserId,
    action: "jv_lead.rejected",
    entityType: "jv_lead",
    entityId: jvLeadId,
    oldValue: { status: lead.status },
    newValue: { status: "rejected", reason },
  });

  revalidatePath("/jv-leads");
  revalidatePath("/jv-ledger");

  // Notify partner (fire-and-forget)
  try {
    const [partnerUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, lead.submitterUserId))
      .limit(1);
    if (partnerUser) {
      await notifyJvLeadRejected({
        partnerEmail: partnerUser.email,
        address: lead.address,
        reason,
      });
    }
  } catch (emailErr) {
    console.error("[rejectJvLead] email notify failed:", emailErr);
  }

  return { jvLeadId, alreadyRejected: false };
}

// ---------------------------------------------------------------------------
// Inline address normalizer — same rules as in jv-queries.ts and normalizeAddress() above.
// Duplicated per project anti-shared-util convention.
// ---------------------------------------------------------------------------

function normalizeForMatchInline(address: string): string {
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
// markMilestonesPaid
// ---------------------------------------------------------------------------

const markMilestonesPaidSchema = z.object({
  milestoneIds: z.array(z.uuid()).min(1).max(500),
  paymentMethod: z.string().trim().min(1).max(200),
  paidAt: z.iso.datetime().optional(), // defaults to now()
});

export async function markMilestonesPaid(
  input: z.infer<typeof markMilestonesPaidSchema>
): Promise<{ updatedCount: number; totalCents: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "user.manage")) throw new Error("Forbidden"); // owner-only
  const actorUserId = session.user.id as string;
  const { milestoneIds, paymentMethod, paidAt } = markMilestonesPaidSchema.parse(input);
  const paidAtDate = paidAt ? new Date(paidAt) : new Date();

  // Race-safe: WHERE paid_at IS NULL — concurrent calls can only win once per row
  const updated = await db
    .update(jvLeadMilestones)
    .set({ paidAt: paidAtDate, paidByUserId: actorUserId, paymentMethod })
    .where(and(inArray(jvLeadMilestones.id, milestoneIds), isNull(jvLeadMilestones.paidAt)))
    .returning({
      id: jvLeadMilestones.id,
      jvLeadId: jvLeadMilestones.jvLeadId,
      amountCents: jvLeadMilestones.amountCents,
      milestoneType: jvLeadMilestones.milestoneType,
    });

  const totalCents = updated.reduce((sum, m) => sum + m.amountCents, 0);

  // Audit once for the whole batch
  await logAudit({
    actorUserId,
    action: "jv_lead.payment_marked_paid",
    entityType: "jv_lead_milestone",
    entityId: null,
    newValue: {
      milestoneIds: updated.map((m) => m.id),
      totalCents,
      paymentMethod,
      paidAt: paidAtDate.toISOString(),
    },
  });

  // Group by partner for payment-issued emails
  const jvLeadIds = [...new Set(updated.map((m) => m.jvLeadId))];
  if (jvLeadIds.length > 0) {
    const partnersForBatch = await db
      .select({
        submitterUserId: jvLeads.submitterUserId,
        email: users.email,
        jvLeadId: jvLeads.id,
        address: jvLeads.address,
      })
      .from(jvLeads)
      .innerJoin(users, eq(users.id, jvLeads.submitterUserId))
      .where(inArray(jvLeads.id, jvLeadIds));

    // Group line items per partner
    const byPartner = new Map<
      string,
      {
        email: string;
        lineItems: { milestoneType: string; address: string; amountCents: number }[];
        totalCents: number;
      }
    >();
    for (const m of updated) {
      const pj = partnersForBatch.find((p) => p.jvLeadId === m.jvLeadId);
      if (!pj) continue;
      const entry = byPartner.get(pj.submitterUserId) ?? {
        email: pj.email,
        lineItems: [],
        totalCents: 0,
      };
      entry.lineItems.push({
        milestoneType: m.milestoneType,
        address: pj.address,
        amountCents: m.amountCents,
      });
      entry.totalCents += m.amountCents;
      byPartner.set(pj.submitterUserId, entry);
    }
    for (const partner of byPartner.values()) {
      await notifyJvPaymentIssued({
        partnerEmail: partner.email,
        totalCents: partner.totalCents,
        paymentMethod,
        lineItems: partner.lineItems,
      });
    }
  }

  revalidatePath("/admin/jv-payments");
  revalidatePath("/jv-ledger");
  return { updatedCount: updated.length, totalCents };
}
