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

-- leads gain lead manager FK
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_manager_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_leads_lead_manager ON leads (lead_manager_id);

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
  | "lead.view_all"           // read all leads
  | "lead.edit_status"        // change lead status
  | "lead.edit_assigned_only" // can only edit leads where you're the lead_manager
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
  sales: ["lead.view_all", "lead.edit_assigned_only", "deal.view_all", "tracerfy.run",
    "campaign.send", "analytics.view_own"],
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
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const old = await db.select().from(auditLog).where(lt(auditLog.createdAt, cutoff));
    if (old.length === 0) {
      context.log(`[auditLogArchive] nothing to archive`);
      return;
    }
    await db.transaction(async (tx) => {
      await tx.insert(auditLogArchive).values(old);
      await tx.delete(auditLog).where(lt(auditLog.createdAt, cutoff));
    });
    context.log(`[auditLogArchive] archived ${old.length} rows`);
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

## Open questions for Brian (non-blocking)

These are baked into the plan as defaults; he can amend before execution or adjust via the admin console post-Phase 30:

1. **Sales role permissions** — proposed has `lead.edit_assigned_only` (Sales can only edit leads where they're the lead_manager). Should they be able to edit any lead after creating one via "driving for dollars"? Or only their own pipeline?
2. **Assistant scope** — currently read-only across the app. Brian said "give them additional access as needed" — supported via multi-role (give them `assistant + lead_manager` etc.). Confirm that's the model.
3. **Stacee's auto-assignment** — defaulting `default_disposition_user_id` and `default_coordinator_user_id` to her even though she's a Lead Manager. OK for now, or default to Brian's user_id until a real DM/TC is hired?
4. **Existing data backfill** — the 5,000+ existing leads have no `lead_manager_id`. Backfill them all to Stacee, or leave NULL and assign as she touches them?

## RESEARCH COMPLETE
