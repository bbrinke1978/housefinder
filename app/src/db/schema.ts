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
  doublePrecision,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

// -- Enums --

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

// -- Properties --

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
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    // UGRC assessor data (populated by import-ugrc-assessor script)
    buildingSqft: integer("building_sqft"),
    yearBuilt: integer("year_built"),
    assessedValue: integer("assessed_value"),
    lotAcres: numeric("lot_acres", { precision: 10, scale: 4 }),
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

// -- Distress Signals --

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

// -- Leads --

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
    leadSource: text("lead_source").default("scraping"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
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

// -- Lead Notes --

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    noteText: text("note_text").notNull(),
    noteType: text("note_type").notNull().default("user"), // "user" | "status_change"
    previousStatus: text("previous_status"),
    newStatus: text("new_status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_lead_notes_lead_id").on(table.leadId)]
);

// -- Scraper Health --

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

// -- Scraper Config --

export const scraperConfig = pgTable("scraper_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -- Owner Contacts --

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

// -- Buyers --

export const buyers = pgTable("buyers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  buyBox: text("buy_box"),
  minPrice: integer("min_price"),
  maxPrice: integer("max_price"),
  fundingType: text("funding_type"), // "cash" | "hard_money" | "both"
  targetAreas: text("target_areas"),
  rehabTolerance: text("rehab_tolerance"), // "light" | "medium" | "heavy" | "any"
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -- Deals --

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").references(() => properties.id), // nullable FK, no cascade
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("UT"),
    sellerName: text("seller_name"),
    sellerPhone: text("seller_phone"),
    condition: text("condition"), // "light" | "medium" | "heavy" | "tear_down"
    timeline: text("timeline"), // "asap" | "1_month" | "3_months" | "flexible"
    motivation: text("motivation"), // "inherited" | "financial_distress" | "vacant" | "divorce" | "other"
    askingPrice: integer("asking_price"),
    arv: integer("arv"),
    repairEstimate: integer("repair_estimate"),
    wholesaleFee: integer("wholesale_fee").default(15000),
    mao: integer("mao"),
    offerPrice: integer("offer_price"),
    status: text("status").notNull().default("lead"),
    // status values: lead | qualified | analyzed | offered | under_contract | marketing | assigned | closing | closed | dead
    assignedBuyerId: uuid("assigned_buyer_id").references(() => buyers.id),
    assignmentFee: integer("assignment_fee"),
    closingDate: date("closing_date"),
    contractStatus: text("contract_status"),
    // contractStatus values: null | sent | signed | in_escrow | title_clear | closing_scheduled
    earnestMoney: integer("earnest_money").default(100),
    inspectionDeadline: date("inspection_deadline"),
    earnestMoneyRefundable: boolean("earnest_money_refundable").default(true),
    comps: text("comps"), // JSON array of comparable sales
    arvNotes: text("arv_notes"), // free-text ARV research notes
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_deals_status").on(table.status),
    index("idx_deals_property_id").on(table.propertyId),
  ]
);

// -- Deal Notes --

export const dealNotes = pgTable(
  "deal_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    noteText: text("note_text").notNull(),
    noteType: text("note_type").notNull().default("user"), // "user" | "status_change"
    previousStatus: text("previous_status"),
    newStatus: text("new_status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_deal_notes_deal_id").on(table.dealId)]
);

export type BuyerRow = InferSelectModel<typeof buyers>;
export type DealRow = InferSelectModel<typeof deals>;
export type DealNoteRow = InferSelectModel<typeof dealNotes>;

// -- Budgets --

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .notNull()
    .unique()
    .references(() => deals.id),
  totalPlannedCents: integer("total_planned_cents").notNull().default(0),
  contingencyCents: integer("contingency_cents").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const budgetCategories = pgTable(
  "budget_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    plannedCents: integer("planned_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_budget_categories_budget_id").on(table.budgetId),
    uniqueIndex("uq_budget_category_name").on(table.budgetId, table.name),
  ]
);

export const receipts = pgTable("receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  budgetId: uuid("budget_id")
    .notNull()
    .references(() => budgets.id),
  blobUrl: text("blob_url").notNull(),
  blobName: text("blob_name").notNull(),
  ocrRawJson: text("ocr_raw_json"),
  vendor: text("vendor"),
  receiptDate: date("receipt_date"),
  totalCents: integer("total_cents"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => budgetCategories.id),
    receiptId: uuid("receipt_id").references(() => receipts.id),
    vendor: text("vendor"),
    description: text("description"),
    amountCents: integer("amount_cents").notNull(),
    expenseDate: date("expense_date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_expenses_budget_id").on(table.budgetId),
    index("idx_expenses_category_id").on(table.categoryId),
    index("idx_expenses_receipt_id").on(table.receiptId),
  ]
);

export type BudgetRow = InferSelectModel<typeof budgets>;
export type BudgetCategoryRow = InferSelectModel<typeof budgetCategories>;
export type ReceiptRow = InferSelectModel<typeof receipts>;
export type ExpenseRow = InferSelectModel<typeof expenses>;

// -- Call Logs --

export const callOutcomeEnum = pgEnum("call_outcome", [
  "answered",
  "voicemail",
  "no_answer",
  "wrong_number",
]);

export const callLogs = pgTable(
  "call_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    outcome: callOutcomeEnum("outcome").notNull(),
    source: text("source"), // "manual" | "tracerfy" | etc — nullable
    durationSeconds: integer("duration_seconds"), // nullable
    notes: text("notes"), // nullable
    calledAt: timestamp("called_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_call_logs_lead_id").on(table.leadId),
    index("idx_call_logs_called_at").on(table.calledAt),
  ]
);

export type CallLogRow = InferSelectModel<typeof callLogs>;

// -- Alert History --

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
