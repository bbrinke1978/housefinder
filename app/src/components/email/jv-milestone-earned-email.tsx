/**
 * jv-milestone-earned-email.tsx
 * Plain HTML email template sent to the JV partner when an active_follow_up or deal_closed
 * milestone is earned. NOT sent for 'qualified' — that is covered by jv-lead-accepted-email.
 * Subject: "[JV Lead] Milestone earned: $X for {address}"
 * Follows the feedback-new-item-email.tsx pattern — returns { subject, html } string.
 * NO react-email render() — plain template literal strings (Phase 28 pattern).
 */

export interface JvMilestoneEarnedEmailProps {
  milestoneType: "active_follow_up" | "deal_closed";
  amountCents: number;
  address: string;
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

const MILESTONE_LABELS: Record<JvMilestoneEarnedEmailProps["milestoneType"], string> = {
  active_follow_up: "Active Follow-Up Bonus",
  deal_closed: "Deal Closed Bonus",
};

const MILESTONE_DESCRIPTIONS: Record<JvMilestoneEarnedEmailProps["milestoneType"], string> = {
  active_follow_up:
    "Brian made first contact with the seller on this property — your active follow-up bonus has been earned.",
  deal_closed:
    "This property has been closed as a deal — your deal closed bonus has been earned. Congratulations!",
};

export function buildJvMilestoneEarnedHtml(
  props: JvMilestoneEarnedEmailProps
): { subject: string; html: string } {
  const dollars = formatDollars(props.amountCents);
  const subject = `[JV Lead] Milestone earned: ${dollars} for ${props.address}`;
  const label = MILESTONE_LABELS[props.milestoneType];
  const description = MILESTONE_DESCRIPTIONS[props.milestoneType];

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background: #f9fafb;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
    <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 20px; font-weight: 700;">Milestone Earned: ${escapeHtml(dollars)}</h2>
    <p style="margin: 0 0 20px 0; font-size: 13px; color: #6b7280;">
      ${escapeHtml(description)}
    </p>

    <table style="border-collapse: collapse; width: 100%; margin: 0 0 20px 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;">
      <tr>
        <td style="padding: 6px 10px; color: #6b7280; font-size: 14px; white-space: nowrap;">Address</td>
        <td style="padding: 6px 10px; font-size: 14px; font-weight: 600;">${escapeHtml(props.address)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #6b7280; font-size: 14px; white-space: nowrap;">Milestone</td>
        <td style="padding: 6px 10px; font-size: 14px;">${escapeHtml(label)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; color: #6b7280; font-size: 14px; white-space: nowrap;">Amount</td>
        <td style="padding: 6px 10px; font-size: 14px; color: #16a34a; font-weight: 600;">${escapeHtml(dollars)} added to ledger</td>
      </tr>
    </table>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #166534;">
        <strong>When will I get paid?</strong> Bonuses are paid on the 1st of each month per Section 6 of your JV agreement. Check your ledger to see your full unpaid balance.
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
