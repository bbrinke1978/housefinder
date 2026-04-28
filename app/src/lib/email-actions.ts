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
