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

// -- Buyer CRM Enums --

export const buyerCommEventTypeEnum = pgEnum("buyer_comm_event_type", [
  "called_buyer",
  "left_voicemail",
  "emailed_buyer",
  "sent_text",
  "met_in_person",
  "deal_blast",
  "note",
]);

export const buyerDealInteractionStatusEnum = pgEnum(
  "buyer_deal_interaction_status",
  ["blasted", "interested", "closed"]
);

// -- Buyers --

export const buyers = pgTable(
  "buyers",
  {
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
    followUpDate: date("follow_up_date"),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_buyers_follow_up_date").on(table.followUpDate)]
);

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
    sqft: integer("sqft"), // total sq ft from floor plans (sum of all floor plan totalSqft)
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

// -- Buyer Communication Events --

export const buyerCommunicationEvents = pgTable(
  "buyer_communication_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id),
    eventType: buyerCommEventTypeEnum("event_type").notNull(),
    notes: text("notes"),
    dealId: uuid("deal_id").references(() => deals.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_buyer_comm_events_buyer_id").on(table.buyerId),
    index("idx_buyer_comm_events_occurred_at").on(table.occurredAt),
  ]
);

// -- Buyer-Deal Interactions --

export const buyerDealInteractions = pgTable(
  "buyer_deal_interactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    status: buyerDealInteractionStatusEnum("status")
      .notNull()
      .default("blasted"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_buyer_deal_interactions_buyer_id").on(table.buyerId),
    index("idx_buyer_deal_interactions_deal_id").on(table.dealId),
    uniqueIndex("uq_buyer_deal_interaction").on(table.buyerId, table.dealId),
  ]
);

// -- Buyer Tags --

export const buyerTags = pgTable(
  "buyer_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id),
    tag: text("tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_buyer_tags_buyer_id").on(table.buyerId),
    index("idx_buyer_tags_tag").on(table.tag),
    uniqueIndex("uq_buyer_tag").on(table.buyerId, table.tag),
  ]
);

export type BuyerCommunicationEventRow = InferSelectModel<
  typeof buyerCommunicationEvents
>;
export type BuyerDealInteractionRow = InferSelectModel<
  typeof buyerDealInteractions
>;
export type BuyerTagRow = InferSelectModel<typeof buyerTags>;

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

// -- Contact Events & Email Campaigns --

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
    // Default cadence from Brian's sales system: Day 1, 3, 7, 14, 30
    delayDays: integer("delay_days").notNull().default(0),
    subject: text("subject").notNull(),
    // Stores template with {firstName}, {senderName}, etc. merge fields
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
    // status values: active | paused | completed | stopped
    status: text("status").notNull().default("active"),
    nextSendAt: timestamp("next_send_at", { withTimezone: true }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),
    // stopReason values: deal_closed | unenrolled | completed | email_bounced | re_enrolled
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
  // status values: sent | bounced | failed | quota_exceeded
  status: text("status").notNull().default("sent"),
});

export type ContactEventRow = InferSelectModel<typeof contactEvents>;
export type EmailSequenceRow = InferSelectModel<typeof emailSequences>;
export type EmailStepRow = InferSelectModel<typeof emailSteps>;
export type CampaignEnrollmentRow = InferSelectModel<typeof campaignEnrollments>;
export type EmailSendLogRow = InferSelectModel<typeof emailSendLog>;

// -- Contracts & E-Signature --

export const contractStatusEnum = pgEnum("contract_lifecycle_status", [
  "draft",
  "sent",
  "seller_signed",
  "countersigned",
  "executed",
  "expired",
  "voided",
  "amended",
]);

export const contractTypeEnum = pgEnum("contract_type", [
  "purchase_agreement",
  "assignment",
]);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    contractType: contractTypeEnum("contract_type").notNull(),
    status: contractStatusEnum("status").notNull().default("draft"),
    // Auto-filled from deal, user can edit before sending
    propertyAddress: text("property_address").notNull(),
    city: text("city").notNull(),
    county: text("county"),
    parcelId: text("parcel_id"),
    sellerName: text("seller_name"),
    buyerName: text("buyer_name"),
    purchasePrice: integer("purchase_price"),
    arv: integer("arv"),
    assignmentFee: integer("assignment_fee"),
    earnestMoney: integer("earnest_money").default(100),
    inspectionPeriodDays: integer("inspection_period_days").default(10),
    closingDays: integer("closing_days").default(30),
    // Editable clauses — stored as JSON array of {id, title, body, order, isDefault}
    clauses: text("clauses"), // JSON string
    // Signed PDF stored in Azure Blob Storage
    signedPdfBlobName: text("signed_pdf_blob_name"),
    signedPdfUrl: text("signed_pdf_url"),
    documentHash: text("document_hash"), // SHA-256 of final signed PDF
    // Lifecycle timestamps
    sentAt: timestamp("sent_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_contracts_deal_id").on(table.dealId),
    index("idx_contracts_status").on(table.status),
  ]
);

export const contractSigners = pgTable(
  "contract_signers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id),
    signerOrder: integer("signer_order").notNull(), // 1 = first signer, 2 = countersigner
    signerRole: text("signer_role").notNull(), // "seller" | "buyer" | "wholesaler"
    signerName: text("signer_name").notNull(),
    signerEmail: text("signer_email").notNull(),
    signingToken: text("signing_token").notNull().unique(), // crypto.randomUUID()
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signatureData: text("signature_data"), // base64 PNG (drawn) or typed name
    signatureType: text("signature_type"), // "drawn" | "typed"
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    documentHash: text("document_hash"), // SHA-256 of PDF at time of signing
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_contract_signers_contract_id").on(table.contractId),
    uniqueIndex("uq_contract_signer_order").on(
      table.contractId,
      table.signerOrder
    ),
  ]
);

export type ContractRow = InferSelectModel<typeof contracts>;
export type ContractSignerRow = InferSelectModel<typeof contractSigners>;

// -- Property Photos --

export const photoCategory = pgEnum("photo_category", [
  "exterior",
  "kitchen",
  "bathroom",
  "living",
  "bedroom",
  "garage",
  "roof",
  "foundation",
  "yard",
  "other",
]);

export const propertyPhotos = pgTable(
  "property_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id").references(() => deals.id),
    propertyId: uuid("property_id").references(() => properties.id),
    isInbox: boolean("is_inbox").notNull().default(false),
    blobName: text("blob_name").notNull(),
    blobUrl: text("blob_url").notNull(),
    category: photoCategory("category").notNull().default("other"),
    caption: text("caption"),
    isCover: boolean("is_cover").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    fileSizeBytes: integer("file_size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_property_photos_deal_id").on(table.dealId),
    index("idx_property_photos_property_id").on(table.propertyId),
    index("idx_property_photos_is_inbox").on(table.isInbox),
  ]
);

export type PropertyPhotoRow = InferSelectModel<typeof propertyPhotos>;

// -- Floor Plans --

export const floorPlans = pgTable(
  "floor_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id").references(() => deals.id),
    propertyId: uuid("property_id").references(() => properties.id),
    floorLabel: text("floor_label").notNull().default("main"),
    // floorLabel values: main | upper | basement | garage | other
    version: text("version").notNull().default("as-is"),
    // version values: as-is | proposed
    sourceType: text("source_type").notNull(),
    // sourceType values: upload | sketch
    blobName: text("blob_name"),
    blobUrl: text("blob_url"),
    mimeType: text("mime_type"),
    // mimeType values: application/pdf | image/jpeg | image/png
    sketchData: text("sketch_data"), // JSON string for sketch rooms
    naturalWidth: integer("natural_width"), // px, for coordinate normalization
    naturalHeight: integer("natural_height"), // px, for coordinate normalization
    totalSqft: integer("total_sqft"),
    shareToken: text("share_token").unique(),
    shareExpiresAt: timestamp("share_expires_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_floor_plans_deal_id").on(table.dealId),
    index("idx_floor_plans_property_id").on(table.propertyId),
    index("idx_floor_plans_share_token").on(table.shareToken),
  ]
);

export const floorPlanPins = pgTable(
  "floor_plan_pins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    floorPlanId: uuid("floor_plan_id")
      .notNull()
      .references(() => floorPlans.id, { onDelete: "cascade" }),
    xPct: doublePrecision("x_pct").notNull(), // 0.0 to 1.0
    yPct: doublePrecision("y_pct").notNull(), // 0.0 to 1.0
    category: text("category").notNull(),
    // category values: plumbing|electrical|structural|cosmetic|hvac|roofing|flooring|painting|windows_doors|kitchen|bathroom|landscaping|general
    note: text("note"),
    budgetCategoryId: uuid("budget_category_id"), // soft link to budget_categories — no FK constraint
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_floor_plan_pins_plan_id").on(table.floorPlanId),
  ]
);

export type FloorPlanRow = InferSelectModel<typeof floorPlans>;
export type FloorPlanPinRow = InferSelectModel<typeof floorPlanPins>;

// -- Users --

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = InferSelectModel<typeof users>;
export type PasswordResetTokenRow = InferSelectModel<typeof passwordResetTokens>;
