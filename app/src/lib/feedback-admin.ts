import type { Session } from "next-auth";
import { userCan } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

// -- Admin gate --
//
// Sync helpers live in this file (no "use server" directive) because Next.js
// requires every export from a "use server" module to be an async function.
// Server actions (in feedback-actions.ts) import isAdmin from here; the
// attachment API routes do the same.

/**
 * isAdmin — returns true if the session user has the 'feedback.triage' permission.
 * Replaced the old hardcoded email list with the RBAC permission check (Phase 29).
 * Backward compatible: Brian's owner role grants 'feedback.triage'.
 */
export function isAdmin(session: Session | null): boolean {
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles;
  return userCan(roles, "feedback.triage");
}
