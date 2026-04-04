"use server";

import { db } from "@/db/client";
import { scraperConfig } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { MAIL_SETTINGS_KEYS, type MailSettings } from "@/types/index";

/**
 * Read mail settings from scraperConfig using MAIL_SETTINGS_KEYS.
 * Returns defaults for missing keys.
 */
export async function getMailSettings(): Promise<MailSettings> {
  const rows = await db
    .select({ key: scraperConfig.key, value: scraperConfig.value })
    .from(scraperConfig)
    .where(like(scraperConfig.key, "mail.%"));

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    fromName: map.get(MAIL_SETTINGS_KEYS.FROM_NAME) ?? "",
    fromEmail: map.get(MAIL_SETTINGS_KEYS.FROM_EMAIL) ?? "",
    replyTo: map.get(MAIL_SETTINGS_KEYS.REPLY_TO) ?? "",
    // Fall back to env var if not configured in DB
    resendApiKey:
      map.get(MAIL_SETTINGS_KEYS.RESEND_KEY) ??
      process.env.RESEND_API_KEY ??
      "",
    phone: map.get(MAIL_SETTINGS_KEYS.PHONE) ?? "",
    signature: map.get(MAIL_SETTINGS_KEYS.SIGNATURE) ?? "",
  };
}

const saveMailSettingsSchema = z.object({
  fromName: z.string().max(100),
  fromEmail: z.union([z.literal(""), z.email()]),
  replyTo: z.union([z.literal(""), z.email()]),
  resendApiKey: z.string().max(200),
  phone: z.string().max(20),
  signature: z.string().max(2000),
});

/**
 * Save mail settings to scraperConfig.
 * Upserts each key using onConflictDoUpdate pattern (consistent with existing alert/dashboard settings).
 */
export async function saveMailSettings(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const parsed = saveMailSettingsSchema.safeParse({
    fromName: String(formData.get("fromName") ?? ""),
    fromEmail: String(formData.get("fromEmail") ?? ""),
    replyTo: String(formData.get("replyTo") ?? ""),
    resendApiKey: String(formData.get("resendApiKey") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    signature: String(formData.get("signature") ?? ""),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  const entries: Array<{
    key: string;
    value: string;
    description: string;
  }> = [
    {
      key: MAIL_SETTINGS_KEYS.FROM_NAME,
      value: parsed.data.fromName,
      description: "Sender display name for outreach emails",
    },
    {
      key: MAIL_SETTINGS_KEYS.FROM_EMAIL,
      value: parsed.data.fromEmail,
      description: "From email address for outreach emails",
    },
    {
      key: MAIL_SETTINGS_KEYS.REPLY_TO,
      value: parsed.data.replyTo,
      description: "Reply-to email address for outreach emails",
    },
    {
      key: MAIL_SETTINGS_KEYS.RESEND_KEY,
      value: parsed.data.resendApiKey,
      description:
        "Resend API key for outreach email sending (system alerts use server env key)",
    },
    {
      key: MAIL_SETTINGS_KEYS.PHONE,
      value: parsed.data.phone,
      description: "Phone number included in email signature",
    },
    {
      key: MAIL_SETTINGS_KEYS.SIGNATURE,
      value: parsed.data.signature,
      description: "Email signature template appended to all outreach emails",
    },
  ];

  try {
    for (const entry of entries) {
      await db
        .insert(scraperConfig)
        .values({
          key: entry.key,
          value: entry.value,
          description: entry.description,
        })
        .onConflictDoUpdate({
          target: [scraperConfig.key],
          set: {
            value: entry.value,
            updatedAt: new Date(),
          },
        });
    }

    revalidatePath("/settings/mail");
    revalidatePath("/campaigns");
    return { success: true };
  } catch (err) {
    console.error("saveMailSettings error:", err);
    return { error: "Failed to save mail settings" };
  }
}
