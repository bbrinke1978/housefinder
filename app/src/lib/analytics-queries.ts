import { db } from "@/db/client";
import { sql, eq } from "drizzle-orm";
import { scraperConfig } from "@/db/schema";

/** Load target cities from settings for filtering analytics to relevant areas */
async function getTargetCities(): Promise<string[]> {
  const rows = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, "target_cities"))
    .limit(1);
  if (rows.length > 0 && rows[0].value) {
    try {
      const cities = JSON.parse(rows[0].value) as string[];
      if (cities.length > 0) return cities;
    } catch { /* fall through */ }
  }
  return [];
}

/** Build a SQL IN clause for target cities (case-insensitive) */
function targetCityFilter(cities: string[], alias: string = "p"): ReturnType<typeof sql> {
  if (cities.length === 0) return sql`TRUE`;
  // SECURITY: sql.raw(alias) is safe — alias is a compile-time TypeScript constant ("p", "l", etc.),
  // never derived from user input. It represents the SQL table alias, not a value.
  return sql`lower(${sql.raw(alias)}.city) IN (${sql.join(cities.map(c => sql`lower(${c})`), sql`, `)})`;
}

// -- Types --

export interface FunnelStage {
  status: string;
  count: number;
  avgDaysInStage: number | null;
}

export interface MarketStat {
  city: string;
  totalLeads: number;
  hotLeads: number;
  converted: number;
  conversionRate: number;
}

export interface TrendPoint {
  week: string;
  city: string;
  count: number;
}

export type HealthStatus = "green" | "yellow" | "red";

export interface ScraperHealthRow {
  county: string;
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastResultCount: number;
  consecutiveZeroResults: number;
  updatedAt: Date;
  status: HealthStatus;
  freshnessHours: number | null;
}

export interface AttributionStat {
  signalType: string;
  totalLeads: number;
  hotLeads: number;
  convertedDeals: number;
}

export interface OutreachStat {
  outcome: string;
  count: number;
  contactRate: number;
}

export interface ActivityEntry {
  id: string;
  type: "note" | "call";
  address: string;
  city: string;
  text: string;
  createdAt: Date;
}

// -- Export row types --

export interface PropertyExportRow {
  id: string;
  parcelId: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  county: string;
  ownerName: string | null;
  ownerType: string | null;
  propertyType: string | null;
  status: string | null;
  distressScore: number | null;
  isHot: boolean | null;
}

export interface DealExportRow {
  id: string;
  address: string;
  city: string;
  state: string;
  sellerName: string | null;
  sellerPhone: string | null;
  condition: string | null;
  askingPrice: number | null;
  arv: number | null;
  repairEstimate: number | null;
  wholesaleFee: number | null;
  mao: number | null;
  offerPrice: number | null;
  status: string;
  assignmentFee: number | null;
  closingDate: string | null;
  createdAt: Date;
}

export interface BuyerExportRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  buyBox: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  fundingType: string | null;
  targetAreas: string | null;
  rehabTolerance: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
}

// -- Query functions --

/**
 * Pipeline funnel: count + avg days in stage per lead status.
 */
export async function getPipelineFunnelData(): Promise<FunnelStage[]> {
  const cities = await getTargetCities();
  const cityFilter = targetCityFilter(cities);

  const rows = await db.execute<{
    status: string;
    count: number;
    avg_days: string | null;
  }>(sql`
    SELECT
      l.status,
      COUNT(*)::int AS count,
      AVG(EXTRACT(EPOCH FROM (l.updated_at - l.created_at)) / 86400)::numeric(10,1) AS avg_days
    FROM leads l
    JOIN properties p ON p.id = l.property_id
    WHERE l.distress_score > 0 AND ${cityFilter}
    GROUP BY l.status
    ORDER BY CASE l.status
      WHEN 'new'        THEN 1
      WHEN 'contacted'  THEN 2
      WHEN 'follow_up'  THEN 3
      WHEN 'closed'     THEN 4
      WHEN 'dead'       THEN 5
      ELSE 6
    END
  `);

  return (rows.rows ?? []).map((r) => ({
    status: r.status,
    count: r.count,
    avgDaysInStage: r.avg_days != null ? parseFloat(r.avg_days) : null,
  }));
}

/**
 * Market comparison: leads, hot leads, and conversions per city.
 */
export async function getMarketComparisonData(): Promise<MarketStat[]> {
  const cities = await getTargetCities();
  const cityFilter = targetCityFilter(cities);

  const rows = await db.execute<{
    city: string;
    total_leads: number;
    hot_leads: number;
    converted: number;
  }>(sql`
    SELECT
      p.city,
      COUNT(*)::int AS total_leads,
      COUNT(*) FILTER (WHERE l.is_hot = true)::int AS hot_leads,
      COUNT(*) FILTER (WHERE l.status = 'closed')::int AS converted
    FROM leads l
    JOIN properties p ON p.id = l.property_id
    WHERE l.distress_score > 0 AND ${cityFilter}
    GROUP BY p.city
    ORDER BY total_leads DESC
  `);

  return (rows.rows ?? []).map((r) => ({
    city: r.city,
    totalLeads: r.total_leads,
    hotLeads: r.hot_leads,
    converted: r.converted,
    conversionRate:
      r.total_leads > 0
        ? Math.round((r.converted / r.total_leads) * 1000) / 10
        : 0,
  }));
}

/**
 * Property trend: new leads per week per city over the last 6 months.
 */
export async function getPropertyTrendData(): Promise<TrendPoint[]> {
  const cities = await getTargetCities();
  const cityFilter = targetCityFilter(cities);

  const rows = await db.execute<{
    week: string;
    city: string;
    count: number;
  }>(sql`
    SELECT
      date_trunc('week', l.first_seen_at)::date::text AS week,
      p.city,
      COUNT(*)::int AS count
    FROM leads l
    JOIN properties p ON p.id = l.property_id
    WHERE l.first_seen_at > NOW() - INTERVAL '6 months'
      AND l.distress_score > 0
      AND ${cityFilter}
    GROUP BY 1, 2
    ORDER BY 1, 2
  `);

  return (rows.rows ?? []).map((r) => ({
    week: r.week,
    city: r.city,
    count: r.count,
  }));
}

/**
 * Scraper health: all rows from scraper_health with computed status + freshness.
 */
export async function getScraperHealthData(): Promise<ScraperHealthRow[]> {
  const rows = await db.execute<{
    county: string;
    last_run_at: Date | null;
    last_success_at: Date | null;
    last_result_count: number;
    consecutive_zero_results: number;
    updated_at: Date;
  }>(sql`
    SELECT
      county,
      last_run_at,
      last_success_at,
      last_result_count,
      consecutive_zero_results,
      updated_at
    FROM scraper_health
    ORDER BY county
  `);

  const now = Date.now();

  return (rows.rows ?? []).map((r) => {
    const freshnessHours = r.last_success_at
      ? Math.round((now - new Date(r.last_success_at).getTime()) / 3_600_000)
      : null;

    let status: HealthStatus = "green";
    if (r.consecutive_zero_results >= 3) {
      status = "red";
    } else if (r.consecutive_zero_results >= 1 || freshnessHours === null || freshnessHours > 48) {
      status = "yellow";
    }

    return {
      county: r.county,
      lastRunAt: r.last_run_at ? new Date(r.last_run_at) : null,
      lastSuccessAt: r.last_success_at ? new Date(r.last_success_at) : null,
      lastResultCount: r.last_result_count,
      consecutiveZeroResults: r.consecutive_zero_results,
      updatedAt: new Date(r.updated_at),
      status,
      freshnessHours,
    };
  });
}

/**
 * Lead source attribution: leads and conversions grouped by distress signal type.
 */
export async function getLeadSourceAttribution(): Promise<AttributionStat[]> {
  const rows = await db.execute<{
    signal_type: string;
    total_leads: number;
    hot_leads: number;
    converted_deals: number;
  }>(sql`
    SELECT
      ds.signal_type,
      COUNT(DISTINCT l.id)::int AS total_leads,
      COUNT(DISTINCT l.id) FILTER (WHERE l.is_hot = true)::int AS hot_leads,
      COUNT(DISTINCT d.id)::int AS converted_deals
    FROM distress_signals ds
    JOIN leads l ON l.property_id = ds.property_id
    LEFT JOIN deals d ON d.property_id = ds.property_id
    GROUP BY ds.signal_type
    ORDER BY total_leads DESC
  `);

  return (rows.rows ?? []).map((r) => ({
    signalType: r.signal_type,
    totalLeads: r.total_leads,
    hotLeads: r.hot_leads,
    convertedDeals: r.converted_deals,
  }));
}

/**
 * Outreach stats: call counts by outcome + contact rate.
 */
export async function getOutreachStats(): Promise<OutreachStat[]> {
  const rows = await db.execute<{
    outcome: string;
    count: number;
    total: number;
  }>(sql`
    SELECT
      outcome,
      COUNT(*)::int AS count,
      SUM(COUNT(*)) OVER ()::int AS total
    FROM call_logs
    GROUP BY outcome
    ORDER BY count DESC
  `);

  return (rows.rows ?? []).map((r) => ({
    outcome: r.outcome,
    count: r.count,
    contactRate:
      r.total > 0
        ? Math.round((r.count / r.total) * 1000) / 10
        : 0,
  }));
}

/**
 * Recent activity log: last N lead notes + call logs, unified, newest first.
 */
export async function getRecentActivityLog(limit = 50): Promise<ActivityEntry[]> {
  const rows = await db.execute<{
    id: string;
    type: "note" | "call";
    address: string;
    city: string;
    text: string;
    created_at: Date;
  }>(sql`
    SELECT
      ln.id::text,
      'note' AS type,
      p.address,
      p.city,
      ln.note_text AS text,
      ln.created_at
    FROM lead_notes ln
    JOIN leads l ON l.id = ln.lead_id
    JOIN properties p ON p.id = l.property_id

    UNION ALL

    SELECT
      cl.id::text,
      'call' AS type,
      p.address,
      p.city,
      COALESCE(cl.notes, cl.outcome::text) AS text,
      cl.created_at
    FROM call_logs cl
    JOIN leads l ON l.id = cl.lead_id
    JOIN properties p ON p.id = l.property_id

    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return (rows.rows ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    address: r.address,
    city: r.city,
    text: r.text,
    createdAt: new Date(r.created_at),
  }));
}

/**
 * Simplified lead list for the call log form dropdown.
 * Returns id + address for up to 500 leads, ordered by address.
 */
export async function getLeadsForCallLog(): Promise<{ id: string; address: string }[]> {
  const rows = await db.execute<{
    id: string;
    address: string;
  }>(sql`
    SELECT l.id::text, p.address
    FROM leads l
    JOIN properties p ON p.id = l.property_id
    ORDER BY p.address
    LIMIT 500
  `);

  return (rows.rows ?? []).map((r) => ({
    id: r.id,
    address: r.address,
  }));
}

// -- Export queries --

/**
 * All properties with lead data for CSV export.
 */
interface PropertyExportDbRow extends Record<string, unknown> {
  id: string;
  parcel_id: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  county: string;
  owner_name: string | null;
  owner_type: string | null;
  property_type: string | null;
  status: string | null;
  distress_score: number | null;
  is_hot: boolean | null;
}

export async function getPropertiesForExport(): Promise<PropertyExportRow[]> {
  const rows = await db.execute<PropertyExportDbRow>(sql`
    SELECT
      p.id,
      p.parcel_id,
      p.address,
      p.city,
      p.state,
      p.zip,
      p.county,
      p.owner_name,
      p.owner_type,
      p.property_type,
      l.status,
      l.distress_score,
      l.is_hot
    FROM properties p
    LEFT JOIN leads l ON l.property_id = p.id
    ORDER BY p.city, p.address
  `);

  return (rows.rows ?? []).map((r) => ({
    id: r.id as string,
    parcelId: r.parcel_id as string,
    address: r.address as string,
    city: r.city as string,
    state: r.state as string,
    zip: r.zip as string | null,
    county: r.county as string,
    ownerName: r.owner_name as string | null,
    ownerType: r.owner_type as string | null,
    propertyType: r.property_type as string | null,
    status: r.status as string | null,
    distressScore: r.distress_score as number | null,
    isHot: r.is_hot as boolean | null,
  }));
}

/**
 * All deals for CSV export.
 */
export async function getDealsForExport(): Promise<DealExportRow[]> {
  const rows = await db.execute<{
    id: string;
    address: string;
    city: string;
    state: string;
    seller_name: string | null;
    seller_phone: string | null;
    condition: string | null;
    asking_price: number | null;
    arv: number | null;
    repair_estimate: number | null;
    wholesale_fee: number | null;
    mao: number | null;
    offer_price: number | null;
    status: string;
    assignment_fee: number | null;
    closing_date: string | null;
    created_at: Date;
  }>(sql`
    SELECT
      id, address, city, state,
      seller_name, seller_phone, condition,
      asking_price, arv, repair_estimate, wholesale_fee, mao, offer_price,
      status, assignment_fee, closing_date, created_at
    FROM deals
    ORDER BY created_at DESC
  `);

  return (rows.rows ?? []).map((r) => ({
    id: r.id,
    address: r.address,
    city: r.city,
    state: r.state,
    sellerName: r.seller_name,
    sellerPhone: r.seller_phone,
    condition: r.condition,
    askingPrice: r.asking_price,
    arv: r.arv,
    repairEstimate: r.repair_estimate,
    wholesaleFee: r.wholesale_fee,
    mao: r.mao,
    offerPrice: r.offer_price,
    status: r.status,
    assignmentFee: r.assignment_fee,
    closingDate: r.closing_date,
    createdAt: new Date(r.created_at),
  }));
}

/**
 * Active buyers for CSV export.
 */
export async function getBuyersForExport(): Promise<BuyerExportRow[]> {
  const rows = await db.execute<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    buy_box: string | null;
    min_price: number | null;
    max_price: number | null;
    funding_type: string | null;
    target_areas: string | null;
    rehab_tolerance: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: Date;
  }>(sql`
    SELECT
      id, name, phone, email, buy_box, min_price, max_price,
      funding_type, target_areas, rehab_tolerance, notes, is_active, created_at
    FROM buyers
    WHERE is_active = true
    ORDER BY name
  `);

  return (rows.rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    buyBox: r.buy_box,
    minPrice: r.min_price,
    maxPrice: r.max_price,
    fundingType: r.funding_type,
    targetAreas: r.target_areas,
    rehabTolerance: r.rehab_tolerance,
    notes: r.notes,
    isActive: r.is_active,
    createdAt: new Date(r.created_at),
  }));
}
