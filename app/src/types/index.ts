export type LeadStatus = "new" | "contacted" | "follow_up" | "closed" | "dead";
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
  firstSeenAt: Date | null;
  lastViewedAt: Date | null;
  lastContactedAt: Date | null;
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
  createdAt: Date;
  updatedAt: Date;
  // from join
  buyerName?: string | null;
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
