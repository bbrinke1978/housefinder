import { Resend } from "resend";
import { db } from "../db/client.js";
import {
  campaignEnrollments,
  emailSteps,
  emailSendLog,
  contactEvents,
  leads,
  properties,
  ownerContacts,
  scraperConfig,
  deals,
} from "../db/schema.js";
import { eq, and, lte, isNotNull, inArray, sql } from "drizzle-orm";

// ── Merge field resolution ─────────────────────────────────────────────────

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

// ── Mail settings ──────────────────────────────────────────────────────────

interface MailSettings {
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  resendApiKey: string;
  phone: string;
  signature: string;
}

async function loadMailSettings(): Promise<MailSettings> {
  const rows = await db
    .select({ key: scraperConfig.key, value: scraperConfig.value })
    .from(scraperConfig)
    .where(sql`${scraperConfig.key} LIKE 'mail.%'`);

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    fromName: map.get("mail.fromName") ?? "",
    fromEmail: map.get("mail.fromEmail") ?? "",
    replyTo: map.get("mail.replyTo") ?? null,
    resendApiKey:
      map.get("mail.resendApiKey") ?? process.env.RESEND_API_KEY ?? "",
    phone: map.get("mail.phone") ?? "",
    signature: map.get("mail.signature") ?? "",
  };
}

// ── dispatchCampaignEmails ─────────────────────────────────────────────────

export interface DispatchResult {
  sent: number;
  stopped: number;
  errors: number;
}

/**
 * Daily campaign email dispatch.
 *
 * 1. Auto-stop enrollments where the linked deal is closed/dead.
 * 2. Query due enrollments (nextSendAt <= NOW(), status=active).
 * 3. For each: idempotency check → send via Resend → advance step or complete.
 *
 * Called by the campaignDispatch Azure Functions timer trigger at 5:15 AM MT.
 */
export async function dispatchCampaignEmails(): Promise<DispatchResult> {
  let sent = 0;
  let stopped = 0;
  let errors = 0;

  // ── Step 1: Auto-stop enrollments where deal is closed/dead ──────────────

  // Find active enrollments whose lead's property has an active deal that is closed/dead
  const closedDealLeadIds = await db
    .select({ leadId: campaignEnrollments.leadId })
    .from(campaignEnrollments)
    .innerJoin(leads, eq(leads.id, campaignEnrollments.leadId))
    .innerJoin(
      deals,
      and(
        eq(deals.propertyId, leads.propertyId),
        inArray(deals.status, ["closed", "dead"])
      )
    )
    .where(eq(campaignEnrollments.status, "active"));

  if (closedDealLeadIds.length > 0) {
    const leadIds = closedDealLeadIds.map((r) => r.leadId);

    const stopResult = await db
      .update(campaignEnrollments)
      .set({
        status: "stopped",
        stoppedAt: new Date(),
        stopReason: "deal_closed",
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(campaignEnrollments.leadId, leadIds),
          eq(campaignEnrollments.status, "active")
        )
      )
      .returning({ id: campaignEnrollments.id });

    stopped = stopResult.length;
    console.log(`[campaign-dispatch] Auto-stopped ${stopped} enrollments (deal closed/dead)`);
  }

  // ── Step 2: Query due enrollments ─────────────────────────────────────────

  const now = new Date();

  const dueEnrollments = await db
    .select({
      enrollmentId: campaignEnrollments.id,
      leadId: campaignEnrollments.leadId,
      sequenceId: campaignEnrollments.sequenceId,
      currentStep: campaignEnrollments.currentStep,
      nextSendAt: campaignEnrollments.nextSendAt,
      // Property details
      address: properties.address,
      city: properties.city,
      ownerName: properties.ownerName,
      propertyId: properties.id,
    })
    .from(campaignEnrollments)
    .innerJoin(leads, eq(leads.id, campaignEnrollments.leadId))
    .innerJoin(properties, eq(properties.id, leads.propertyId))
    .where(
      and(
        eq(campaignEnrollments.status, "active"),
        isNotNull(campaignEnrollments.nextSendAt),
        lte(campaignEnrollments.nextSendAt, now)
      )
    );

  if (dueEnrollments.length === 0) {
    console.log("[campaign-dispatch] No due enrollments");
    return { sent, stopped, errors };
  }

  console.log(`[campaign-dispatch] Processing ${dueEnrollments.length} due enrollments`);

  // ── Step 3: Load mail settings once ───────────────────────────────────────

  const mailSettings = await loadMailSettings();
  if (!mailSettings.resendApiKey) {
    console.warn("[campaign-dispatch] No Resend API key configured — skipping send");
    return { sent, stopped, errors };
  }

  const resend = new Resend(mailSettings.resendApiKey);
  const fromAddress = mailSettings.fromEmail || "outreach@resend.dev";
  const fromLabel = mailSettings.fromName || "HouseFinder";

  // ── Step 4: Process each due enrollment ───────────────────────────────────

  for (const enrollment of dueEnrollments) {
    try {
      // 4a. Race condition protection: re-check deal status
      const activeDeal = await db
        .select({ id: deals.id, status: deals.status })
        .from(deals)
        .where(
          and(
            eq(deals.propertyId, enrollment.propertyId),
            inArray(deals.status, ["closed", "dead"])
          )
        )
        .limit(1);

      if (activeDeal.length > 0) {
        await db
          .update(campaignEnrollments)
          .set({
            status: "stopped",
            stoppedAt: new Date(),
            stopReason: "deal_closed",
            updatedAt: new Date(),
          })
          .where(eq(campaignEnrollments.id, enrollment.enrollmentId));
        stopped++;
        console.log(`[campaign-dispatch] Stopped enrollment ${enrollment.enrollmentId} (deal closed at send time)`);
        continue;
      }

      // 4b. Load the NEXT step to send (currentStep + 1, which is stepNumber = currentStep + 2
      // because currentStep is 0-based progress and stepNumber is 1-indexed)
      // After step 0 (stepNumber=1) is sent on enrollment, currentStep=0, nextSendAt is set.
      // The scheduler sends stepNumber = currentStep + 2.
      const nextStepNumber = enrollment.currentStep + 2;

      const [nextStep] = await db
        .select()
        .from(emailSteps)
        .where(
          and(
            eq(emailSteps.sequenceId, enrollment.sequenceId),
            eq(emailSteps.stepNumber, nextStepNumber)
          )
        )
        .limit(1);

      if (!nextStep) {
        // No more steps — mark as completed
        await db
          .update(campaignEnrollments)
          .set({
            status: "completed",
            nextSendAt: null,
            updatedAt: new Date(),
          })
          .where(eq(campaignEnrollments.id, enrollment.enrollmentId));
        console.log(`[campaign-dispatch] Completed enrollment ${enrollment.enrollmentId} (no more steps)`);
        continue;
      }

      // 4c. Idempotency check — skip if already sent
      const existingLog = await db
        .select({ id: emailSendLog.id })
        .from(emailSendLog)
        .where(
          and(
            eq(emailSendLog.enrollmentId, enrollment.enrollmentId),
            eq(emailSendLog.stepId, nextStep.id)
          )
        )
        .limit(1);

      if (existingLog.length > 0) {
        console.log(`[campaign-dispatch] Skipping enrollment ${enrollment.enrollmentId} step ${nextStepNumber} — already sent`);
        // Advance state anyway in case previous run partially succeeded
        await advanceEnrollment(enrollment.enrollmentId, enrollment.sequenceId, enrollment.currentStep + 1);
        continue;
      }

      // 4d. Fetch contact email
      const emailRows = await db
        .select({ email: ownerContacts.email })
        .from(ownerContacts)
        .where(
          and(
            eq(ownerContacts.propertyId, enrollment.propertyId),
            isNotNull(ownerContacts.email)
          )
        )
        .limit(10);

      // Filter out MAILING: prefixed entries
      const ownerEmail = emailRows
        .map((r) => r.email)
        .find((e) => e && !e.startsWith("MAILING:"));

      if (!ownerEmail) {
        console.warn(`[campaign-dispatch] No email for lead ${enrollment.leadId} — skipping`);
        continue;
      }

      // 4e. Resolve merge fields
      const firstName =
        enrollment.ownerName
          ?.split(/[\s,]+/)
          .find((w) => w.length > 0) ?? "Homeowner";

      const mergeFields = {
        firstName,
        address: enrollment.address,
        city: enrollment.city,
        senderName: mailSettings.fromName || "an investor",
        phone: mailSettings.phone || "",
      };

      const resolvedSubject = resolveFields(nextStep.subject, mergeFields);
      const resolvedBody = resolveFields(nextStep.bodyHtml, mergeFields);

      // 4f. Pre-log for idempotency (status=sent optimistically)
      await db.insert(emailSendLog).values({
        enrollmentId: enrollment.enrollmentId,
        stepId: nextStep.id,
        leadId: enrollment.leadId,
        toEmail: ownerEmail,
        status: "sent",
      });

      // 4g. Send via Resend with idempotency key
      const idempotencyKey = `${enrollment.enrollmentId}-step-${nextStepNumber}`;

      const bodyWithSignature = mailSettings.signature
        ? `${resolvedBody}\n\n${mailSettings.signature}`
        : resolvedBody;

      let resendEmailId: string | undefined;

      try {
        const sendResult = await resend.emails.send({
          from: `${fromLabel} <${fromAddress}>`,
          to: ownerEmail,
          ...(mailSettings.replyTo ? { replyTo: mailSettings.replyTo } : {}),
          subject: resolvedSubject,
          text: bodyWithSignature,
          headers: {
            "X-Idempotency-Key": idempotencyKey,
          },
        });

        if (sendResult.error) {
          const errMsg = sendResult.error.message ?? String(sendResult.error);
          console.error(`[campaign-dispatch] Resend error for enrollment ${enrollment.enrollmentId}: ${errMsg}`);

          // Check for quota exceeded (429)
          if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("rate")) {
            await db
              .update(emailSendLog)
              .set({ status: "quota_exceeded" })
              .where(
                and(
                  eq(emailSendLog.enrollmentId, enrollment.enrollmentId),
                  eq(emailSendLog.stepId, nextStep.id)
                )
              );
            errors++;
            console.warn("[campaign-dispatch] Rate limit hit — stopping dispatch for today");
            break; // Stop sending for today
          }

          await db
            .update(emailSendLog)
            .set({ status: "failed" })
            .where(
              and(
                eq(emailSendLog.enrollmentId, enrollment.enrollmentId),
                eq(emailSendLog.stepId, nextStep.id)
              )
            );
          errors++;
          continue;
        }

        resendEmailId = sendResult.data?.id;
      } catch (sendErr) {
        console.error(`[campaign-dispatch] Send exception for enrollment ${enrollment.enrollmentId}:`, sendErr);
        await db
          .update(emailSendLog)
          .set({ status: "failed" })
          .where(
            and(
              eq(emailSendLog.enrollmentId, enrollment.enrollmentId),
              eq(emailSendLog.stepId, nextStep.id)
            )
          );
        errors++;
        continue;
      }

      // 4h. Update send log with Resend email ID
      if (resendEmailId) {
        await db
          .update(emailSendLog)
          .set({ resendEmailId })
          .where(
            and(
              eq(emailSendLog.enrollmentId, enrollment.enrollmentId),
              eq(emailSendLog.stepId, nextStep.id)
            )
          );
      }

      // 4i. Advance enrollment state
      await advanceEnrollment(enrollment.enrollmentId, enrollment.sequenceId, enrollment.currentStep + 1);

      // 4j. Insert contact event for timeline tracking (non-fatal)
      try {
        await db.insert(contactEvents).values({
          leadId: enrollment.leadId,
          eventType: "emailed_client",
          notes: `Campaign step ${nextStepNumber}: ${resolvedSubject}`,
        });
      } catch (evtErr) {
        console.warn(`[campaign-dispatch] Contact event insert failed for lead ${enrollment.leadId}:`, evtErr);
      }

      sent++;
      console.log(`[campaign-dispatch] Sent step ${nextStepNumber} to lead ${enrollment.leadId}`);

    } catch (err) {
      console.error(`[campaign-dispatch] Error processing enrollment ${enrollment.enrollmentId}:`, err);
      errors++;
    }
  }

  return { sent, stopped, errors };
}

// ── Helper: advance enrollment to next step ────────────────────────────────

async function advanceEnrollment(
  enrollmentId: string,
  sequenceId: string,
  newCurrentStep: number
): Promise<void> {
  // Check if there's a subsequent step after the one we just sent
  const subsequentStepNumber = newCurrentStep + 2; // 0-based currentStep → 1-indexed stepNumber + 1

  const [subsequentStep] = await db
    .select({ delayDays: emailSteps.delayDays })
    .from(emailSteps)
    .where(
      and(
        eq(emailSteps.sequenceId, sequenceId),
        eq(emailSteps.stepNumber, subsequentStepNumber)
      )
    )
    .limit(1);

  if (subsequentStep) {
    // More steps remain — set nextSendAt based on the subsequent step's delay
    const nextSendAt = new Date(
      Date.now() + subsequentStep.delayDays * 24 * 60 * 60 * 1000
    );

    await db
      .update(campaignEnrollments)
      .set({
        currentStep: newCurrentStep,
        nextSendAt,
        updatedAt: new Date(),
      })
      .where(eq(campaignEnrollments.id, enrollmentId));
  } else {
    // No more steps — mark as completed
    await db
      .update(campaignEnrollments)
      .set({
        currentStep: newCurrentStep,
        status: "completed",
        nextSendAt: null,
        updatedAt: new Date(),
      })
      .where(eq(campaignEnrollments.id, enrollmentId));
  }
}
