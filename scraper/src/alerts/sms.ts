import twilio from "twilio";
import type { AlertLead } from "./email.js";

export async function sendSmsAlert(
  lead: AlertLead,
  appUrl: string
): Promise<{ sent: boolean }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  // TCPA: to: must always be app user's number from env, never owner contact numbers
  const toNumber = process.env.ALERT_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.warn(
      "Twilio env vars not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, ALERT_PHONE_NUMBER) -- skipping SMS"
    );
    return { sent: false };
  }

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    body: `HOT LEAD: ${lead.address}, ${lead.city} (score: ${lead.distressScore}) - ${appUrl}/properties/${lead.propertyId}`,
    from: fromNumber,
    to: toNumber, // TCPA: to: must always be app user's number from env, never owner contact numbers
  });

  return { sent: true };
}
