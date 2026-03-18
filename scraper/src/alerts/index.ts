import { eq, and, sql, gte } from "drizzle-orm";
import type { InvocationContext } from "@azure/functions";
import { db } from "../db/client.js";
import {
  leads,
  properties,
  distressSignals,
  scraperConfig,
  alertHistory,
} from "../db/schema.js";
import { sendDigestEmail } from "./email.js";
import { sendSmsAlert } from "./sms.js";
import type { AlertLead } from "./email.js";

// ── Config helpers ──────────────────────────────────────────────────────────

async function getAlertConfig(): Promise<{
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailThreshold: number;
  smsThreshold: number;
}> {
  const keys = [
    "alerts.email.enabled",
    "alerts.sms.enabled",
    "alerts.email.threshold",
    "alerts.sms.threshold",
  ];

  const rows = await db
    .select({ key: scraperConfig.key, value: scraperConfig.value })
    .from(scraperConfig)
    .where(
      sql`${scraperConfig.key} IN (${sql.join(
        keys.map((k) => sql`${k}`),
        sql`, `
      )})`
    );

  const configMap = new Map(rows.map((r) => [r.key, r.value]));

  return {
    emailEnabled: (configMap.get("alerts.email.enabled") ?? "true") === "true",
    smsEnabled: (configMap.get("alerts.sms.enabled") ?? "true") === "true",
    emailThreshold: Number(configMap.get("alerts.email.threshold") ?? "2"),
    smsThreshold: Number(configMap.get("alerts.sms.threshold") ?? "3"),
  };
}

// ── Lead query ──────────────────────────────────────────────────────────────

async function getHotLeadsNotAlerted(
  channel: string,
  threshold: number,
  today: string
): Promise<AlertLead[]> {
  // Get hot leads at or above threshold, not yet alerted today for this channel
  const rows = await db
    .select({
      leadId: leads.id,
      propertyId: leads.propertyId,
      address: properties.address,
      city: properties.city,
      ownerName: properties.ownerName,
      distressScore: leads.distressScore,
      firstSeenAt: properties.firstSeenAt,
    })
    .from(leads)
    .innerJoin(properties, eq(properties.id, leads.propertyId))
    .where(
      and(
        eq(leads.isHot, true),
        gte(leads.distressScore, threshold),
        sql`NOT EXISTS (
          SELECT 1 FROM alert_history ah
          WHERE ah.lead_id = ${leads.id}
            AND ah.channel = ${channel}
            AND ah.run_date = ${today}
        )`
      )
    );

  // Get signals for each lead
  const propertyIds = rows.map((r) => r.propertyId);
  if (propertyIds.length === 0) return [];

  const signalRows = await db
    .select({
      propertyId: distressSignals.propertyId,
      signalType: distressSignals.signalType,
    })
    .from(distressSignals)
    .where(
      and(
        eq(distressSignals.status, "active"),
        sql`${distressSignals.propertyId} IN (${sql.join(
          propertyIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    );

  const signalMap = new Map<string, string[]>();
  for (const sr of signalRows) {
    const existing = signalMap.get(sr.propertyId) ?? [];
    existing.push(sr.signalType);
    signalMap.set(sr.propertyId, existing);
  }

  return rows.map((r) => ({
    leadId: r.leadId,
    propertyId: r.propertyId,
    address: r.address,
    city: r.city,
    ownerName: r.ownerName,
    distressScore: r.distressScore,
    signals: signalMap.get(r.propertyId) ?? [],
    firstSeenAt: r.firstSeenAt,
  }));
}

// ── Record alert history ────────────────────────────────────────────────────

async function recordAlert(
  leadId: string,
  channel: string,
  today: string
): Promise<void> {
  await db
    .insert(alertHistory)
    .values({ leadId, channel, runDate: today })
    .onConflictDoNothing();
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export async function sendAlerts(
  context: InvocationContext
): Promise<{ emailSent: number; smsSent: number }> {
  const config = await getAlertConfig();
  const today = new Date().toISOString().split("T")[0]!;
  const appUrl =
    process.env.APP_URL ?? "https://housefinder.azurewebsites.net";

  let emailSent = 0;
  let smsSent = 0;

  // ── Email digest ────────────────────────────────────────────────────────
  if (config.emailEnabled) {
    try {
      const emailLeads = await getHotLeadsNotAlerted(
        "email",
        config.emailThreshold,
        today
      );

      if (emailLeads.length > 0) {
        const result = await sendDigestEmail(emailLeads, appUrl);
        if (result.sent) {
          // Record alert history for each lead
          for (const lead of emailLeads) {
            await recordAlert(lead.leadId, "email", today);
          }
          emailSent = result.count;
          context.log(`Email digest sent: ${emailSent} leads`);
        }
      } else {
        context.log("No new hot leads for email digest");
      }
    } catch (err) {
      context.error("Email digest failed", err);
    }
  }

  // ── SMS alerts ──────────────────────────────────────────────────────────
  if (config.smsEnabled) {
    const smsLeads = await getHotLeadsNotAlerted(
      "sms",
      config.smsThreshold,
      today
    );

    for (const lead of smsLeads) {
      try {
        const result = await sendSmsAlert(lead, appUrl);
        if (result.sent) {
          await recordAlert(lead.leadId, "sms", today);
          smsSent++;
        }
      } catch (err) {
        // One SMS failure should not block others
        context.error(`SMS alert failed for lead ${lead.leadId}`, err);
      }
    }

    if (smsLeads.length > 0) {
      context.log(`SMS alerts: ${smsSent}/${smsLeads.length} sent`);
    }
  }

  return { emailSent, smsSent };
}
