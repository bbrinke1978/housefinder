import type { Session } from "next-auth";

// -- Admin gate --
//
// Sync helpers live in this file (no "use server" directive) because Next.js
// requires every export from a "use server" module to be an async function.
// Server actions (in feedback-actions.ts) import isAdmin from here; the
// attachment API routes do the same.

const ADMIN_EMAILS = ["bbrinke1978@gmail.com"] as const;

/**
 * isAdmin — returns true if the session user's email is in the admin list.
 * Reused by feedback-actions.ts server actions and by the attachment API
 * routes for the upload/delete authorization gate.
 */
export function isAdmin(session: Session | null): boolean {
  return Boolean(
    session?.user?.email &&
      ADMIN_EMAILS.includes(
        session.user.email as typeof ADMIN_EMAILS[number]
      )
  );
}
