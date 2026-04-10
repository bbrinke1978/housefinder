import { createWholesaleLeadFromEmail } from "@/lib/wholesale-actions";

/**
 * POST /api/inbound
 * Resend inbound email webhook handler.
 * Accepts email.received events, fetches the full email body, and parses into a wholesale lead draft.
 * No auth — webhook URL is the secret (Resend does not send a verification signature).
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const payload = await req.json();

    // Only handle email.received events
    if (payload?.type !== "email.received") {
      return Response.json({ ok: true });
    }

    const emailId: string | undefined = payload?.data?.email_id;
    if (!emailId) {
      return Response.json({ ok: true });
    }

    // Fetch full email from Resend API
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("[inbound] RESEND_API_KEY not set");
      return Response.json({ ok: true });
    }

    const emailRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${resendKey}`,
      },
    });

    if (!emailRes.ok) {
      console.error(`[inbound] Failed to fetch email ${emailId}: ${emailRes.status}`);
      return Response.json({ ok: true });
    }

    const emailData = await emailRes.json();

    // Extract body text — prefer plain text, fall back to HTML with tags stripped
    let bodyText: string = emailData.text ?? "";
    if (!bodyText && emailData.html) {
      bodyText = emailData.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    // Extract from and subject — prefer payload.data, fall back to email response
    const fromEmail: string =
      payload?.data?.from ?? emailData.from ?? "";
    const subject: string =
      payload?.data?.subject ?? emailData.subject ?? "";

    if (bodyText) {
      // skipAuth=true: webhook is server-side, no user session available
      await createWholesaleLeadFromEmail(bodyText, fromEmail, subject, true);
    }
  } catch (err) {
    // Always return 200 to prevent Resend retry storms
    console.error("[inbound] Error processing email:", err);
  }

  return Response.json({ ok: true });
}
