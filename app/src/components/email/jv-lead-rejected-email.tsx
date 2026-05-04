/**
 * jv-lead-rejected-email.tsx
 * Plain HTML email template sent to the JV partner when their lead is not accepted.
 * Subject: "[JV Lead] Your lead was not accepted"
 * Follows the feedback-new-item-email.tsx pattern — returns { subject, html } string.
 * NO react-email render() — plain template literal strings (Phase 28 pattern).
 */

export interface JvLeadRejectedEmailProps {
  address: string;
  reason: string;
  ledgerDeepLink: string; // e.g. https://finder.no-bshomes.com/jv-ledger
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildJvLeadRejectedHtml(
  props: JvLeadRejectedEmailProps
): { subject: string; html: string } {
  const subject = `[JV Lead] Your lead was not accepted`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
    <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 20px; font-weight: 700;">Lead Not Accepted</h2>
    <p style="margin: 0 0 20px 0; font-size: 13px; color: #6b7280;">
      Unfortunately, your recent lead submission did not meet the acceptance criteria.
    </p>

    <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;">
      <tr>
        <td style="padding: 6px 10px; color: #6b7280; font-size: 14px; white-space: nowrap; vertical-align: top;">Address</td>
        <td style="padding: 6px 10px; font-size: 14px; font-weight: 600;">${escapeHtml(props.address)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #6b7280; font-size: 14px; white-space: nowrap; vertical-align: top;">Reason</td>
        <td style="padding: 6px 10px; font-size: 14px; color: #dc2626;">${escapeHtml(props.reason)}</td>
      </tr>
    </table>

    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px 16px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #9a3412;">
        <strong>Section 3 of your JV agreement</strong> lists the full acceptance criteria. If you believe this rejection was made in error, please reply to this email within 30 days.
      </p>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 14px; color: #374151;">
      Keep submitting — no-sale properties with motivated sellers are the best fit. Your ledger shows your full submission history and any bonuses earned to date.
    </p>

    <p style="margin: 24px 0;">
      <a href="${escapeHtml(props.ledgerDeepLink)}"
         style="background: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px;">
        View My Ledger
      </a>
    </p>

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      If the button doesn't work, copy this link:<br/>
      <a href="${escapeHtml(props.ledgerDeepLink)}" style="color: #6d28d9;">${escapeHtml(props.ledgerDeepLink)}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">No BS Workbench — JV Partner Lead Pipeline</p>
  </div>
</body>
</html>`;

  return { subject, html };
}
