"use server";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { jvLeads } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { userCan, type Role } from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";

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

  // TODO(34-05): notifyNewJvLeadSubmission(row.id)

  revalidatePath("/jv-leads");
  revalidatePath("/jv-ledger");
  return { id: row.id };
}
