---
status: research
phase: 29
created: 2026-04-28
purpose: Light technical research for RBAC schema, audit log, and auth gates
---

# Phase 29 Technical Research

## Summary

Confidence: **HIGH**. Almost everything reuses existing patterns:
- Postgres `text[]` for roles (Drizzle's `text("roles").array()`)
- NextAuth `authorize` callback already in use — just adds the domain + `is_active` checks
- Audit log is a standard write-side helper called from server actions
- Azure Function timer trigger pattern already used by the scraper Function App for the 30-day archive job

No new dependencies. No new infrastructure beyond a single Azure Function timer trigger.

## Schema additions

```sql
-- users gain roles + is_active
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active);

-- deals gain three assignee FKs
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS acquisition_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS disposition_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS coordinator_user_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_deals_acquisition_user ON deals (acquisition_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_disposition_user ON deals (disposition_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_coordinator_user ON deals (coordinator_user_id);

-- leads gain lead manager FK + creator FK
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_manager_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_leads_lead_manager ON leads (lead_manager_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads (created_by_user_id);

-- audit log (active 30-day window)
CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),  -- nullable for system-driven actions
  action        text NOT NULL,               -- 'lead.status_changed', 'deal.assignee_changed', etc.
  entity_type   text NOT NULL,               -- 'lead', 'deal', 'property', 'buyer', 'user'
  entity_id     uuid,                        -- nullable for entity-less actions like 'user.login'
  old_value     jsonb,
  new_value     jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_actor_created ON audit_log (actor_user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON audit_log (action);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);

-- audit log archive (rows >30 days, queryable but cold)
CREATE TABLE IF NOT EXISTS audit_log_archive (LIKE audit_log INCLUDING ALL);
```

Migration file: `app/drizzle/0016_rbac_foundation.sql`. Runner: `app/scripts/migrate-0016-rbac.ts` (mirror the 0015 runner pattern).

## Permission helper

```typescript
// app/src/lib/permissions.ts (new file, no "use server")

import type { Session } from "next-auth";

export type Role =
  | "owner"
  | "acquisition_manager"
  | "disposition_manager"
  | "lead_manager"
  | "transaction_coordinator"
  | "sales"
  | "assistant";

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
  | "feedback.triage";

const ROLE_GRANTS: Record<Role, Action[]> = {
  owner: ["lead.view_all", "lead.edit_status", "deal.view_all", "deal.create", "deal.edit_terms",
    "deal.edit_disposition", "deal.reassign_any", "deal.reassign_own", "buyer.view_all",
    "buyer.create_or_edit", "buyer.delete", "contract.generate", "contract.sign_as_agent",
    "deal.edit_closing_logistics", "campaign.send", "blast.send", "tracerfy.run",
    "analytics.view_all", "user.manage", "scraper_config.manage", "audit_log.view",
    "feedback.triage"],
  acquisition_manager: ["lead.view_all", "lead.edit_status", "deal.view_all", "deal.create",
    "deal.edit_terms", "deal.reassign_own", "buyer.view_all", "contract.generate",
    "contract.sign_as_agent", "campaign.send", "tracerfy.run", "analytics.view_own"],
  disposition_manager: ["lead.view_all", "deal.view_all", "deal.edit_disposition",
    "buyer.view_all", "buyer.create_or_edit", "contract.generate", "blast.send",
    "campaign.send", "tracerfy.run", "analytics.view_own"],
  lead_manager: ["lead.view_all", "lead.edit_status", "deal.view_all", "tracerfy.run",
    "campaign.send", "analytics.view_own"],
  transaction_coordinator: ["deal.view_all", "contract.generate", "contract.sign_as_agent",
    "deal.edit_closing_logistics", "analytics.view_own"],
  sales: ["lead.view_all", "lead.edit_assigned_or_self_created", "lead.create",
    "deal.view_all", "tracerfy.run", "campaign.send", "analytics.view_own"],
  assistant: ["lead.view_all", "deal.view_all", "buyer.view_all"],
};

export function userCan(roles: Role[] | undefined, action: Action): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => ROLE_GRANTS[r]?.includes(action) ?? false);
}

// Convenience: pull roles off the session
export function sessionCan(session: Session | null, action: Action): boolean {
  return userCan(session?.user?.roles as Role[] | undefined, action);
}

// Entity-scoped helper: can this user edit this specific lead?
// Owner / Acquisition Manager / Lead Manager → unconditional yes.
// Sales → only if assigned (lead_manager_id) OR creator (created_by_user_id).
// Everyone else → no.
export function canEditLead(
  session: Session | null,
  lead: { leadManagerId: string | null; createdByUserId: string | null }
): boolean {
  const roles = (session?.user?.roles as Role[] | undefined) ?? [];
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  if (roles.includes("owner")) return true;
  if (roles.includes("acquisition_manager")) return true;
  if (roles.includes("lead_manager")) return true;
  if (roles.includes("sales") && userId) {
    return lead.leadManagerId === userId || lead.createdByUserId === userId;
  }
  return false;
}
```

`session.user.roles` requires extending the NextAuth type — see `app/src/auth.ts` JWT/session callbacks. Add:

```typescript
async jwt({ token, user }) {
  if (user) {
    token.roles = (user as any).roles ?? [];
    token.userId = (user as any).id;
  }
  return token;
},
async session({ session, token }) {
  if (session.user) {
    (session.user as any).id = token.userId;
    (session.user as any).roles = token.roles ?? [];
  }
  return session;
},
```

## Audit log helper

```typescript
// app/src/lib/audit-log.ts (new file)

import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { headers } from "next/headers";

export async function logAudit(args: {
  actorUserId: string | null;
  action: string;             // e.g. 'lead.status_changed'
  entityType: string;         // 'lead' | 'deal' | 'property' | 'buyer' | 'user'
  entityId: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  try {
    const h = await headers();
    const ipAddress = h.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
    const userAgent = h.get("user-agent") ?? null;
    await db.insert(auditLog).values({
      actorUserId: args.actorUserId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      oldValue: args.oldValue ?? null,
      newValue: args.newValue ?? null,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    // Audit logging never blocks the user's action — log and continue.
    console.error("[audit-log] write failed:", err);
  }
}
```

## Auth changes

`app/src/auth.ts` — extend the `authorize` callback:

```typescript
async authorize(credentials) {
  const email = credentials?.email as string | undefined;
  const password = credentials?.password as string | undefined;
  if (!email || !password) return null;

  // Domain restriction (strict @no-bshomes.com)
  if (!email.toLowerCase().endsWith("@no-bshomes.com")) {
    return null;
  }

  // (existing user lookup logic)
  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (!user) return null;
  if (!user.isActive) return null;  // NEW: deactivated users blocked
  if ((user.roles ?? []).length === 0) return null;  // NEW: no roles = no login

  const ok = await bcryptjs.compare(password, user.passwordHash);
  if (!ok) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,  // NEW: pass roles through to JWT
  };
},
```

## Audit log archive job

New Azure Function in the scraper Function App at `scraper/src/functions/auditLogArchive.ts`. Timer trigger: `0 0 3 * * *` (3:00 AM UTC daily).

```typescript
import { app } from "@azure/functions";
import { db } from "../db/client";
import { auditLog, auditLogArchive } from "../db/schema";
import { lt } from "drizzle-orm";

app.timer("auditLogArchive", {
  schedule: "0 0 3 * * *",
  handler: async (timer, context) => {
    const archiveCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const dropCutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);    // 60 days

    // Step 1: copy >30-day rows from active to archive, then delete from active.
    const toArchive = await db.select().from(auditLog).where(lt(auditLog.createdAt, archiveCutoff));
    if (toArchive.length > 0) {
      await db.transaction(async (tx) => {
        await tx.insert(auditLogArchive).values(toArchive);
        await tx.delete(auditLog).where(lt(auditLog.createdAt, archiveCutoff));
      });
    }

    // Step 2: drop >60-day rows from archive entirely (Brian's 30/60/drop policy).
    const { rowCount: droppedCount } = await db
      .delete(auditLogArchive)
      .where(lt(auditLogArchive.createdAt, dropCutoff));

    context.log(`[auditLogArchive] archived ${toArchive.length}, dropped ${droppedCount ?? 0}`);
  },
});
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Forgetting to call `logAudit()` in a new server action | Medium-high | Code-review discipline + a lint rule once we hit a comfortable baseline. NOT using Postgres triggers because Drizzle-side audit makes more sense for actor/IP context. |
| `session.user.roles` not available in a deeply nested component | Low | Pass roles down via props from server components, or use a `useRoles()` client hook. Same pattern as `currentUserId`. |
| Locking yourself out via the domain restriction | Low | Brian + Shawn already have `@no-bshomes.com` accounts. The script `admin-reset-password.ts` works regardless of login state. |
| Auto-assignment fires but the default user is inactive | Medium | The Phase 30 admin console is a settings UI for these defaults. Server-side fallback: if the configured default is inactive, fall through to `null` (unassigned). |

## Brian's locked decisions (2026-04-28)

All open questions resolved (see 29-CONTEXT.md "Brian's locked decisions"). No remaining research blockers.

## RESEARCH COMPLETE
