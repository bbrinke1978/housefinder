/**
 * jv-payment-issued-email.tsx
 * Plain HTML email template sent to the JV partner when their milestones are marked paid.
 * Subject: "[JV Lead] Payment issued: $X via {method}"
 * Follows the feedback-new-item-email.tsx pattern — returns { subject, html } string.
 * NO react-email render() — plain template literal strings (Phase 28 pattern).
 */

export interface JvPaymentIssuedEmailProps {
  totalCents: number;
  paymentMethod: string;
  lineItems: {
    milestoneType: string;
    address: string;
    amountCents: number;
  }[];
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

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const MILESTONE_TYPE_LABELS: Record<string, string> = {
  qualified: "Qualified Lead",
  active_follow_up: "Active Follow-Up",
  deal_closed: "Deal Closed",
};

function getMilestoneLabel(type: string): string {
  return MILESTONE_TYPE_LABELS[type] ?? type;
}

export function buildJvPaymentIssuedHtml(
  props: JvPaymentIssuedEmailProps
): { subject: string; html: string } {
  const totalDollars = formatDollars(props.totalCents);
  const subject = `[JV Lead] Payment issued: ${totalDollars} via ${props.paymentMethod}`;

  const lineItemRows = props.lineItems
    .map(
      (item) => `<tr>
        <td style="padding: 6px 10px; font-size: 14px;">${escapeHtml(item.address)}</td>
        <td style="padding: 6px 10px; font-size: 14px; color: #6b7280; white-space: nowrap;">${escapeHtml(getMilestoneLabel(item.milestoneType))}</td>
        <td style="padding: 6px 10px; font-size: 14px; text-align: right; white-space: nowrap;">${escapeHtml(formatDollars(item.amountCents))}</td>
      </tr>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
    <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 20px; font-weight: 700;">Payment Issued: ${escapeHtml(totalDollars)}</h2>
    <p style="margin: 0 0 20px 0; font-size: 13px; color: #6b7280;">
      Your JV partner payment has been issued via <strong>${escapeHtml(props.paymentMethod)}</strong>.
    </p>

    <table style="border-collapse: collapse; width: 100%; margin: 0 0 4px 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px 6px 0 0;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px 10px; font-size: 13px; font-weight: 600; text-align: left; color: #374151;">Address</th>
          <th style="padding: 8px 10px; font-size: 13px; font-weight: 600; text-align: left; color: #374151; white-space: nowrap;">Milestone</th>
          <th style="padding: 8px 10px; font-size: 13px; font-weight: 600; text-align: right; color: #374151; white-space: nowrap;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemRows}
      </tbody>
    </table>
    <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px 0; background: #f0fdf4; border: 1px solid #bbf7d0; border-top: none; border-radius: 0 0 6px 6px;">
      <tr>
        <td style="padding: 8px 10px; font-size: 14px; font-weight: 700;" colspan="2">Total Paid</td>
        <td style="padding: 8px 10px; font-size: 14px; font-weight: 700; text-align: right; color: #16a34a;">${escapeHtml(totalDollars)}</td>
      </tr>
    </table>

    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px 16px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #9a3412;">
        If anything looks wrong, please reply to this email within 30 days per Section 6 of your JV agreement.
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
