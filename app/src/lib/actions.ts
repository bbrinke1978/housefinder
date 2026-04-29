"use server";

import { db } from "@/db/client";
import {
  leads,
  leadNotes,
  scraperConfig,
  ownerContacts,
  distressSignals,
  callLogs,
  alertHistory,
  contactEvents,
  campaignEnrollments,
  emailSendLog,
} from "@/db/schema";
import { eq, and, like } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { userCan } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";

/**
 * Mark a lead as viewed (updates lastViewedAt timestamp).
 * Clears the "new" badge on the dashboard.
 */
export async function markLeadViewed(propertyId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  await db
    .update(leads)
    .set({
      lastViewedAt: new Date(),
      newLeadStatus: "unreviewed",
      updatedAt: new Date(),
    })
    .where(eq(leads.propertyId, propertyId));
}

const addNoteSchema = z.object({
  leadId: z.uuid(),
  noteText: z.string().min(1).max(2000),
});

/**
 * Add a user note to a lead.
 */
export async function addLeadNote(
  leadId: string,
  noteText: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "lead.edit_status")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = addNoteSchema.parse({ leadId, noteText });

  await db.insert(leadNotes).values({
    leadId: parsed.leadId,
    noteText: parsed.noteText,
    noteType: "user",
  });

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "lead.note_added",
    entityType: "lead",
    entityId: parsed.leadId,
    newValue: { noteText: parsed.noteText },
  });

  revalidatePath("/properties");
  revalidatePath("/leads");
}

const VALID_STATUSES = ["new", "contacted", "follow_up", "closed", "dead"] as const;

const updateLeadStatusSchema = z.object({
  leadId: z.uuid(),
  status: z.enum(VALID_STATUSES),
  note: z.string().optional(),
});

/**
 * updateLeadStatus — server action to change a lead's status.
 * Auto-logs the status change as a note. Optionally adds a user note.
 */
export async function updateLeadStatus(
  leadId: string,
  status: string,
  note?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "lead.edit_status")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = updateLeadStatusSchema.parse({ leadId, status, note });

  // Fetch current lead to record previous status
  const [existing] = await db
    .select({ status: leads.status })
    .from(leads)
    .where(eq(leads.id, parsed.leadId))
    .limit(1);

  if (!existing) {
    throw new Error("Lead not found");
  }

  const previousStatus = existing.status;

  // Update lead status (and lastContactedAt if moving to "contacted")
  const updateData: Record<string, unknown> = {
    status: parsed.status,
    updatedAt: new Date(),
  };
  if (parsed.status === "contacted") {
    updateData.lastContactedAt = new Date();
  }

  await db.update(leads).set(updateData).where(eq(leads.id, parsed.leadId));

  // Auto-log the status change
  if (previousStatus !== parsed.status) {
    await db.insert(leadNotes).values({
      leadId: parsed.leadId,
      noteText: `Status changed from ${previousStatus} to ${parsed.status}`,
      noteType: "status_change",
      previousStatus,
      newStatus: parsed.status,
    });
  }

  // If a user note was provided, add it separately
  if (parsed.note && parsed.note.trim().length > 0) {
    await db.insert(leadNotes).values({
      leadId: parsed.leadId,
      noteText: parsed.note.trim(),
      noteType: "user",
    });
  }

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "lead.status_changed",
    entityType: "lead",
    entityId: parsed.leadId,
    oldValue: { status: previousStatus },
    newValue: { status: parsed.status },
  });

  revalidatePath("/pipeline");
  revalidatePath("/leads");
}

// -- Target Cities --

const DEFAULT_TARGET_CITIES = [
  // Rural counties (Carbon, Emery, Sanpete, Sevier, Juab, Millard)
  "Price",
  "Huntington",
  "Castle Dale",
  "Richfield",
  "Nephi",
  "Ephraim",
  "Manti",
  "Fillmore",
  "Delta",
  // Salt Lake County — neighborhoods derived from UGRC zip mapping (Path A, 2026-04-17)
  "Rose Park",
  "Salt Lake City",
  "Sugar House",
  "Midvale",
  "Sandy",
  "Murray",
  "Holladay",
  "Kearns",
  "West Valley City",
  "Cottonwood Heights",
  "Taylorsville",
  "West Jordan",
  "South Jordan",
  "Riverton",
  "Herriman",
  "Draper",
  "South Salt Lake",
  "Salt Lake County (other)",
];

/**
 * Read target cities from scraperConfig.
 * Returns parsed JSON array or default ["Price"] if not set.
 */
export async function getTargetCities(): Promise<string[]> {
  const rows = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, "target_cities"))
    .limit(1);

  if (rows.length === 0) {
    return DEFAULT_TARGET_CITIES;
  }

  try {
    const parsed = JSON.parse(rows[0].value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_TARGET_CITIES;
  } catch {
    return DEFAULT_TARGET_CITIES;
  }
}

const updateTargetCitiesSchema = z.object({
  cities: z.array(z.string().min(1).max(100)).min(1).max(50),
});

/**
 * Upsert target cities in scraperConfig.
 */
export async function updateTargetCities(cities: string[]): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "scraper_config.manage")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = updateTargetCitiesSchema.parse({ cities });

  const value = JSON.stringify(parsed.cities);

  // Check if the key already exists
  const existing = await db
    .select({ id: scraperConfig.id })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, "target_cities"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(scraperConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(scraperConfig.key, "target_cities"));
  } else {
    await db.insert(scraperConfig).values({
      key: "target_cities",
      value,
      description: "JSON array of target city names for scraping",
    });
  }

  revalidatePath("/settings");
}

// -- Owner Phone --

const saveOwnerPhoneSchema = z.object({
  propertyId: z.uuid(),
  phone: z.string().min(1).max(20),
});

/**
 * Save a manually-entered phone number for a property owner.
 *
 * Each manual entry gets a unique source like 'manual-1', 'manual-2', so
 * adding a second number does NOT overwrite the first. The existing
 * unique index on (property_id, source) treats each as a distinct row,
 * mirroring how Tracerfy stores additional phones via 'tracerfy-mobile-2'
 * etc. The bare 'manual' source is preserved for any rows that pre-date
 * this change — they're treated as the original entry and aren't disturbed.
 */
export async function saveOwnerPhone(
  propertyId: string,
  phone: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "lead.edit_status")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = saveOwnerPhoneSchema.parse({ propertyId, phone });

  // Find the next available manual-N source for this property.
  // Counts existing 'manual' (legacy bare source) and 'manual-N' rows.
  const existing = await db
    .select({ source: ownerContacts.source })
    .from(ownerContacts)
    .where(
      and(
        eq(ownerContacts.propertyId, parsed.propertyId),
        like(ownerContacts.source, "manual%")
      )
    );

  // Determine the highest N already in use; default to 0 if none.
  let maxN = 0;
  let hasBareManual = false;
  for (const row of existing) {
    if (row.source === "manual") {
      hasBareManual = true;
      continue;
    }
    const m = row.source.match(/^manual-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxN) maxN = n;
    }
  }
  // If a bare 'manual' exists, treat it as slot 1 (so the next is at least 2).
  if (hasBareManual && maxN < 1) maxN = 1;

  const nextSource = `manual-${maxN + 1}`;

  await db.insert(ownerContacts).values({
    propertyId: parsed.propertyId,
    phone: parsed.phone,
    source: nextSource,
    isManual: true,
    needsSkipTrace: false,
  });

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "lead.phone_added",
    entityType: "property",
    entityId: parsed.propertyId,
    newValue: { phone: parsed.phone, source: nextSource },
  });

  revalidatePath(`/properties/${parsed.propertyId}`);
  revalidatePath("/");
}

// -- Alert Settings --

export interface AlertSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailThreshold: number;
  smsThreshold: number;
}

const ALERT_DEFAULTS: AlertSettings = {
  emailEnabled: true,
  smsEnabled: true,
  emailThreshold: 2,
  smsThreshold: 3,
};

/**
 * Read alert settings from scraperConfig.
 * Returns defaults if keys not found.
 */
export async function getAlertSettings(): Promise<AlertSettings> {
  const rows = await db
    .select({ key: scraperConfig.key, value: scraperConfig.value })
    .from(scraperConfig)
    .where(like(scraperConfig.key, "alerts.%"));

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    emailEnabled: map.get("alerts.email.enabled") === "false" ? false : ALERT_DEFAULTS.emailEnabled,
    smsEnabled: map.get("alerts.sms.enabled") === "false" ? false : ALERT_DEFAULTS.smsEnabled,
    emailThreshold: map.has("alerts.email.threshold")
      ? parseInt(map.get("alerts.email.threshold")!, 10)
      : ALERT_DEFAULTS.emailThreshold,
    smsThreshold: map.has("alerts.sms.threshold")
      ? parseInt(map.get("alerts.sms.threshold")!, 10)
      : ALERT_DEFAULTS.smsThreshold,
  };
}

const updateAlertSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  emailThreshold: z.number().int().min(1).max(10),
  smsThreshold: z.number().int().min(1).max(10),
});

/**
 * Upsert alert settings in scraperConfig.
 */
export async function updateAlertSettings(
  settings: AlertSettings
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "scraper_config.manage")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = updateAlertSettingsSchema.parse(settings);

  const entries: Array<{ key: string; value: string; description: string }> = [
    { key: "alerts.email.enabled", value: String(parsed.emailEnabled), description: "Email alerts enabled" },
    { key: "alerts.sms.enabled", value: String(parsed.smsEnabled), description: "SMS alerts enabled" },
    { key: "alerts.email.threshold", value: String(parsed.emailThreshold), description: "Minimum score for email alerts" },
    { key: "alerts.sms.threshold", value: String(parsed.smsThreshold), description: "Minimum score for SMS alerts" },
  ];

  for (const entry of entries) {
    const existing = await db
      .select({ id: scraperConfig.id })
      .from(scraperConfig)
      .where(eq(scraperConfig.key, entry.key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(scraperConfig)
        .set({ value: entry.value, updatedAt: new Date() })
        .where(eq(scraperConfig.key, entry.key));
    } else {
      await db.insert(scraperConfig).values({
        key: entry.key,
        value: entry.value,
        description: entry.description,
      });
    }
  }

  revalidatePath("/settings");
}

// -- Manual Signal Management --

/**
 * Toggle vacant flag for a property.
 * Creates an active "vacant" distress signal when true, resolves it when false.
 */
export async function setVacantFlag(
  propertyId: string,
  isVacant: boolean
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "lead.edit_status")) {
    throw new Error("Forbidden: insufficient role");
  }

  if (isVacant) {
    await db
      .insert(distressSignals)
      .values({
        propertyId,
        signalType: "vacant",
        status: "active",
        recordedDate: new Date().toISOString().split("T")[0],
        rawData: "Manual flag - field observation",
        sourceUrl: null,
      })
      .onConflictDoNothing();
  } else {
    await db
      .update(distressSignals)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(distressSignals.propertyId, propertyId),
          eq(distressSignals.signalType, "vacant"),
          eq(distressSignals.status, "active")
        )
      );
  }

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: isVacant ? "lead.vacant_flag_set" : "lead.vacant_flag_cleared",
    entityType: "property",
    entityId: propertyId,
    newValue: { isVacant },
  });

  revalidatePath(`/properties/${propertyId}`);
}

const addManualSignalSchema = z.object({
  propertyId: z.uuid(),
  signalType: z.enum(["probate", "code_violation"]),
  rawData: z.string().optional(),
});

/**
 * Add a manual distress signal (probate or code_violation) to a property.
 */
export async function addManualSignal(
  propertyId: string,
  signalType: "probate" | "code_violation",
  rawData?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "lead.edit_status")) {
    throw new Error("Forbidden: insufficient role");
  }

  addManualSignalSchema.parse({ propertyId, signalType, rawData });

  await db
    .insert(distressSignals)
    .values({
      propertyId,
      signalType,
      status: "active",
      recordedDate: new Date().toISOString().split("T")[0],
      rawData: rawData ?? "Manual entry",
      sourceUrl: null,
    })
    .onConflictDoNothing();

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "lead.signal_added",
    entityType: "property",
    entityId: propertyId,
    newValue: { signalType, rawData: rawData ?? "Manual entry" },
  });

  revalidatePath(`/properties/${propertyId}`);
}

// -- Dashboard Settings --

export interface DashboardSettings {
  hideBigOperators: boolean;
  hideVacantLand: boolean;
  hideEntities: boolean;
  hideParcelOnly: boolean;
}

const DASHBOARD_DEFAULTS: DashboardSettings = {
  hideBigOperators: true,
  hideVacantLand: true,
  hideEntities: true,
  hideParcelOnly: true,
};

/**
 * Read dashboard settings from scraperConfig.
 * Returns defaults (hideBigOperators: true) if keys not found.
 */
export async function getDashboardSettings(): Promise<DashboardSettings> {
  const rows = await db
    .select({ key: scraperConfig.key, value: scraperConfig.value })
    .from(scraperConfig)
    .where(like(scraperConfig.key, "dashboard.%"));

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    hideBigOperators:
      map.get("dashboard.hideBigOperators") === "false"
        ? false
        : DASHBOARD_DEFAULTS.hideBigOperators,
    hideVacantLand:
      map.get("dashboard.hideVacantLand") === "false"
        ? false
        : DASHBOARD_DEFAULTS.hideVacantLand,
    hideEntities:
      map.get("dashboard.hideEntities") === "false"
        ? false
        : DASHBOARD_DEFAULTS.hideEntities,
    hideParcelOnly:
      map.get("dashboard.hideParcelOnly") === "false"
        ? false
        : DASHBOARD_DEFAULTS.hideParcelOnly,
  };
}

const updateDashboardSettingsSchema = z.object({
  hideBigOperators: z.boolean(),
  hideVacantLand: z.boolean(),
  hideEntities: z.boolean(),
  hideParcelOnly: z.boolean(),
});

/**
 * Upsert dashboard settings in scraperConfig.
 */
export async function updateDashboardSettings(
  settings: DashboardSettings
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "scraper_config.manage")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = updateDashboardSettingsSchema.parse(settings);

  const entries: Array<{ key: string; value: string; description: string }> = [
    {
      key: "dashboard.hideBigOperators",
      value: String(parsed.hideBigOperators),
      description: "Hide owners with 10+ distress-signal properties from dashboard",
    },
    {
      key: "dashboard.hideVacantLand",
      value: String(parsed.hideVacantLand),
      description: "Hide vacant land / unimproved lots from dashboard (property_type contains 'vacant' or 'land', or owner name indicates land use)",
    },
    {
      key: "dashboard.hideEntities",
      value: String(parsed.hideEntities),
      description: "Hide LLC, Trust, and Estate-owned properties from dashboard — focus on individual owners only",
    },
    {
      key: "dashboard.hideParcelOnly",
      value: String(parsed.hideParcelOnly),
      description: "Hide properties with no street address — only a parcel ID like '2A-0584-0000'",
    },
  ];

  for (const entry of entries) {
    const existing = await db
      .select({ id: scraperConfig.id })
      .from(scraperConfig)
      .where(eq(scraperConfig.key, entry.key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(scraperConfig)
        .set({ value: entry.value, updatedAt: new Date() })
        .where(eq(scraperConfig.key, entry.key));
    } else {
      await db.insert(scraperConfig).values({
        key: entry.key,
        value: entry.value,
        description: entry.description,
      });
    }
  }

  revalidatePath("/settings");
  revalidatePath("/");
}

// -- Lead Source --

const VALID_LEAD_SOURCES = [
  "scraping",
  "website",
  "flyer",
  "signage",
  "driving",
  "word_of_mouth",
  "voicemail",
  "other",
] as const;

const updateLeadSourceSchema = z.object({
  leadId: z.uuid(),
  source: z.enum(VALID_LEAD_SOURCES),
  otherText: z.string().max(100).optional(),
});

/**
 * Update the lead source for a property lead.
 * When source is "other", optionally store custom text in a note.
 */
export async function updateLeadSource(
  leadId: string,
  source: string,
  otherText?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "lead.edit_status")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = updateLeadSourceSchema.parse({ leadId, source, otherText });

  await db
    .update(leads)
    .set({
      leadSource: parsed.source === "other" && parsed.otherText
        ? `other:${parsed.otherText}`
        : parsed.source,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, parsed.leadId));

  revalidatePath("/");
}

/**
 * Check if a property has an active vacant flag.
 */
export async function getActiveVacantFlag(
  propertyId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: distressSignals.id })
    .from(distressSignals)
    .where(
      and(
        eq(distressSignals.propertyId, propertyId),
        eq(distressSignals.signalType, "vacant"),
        eq(distressSignals.status, "active")
      )
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Delete an inbound (website/voicemail) lead and all its child rows.
 * Restricted to leads with leadSource 'website' or 'voicemail' to prevent
 * accidentally nuking scraped property leads.
 */
export async function deleteInboundLead(leadId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "user.manage")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsedId = z.uuid().parse(leadId);

  const [existing] = await db
    .select({ leadSource: leads.leadSource, propertyId: leads.propertyId })
    .from(leads)
    .where(eq(leads.id, parsedId))
    .limit(1);

  if (!existing) {
    throw new Error("Lead not found");
  }

  if (existing.leadSource !== "website" && existing.leadSource !== "voicemail") {
    throw new Error("Only inbound (website/voicemail) leads can be deleted from this action");
  }

  await db.delete(emailSendLog).where(eq(emailSendLog.leadId, parsedId));
  await db.delete(campaignEnrollments).where(eq(campaignEnrollments.leadId, parsedId));
  await db.delete(contactEvents).where(eq(contactEvents.leadId, parsedId));
  await db.delete(alertHistory).where(eq(alertHistory.leadId, parsedId));
  await db.delete(callLogs).where(eq(callLogs.leadId, parsedId));
  await db.delete(leadNotes).where(eq(leadNotes.leadId, parsedId));
  await db.delete(leads).where(eq(leads.id, parsedId));

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "lead.deleted",
    entityType: "lead",
    entityId: parsedId,
    oldValue: { leadSource: existing.leadSource },
  });

  revalidatePath("/");
  revalidatePath("/leads");
  redirect("/");
}
