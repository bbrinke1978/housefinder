/**
 * jv-lead-accepted-email.tsx
 * Plain HTML email template sent to the JV partner when their lead is accepted.
 * Subject: "[JV Lead] Your lead was accepted — $10 queued"
 * Follows the feedback-new-item-email.tsx pattern — returns { subject, html } string.
 * NO react-email render() — plain template literal strings (Phase 28 pattern).
 */

export interface JvLeadAcceptedEmailProps {
  address: string;
  conditionNotes?: string | null;
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

export function buildJvLeadAcceptedHtml(
  props: JvLeadAcceptedEmailProps
): { subject: string; html: string } {
  const subject = `[JV Lead] Your lead was accepted — $10 queued`;

  const conditionRow = props.conditionNotes
    ? `<tr>
        <td style="padding: 6px 10px; color: #6b7280; font-size: 14px; white-space: nowrap; vertical-align: top;">Notes</td>
        <td style="padding: 6px 10px; font-size: 14px;">${escapeHtml(props.conditionNotes)}</td>
      </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
    <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 20px; font-weight: 700;">Your Lead Was Accepted</h2>
    <p style="margin: 0 0 20px 0; font-size: 13px; color: #6b7280;">
      Great news — Brian has accepted your lead submission and $10 has been added to your ledger.
    </p>

    <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;">
      <tr>
        <td style="padding: 6px 10px; color: #6b7280; font-size: 14px; white-space: nowrap;">Address</td>
        <td style="padding: 6px 10px; font-size: 14px; font-weight: 600;">${escapeHtml(props.address)}</td>
      </tr>
      ${conditionRow}
      <tr>
        <td style="padding: 6px 10px; color: #6b7280; font-size: 14px; white-space: nowrap;">Qualified bonus</td>
        <td style="padding: 6px 10px; font-size: 14px; color: #16a34a; font-weight: 600;">$10.00 added to ledger</td>
      </tr>
    </table>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #166534;">
        <strong>When will I get paid?</strong> Qualified bonuses are paid on the 1st of each month per Section 6 of your JV agreement.
      </p>
    </div>

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
