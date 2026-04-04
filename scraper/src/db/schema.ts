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

// ── Deals ──────────────────────────────────────────────────────────────────

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id").references(() => properties.id),
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("UT"),
    status: text("status").notNull().default("lead"),
    // status values: lead | qualified | analyzed | offered | under_contract |
    // marketing | assigned | closing | closed | dead
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

// ── Contact Events & Email Campaigns ──────────────────────────────────────

export const contactEventTypeEnum = pgEnum("contact_event_type", [
  "called_client",
  "left_voicemail",
  "emailed_client",
  "sent_text",
  "met_in_person",
  "received_email",
]);

export const contactEvents = pgTable(
  "contact_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    eventType: contactEventTypeEnum("event_type").notNull(),
    notes: text("notes"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_contact_events_lead_id").on(table.leadId),
    index("idx_contact_events_occurred_at").on(table.occurredAt),
  ]
);

export const emailSequences = pgTable("email_sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const emailSteps = pgTable(
  "email_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => emailSequences.id),
    stepNumber: integer("step_number").notNull(),
    delayDays: integer("delay_days").notNull().default(0),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_email_steps_sequence_step").on(
      table.sequenceId,
      table.stepNumber
    ),
  ]
);

export const campaignEnrollments = pgTable(
  "campaign_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => emailSequences.id),
    currentStep: integer("current_step").notNull().default(0),
    status: text("status").notNull().default("active"),
    nextSendAt: timestamp("next_send_at", { withTimezone: true }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),
    stopReason: text("stop_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_campaign_enrollments_lead_id").on(table.leadId),
    index("idx_campaign_enrollments_next_send_at").on(table.nextSendAt),
  ]
);

export const emailSendLog = pgTable("email_send_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: uuid("enrollment_id")
    .notNull()
    .references(() => campaignEnrollments.id),
  stepId: uuid("step_id")
    .notNull()
    .references(() => emailSteps.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  toEmail: text("to_email").notNull(),
  resendEmailId: text("resend_email_id"),
  sentAt: timestamp("sent_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull().default("sent"),
});

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
