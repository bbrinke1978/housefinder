import { db } from "@/db/client";
import { floorPlans, floorPlanPins } from "@/db/schema";
import type { FloorPlanRow, FloorPlanPinRow } from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { generateFloorPlanSasUrl } from "@/lib/blob-storage";
import type { FloorPlanWithPins } from "@/types/index";

/**
 * Build a SAS URL for an upload-type floor plan, or null for sketch plans.
 */
function buildSasUrl(plan: FloorPlanRow): string | null {
  if (plan.sourceType === "upload" && plan.blobName) {
    return generateFloorPlanSasUrl(plan.blobName);
  }
  return null;
}

/**
 * Group raw query rows (plan + pin) into FloorPlanWithPins objects.
 * Handles left-join rows where pinId may be null (plans with no pins).
 */
function groupPlansWithPins(
  rows: Array<{ plan: FloorPlanRow; pin: FloorPlanPinRow | null }>
): FloorPlanWithPins[] {
  const planMap = new Map<string, FloorPlanWithPins>();

  for (const row of rows) {
    const { plan, pin } = row;
    if (!planMap.has(plan.id)) {
      planMap.set(plan.id, {
        plan,
        pins: [],
        sasUrl: buildSasUrl(plan),
      });
    }
    if (pin !== null) {
      planMap.get(plan.id)!.pins.push(pin);
    }
  }

  return Array.from(planMap.values());
}

/**
 * getFloorPlansByDeal — fetch all floor plans for a deal with their pins and SAS URLs.
 * Ordered by sortOrder then floorLabel.
 */
export async function getFloorPlansByDeal(
  dealId: string
): Promise<FloorPlanWithPins[]> {
  const rows = await db
    .select({
      plan: floorPlans,
      pin: floorPlanPins,
    })
    .from(floorPlans)
    .leftJoin(floorPlanPins, eq(floorPlanPins.floorPlanId, floorPlans.id))
    .where(eq(floorPlans.dealId, dealId))
    .orderBy(asc(floorPlans.sortOrder), asc(floorPlans.floorLabel));

  return groupPlansWithPins(
    rows.map((r) => ({ plan: r.plan, pin: r.pin as FloorPlanPinRow | null }))
  );
}

/**
 * getFloorPlansByProperty — fetch all floor plans for a property with their pins and SAS URLs.
 * Ordered by sortOrder then floorLabel.
 */
export async function getFloorPlansByProperty(
  propertyId: string
): Promise<FloorPlanWithPins[]> {
  const rows = await db
    .select({
      plan: floorPlans,
      pin: floorPlanPins,
    })
    .from(floorPlans)
    .leftJoin(floorPlanPins, eq(floorPlanPins.floorPlanId, floorPlans.id))
    .where(eq(floorPlans.propertyId, propertyId))
    .orderBy(asc(floorPlans.sortOrder), asc(floorPlans.floorLabel));

  return groupPlansWithPins(
    rows.map((r) => ({ plan: r.plan, pin: r.pin as FloorPlanPinRow | null }))
  );
}

/**
 * getFloorPlanWithPins — fetch a single floor plan with its pins and SAS URL.
 * Returns null if not found.
 */
export async function getFloorPlanWithPins(
  planId: string
): Promise<FloorPlanWithPins | null> {
  const rows = await db
    .select({
      plan: floorPlans,
      pin: floorPlanPins,
    })
    .from(floorPlans)
    .leftJoin(floorPlanPins, eq(floorPlanPins.floorPlanId, floorPlans.id))
    .where(eq(floorPlans.id, planId));

  if (rows.length === 0) return null;

  const grouped = groupPlansWithPins(
    rows.map((r) => ({ plan: r.plan, pin: r.pin as FloorPlanPinRow | null }))
  );
  return grouped[0] ?? null;
}

/**
 * getFloorPlanByShareToken — fetch a floor plan by share token for contractor view.
 * Validates that shareExpiresAt > now(). Returns null if expired or not found.
 */
export async function getFloorPlanByShareToken(
  token: string
): Promise<FloorPlanWithPins | null> {
  const planRows = await db
    .select()
    .from(floorPlans)
    .where(eq(floorPlans.shareToken, token))
    .limit(1);

  if (planRows.length === 0) return null;

  const plan = planRows[0];

  // Validate token expiry
  if (!plan.shareExpiresAt || plan.shareExpiresAt < new Date()) {
    return null;
  }

  const pinRows = await db
    .select()
    .from(floorPlanPins)
    .where(eq(floorPlanPins.floorPlanId, plan.id))
    .orderBy(asc(floorPlanPins.sortOrder));

  return {
    plan,
    pins: pinRows,
    sasUrl: buildSasUrl(plan),
  };
}

/**
 * getFloorPlanCount — count floor plans for a deal (for tab badge).
 */
export async function getFloorPlanCount(dealId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(floorPlans)
    .where(eq(floorPlans.dealId, dealId));
  return Number(result[0]?.count ?? 0);
}
