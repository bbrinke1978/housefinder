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
