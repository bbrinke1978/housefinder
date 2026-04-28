/**
 * feedback-shipped-email.tsx
 * Plain HTML email template for "shipped" status notifications (sent to original reporter).
 * Matches the pattern from contract-emails.tsx — returns { subject, html } string.
 */

export interface FeedbackShippedEmailProps {
  itemId: string;
  title: string;
  type: string;
  actorName: string;
  shipNote?: string;
  deepLink: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * buildFeedbackShippedHtml — builds the email sent to the original reporter when their item ships.
 * Subject: "[Feedback] Shipped: {title}"
 */
export function buildFeedbackShippedHtml(
  props: FeedbackShippedEmailProps
): { subject: string; html: string } {
  const subject = `[Feedback] Shipped: ${props.title}`;

  const typeLabel = props.type.charAt(0).toUpperCase() + props.type.slice(1);

  const shipNoteBlock = props.shipNote
    ? `<div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em;">Ship Note</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151; white-space: pre-wrap;">${escapeHtml(props.shipNote)}</p>
      </div>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
      <div style="display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; padding: 4px 12px; margin: 0 0 16px 0;">
        <span style="font-size: 12px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em;">Shipped</span>
      </div>

      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 700;">
        ${escapeHtml(props.title)}
      </h2>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #374151;">
        <strong>${escapeHtml(props.actorName)}</strong> marked your ${escapeHtml(typeLabel)} as shipped.
      </p>

      ${shipNoteBlock}

      <p style="margin: 24px 0;">
        <a href="${escapeHtml(props.deepLink)}"
           style="background: #16a34a; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 7px; display: inline-block; font-weight: 600; font-size: 15px;">
          View in No BS Workbench
        </a>
      </p>

      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        If the button doesn't work, copy this link:<br/>
        <a href="${escapeHtml(props.deepLink)}" style="color: #16a34a;">${escapeHtml(props.deepLink)}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">No BS Workbench — Internal Feedback System</p>
    </div>
  `;

  return { subject, html };
}
