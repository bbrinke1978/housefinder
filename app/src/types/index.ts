export type LeadStatus = "new" | "contacted" | "follow_up" | "closed" | "dead";

export const LEAD_SOURCES = [
  { value: "scraping", label: "Scraping Data", color: "bg-slate-500" },
  { value: "flyer", label: "Flyer", color: "bg-green-500" },
  { value: "signage", label: "Signage", color: "bg-amber-500" },
  { value: "driving", label: "Driving for $", color: "bg-orange-500" },
  { value: "word_of_mouth", label: "Word of Mouth", color: "bg-indigo-500" },
  { value: "website", label: "Website", color: "bg-blue-500" },
  { value: "voicemail", label: "Voicemail", color: "bg-teal-500" },
  { value: "other", label: "Other", color: "bg-rose-500" },
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCES)[number]["value"];
export type NewLeadStatus = "new" | "unreviewed";
export type SignalType =
  | "nod"
  | "tax_lien"
  | "lis_pendens"
  | "probate"
  | "code_violation"
  | "vacant";
export type SignalStatus = "active" | "resolved";

export interface PropertyWithLead {
  id: string;
  leadId: string;
  parcelId: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  county: string;
  ownerName: string | null;
  ownerType: string | null;
  propertyType: string | null;
  distressScore: number;
  isHot: boolean;
  leadStatus: LeadStatus;
  newLeadStatus: NewLeadStatus;
  leadSource: string | null;
  firstSeenAt: Date | null;
  lastViewedAt: Date | null;
  lastContactedAt: Date | null;
  /** True when an active deal exists for this property */
  hasDeal?: boolean;
  /** Number of contact touchpoints logged for this lead */
  touchpointCount?: number;
  /** True when a real (non-mailing) email exists in ownerContacts for this property */
  hasEmail?: boolean;
  /** Skip trace status: traced_found, traced_not_found, or null (not traced) */
  traceStatus?: "traced_found" | "traced_not_found" | null;
  // UGRC assessor data (may be null if not yet imported)
  buildingSqft: number | null;
  yearBuilt: number | null;
  assessedValue: number | null;
  lotAcres: string | null;
  // Phase 31: unified activity feed card indicator data (fetched in dashboard page)
  lastActivity?: import("@/lib/activity-queries").ActivityEntry | null;
  activityCount?: number;
  // Phase 32: dismiss state (populated by getProperties)
  dismissedAt?: Date | null;
  dismissedReason?: string | null;
}

/** Map view: includes coordinates and aggregated signal types */
export interface MapProperty extends PropertyWithLead {
  latitude: number;
  longitude: number;
  signalTypes: SignalType[];
}

/** Pipeline view: id = lead ID, propertyId = property ID */
export interface PipelineLead extends PropertyWithLead {
  propertyId: string;
}

export interface DistressSignalRow {
  id: string;
  signalType: SignalType;
  status: SignalStatus;
  recordedDate: string | null;
  sourceUrl: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface LeadNote {
  id: string;
  leadId: string;
  noteText: string;
  noteType: "user" | "status_change";
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: Date;
}

export interface OwnerContact {
  id: string;
  propertyId: string;
  phone: string | null;
  email: string | null;
  source: string;
  isManual: boolean;
  needsSkipTrace: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// -- Deal Pipeline Types --

export const DEAL_STATUSES = [
  "lead",
  "qualified",
  "analyzed",
  "offered",
  "under_contract",
  "marketing",
  "assigned",
  "closing",
  "closed",
  "dead",
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export const CONTRACT_STATUSES = [
  "sent",
  "signed",
  "in_escrow",
  "title_clear",
  "closing_scheduled",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONDITION_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
  { value: "tear_down", label: "Tear Down" },
] as const;

export const TIMELINE_OPTIONS = [
  { value: "asap", label: "ASAP" },
  { value: "1_month", label: "1 Month" },
  { value: "3_months", label: "3 Months" },
  { value: "flexible", label: "Flexible" },
] as const;

export const MOTIVATION_OPTIONS = [
  { value: "inherited", label: "Inherited" },
  { value: "financial_distress", label: "Financial Distress" },
  { value: "vacant", label: "Vacant" },
  { value: "divorce", label: "Divorce" },
  { value: "other", label: "Other" },
] as const;

export interface Buyer {
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
  updatedAt: Date;
}

export interface BuyerWithTags extends Buyer {
  tags: string[];
  followUpDate: string | null;
  lastContactedAt: Date | null;
}

export interface BuyerTimelineEntry {
  id: string;
  type: "comm_event" | "deal_interaction";
  eventType?: string;
  status?: string;
  notes?: string | null;
  dealId?: string | null;
  dealAddress?: string | null;
  occurredAt: Date;
}

export interface BuyerDealInteraction {
  id: string;
  buyerId: string;
  dealId: string;
  status: string;
  dealAddress: string;
  dealCity: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuyerWithMatchInfo extends Buyer {
  tags: string[];
  matchesArea: boolean;
  isFullMatch: boolean;
}

export interface OverdueBuyer {
  id: string;
  name: string;
  followUpDate: string;
}

export interface DealComp {
  address: string;
  salePrice: number;
  details?: string; // e.g. "3bd/2ba 1400sqft"
  dom?: number; // days on market
  notes?: string;
}

export interface DealWithBuyer {
  id: string;
  propertyId: string | null;
  address: string;
  city: string;
  state: string;
  sellerName: string | null;
  sellerPhone: string | null;
  condition: string | null;
  timeline: string | null;
  motivation: string | null;
  askingPrice: number | null;
  arv: number | null;
  repairEstimate: number | null;
  wholesaleFee: number | null;
  mao: number | null;
  offerPrice: number | null;
  status: DealStatus;
  assignedBuyerId: string | null;
  assignmentFee: number | null;
  closingDate: string | null;
  contractStatus: string | null;
  earnestMoney: number | null;
  inspectionDeadline: string | null;
  earnestMoneyRefundable: boolean | null;
  comps: string | null; // JSON: DealComp[]
  arvNotes: string | null;
  leadSource: string | null; // "wholesale" when promoted from wholesale lead
  createdAt: Date;
  updatedAt: Date;
  // RBAC (Phase 29): deal assignee FKs
  acquisitionUserId?: string | null;
  dispositionUserId?: string | null;
  coordinatorUserId?: string | null;
  // from joins
  buyerName?: string | null;
  // assessor data from linked property
  buildingSqft?: number | null;
  yearBuilt?: number | null;
  assessedValue?: number | null;
  lotAcres?: string | null;
  // from floor plans: sum of all floor plan totalSqft
  sqft?: number | null;
  // Phase 32: archive fields
  archivedAt?: Date | null;
  archivedByUserId?: string | null;
  archivedReason?: string | null;
}

export interface DealNote {
  id: string;
  dealId: string;
  noteText: string;
  noteType: "user" | "status_change";
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: Date;
}

// -- Budget Types --

export const DEFAULT_BUDGET_CATEGORIES = [
  "Demo / Site Prep",
  "Foundation / Structural",
  "Framing / Carpentry",
  "Roofing",
  "Exterior / Siding",
  "Windows / Doors",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Insulation",
  "Drywall",
  "Paint / Finish Work",
  "Flooring",
  "Kitchen",
  "Bathrooms",
  "Interior Trim",
  "Landscaping",
  "Permits / Fees",
  "Miscellaneous",
] as const;
// Note: "Contingency" is NOT a category — it's a separate 10% reserve on the budget level

export interface BudgetCategory {
  id: string;
  name: string;
  sortOrder: number;
  plannedCents: number;
  actualCents: number; // computed from expenses SUM
}

export interface BudgetSummary {
  id: string;
  dealId: string;
  totalPlannedCents: number;
  contingencyCents: number; // 10% of totalPlannedCents, auto-calculated
  totalSpentCents: number; // SUM of all expenses
  remainingCents: number; // totalPlannedCents + contingencyCents - totalSpentCents
  percentUsed: number; // totalSpentCents / (totalPlannedCents + contingencyCents) * 100
  categories: BudgetCategory[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseLine {
  id: string;
  budgetId: string;
  categoryId: string;
  categoryName: string; // from join
  receiptId: string | null;
  vendor: string | null;
  description: string | null;
  amountCents: number;
  expenseDate: string;
  notes: string | null;
  createdAt: Date;
}

// Budget health status for MAO profit indicators (per user decision)
export type BudgetHealth = "profitable" | "break_even" | "loss";

// -- Email Campaign & Contact Event Types --

export type ContactEventType =
  | "called_client"
  | "left_voicemail"
  | "emailed_client"
  | "sent_text"
  | "met_in_person"
  | "received_email";

export const CONTACT_EVENT_LABELS: Record<ContactEventType, string> = {
  called_client: "Called client",
  left_voicemail: "Left voicemail",
  emailed_client: "Emailed client",
  sent_text: "Sent text",
  met_in_person: "Met in person",
  received_email: "Received email",
};

export type CampaignStatus = "active" | "paused" | "completed" | "stopped";

export interface EmailSequenceSummary {
  id: string;
  name: string;
  isActive: boolean;
  stepCount: number;
  activeEnrollments: number;
  totalSent: number;
}

export interface EnrollmentWithDetails {
  id: string;
  leadId: string;
  ownerName: string | null;
  address: string;
  city: string;
  currentStep: number;
  totalSteps: number;
  status: CampaignStatus;
  nextSendAt: Date | null;
  enrolledAt: Date;
}

export interface ContactEvent {
  id: string;
  leadId: string;
  eventType: ContactEventType;
  notes: string | null;
  occurredAt: Date;
}

export interface TimelineEntry {
  id: string;
  type: ContactEventType | "note" | "email_sent" | "status_change";
  label: string;
  notes: string | null;
  occurredAt: Date;
}

export const MAIL_SETTINGS_KEYS = {
  FROM_NAME: "mail.fromName",
  FROM_EMAIL: "mail.fromEmail",
  REPLY_TO: "mail.replyTo",
  RESEND_KEY: "mail.resendApiKey",
  PHONE: "mail.phone",
  SIGNATURE: "mail.signature",
} as const;

// -- Tracerfy Skip Trace Types --

export const TRACERFY_CONFIG_KEYS = {
  RUN_HISTORY: "tracerfy.runHistory",
  MONTHLY_SPEND: "tracerfy.monthlySpend",
  LOW_BALANCE_THRESHOLD: "tracerfy.lowBalanceThreshold",
  MONTHLY_CAP: "tracerfy.monthlyCap",
} as const;

export interface TracerfyRunEntry {
  date: string; // ISO date
  count: number;
  found: number;
  notFound: number;
  creditsUsed: number;
}

export interface TracerfyStatus {
  configured: boolean;
  balance: number | null;
  error?: string;
}

export interface TracerfyConfig {
  lowBalanceThreshold: number; // default 2.00
  monthlyCap: number; // default 50.00
}

export interface MailSettings {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  resendApiKey: string;
  phone: string;
  signature: string;
}

/**
 * Default follow-up cadence from Brian's sales system.
 * Day 1 Call → Day 3 Text → Day 7 Call → Day 14 Call → Day 30 Call
 * Email sequences mirror this cadence.
 */
export const DEFAULT_SEQUENCE_DELAY_DAYS = [1, 3, 7, 14, 30] as const;

/**
 * Pre-built call scripts from Brian's sales training system.
 * Stored as structured data for display in the call script modal.
 */
export type CallScriptType =
  | "acquisitions"
  | "dispositions"
  | "agent_partnership"
  | "jv_partner"
  | "objection_handling";

export const CALL_SCRIPT_LABELS: Record<CallScriptType, string> = {
  acquisitions: "Acquisitions Script",
  dispositions: "Dispositions Script",
  agent_partnership: "Agent Partnership Script",
  jv_partner: "JV Partner Script",
  objection_handling: "Objection Handling",
};

export interface CallScriptStep {
  label: string;
  text: string;
}

// -- Contract & E-Signature Types --

export type ContractLifecycleStatus =
  | "draft"
  | "sent"
  | "seller_signed"
  | "countersigned"
  | "executed"
  | "expired"
  | "voided"
  | "amended";

export type ContractType = "purchase_agreement" | "assignment";

export interface ContractClause {
  id: string;
  title: string;
  body: string;
  order: number;
  isDefault: boolean;
}

export const DEFAULT_PURCHASE_CLAUSES: ContractClause[] = [
  {
    id: "as-is",
    title: "As-Is Condition",
    body: "Buyer agrees to purchase the Property in its current \"as-is\" condition. Seller makes no warranties, representations, or guarantees of any kind, express or implied, regarding the condition of the Property, including without limitation its physical condition, structural integrity, mechanical systems, or compliance with applicable laws or regulations.",
    order: 1,
    isDefault: true,
  },
  {
    id: "inspection",
    title: "Inspection Period",
    body: "Buyer shall have 10 business days from the date of full execution of this Agreement (the \"Inspection Period\") to conduct any and all inspections of the Property at Buyer's sole expense. If Buyer is not satisfied with the condition of the Property for any reason, Buyer may cancel this Agreement by written notice to Seller prior to the expiration of the Inspection Period, and the Earnest Money shall be returned to Buyer in full.",
    order: 2,
    isDefault: true,
  },
  {
    id: "earnest-money",
    title: "Earnest Money",
    body: "Buyer shall deposit $100.00 (the \"Earnest Money\") with the closing agent within 3 business days of the date of full execution of this Agreement. The Earnest Money shall be applied toward the Purchase Price at closing. In the event this Agreement is terminated pursuant to the Inspection Period provision, the Earnest Money shall be refunded to Buyer.",
    order: 3,
    isDefault: true,
  },
  {
    id: "closing-timeline",
    title: "Closing Timeline",
    body: "The closing of this transaction (\"Closing\") shall occur within 30 days from the date of full execution of this Agreement, or on such other date as the parties may agree in writing. Time is of the essence with respect to the Closing date.",
    order: 4,
    isDefault: true,
  },
  {
    id: "title-closing-costs",
    title: "Title and Closing Costs",
    body: "Seller shall convey clear and marketable title to the Property by general warranty deed, free and clear of all liens, encumbrances, and restrictions, except for those of record that Buyer has approved. Seller shall pay for the cost of the title insurance commitment and the owner's title insurance policy. Each party shall pay their own closing costs unless otherwise agreed in writing.",
    order: 5,
    isDefault: true,
  },
  {
    id: "assignment",
    title: "Assignment Clause",
    body: "Buyer may assign this Agreement, or any interest herein, to any third party without the consent of Seller. In the event of assignment, the assignee shall assume all obligations of Buyer under this Agreement and Buyer shall be released from all further obligations hereunder.",
    order: 6,
    isDefault: true,
  },
  {
    id: "default-remedies",
    title: "Default and Remedies",
    body: "If either party defaults in the performance of their obligations under this Agreement, the non-defaulting party shall be entitled to retain or recover the Earnest Money as liquidated damages, which the parties agree is a reasonable estimate of the damages that would be suffered in the event of such default. This shall be the sole and exclusive remedy of the non-defaulting party for such default.",
    order: 7,
    isDefault: true,
  },
];

export const DEFAULT_ASSIGNMENT_CLAUSES: ContractClause[] = [
  {
    id: "assignment-terms",
    title: "Assignment of Contract",
    body: "Assignor hereby assigns, transfers, and conveys to Assignee all of Assignor's right, title, and interest in and to that certain Purchase and Sale Agreement (the \"Original Agreement\") including all rights to purchase the Property described therein. Assignee hereby assumes all obligations of Assignor under the Original Agreement from and after the date of this Assignment.",
    order: 1,
    isDefault: true,
  },
  {
    id: "assignment-fee",
    title: "Assignment Fee",
    body: "In consideration of this Assignment, Assignee shall pay to Assignor an Assignment Fee in the amount specified herein. The Assignment Fee shall be paid at closing and shall be in addition to the original Purchase Price under the Original Agreement.",
    order: 2,
    isDefault: true,
  },
  {
    id: "earnest-money-assignment",
    title: "Earnest Money",
    body: "Assignee shall be responsible for all Earnest Money required under the Original Agreement. Any Earnest Money previously deposited by Assignor shall be credited against amounts owed by Assignee.",
    order: 3,
    isDefault: true,
  },
  {
    id: "closing-timeline-assignment",
    title: "Closing Timeline",
    body: "The Closing shall occur on the date specified in the Original Agreement, or on such other date as may be agreed upon by all parties. Assignee acknowledges and accepts the Closing timeline set forth in the Original Agreement.",
    order: 4,
    isDefault: true,
  },
  {
    id: "representations",
    title: "Representations",
    body: "Assignor represents and warrants that: (a) the Original Agreement is in full force and effect; (b) Assignor is not in default under the Original Agreement; (c) Assignor has the full right and authority to assign the Original Agreement; and (d) the Original Agreement has not been previously assigned.",
    order: 5,
    isDefault: true,
  },
];

import type { ContractRow, ContractSignerRow, FloorPlanRow, FloorPlanPinRow } from "@/db/schema";

export interface ContractWithSigners extends ContractRow {
  signers: ContractSignerRow[];
  parsedClauses: ContractClause[];
}

// -- Floor Plan Types --

export type FloorLabel = 'main' | 'upper' | 'basement' | 'garage' | 'other';
export type FloorPlanVersion = 'as-is' | 'proposed';
export type FloorPlanSourceType = 'upload' | 'sketch';

export type PinCategory =
  | 'plumbing'
  | 'electrical'
  | 'structural'
  | 'cosmetic'
  | 'hvac'
  | 'roofing'
  | 'flooring'
  | 'painting'
  | 'windows_doors'
  | 'kitchen'
  | 'bathroom'
  | 'landscaping'
  | 'general';

export const PIN_COLORS: Record<PinCategory, string> = {
  plumbing: '#3b82f6',      // blue
  electrical: '#eab308',    // yellow
  structural: '#ef4444',    // red
  cosmetic: '#a855f7',      // purple
  hvac: '#06b6d4',          // cyan
  roofing: '#f97316',       // orange
  flooring: '#84cc16',      // lime
  painting: '#ec4899',      // pink
  windows_doors: '#14b8a6', // teal
  kitchen: '#1e4d8c',       // brand blue
  bathroom: '#6366f1',      // indigo
  landscaping: '#22c55e',   // green
  general: '#94a3b8',       // slate
};

export interface SketchRoom {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lengthFt: number;
  widthFt: number;
  sqft: number;
}

export interface FloorPlanWithPins {
  plan: FloorPlanRow;
  pins: FloorPlanPinRow[];
  sasUrl: string | null;
}

// -- Wholesale Lead Types --

export interface WholesaleLeadWithWholesaler {
  id: string;
  address: string;
  addressNormalized: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  askingPrice: number | null;
  arv: number | null;
  repairEstimate: number | null;
  sqft: number | null;
  beds: number | null;
  baths: string | null;
  lotSize: string | null;
  yearBuilt: number | null;
  taxId: string | null;
  mao: number | null;
  dealScore: number | null;
  verdict: string | null;
  scoreBreakdown: string | null;
  status: string;
  sourceChannel: string | null;
  rawEmailText: string | null;
  parsedDraft: string | null;
  promotedDealId: string | null;
  wholesalerName: string | null;
  wholesalerEmail: string | null;
  wholesalerPhone: string | null;
  wholesalerCompany: string | null;
  wholesalerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WholesalerWithStats {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  isActive: boolean;
  totalSent: number;
  totalPromoted: number;
  avgSpread: number | null;
  createdAt: Date;
}

export interface WholesaleScoreBreakdown {
  maoSpreadPts: number;
  equityPctPts: number;
  endBuyerRoiPts: number;
  total: number;
  verdict: "green" | "yellow" | "red";
  mao: number;
  spreadDollars: number;
  endBuyerProfit: number;
  endBuyerRoi: number;
}

export interface ParsedWholesaleDeal {
  address: string | null;
  askingPrice: number | null;
  arv: number | null;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  yearBuilt: number | null;
  taxId: string | null;
  wholesalerName: string | null;
  wholesalerPhone: string | null;
  wholesalerEmail: string | null;
  confidence: number;
}

export const CALL_SCRIPTS: Record<CallScriptType, CallScriptStep[]> = {
  acquisitions: [
    {
      label: "Opener",
      text: "Hey this is {senderName}, I'm looking to buy a few properties in {city}. Is this the owner of {address}?",
    },
    {
      label: "Discovery",
      text: "Tell me a little about the property — how long have you owned it? What's the condition like?",
    },
    {
      label: "Motivation",
      text: "What's driving your interest in selling right now? Is there a timeline you're working with?",
    },
    {
      label: "Price",
      text: "Have you thought about a price you'd be happy with? What would make this a no-brainer for you?",
    },
    {
      label: "Surprise",
      text: "[Pause after their number.] Hmm... [silence] That's a bit more than I was thinking, but let me see what I can do.",
    },
    {
      label: "Close",
      text: "If I can get you [offer] cash, close in 2 weeks, no repairs, no commissions — would you be open to moving forward?",
    },
  ],
  dispositions: [
    {
      label: "Opener",
      text: "Hey this is {senderName}, I have an off-market deal in {city} — are you still buying in that area?",
    },
    {
      label: "Price Range",
      text: "We're at [asking price]. What price range are you working in right now?",
    },
    {
      label: "Rehab Level",
      text: "This one needs [condition] work. Are you comfortable with that level of rehab?",
    },
    {
      label: "Cash Ready",
      text: "Are you buying with cash or do you have financing lined up?",
    },
    {
      label: "Timeline",
      text: "We can close in 2-3 weeks. Does that timeline work for you?",
    },
  ],
  agent_partnership: [
    {
      label: "Opener",
      text: "Hey this is {senderName}, I work with investors buying off-market deals in {city}. Do you work with investors?",
    },
    {
      label: "Cash Buy",
      text: "We buy properties as-is, all cash, fast close. No showings, no repairs, no hassle for the seller.",
    },
    {
      label: "Front Commission",
      text: "We pay a buyer's agent commission on the front end — you get paid at closing just like a traditional sale.",
    },
    {
      label: "Back-End Listing",
      text: "Once we rehab it, we typically list with the agent who brought us the deal. That's a second commission for you.",
    },
  ],
  jv_partner: [
    {
      label: "Opener",
      text: "Hey this is {senderName}. We find deeply discounted off-market deals. You bring the capital. We split the profit 50/50.",
    },
    {
      label: "Our Role",
      text: "We handle acquisition, negotiation, project management, and disposition. You're passive.",
    },
    {
      label: "Your Role",
      text: "You fund the purchase and rehab. We protect your capital with an assignment of contract and/or deed.",
    },
    {
      label: "Returns",
      text: "Typical deals net $20-50k profit split equally. Average hold time 60-120 days.",
    },
  ],
  objection_handling: [
    {
      label: "Retail Price Response",
      text: "I totally understand — you want top dollar. The challenge is I have to account for repairs, holding costs, and my profit. Here's what I can offer...",
    },
    {
      label: "Too Low Response",
      text: "I hear you. Can you help me understand what you need to net out of this? Let's see if we can find a number that works.",
    },
    {
      label: "Ask",
      text: "What's the best you can do on price?",
    },
    {
      label: "Mirror",
      text: "[Repeat their last 2-3 words back as a question.] 'The repairs are too much'... the repairs are too much?",
    },
    {
      label: "Surprise",
      text: "[Audible inhale.] Hmm... [long pause] That's tough for me to work with.",
    },
    {
      label: "Silence",
      text: "[Say nothing. Let them fill the silence. They often lower their number.]",
    },
    {
      label: "Soft Counter",
      text: "What if I could get you [slightly higher number]? Could we do something today?",
    },
  ],
};
