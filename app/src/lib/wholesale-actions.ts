"use server";

import { db } from "@/db/client";
import {
  wholesaleLeads,
  wholesalers,
  wholesaleLeadNotes,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { computeWholesaleScore } from "@/lib/wholesale-score";
import { parseWholesaleEmail, normalizeAddress } from "@/lib/wholesale-parser";

// -- Zod schemas --

const wholesaleLeadSchema = z.object({
  address: z.string().min(1).max(500),
  city: z.string().max(100).optional(),
  state: z.string().max(10).optional(),
  zip: z.string().max(20).optional(),
  askingPrice: z.number().int().positive().optional(),
  arv: z.number().int().positive().optional(),
  repairEstimate: z.number().int().nonnegative().optional(),
  sqft: z.number().int().positive().optional(),
  beds: z.number().int().positive().optional(),
  baths: z.string().max(10).optional(),
  lotSize: z.string().max(50).optional(),
  yearBuilt: z.number().int().optional(),
  taxId: z.string().max(50).optional(),
  sourceChannel: z.string().max(50).optional(),
  wholesalerEmail: z.string().email().optional(),
  wholesalerName: z.string().max(255).optional(),
  wholesalerPhone: z.string().max(50).optional(),
  wholesalerCompany: z.string().max(255).optional(),
});

// -- Internal helper: upsert wholesaler by email --

/**
 * upsertWholesaler — finds or creates a wholesaler by email.
 * If email is null/empty, creates a name-only record if name provided.
 * Returns wholesaler id or null.
 */
export async function upsertWholesaler(
  email: string | null,
  name: string | null
): Promise<string | null> {
  if (!email && !name) return null;

  if (email) {
    const existing = await db
      .select({ id: wholesalers.id })
      .from(wholesalers)
      .where(eq(wholesalers.email, email))
      .limit(1);

    if (existing.length > 0) {
      // Update name if provided and not already set
      if (name) {
        await db
          .update(wholesalers)
          .set({ name, updatedAt: new Date() })
          .where(and(eq(wholesalers.id, existing[0].id), eq(wholesalers.name, "")));
      }
      return existing[0].id;
    }
  }

  const [created] = await db
    .insert(wholesalers)
    .values({
      name: name ?? email ?? "Unknown",
      email: email ?? undefined,
    })
    .returning({ id: wholesalers.id });

  return created?.id ?? null;
}

// -- createWholesaleLead --

/**
 * createWholesaleLead — validates, scores, normalizes address, upserts wholesaler, inserts lead.
 */
export async function createWholesaleLead(
  formData: FormData
): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const raw = {
    address: formData.get("address") as string,
    city: (formData.get("city") as string) || undefined,
    state: (formData.get("state") as string) || undefined,
    zip: (formData.get("zip") as string) || undefined,
    askingPrice: formData.get("askingPrice")
      ? parseInt(formData.get("askingPrice") as string, 10)
      : undefined,
    arv: formData.get("arv")
      ? parseInt(formData.get("arv") as string, 10)
      : undefined,
    repairEstimate: formData.get("repairEstimate")
      ? parseInt(formData.get("repairEstimate") as string, 10)
      : undefined,
    sqft: formData.get("sqft")
      ? parseInt(formData.get("sqft") as string, 10)
      : undefined,
    beds: formData.get("beds")
      ? parseInt(formData.get("beds") as string, 10)
      : undefined,
    baths: (formData.get("baths") as string) || undefined,
    lotSize: (formData.get("lotSize") as string) || undefined,
    yearBuilt: formData.get("yearBuilt")
      ? parseInt(formData.get("yearBuilt") as string, 10)
      : undefined,
    taxId: (formData.get("taxId") as string) || undefined,
    sourceChannel: (formData.get("sourceChannel") as string) || undefined,
    wholesalerEmail: (formData.get("wholesalerEmail") as string) || undefined,
    wholesalerName: (formData.get("wholesalerName") as string) || undefined,
    wholesalerPhone: (formData.get("wholesalerPhone") as string) || undefined,
    wholesalerCompany:
      (formData.get("wholesalerCompany") as string) || undefined,
  };

  const parsed = wholesaleLeadSchema.parse(raw);

  // Compute score if we have enough data
  let mao: number | null = null;
  let dealScore: number | null = null;
  let verdict: string | null = null;
  let scoreBreakdown: string | null = null;

  if (parsed.arv && parsed.repairEstimate !== undefined && parsed.askingPrice) {
    const breakdown = computeWholesaleScore(
      parsed.arv,
      parsed.repairEstimate,
      parsed.askingPrice
    );
    mao = breakdown.mao;
    dealScore = breakdown.total;
    verdict = breakdown.verdict;
    scoreBreakdown = JSON.stringify(breakdown);
  }

  const addressNormalized = normalizeAddress(parsed.address);

  const wholesalerId = await upsertWholesaler(
    parsed.wholesalerEmail ?? null,
    parsed.wholesalerName ?? null
  );

  const [lead] = await db
    .insert(wholesaleLeads)
    .values({
      address: parsed.address,
      addressNormalized,
      city: parsed.city ?? null,
      state: parsed.state ?? "UT",
      zip: parsed.zip ?? null,
      askingPrice: parsed.askingPrice ?? null,
      arv: parsed.arv ?? null,
      repairEstimate: parsed.repairEstimate ?? null,
      sqft: parsed.sqft ?? null,
      beds: parsed.beds ?? null,
      baths: parsed.baths ?? null,
      lotSize: parsed.lotSize ?? null,
      yearBuilt: parsed.yearBuilt ?? null,
      taxId: parsed.taxId ?? null,
      mao,
      dealScore,
      verdict,
      scoreBreakdown,
      status: "new",
      wholesalerId,
      sourceChannel: parsed.sourceChannel ?? null,
    })
    .returning({ id: wholesaleLeads.id });

  revalidatePath("/wholesale");
  return { id: lead.id };
}

// -- updateWholesaleLead --

/**
 * updateWholesaleLead — updates lead fields and recomputes score.
 */
export async function updateWholesaleLead(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing lead id");

  const raw = {
    address: formData.get("address") as string,
    city: (formData.get("city") as string) || undefined,
    state: (formData.get("state") as string) || undefined,
    zip: (formData.get("zip") as string) || undefined,
    askingPrice: formData.get("askingPrice")
      ? parseInt(formData.get("askingPrice") as string, 10)
      : undefined,
    arv: formData.get("arv")
      ? parseInt(formData.get("arv") as string, 10)
      : undefined,
    repairEstimate: formData.get("repairEstimate")
      ? parseInt(formData.get("repairEstimate") as string, 10)
      : undefined,
    sqft: formData.get("sqft")
      ? parseInt(formData.get("sqft") as string, 10)
      : undefined,
    beds: formData.get("beds")
      ? parseInt(formData.get("beds") as string, 10)
      : undefined,
    baths: (formData.get("baths") as string) || undefined,
    lotSize: (formData.get("lotSize") as string) || undefined,
    yearBuilt: formData.get("yearBuilt")
      ? parseInt(formData.get("yearBuilt") as string, 10)
      : undefined,
    taxId: (formData.get("taxId") as string) || undefined,
    sourceChannel: (formData.get("sourceChannel") as string) || undefined,
    wholesalerEmail: (formData.get("wholesalerEmail") as string) || undefined,
    wholesalerName: (formData.get("wholesalerName") as string) || undefined,
    wholesalerPhone: (formData.get("wholesalerPhone") as string) || undefined,
    wholesalerCompany:
      (formData.get("wholesalerCompany") as string) || undefined,
  };

  const parsed = wholesaleLeadSchema.parse(raw);

  let mao: number | null = null;
  let dealScore: number | null = null;
  let verdict: string | null = null;
  let scoreBreakdown: string | null = null;

  if (parsed.arv && parsed.repairEstimate !== undefined && parsed.askingPrice) {
    const breakdown = computeWholesaleScore(
      parsed.arv,
      parsed.repairEstimate,
      parsed.askingPrice
    );
    mao = breakdown.mao;
    dealScore = breakdown.total;
    verdict = breakdown.verdict;
    scoreBreakdown = JSON.stringify(breakdown);
  }

  const addressNormalized = normalizeAddress(parsed.address);

  const wholesalerId = await upsertWholesaler(
    parsed.wholesalerEmail ?? null,
    parsed.wholesalerName ?? null
  );

  await db
    .update(wholesaleLeads)
    .set({
      address: parsed.address,
      addressNormalized,
      city: parsed.city ?? null,
      state: parsed.state ?? "UT",
      zip: parsed.zip ?? null,
      askingPrice: parsed.askingPrice ?? null,
      arv: parsed.arv ?? null,
      repairEstimate: parsed.repairEstimate ?? null,
      sqft: parsed.sqft ?? null,
      beds: parsed.beds ?? null,
      baths: parsed.baths ?? null,
      lotSize: parsed.lotSize ?? null,
      yearBuilt: parsed.yearBuilt ?? null,
      taxId: parsed.taxId ?? null,
      mao,
      dealScore,
      verdict,
      scoreBreakdown,
      wholesalerId,
      sourceChannel: parsed.sourceChannel ?? null,
      updatedAt: new Date(),
    })
    .where(eq(wholesaleLeads.id, id));

  revalidatePath("/wholesale");
}

// -- updateWholesaleLeadStatus --

/**
 * updateWholesaleLeadStatus — updates status, auto-logs a status_change note.
 */
export async function updateWholesaleLeadStatus(
  wholesaleLeadId: string,
  newStatus: string,
  note?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const existing = await db
    .select({ status: wholesaleLeads.status })
    .from(wholesaleLeads)
    .where(eq(wholesaleLeads.id, wholesaleLeadId))
    .limit(1);

  const previousStatus = existing[0]?.status ?? null;

  await db
    .update(wholesaleLeads)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(wholesaleLeads.id, wholesaleLeadId));

  // Auto-log status change note
  await db.insert(wholesaleLeadNotes).values({
    wholesaleLeadId,
    noteText:
      note ?? `Status changed from ${previousStatus} to ${newStatus}`,
    noteType: "status_change",
    previousStatus,
    newStatus,
  });

  revalidatePath("/wholesale");
}

// -- addWholesaleNote --

const addNoteSchema = z.object({
  wholesaleLeadId: z.string().uuid(),
  noteText: z.string().min(1).max(5000),
});

/**
 * addWholesaleNote — inserts a user note on a wholesale lead.
 */
export async function addWholesaleNote(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = addNoteSchema.parse({
    wholesaleLeadId: formData.get("wholesaleLeadId"),
    noteText: formData.get("noteText"),
  });

  await db.insert(wholesaleLeadNotes).values({
    wholesaleLeadId: parsed.wholesaleLeadId,
    noteText: parsed.noteText,
    noteType: "user",
  });

  revalidatePath("/wholesale");
}

// -- createWholesaleLeadFromEmail --

/**
 * createWholesaleLeadFromEmail — parses an email blast, upserts wholesaler, inserts lead.
 * Status: "new". Stores parsedDraft and rawEmailText.
 */
export async function createWholesaleLeadFromEmail(
  bodyText: string,
  fromEmail: string,
  subject: string
): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = parseWholesaleEmail(bodyText, fromEmail, subject);

  const wholesalerId = await upsertWholesaler(
    parsed.wholesalerEmail ?? fromEmail ?? null,
    parsed.wholesalerName ?? null
  );

  const address = parsed.address ?? subject ?? "Unknown address";
  const addressNormalized = normalizeAddress(address);

  let mao: number | null = null;
  let dealScore: number | null = null;
  let verdict: string | null = null;
  let scoreBreakdown: string | null = null;

  if (parsed.arv && parsed.askingPrice) {
    const breakdown = computeWholesaleScore(
      parsed.arv,
      0, // repairEstimate may not be parsed from email
      parsed.askingPrice
    );
    mao = breakdown.mao;
    dealScore = breakdown.total;
    verdict = breakdown.verdict;
    scoreBreakdown = JSON.stringify(breakdown);
  }

  const [lead] = await db
    .insert(wholesaleLeads)
    .values({
      address,
      addressNormalized,
      askingPrice: parsed.askingPrice ?? null,
      arv: parsed.arv ?? null,
      sqft: parsed.sqft ?? null,
      beds: parsed.beds ?? null,
      baths: parsed.baths !== null ? String(parsed.baths) : null,
      yearBuilt: parsed.yearBuilt ?? null,
      taxId: parsed.taxId ?? null,
      mao,
      dealScore,
      verdict,
      scoreBreakdown,
      status: "new",
      wholesalerId,
      sourceChannel: "email",
      rawEmailText: bodyText,
      parsedDraft: JSON.stringify(parsed),
    })
    .returning({ id: wholesaleLeads.id });

  revalidatePath("/wholesale");
  return { id: lead.id };
}
