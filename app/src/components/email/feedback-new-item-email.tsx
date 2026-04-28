/**
 * feedback-new-item-email.tsx
 * Plain HTML email template for new feedback item notifications (sent to Brian).
 * Matches the pattern from contract-emails.tsx — returns { subject, html } string.
 */

export interface FeedbackNewItemEmailProps {
  itemId: string;
  type: "bug" | "feature" | "idea" | "question";
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  urlContext?: string | null;
  reporterName: string;
  reporterEmail: string;
  deepLink: string;
}

const TYPE_LABELS: Record<FeedbackNewItemEmailProps["type"], string> = {
  bug: "Bug",
  feature: "Feature Request",
  idea: "Idea",
  question: "Question",
};

const PRIORITY_COLORS: Record<FeedbackNewItemEmailProps["priority"], string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#2563eb",
  low: "#6b7280",
};

const PRIORITY_LABELS: Record<FeedbackNewItemEmailProps["priority"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * buildFeedbackNewItemHtml — builds the email sent to Brian on new feedback item creation.
 * Subject: "[Feedback] {type}: {title}"
 */
export function buildFeedbackNewItemHtml(
  props: FeedbackNewItemEmailProps
): { subject: string; html: string } {
  const typeLabel = TYPE_LABELS[props.type];
  const priorityColor = PRIORITY_COLORS[props.priority];
  const priorityLabel = PRIORITY_LABELS[props.priority];

  const subject = `[Feedback] ${typeLabel}: ${props.title}`;

  const descriptionSnippet = props.description
    ? escapeHtml(props.description.slice(0, 500))
    : null;

  const urlContextBlock = props.urlContext
    ? `<p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">
        Reported from: <a href="${escapeHtml(props.urlContext)}" style="color: #6d28d9;">${escapeHtml(props.urlContext)}</a>
      </p>`
    : "";

  const descriptionBlock = descriptionSnippet
    ? `<div style="background: #f9fafb; border-left: 4px solid #e5e7eb; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #374151; white-space: pre-wrap;">${descriptionSnippet}${props.description && props.description.length > 500 ? "\n…" : ""}</p>
      </div>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
      <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 20px; font-weight: 700;">
        ${escapeHtml(typeLabel)}: ${escapeHtml(props.title)}
      </h2>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">
        New feedback item in No BS Workbench
      </p>

      <div style="display: flex; gap: 8px; margin: 0 0 16px 0;">
        <span style="display: inline-block; padding: 3px 10px; background: #f3f4f6; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #374151;">
          ${escapeHtml(typeLabel)}
        </span>
        <span style="display: inline-block; padding: 3px 10px; background: ${priorityColor}1a; border-radius: 9999px; font-size: 12px; font-weight: 600; color: ${priorityColor};">
          ${escapeHtml(priorityLabel)}
        </span>
      </div>

      <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
        <strong>Reporter:</strong> ${escapeHtml(props.reporterName)} &lt;${escapeHtml(props.reporterEmail)}&gt;
      </p>

      ${descriptionBlock}
      ${urlContextBlock}

      <p style="margin: 24px 0;">
        <a href="${escapeHtml(props.deepLink)}"
           style="background: #6d28d9; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 7px; display: inline-block; font-weight: 600; font-size: 15px;">
          View in No BS Workbench
        </a>
      </p>

      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        If the button doesn't work, copy this link:<br/>
        <a href="${escapeHtml(props.deepLink)}" style="color: #6d28d9;">${escapeHtml(props.deepLink)}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">No BS Workbench — Internal Feedback System</p>
    </div>
  `;

  return { subject, html };
}
