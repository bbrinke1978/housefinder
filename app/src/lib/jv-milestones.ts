// app/src/lib/jv-milestones.ts
// Plain DB helpers — NOT "use server". Callable from any server action or server component.
// Each function is idempotent via UNIQUE(jv_lead_id, milestone_type) + onConflictDoNothing().

import { db } from "@/db/client";
import { jvLeadMilestones } from "@/db/schema";
import { logAudit } from "@/lib/audit-log";

const QUALIFIED_CENTS = 1000;        // $10
const ACTIVE_FOLLOW_UP_CENTS = 1500; // $15
const DEAL_CLOSED_CENTS = 50000;     // $500

/**
 * createQualifiedMilestone — fires when Brian accepts a JV lead.
 * Idempotent via UNIQUE(jv_lead_id, milestone_type).
 * Returns { created: true } on first insert, { created: false } if already exists.
 * Callers should only send partner notification emails when created === true.
 */
export async function createQualifiedMilestone(
  jvLeadId: string,
  actorUserId: string | null
): Promise<{ created: boolean }> {
  const inserted = await db
    .insert(jvLeadMilestones)
    .values({
      jvLeadId,
      milestoneType: "qualified",
      amountCents: QUALIFIED_CENTS,
    })
    .onConflictDoNothing({ target: [jvLeadMilestones.jvLeadId, jvLeadMilestones.milestoneType] })
    .returning({ id: jvLeadMilestones.id });

  const created = inserted.length > 0;
  if (created) {
    await logAudit({
      actorUserId,
      action: "jv_lead.milestone_earned",
      entityType: "jv_lead",
      entityId: jvLeadId,
      newValue: { milestone: "qualified", amountCents: QUALIFIED_CENTS },
    });
  }
  return { created };
}

/**
 * createActiveFollowUpMilestone — fired by activity-actions.ts on first outbound contact_event.
 * Idempotent via UNIQUE(jv_lead_id, milestone_type).
 * Returns { created: true } on first insert, { created: false } if already exists.
 */
export async function createActiveFollowUpMilestone(
  jvLeadId: string,
  actorUserId: string | null
): Promise<{ created: boolean }> {
  const inserted = await db
    .insert(jvLeadMilestones)
    .values({
      jvLeadId,
      milestoneType: "active_follow_up",
      amountCents: ACTIVE_FOLLOW_UP_CENTS,
    })
    .onConflictDoNothing({ target: [jvLeadMilestones.jvLeadId, jvLeadMilestones.milestoneType] })
    .returning({ id: jvLeadMilestones.id });

  const created = inserted.length > 0;
  if (created) {
    await logAudit({
      actorUserId,
      action: "jv_lead.milestone_earned",
      entityType: "jv_lead",
      entityId: jvLeadId,
      newValue: { milestone: "active_follow_up", amountCents: ACTIVE_FOLLOW_UP_CENTS },
    });
  }
  return { created };
}

/**
 * createDealClosedMilestone — fired by deal-actions.ts on status transition to 'closed'.
 * Idempotent via UNIQUE(jv_lead_id, milestone_type).
 * Returns { created: true } on first insert, { created: false } if already exists.
 */
export async function createDealClosedMilestone(
  jvLeadId: string,
  actorUserId: string | null
): Promise<{ created: boolean }> {
  const inserted = await db
    .insert(jvLeadMilestones)
    .values({
      jvLeadId,
      milestoneType: "deal_closed",
      amountCents: DEAL_CLOSED_CENTS,
    })
    .onConflictDoNothing({ target: [jvLeadMilestones.jvLeadId, jvLeadMilestones.milestoneType] })
    .returning({ id: jvLeadMilestones.id });

  const created = inserted.length > 0;
  if (created) {
    await logAudit({
      actorUserId,
      action: "jv_lead.milestone_earned",
      entityType: "jv_lead",
      entityId: jvLeadId,
      newValue: { milestone: "deal_closed", amountCents: DEAL_CLOSED_CENTS },
    });
  }
  return { created };
}
