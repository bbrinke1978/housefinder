/**
 * email-actions.ts
 * Shared email-send helpers for the No BS Workbench app.
 * Uses Resend directly via RESEND_API_KEY env var.
 * All functions swallow send errors and log to console.error — callers must not await
 * them on the critical path (fire-and-forget).
 */

import { Resend } from "resend";
import {
  buildFeedbackNewItemHtml,
  type FeedbackNewItemEmailProps,
} from "@/components/email/feedback-new-item-email";
import { buildFeedbackShippedHtml } from "@/components/email/feedback-shipped-email";
import {
  buildJvLeadSubmittedHtml,
  type JvLeadSubmittedEmailProps,
} from "@/components/email/jv-lead-submitted-email";
import { buildJvLeadAcceptedHtml } from "@/components/email/jv-lead-accepted-email";
import { buildJvLeadRejectedHtml } from "@/components/email/jv-lead-rejected-email";
import {
  buildJvMilestoneEarnedHtml,
  type JvMilestoneEarnedEmailProps,
} from "@/components/email/jv-milestone-earned-email";
import {
  buildJvPaymentIssuedHtml,
  type JvPaymentIssuedEmailProps,
} from "@/components/email/jv-payment-issued-email";

const SENDER = "No BS Workbench <onboarding@resend.dev>";
const BRIAN_EMAIL = process.env.BRIAN_EMAIL ?? "bbrinke1978@gmail.com";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://finder.no-bshomes.com";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email-actions] RESEND_API_KEY not set — email send skipped");
    return null;
  }
  return new Resend(apiKey);
}

// ── notifyNewFeedbackItem ─────────────────────────────────────────────────────

export interface NotifyNewFeedbackItemArgs {
  itemId: string;
  type: FeedbackNewItemEmailProps["type"];
  title: string;
  description?: string | null;
  priority: FeedbackNewItemEmailProps["priority"];
  urlContext?: string | null;
  reporterName: string;
  reporterEmail: string;
}

/**
 * notifyNewFeedbackItem — email Brian when a new feedback item is created.
 * Subject: "[Feedback] {type}: {title}"
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function notifyNewFeedbackItem(
  args: NotifyNewFeedbackItemArgs
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;

    const deepLink = `${APP_BASE_URL}/feedback/${args.itemId}`;
    const { subject, html } = buildFeedbackNewItemHtml({
      ...args,
      description: args.description ?? null,
      urlContext: args.urlContext ?? null,
      deepLink,
    });

    await resend.emails.send({
      from: SENDER,
      to: BRIAN_EMAIL,
      subject,
      html,
    });
  } catch (err) {
    console.error("[notifyNewFeedbackItem] failed:", err);
    // intentionally swallow — don't fail the user's create action
  }
}

// ── notifyFeedbackShipped ─────────────────────────────────────────────────────

export interface NotifyFeedbackShippedArgs {
  itemId: string;
  title: string;
  type: string;
  reporterEmail: string;
  reporterName: string;
  actorName: string;
  shipNote?: string;
}

/**
 * notifyFeedbackShipped — email the original reporter when their item is marked shipped.
 * Subject: "[Feedback] Shipped: {title}"
 * Caller must have already applied the self-notify guard (actor !== reporter).
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function notifyFeedbackShipped(
  args: NotifyFeedbackShippedArgs
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;

    const deepLink = `${APP_BASE_URL}/feedback/${args.itemId}`;
    const { subject, html } = buildFeedbackShippedHtml({
      itemId: args.itemId,
      title: args.title,
      type: args.type,
      actorName: args.actorName,
      shipNote: args.shipNote,
      deepLink,
    });

    await resend.emails.send({
      from: SENDER,
      to: args.reporterEmail,
      subject,
      html,
    });
  } catch (err) {
    console.error("[notifyFeedbackShipped] failed:", err);
  }
}

// ── JV Partner Lead Pipeline notifications (Phase 34) ─────────────────────

/**
 * notifyJvLeadSubmitted — email Brian when a JV partner submits a new lead.
 * Subject: "[JV Lead] New submission: {address}"
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function notifyJvLeadSubmitted(
  args: Omit<JvLeadSubmittedEmailProps, "triageDeepLink">
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;
    const { subject, html } = buildJvLeadSubmittedHtml({
      ...args,
      triageDeepLink: `${APP_BASE_URL}/jv-leads`,
    });
    await resend.emails.send({ from: SENDER, to: BRIAN_EMAIL, subject, html });
  } catch (err) {
    console.error("[notifyJvLeadSubmitted] failed:", err);
  }
}

/**
 * notifyJvLeadAccepted — email the JV partner when their lead is accepted.
 * Subject: "[JV Lead] Your lead was accepted — $10 queued"
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function notifyJvLeadAccepted(args: {
  partnerEmail: string;
  address: string;
  conditionNotes?: string | null;
}): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;
    const { subject, html } = buildJvLeadAcceptedHtml({
      address: args.address,
      conditionNotes: args.conditionNotes,
      ledgerDeepLink: `${APP_BASE_URL}/jv-ledger`,
    });
    await resend.emails.send({ from: SENDER, to: args.partnerEmail, subject, html });
  } catch (err) {
    console.error("[notifyJvLeadAccepted] failed:", err);
  }
}

/**
 * notifyJvLeadRejected — email the JV partner when their lead is not accepted.
 * Subject: "[JV Lead] Your lead was not accepted"
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function notifyJvLeadRejected(args: {
  partnerEmail: string;
  address: string;
  reason: string;
}): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;
    const { subject, html } = buildJvLeadRejectedHtml({
      address: args.address,
      reason: args.reason,
      ledgerDeepLink: `${APP_BASE_URL}/jv-ledger`,
    });
    await resend.emails.send({ from: SENDER, to: args.partnerEmail, subject, html });
  } catch (err) {
    console.error("[notifyJvLeadRejected] failed:", err);
  }
}

/**
 * notifyJvMilestoneEarned — email the JV partner when an active_follow_up or deal_closed
 * milestone is earned. NOT called for 'qualified' (partner is notified via notifyJvLeadAccepted).
 * Subject: "[JV Lead] Milestone earned: $X for {address}"
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function notifyJvMilestoneEarned(
  args: Omit<JvMilestoneEarnedEmailProps, "ledgerDeepLink"> & { partnerEmail: string }
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;
    const { subject, html } = buildJvMilestoneEarnedHtml({
      milestoneType: args.milestoneType,
      amountCents: args.amountCents,
      address: args.address,
      ledgerDeepLink: `${APP_BASE_URL}/jv-ledger`,
    });
    await resend.emails.send({ from: SENDER, to: args.partnerEmail, subject, html });
  } catch (err) {
    console.error("[notifyJvMilestoneEarned] failed:", err);
  }
}

/**
 * notifyJvPaymentIssued — email the JV partner when their milestones are marked paid.
 * Subject: "[JV Lead] Payment issued: $X via {method}"
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function notifyJvPaymentIssued(
  args: Omit<JvPaymentIssuedEmailProps, "ledgerDeepLink"> & { partnerEmail: string }
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;
    const { subject, html } = buildJvPaymentIssuedHtml({
      totalCents: args.totalCents,
      paymentMethod: args.paymentMethod,
      lineItems: args.lineItems,
      ledgerDeepLink: `${APP_BASE_URL}/jv-ledger`,
    });
    await resend.emails.send({ from: SENDER, to: args.partnerEmail, subject, html });
  } catch (err) {
    console.error("[notifyJvPaymentIssued] failed:", err);
  }
}
