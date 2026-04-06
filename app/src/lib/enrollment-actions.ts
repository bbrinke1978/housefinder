"use server";

import { db } from "@/db/client";
import {
  leads,
  properties,
  ownerContacts,
  campaignEnrollments,
  emailSendLog,
} from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { getMailSettings } from "@/lib/mail-settings-actions";
import { getSequenceWithSteps } from "@/lib/campaign-queries";
import { logContactEvent } from "@/lib/contact-event-actions";
import { OutreachTemplate } from "@/components/email/outreach-template";

// ── Merge field resolution ──────────────────────────────────────────────────

function resolveFields(
  template: string,
  fields: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(fields)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

// ── enrollLeadInSequence ────────────────────────────────────────────────────

export async function enrollLeadInSequence(
  leadId: string,
  sequenceId: string
): Promise<{ success: true } | { error: string }> {
  // 1. Validate lead + fetch property details
  const leadRows = await db
    .select({
      leadId: leads.id,
      propertyId: leads.propertyId,
      address: properties.address,
      city: properties.city,
      ownerName: properties.ownerName,
    })
    .from(leads)
    .innerJoin(properties, eq(properties.id, leads.propertyId))
    .where(eq(leads.id, leadId))
    .limit(1);

  const lead = leadRows[0];
  if (!lead) return { error: "Lead not found" };

  // 2. Check for contact email
  const emailRows = await db
    .select({ email: ownerContacts.email })
    .from(ownerContacts)
    .where(
      and(
        lead.propertyId ? eq(ownerContacts.propertyId, lead.propertyId) : undefined,
        isNotNull(ownerContacts.email)
      )
    )
    .limit(1);

  // Filter out MAILING: prefixed entries (those are mailing addresses, not real emails)
  const ownerEmail = emailRows
    .map((r) => r.email)
    .find((e) => e && !e.startsWith("MAILING:"));

  if (!ownerEmail) {
    return { error: "Lead has no contact email" };
  }

  // 3. Load mail settings
  const mailSettings = await getMailSettings();
  const resendApiKey =
    mailSettings.resendApiKey || process.env.RESEND_API_KEY || "";

  if (!resendApiKey) {
    return { error: "Mail settings not configured" };
  }

  // 4. Load sequence + step 0
  const sequenceData = await getSequenceWithSteps(sequenceId);
  if (!sequenceData) return { error: "Sequence not found" };

  const { sequence, steps } = sequenceData;
  if (!sequence.isActive) return { error: "Sequence is not active" };

  // Steps are 1-indexed in the DB (stepNumber 1, 2, 3...) — step "0" in enrollment
  // context means the first step (stepNumber=1)
  const step0 = steps.find((s) => s.stepNumber === 1);
  if (!step0) return { error: "Sequence has no steps" };

  // Step 1 is the *second* step (stepNumber=2) — used for nextSendAt calculation
  const step1 = steps.find((s) => s.stepNumber === 2);

  // 5. Resolve merge fields
  const firstName =
    lead.ownerName
      ?.split(/[\s,]+/)
      .find((w) => w.length > 0) ?? "Homeowner";

  const mergeFields = {
    firstName,
    address: lead.address,
    city: lead.city,
    senderName: mailSettings.fromName || "an investor",
    phone: mailSettings.phone || "",
  };

  const resolvedSubject = resolveFields(step0.subject, mergeFields);
  const resolvedBody = resolveFields(step0.bodyHtml, mergeFields);

  // 6. Calculate nextSendAt
  const nextSendAt = step1
    ? new Date(Date.now() + step1.delayDays * 24 * 60 * 60 * 1000)
    : null;

  // 7. DB transaction: stop prior enrollment, insert new enrollment
  let enrollmentId: string;
  let stepId: string;

  try {
    const result = await db.transaction(async (tx) => {
      // Stop any active enrollment for this lead
      await tx
        .update(campaignEnrollments)
        .set({
          status: "stopped",
          stoppedAt: new Date(),
          stopReason: "re_enrolled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(campaignEnrollments.leadId, leadId),
            eq(campaignEnrollments.status, "active")
          )
        );

      // Insert new enrollment
      const [enrollment] = await tx
        .insert(campaignEnrollments)
        .values({
          leadId,
          sequenceId,
          currentStep: 0,
          status: "active",
          nextSendAt,
        })
        .returning({ id: campaignEnrollments.id });

      if (!enrollment) throw new Error("Failed to create enrollment");

      // Check for existing send log entry (idempotency)
      const existingLog = await tx
        .select({ id: emailSendLog.id })
        .from(emailSendLog)
        .where(
          and(
            eq(emailSendLog.enrollmentId, enrollment.id),
            eq(emailSendLog.stepId, step0.id)
          )
        )
        .limit(1);

      if (existingLog.length > 0) {
        // Already sent — return without resending
        return { enrollmentId: enrollment.id, stepId: step0.id, alreadySent: true };
      }

      // Insert send log entry (status=sent optimistically — update on failure)
      await tx.insert(emailSendLog).values({
        enrollmentId: enrollment.id,
        stepId: step0.id,
        leadId,
        toEmail: ownerEmail,
        status: "sent",
      });

      return { enrollmentId: enrollment.id, stepId: step0.id, alreadySent: false };
    });

    enrollmentId = result.enrollmentId;
    stepId = result.stepId;

    if (result.alreadySent) {
      revalidatePath(`/properties/${lead.propertyId}`);
      revalidatePath("/");
      return { success: true };
    }
  } catch (err) {
    console.error("enrollLeadInSequence transaction error:", err);
    return { error: "Failed to create enrollment" };
  }

  // 8. Send via Resend
  const resend = new Resend(resendApiKey);
  const fromAddress = mailSettings.fromEmail || "outreach@resend.dev";
  const fromLabel = mailSettings.fromName || "HouseFinder";
  const replyTo = mailSettings.replyTo || undefined;

  try {
    const sendResult = await resend.emails.send({
      from: `${fromLabel} <${fromAddress}>`,
      to: ownerEmail,
      ...(replyTo ? { replyTo } : {}),
      subject: resolvedSubject,
      react: OutreachTemplate({
        bodyHtml: resolvedBody,
        signature: mailSettings.signature || "",
      }),
      headers: {
        "X-Idempotency-Key": `${enrollmentId}-step-0`,
      },
    });

    // Update send log with Resend email ID
    if (sendResult.data?.id) {
      await db
        .update(emailSendLog)
        .set({ resendEmailId: sendResult.data.id })
        .where(
          and(
            eq(emailSendLog.enrollmentId, enrollmentId),
            eq(emailSendLog.stepId, stepId)
          )
        );
    }

    if (sendResult.error) {
      // Update status to failed
      await db
        .update(emailSendLog)
        .set({ status: "failed" })
        .where(
          and(
            eq(emailSendLog.enrollmentId, enrollmentId),
            eq(emailSendLog.stepId, stepId)
          )
        );
      return { error: `Email send failed: ${sendResult.error.message}` };
    }
  } catch (err) {
    console.error("Resend send error:", err);
    await db
      .update(emailSendLog)
      .set({ status: "failed" })
      .where(
        and(
          eq(emailSendLog.enrollmentId, enrollmentId),
          eq(emailSendLog.stepId, stepId)
        )
      );
    return { error: "Email send failed" };
  }

  // 9. Log contact event for timeline
  try {
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("eventType", "emailed_client");
    formData.set(
      "notes",
      `Enrolled in sequence "${sequence.name}" — Step 1: ${resolvedSubject}`
    );
    await logContactEvent(null, formData);
  } catch (err) {
    // Non-fatal — enrollment and email already succeeded
    console.warn("Failed to log contact event for enrollment:", err);
  }

  revalidatePath(`/properties/${lead.propertyId}`);
  revalidatePath("/");
  revalidatePath("/campaigns");

  return { success: true };
}

// ── unenrollLead ─────────────────────────────────────────────────────────────

export async function unenrollLead(
  enrollmentId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const result = await db
      .update(campaignEnrollments)
      .set({
        status: "stopped",
        stoppedAt: new Date(),
        stopReason: "unenrolled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(campaignEnrollments.id, enrollmentId),
          eq(campaignEnrollments.status, "active")
        )
      )
      .returning({ id: campaignEnrollments.id });

    if (result.length === 0) {
      return { error: "Enrollment not found or already stopped" };
    }

    revalidatePath("/");
    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error("unenrollLead error:", err);
    return { error: "Failed to unenroll" };
  }
}

// ── bulkEnrollLeads ──────────────────────────────────────────────────────────

/**
 * Enroll multiple leads in a sequence sequentially with 200ms delay between
 * sends to respect Resend rate limits (5 req/sec).
 */
export async function bulkEnrollLeads(
  leadIds: string[],
  sequenceId: string
): Promise<{ enrolled: number; skipped: number; errors: string[] }> {
  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const leadId of leadIds) {
    const result = await enrollLeadInSequence(leadId, sequenceId);

    if ("success" in result) {
      enrolled++;
    } else {
      if (result.error === "Lead has no contact email") {
        skipped++;
      } else {
        errors.push(`Lead ${leadId}: ${result.error}`);
      }
    }

    // 200ms delay between sends to stay under Resend rate limit (5 req/sec)
    if (leadIds.indexOf(leadId) < leadIds.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { enrolled, skipped, errors };
}
