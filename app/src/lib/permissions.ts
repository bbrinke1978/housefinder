// app/src/lib/permissions.ts
// Pure TS — no "use server". Callable from server components and server actions.

import type { Session } from "next-auth";

export type Role =
  | "owner"
  | "acquisition_manager"
  | "disposition_manager"
  | "lead_manager"
  | "transaction_coordinator"
  | "sales"
  | "assistant"
  | "jv_partner";

export type Action =
  // leads
  | "lead.view_all"                       // read all leads
  | "lead.create"                         // create a new lead from scratch (Sales / D4D)
  | "lead.edit_status"                    // change lead status (broad — any lead)
  | "lead.edit_assigned_or_self_created"  // can edit leads where assigned OR created by self (Sales)
  // deals
  | "deal.view_all"
  | "deal.create"
  | "deal.edit_terms"         // ARV, MAO, repairs, offer price
  | "deal.edit_disposition"   // marketing, blast
  | "deal.reassign_any"       // can swap assignees on any deal
  | "deal.reassign_own"       // can swap on own assigned deals
  // buyers
  | "buyer.view_all"
  | "buyer.create_or_edit"
  | "buyer.delete"
  // contracts
  | "contract.generate"
  | "contract.sign_as_agent"
  // closing-phase
  | "deal.edit_closing_logistics" // closing date, title, escrow
  // communications
  | "campaign.send"
  | "blast.send"
  // tracerfy
  | "tracerfy.run"
  // analytics
  | "analytics.view_all"
  | "analytics.view_own"
  // admin
  | "user.manage"
  | "scraper_config.manage"
  | "audit_log.view"
  // feedback
  | "feedback.triage"
  // jv partner
  | "jv.submit_lead"
  | "jv.view_own_ledger"
  | "jv.triage";

const ROLE_GRANTS: Record<Role, Action[]> = {
  owner: [
    "lead.view_all", "lead.edit_status", "deal.view_all", "deal.create", "deal.edit_terms",
    "deal.edit_disposition", "deal.reassign_any", "deal.reassign_own", "buyer.view_all",
    "buyer.create_or_edit", "buyer.delete", "contract.generate", "contract.sign_as_agent",
    "deal.edit_closing_logistics", "campaign.send", "blast.send", "tracerfy.run",
    "analytics.view_all", "user.manage", "scraper_config.manage", "audit_log.view",
    "feedback.triage", "jv.submit_lead", "jv.view_own_ledger", "jv.triage",
  ],
  acquisition_manager: [
    "lead.view_all", "lead.edit_status", "deal.view_all", "deal.create",
    "deal.edit_terms", "deal.reassign_own", "buyer.view_all", "contract.generate",
    "contract.sign_as_agent", "campaign.send", "tracerfy.run", "analytics.view_own",
  ],
  disposition_manager: [
    "lead.view_all", "deal.view_all", "deal.edit_disposition",
    "buyer.view_all", "buyer.create_or_edit", "contract.generate", "blast.send",
    "campaign.send", "tracerfy.run", "analytics.view_own",
  ],
  lead_manager: [
    "lead.view_all", "lead.edit_status", "deal.view_all", "tracerfy.run",
    "campaign.send", "analytics.view_own",
  ],
  transaction_coordinator: [
    "deal.view_all", "contract.generate", "contract.sign_as_agent",
    "deal.edit_closing_logistics", "analytics.view_own",
  ],
  sales: [
    "lead.view_all", "lead.edit_assigned_or_self_created", "lead.create",
    "deal.view_all", "tracerfy.run", "campaign.send", "analytics.view_own",
  ],
  assistant: ["lead.view_all", "deal.view_all", "buyer.view_all"],
  jv_partner: ["jv.submit_lead", "jv.view_own_ledger"],
};

/**
 * userCan — returns true if any of the user's roles grants the given action.
 * Returns false for empty/undefined roles array.
 */
export function userCan(roles: Role[] | undefined, action: Action): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => ROLE_GRANTS[r]?.includes(action) ?? false);
}

/**
 * sessionCan — convenience wrapper that pulls roles off the session object.
 */
export function sessionCan(session: Session | null, action: Action): boolean {
  return userCan((session?.user as { roles?: Role[] } | undefined)?.roles, action);
}

/**
 * canEditLead — entity-scoped permission check for lead editing.
 *
 * Owner / Acquisition Manager / Lead Manager → unconditional yes.
 * Sales → only if they are the assigned lead_manager OR the original creator.
 * Everyone else → no.
 */
export function canEditLead(
  session: Session | null,
  lead: { leadManagerId: string | null; createdByUserId: string | null }
): boolean {
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? [];
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  if (roles.includes("owner")) return true;
  if (roles.includes("acquisition_manager")) return true;
  if (roles.includes("lead_manager")) return true;
  if (roles.includes("sales") && userId) {
    return lead.leadManagerId === userId || lead.createdByUserId === userId;
  }
  return false;
}
