import { db } from "@/db/client";
import {
  emailSequences,
  emailSteps,
  campaignEnrollments,
  emailSendLog,
  leads,
  properties,
} from "@/db/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import type {
  EmailSequenceSummary,
  EnrollmentWithDetails,
  CampaignStatus,
} from "@/types/index";
import type { EmailSequenceRow, EmailStepRow } from "@/db/schema";

/**
 * Returns all sequences with computed stats:
 * stepCount, activeEnrollments, totalSent.
 */
export async function getSequences(): Promise<EmailSequenceSummary[]> {
  // Get all sequences
  const sequences = await db
    .select({
      id: emailSequences.id,
      name: emailSequences.name,
      isActive: emailSequences.isActive,
    })
    .from(emailSequences)
    .orderBy(emailSequences.createdAt);

  if (sequences.length === 0) return [];

  const sequenceIds = sequences.map((s) => s.id);

  // Count steps per sequence
  const stepCounts = await db
    .select({
      sequenceId: emailSteps.sequenceId,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(emailSteps)
    .where(inArray(emailSteps.sequenceId, sequenceIds))
    .groupBy(emailSteps.sequenceId);

  // Count active enrollments per sequence
  const activeCounts = await db
    .select({
      sequenceId: campaignEnrollments.sequenceId,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(campaignEnrollments)
    .where(
      // SECURITY: sql.raw() wraps server-fetched UUIDs from DB, not user input.
      // sequenceIds are read from emailSequences table in the query above, never from request params.
      sql`${campaignEnrollments.sequenceId} = ANY(${sql.raw(`'{${sequenceIds.join(",")}}'::uuid[]`)}) AND ${campaignEnrollments.status} = 'active'`
    )
    .groupBy(campaignEnrollments.sequenceId);

  // Count total emails sent per sequence (via enrollment join)
  const sentCounts = await db
    .select({
      sequenceId: campaignEnrollments.sequenceId,
      count: sql<number>`cast(count(${emailSendLog.id}) as integer)`,
    })
    .from(campaignEnrollments)
    .leftJoin(
      emailSendLog,
      eq(emailSendLog.enrollmentId, campaignEnrollments.id)
    )
    .where(
      inArray(campaignEnrollments.sequenceId, sequenceIds)
    )
    .groupBy(campaignEnrollments.sequenceId);

  // Build lookup maps
  const stepCountMap = new Map(stepCounts.map((r) => [r.sequenceId, r.count]));
  const activeCountMap = new Map(
    activeCounts.map((r) => [r.sequenceId, r.count])
  );
  const sentCountMap = new Map(sentCounts.map((r) => [r.sequenceId, r.count]));

  return sequences.map((seq) => ({
    id: seq.id,
    name: seq.name,
    isActive: seq.isActive,
    stepCount: stepCountMap.get(seq.id) ?? 0,
    activeEnrollments: activeCountMap.get(seq.id) ?? 0,
    totalSent: sentCountMap.get(seq.id) ?? 0,
  }));
}

/**
 * Returns a single sequence with its ordered steps.
 * Used by the sequence editor for pre-filling edit form.
 */
export async function getSequenceWithSteps(sequenceId: string): Promise<{
  sequence: EmailSequenceRow;
  steps: EmailStepRow[];
} | null> {
  const [sequence] = await db
    .select()
    .from(emailSequences)
    .where(eq(emailSequences.id, sequenceId))
    .limit(1);

  if (!sequence) return null;

  const steps = await db
    .select()
    .from(emailSteps)
    .where(eq(emailSteps.sequenceId, sequenceId))
    .orderBy(emailSteps.stepNumber);

  return { sequence, steps };
}

/**
 * Returns the active enrollment for a specific lead, if any.
 * Used by the property detail page to show enrollment state in EnrollButton.
 */
export async function getLeadActiveEnrollment(
  leadId: string
): Promise<EnrollmentWithDetails | null> {
  const rows = await db
    .select({
      id: campaignEnrollments.id,
      leadId: campaignEnrollments.leadId,
      sequenceId: campaignEnrollments.sequenceId,
      currentStep: campaignEnrollments.currentStep,
      status: campaignEnrollments.status,
      nextSendAt: campaignEnrollments.nextSendAt,
      enrolledAt: campaignEnrollments.enrolledAt,
      ownerName: properties.ownerName,
      address: properties.address,
      city: properties.city,
    })
    .from(campaignEnrollments)
    .innerJoin(leads, eq(leads.id, campaignEnrollments.leadId))
    .innerJoin(properties, eq(properties.id, leads.propertyId))
    .where(
      and(
        eq(campaignEnrollments.leadId, leadId),
        eq(campaignEnrollments.status, "active")
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [stepCount] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(emailSteps)
    .where(eq(emailSteps.sequenceId, row.sequenceId));

  return {
    id: row.id,
    leadId: row.leadId,
    ownerName: row.ownerName,
    address: row.address,
    city: row.city,
    currentStep: row.currentStep,
    totalSteps: stepCount?.count ?? 0,
    status: row.status as CampaignStatus,
    nextSendAt: row.nextSendAt,
    enrolledAt: row.enrolledAt,
  };
}

/**
 * Returns active enrollments with lead and property details.
 * Optional sequenceId filter.
 */
export async function getActiveEnrollments(
  sequenceId?: string
): Promise<EnrollmentWithDetails[]> {
  // Get enrollments joined with leads and properties
  const baseQuery = db
    .select({
      id: campaignEnrollments.id,
      leadId: campaignEnrollments.leadId,
      sequenceId: campaignEnrollments.sequenceId,
      currentStep: campaignEnrollments.currentStep,
      status: campaignEnrollments.status,
      nextSendAt: campaignEnrollments.nextSendAt,
      enrolledAt: campaignEnrollments.enrolledAt,
      ownerName: properties.ownerName,
      address: properties.address,
      city: properties.city,
    })
    .from(campaignEnrollments)
    .innerJoin(leads, eq(leads.id, campaignEnrollments.leadId))
    .innerJoin(properties, eq(properties.id, leads.propertyId))
    .orderBy(campaignEnrollments.enrolledAt);

  const rows = sequenceId
    ? await baseQuery.where(
        sql`${campaignEnrollments.sequenceId} = ${sequenceId} AND ${campaignEnrollments.status} = 'active'`
      )
    : await baseQuery.where(eq(campaignEnrollments.status, "active"));

  if (rows.length === 0) return [];

  // Get step counts per sequence
  const sequenceIds = [...new Set(rows.map((r) => r.sequenceId))];
  const stepCounts = await db
    .select({
      sequenceId: emailSteps.sequenceId,
      count: sql<number>`cast(count(*) as integer)`,
    })
    .from(emailSteps)
    .where(inArray(emailSteps.sequenceId, sequenceIds))
    .groupBy(emailSteps.sequenceId);

  const stepCountMap = new Map(
    stepCounts.map((r) => [r.sequenceId, r.count])
  );

  return rows.map((row) => ({
    id: row.id,
    leadId: row.leadId,
    ownerName: row.ownerName,
    address: row.address,
    city: row.city,
    currentStep: row.currentStep,
    totalSteps: stepCountMap.get(row.sequenceId) ?? 0,
    status: row.status as CampaignStatus,
    nextSendAt: row.nextSendAt,
    enrolledAt: row.enrolledAt,
  }));
}
