/**
 * gates.ts — Convenience helper that computes a typed permission object from a
 * session.  Keeps JSX clean: `{gates.canCreateDeal && <Button>Start Deal</Button>}`
 * instead of repeating `sessionCan(session, "deal.create")` inline.
 *
 * Returned booleans are always `true` or `false` — never undefined.
 */

import type { Session } from "next-auth";
import { sessionCan } from "@/lib/permissions";

export interface Gates {
  canCreateDeal: boolean;
  canEditTerms: boolean;
  canEditDisposition: boolean;
  canEditClosingLogistics: boolean;
  canReassignAny: boolean;
  canReassignOwn: boolean;
  canCreateOrEditBuyer: boolean;
  canRunTracerfy: boolean;
  canSendBlast: boolean;
  canSendCampaign: boolean;
  canViewAllLeads: boolean;
  canManageUsers: boolean;
  canViewAuditLog: boolean;
  canTriageFeedback: boolean;
  isOwner: boolean;
}

export function gates(session: Session | null): Gates {
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  return {
    canCreateDeal: sessionCan(session, "deal.create"),
    canEditTerms: sessionCan(session, "deal.edit_terms"),
    canEditDisposition: sessionCan(session, "deal.edit_disposition"),
    canEditClosingLogistics: sessionCan(session, "deal.edit_closing_logistics"),
    canReassignAny: sessionCan(session, "deal.reassign_any"),
    canReassignOwn: sessionCan(session, "deal.reassign_own"),
    canCreateOrEditBuyer: sessionCan(session, "buyer.create_or_edit"),
    canRunTracerfy: sessionCan(session, "tracerfy.run"),
    canSendBlast: sessionCan(session, "blast.send"),
    canSendCampaign: sessionCan(session, "campaign.send"),
    canViewAllLeads: sessionCan(session, "lead.view_all"),
    canManageUsers: sessionCan(session, "user.manage"),
    canViewAuditLog: sessionCan(session, "audit_log.view"),
    canTriageFeedback: sessionCan(session, "feedback.triage"),
    isOwner: roles.includes("owner"),
  };
}
