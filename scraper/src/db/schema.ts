import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────

export const signalTypeEnum = pgEnum("signal_type", [
  "nod",
  "tax_lien",
  "lis_pendens",
  "probate",
  "code_violation",
  "vacant",
]);

export const signalStatusEnum = pgEnum("signal_status", [
  "active",
  "resolved",
]);

export const ownerTypeEnum = pgEnum("owner_type", [
  "individual",
  "llc",
  "trust",
  "estate",
  "unknown",
]);

// ── Properties ─────────────────────────────────────────────────────────────

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parcelId: text("parcel_id").notNull().unique(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("UT"),
    zip: text("zip"),
    county: text("county").notNull(),
    ownerName: text("owner_name"),
    ownerType: ownerTypeEnum("owner_type").default("unknown"),
    propertyType: text("property_type"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_properties_city").on(table.city),
    index("idx_properties_county").on(table.county),
  ]
);

// ── Distress Signals ───────────────────────────────────────────────────────

export const distressSignals = pgTable(
  "distress_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id),
    signalType: signalTypeEnum("signal_type").notNull(),
    status: signalStatusEnum("status").notNull().default("active"),
    recordedDate: date("recorded_date"),
    sourceUrl: text("source_url"),
    rawData: text("raw_data"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_distress_signals_property_id").on(table.propertyId),
    index("idx_distress_signals_signal_type").on(table.signalType),
    uniqueIndex("uq_distress_signal_dedup").on(
      table.propertyId,
      table.signalType,
      table.recordedDate
    ),
  ]
);

// ── Leads ──────────────────────────────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .unique()
      .references(() => properties.id),
    status: text("status").notNull().default("new"),
    newLeadStatus: text("new_lead_status").notNull().default("new"),
    distressScore: integer("distress_score").notNull().default(0),
    isHot: boolean("is_hot").notNull().default(false),
    alertSent: boolean("alert_sent").notNull().default(false),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_leads_hot_status").on(table.isHot, table.status),
    index("idx_leads_new_lead_status").on(table.newLeadStatus),
  ]
);

// ── Scraper Health ─────────────────────────────────────────────────────────

export const scraperHealth = pgTable("scraper_health", {
  id: serial("id").primaryKey(),
  county: text("county").notNull().unique(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastResultCount: integer("last_result_count").default(0),
  consecutiveZeroResults: integer("consecutive_zero_results")
    .notNull()
    .default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Scraper Config ─────────────────────────────────────────────────────────

export const scraperConfig = pgTable("scraper_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Owner Contacts ────────────────────────────────────────────────────────

export const ownerContacts = pgTable(
  "owner_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id),
    phone: text("phone"),
    email: text("email"),
    source: text("source").notNull(),
    isManual: boolean("is_manual").notNull().default(false),
    needsSkipTrace: boolean("needs_skip_trace").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_owner_contacts_property_id").on(table.propertyId),
    uniqueIndex("uq_owner_contacts_property_source").on(
      table.propertyId,
      table.source
    ),
  ]
);

// ── Alert History ─────────────────────────────────────────────────────────

export const alertHistory = pgTable(
  "alert_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    channel: text("channel").notNull(),
    runDate: text("run_date").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_alert_history").on(
      table.leadId,
      table.channel,
      table.runDate
    ),
    index("idx_alert_history_lead_id").on(table.leadId),
  ]
);
