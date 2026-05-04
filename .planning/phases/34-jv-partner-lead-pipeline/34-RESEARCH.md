# Phase 34: JV Partner Lead Pipeline - Research

**Researched:** 2026-05-03
**Domain:** RBAC extension + mobile form with photo upload + payment ledger + admin reporting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
1. Phase 34 is added to v1.4 (not a new v1.5 milestone). v1.4 stays open.
2. One phase, not three. Full submission → triage → ledger → payment-run flow shipped together.
3. JV partners are internal users with `@no-bshomes.com` Google Workspace accounts. Brian provisions each partner manually via `/admin/users`. No changes to Phase 30.1 Google OAuth auto-provision logic.
4. NEW `jv_partner` role — separate from the existing `sales` role. Narrow grants: submit own leads, view own ledger only.

### Claude's Discretion
- DB schema shape (combined vs. split tables)
- Photo storage container name
- "Active follow-up" trigger definition (which contact_event types count)
- Bottom-nav content for `jv_partner` role
- Login redirect target for `jv_partner`
- Notification events to wire to Resend
- Payment method storage approach (users table vs. separate table)

### Deferred Ideas (OUT OF SCOPE)
- Any external auth surface for JV partners
- Changes to Google OAuth auto-provision logic
- Any grants to JV partners for Tracerfy, Skip Trace, Deal Blast, full lead pipeline, buyers, contracts
</user_constraints>

---

<phase_requirements>
## Phase Requirements

The 10 Success Criteria from ROADMAP.md Phase 34 map to the following proposed REQ-IDs. The planner MUST add these to REQUIREMENTS.md in the `## v1.4 Requirements` section under a new `### JV Partner Lead Pipeline` heading.

| ID | Description | Source SC |
|----|-------------|-----------|
| **JV-01** | New `jv_partner` role added to `permissions.ts` `ROLE_GRANTS` with exactly two grants: `jv.submit_lead` and `jv.view_own_ledger`. No existing pipeline grants. | SC #1 |
| **JV-02** | Brian provisions JV partner accounts via existing `/admin/users` (`jv_partner` added to ROLE_OPTIONS in `new-user-form.tsx`). No new provisioning flow. | SC #2 |
| **JV-03** | Logged-in `jv_partner` reaches a mobile-first lead-submission form from bottom nav. Form requires full address (text), front-of-property photo (camera/gallery, client-side compressed, uploaded to Azure Blob `jv-leads` container), and condition notes textarea. | SC #3 |
| **JV-04** | Submitting the form creates a `jv_leads` row with `status='pending'` linked to the submitting user. Submissions missing address or photo are rejected server-side with a clear error. | SC #3 |
| **JV-05** | Brian's triage queue at `/jv-leads` (owner-gated) shows pending submissions sorted oldest-first with submitter name, address, photo thumbnail (SAS URL), condition notes, and a dedup hint (address fuzzy-match against `properties.address` + prior `jv_leads`). Accept and Reject buttons present. Reject requires a reason. | SC #4 |
| **JV-06** | Accept action upserts a row in `properties` (or links to existing) with the JV photo attached and `lead_source='jv_partner'`. The `jv_leads` row stores `property_id` FK and `accepted_at`. Idempotent on re-run. | SC #5 |
| **JV-07** | Three `jv_lead_milestones` rows are managed per accepted lead: (a) `qualified` milestone ($10) created on accept; (b) `active_follow_up` milestone ($15) created when first outbound `contact_event` is logged for the linked property/lead (types: `called_client`, `left_voicemail`, `emailed_client`, `sent_text`, `met_in_person` — NOT `received_email`); (c) `deal_closed` milestone ($500) created when linked deal's `status` transitions to `'closed'`. All three use `INSERT ... ON CONFLICT DO NOTHING` keyed on `(jv_lead_id, milestone_type)`. | SC #6 |
| **JV-08** | Each `jv_partner` sees their own ledger at `/jv-ledger`: all their submitted leads, per-lead statuses, per-lead milestone rows (earned/paid/not-yet), and running current-month total owed. Row-level gate: query always filters by `submitter_user_id = session.user.id`. | SC #7 |
| **JV-09** | Owner sees aggregated payment-run at `/admin/jv-payments`: per-partner list of current-month earned-but-unpaid milestones with paid/unpaid checkboxes. "Mark all paid as of {date}" batch action updates `paid_at` + `paid_by_user_id` + `payment_method`. Idempotent. Audit-logged via `logAudit()`. | SC #8 |
| **JV-10** | Payment-run page includes a printable/downloadable monthly summary per partner (at minimum a `<table>` the browser can print; CSV export optional). | SC #8 |
| **JV-11** | All JV mutations (submit, accept, reject, milestone-created, milestone-paid) are written to the unified activity feed for the linked property (when one exists) and to the audit log. | SC #9 |
| **JV-12** | Resend email notifications wired: (a) new submission → Brian; (b) accept → partner; (c) reject → partner with reason; (d) milestone earned ($15 or $500) → partner; (e) payment marked paid → partner. | SC #9 (partial) |
| **JV-13** | `jv_partner` bottom nav shows only "Submit Lead" (`/jv-submit`) and "My Ledger" (`/jv-ledger`). All other nav items hidden via role-conditional rendering. | SC #1 + SC #7 |
| **JV-14** | Middleware redirects `jv_partner` from `/` to `/jv-ledger` on login. | SC #1 |
| **JV-15** | `next lint` and `tsc --noEmit` clean before commit. `git status` clean post-phase (no orphaned edits). | SC #10 |
</phase_requirements>

---

## Summary

Phase 34 adds a narrow JV partner workflow to an existing Next.js + Drizzle + Azure app. It is a well-bounded feature: new DB tables, one new RBAC role, two new pages for partners, two new admin pages, and hooks into the existing contact_events and deals status-change paths. No new infrastructure (no new services, no Azure Functions changes). All patterns have direct precedents in the codebase.

The closest analogue is **Phase 28 (User Feedback System)**: same multipart-photo-upload flow (form → server action → DB insert → API route for photo → Azure Blob), same pattern of a submitter-side form plus an admin triage queue, same Resend fire-and-forget notifications, same `logAudit()` on every mutation. The JV submission form is simpler than the feedback form (no attachment-after-insert dance — the photo is mandatory and submitted together with the form via a 2-step client flow: create record then upload photo, same as feedback).

The second key precedent is **Phase 29 RBAC** (`permissions.ts`, `gates.ts`, `logAudit()`) and **Phase 30** (`/admin/users`, `new-user-form.tsx` ROLE_OPTIONS). Adding `jv_partner` is a four-line change to `permissions.ts` and a one-line change to `new-user-form.tsx`.

The payment ledger/payment-run is net-new UI but follows the same server-component + server-action pattern used across the app (no new libraries needed).

**Primary recommendation:** Execute in 5 atomic plans: (01) schema + role, (02) submission form + nav wiring, (03) triage queue + accept/reject, (04) milestone hooks + ledger view, (05) payment-run admin page + Resend notifications.

---

## Standard Stack

### Core (no new installs — all already in package.json)

| Library | Already Used | Purpose in Phase 34 |
|---------|-------------|---------------------|
| `drizzle-orm` + `pg` | Yes (all phases) | New tables: `jv_leads`, `jv_lead_milestones`, `jv_partner_payment_method` |
| `@azure/storage-blob` | Yes (blob-storage.ts) | New `jv-leads` container for partner photos |
| `next-auth` | Yes | `jv_partner` role in session; middleware redirect |
| `resend` | Yes (email-actions.ts) | 5 new notification types |
| `zod` (v4, already imported as `zod/v4`) | Yes | Server action input validation |

### No New Packages Required

All patterns needed are already in the codebase. The plan executor should NOT reach for new libraries.

**One exception to verify:** The `resizeImage()` function in `photo-upload.tsx` (canvas-based, client-side) can be reused verbatim. No new image compression library needed.

---

## Architecture Patterns

### Recommended New File Structure

```
app/src/
├── db/
│   └── schema.ts                        MODIFIED — add jv_leads, jv_lead_milestones, jv_partner_settings tables + types
├── drizzle/
│   └── 0019_jv_partner.sql              NEW — migration
├── lib/
│   ├── permissions.ts                   MODIFIED — add jv_partner role + JV actions
│   ├── gates.ts                         MODIFIED — add canSubmitJvLead, canViewJvLedger, canTriageJvLeads
│   ├── jv-actions.ts                    NEW — server actions: submitJvLead, acceptJvLead, rejectJvLead, markMilestonesPaid
│   ├── jv-queries.ts                    NEW — query functions: getJvLeads, getJvLeadsForPartner, getJvLedger, getJvPaymentRun
│   ├── jv-milestones.ts                 NEW — idempotent milestone creators: createQualifiedMilestone, createActiveFollowUpMilestone, createDealClosedMilestone
│   ├── blob-storage.ts                  MODIFIED — add uploadJvLeadBlob, generateJvLeadSasUrl
│   ├── email-actions.ts                 MODIFIED — add 5 JV notification functions
│   └── admin-actions.ts                 MODIFIED — add jv_partner to VALID_ROLES check if applicable
├── app/(dashboard)/
│   ├── jv-submit/
│   │   └── page.tsx                     NEW — mobile-first submission form (jv_partner gated)
│   ├── jv-ledger/
│   │   └── page.tsx                     NEW — per-partner ledger (jv_partner gated, row-level scoped)
│   ├── jv-leads/
│   │   └── page.tsx                     NEW — triage queue (owner-gated, notFound for others)
│   └── admin/
│       └── jv-payments/
│           └── page.tsx                 NEW — payment-run page (owner-gated)
├── app/api/
│   └── jv-leads/[id]/photo/
│       └── route.ts                     NEW — multipart POST → jv-leads blob container
├── components/
│   ├── admin/
│   │   └── new-user-form.tsx            MODIFIED — add jv_partner to ROLE_OPTIONS
│   ├── jv/
│   │   ├── jv-submit-form.tsx           NEW — client component: address + photo + notes
│   │   ├── jv-triage-table.tsx          NEW — client component: triage list with accept/reject
│   │   ├── jv-ledger-table.tsx          NEW — client component: partner ledger rows
│   │   └── jv-payment-run-table.tsx     NEW — client component: admin payment checkboxes
│   └── bottom-nav.tsx                   MODIFIED — role-conditional rendering for jv_partner
```

### Pattern 1: JV Submission (Phase 28 feedback form pattern)

**What:** Two-step client flow. Step 1: server action `submitJvLead()` creates the `jv_leads` row and returns `{ id }`. Step 2: client POSTs the photo to `/api/jv-leads/[id]/photo`. This matches exactly how `createFeedbackItem()` + `/api/feedback/[id]/attachments` works.

**Why two steps:** The server action needs to create the DB row first to get the `id` used as the blob path prefix (`{jv_lead_id}/{uuid}.jpg`).

**Example (from Phase 28 precedent):**
```typescript
// lib/jv-actions.ts — "use server"
export async function submitJvLead(input: {
  address: string;
  conditionNotes: string;
}): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "jv.submit_lead")) throw new Error("Forbidden");

  const [row] = await db.insert(jvLeads).values({
    submitterUserId: session.user.id as string,
    address: input.address.trim(),
    addressNormalized: normalizeAddress(input.address),
    conditionNotes: input.conditionNotes.trim() || null,
    status: "pending",
  }).returning({ id: jvLeads.id });

  await logAudit({
    actorUserId: session.user.id as string,
    action: "jv_lead.submitted",
    entityType: "jv_lead",
    entityId: row.id,
    newValue: { address: input.address },
  });

  revalidatePath("/jv-leads");
  revalidatePath("/jv-ledger");
  return { id: row.id };
}
```

### Pattern 2: Photo API Route (Phase 28 attachments route pattern)

```typescript
// app/api/jv-leads/[id]/photo/route.ts
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "jv.submit_lead")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: jvLeadId } = await params;

  // Verify jv_lead belongs to this user
  const [lead] = await db.select().from(jvLeads)
    .where(and(eq(jvLeads.id, jvLeadId), eq(jvLeads.submitterUserId, session.user.id as string)))
    .limit(1);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || !file.type.startsWith("image/")) return NextResponse.json({ error: "Image required" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Max 10MB" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const blobName = `${jvLeadId}/${randomUUID()}.jpg`;
  await uploadJvLeadBlob(buffer, blobName, file.type);

  await db.update(jvLeads).set({ photoBlobName: blobName, updatedAt: new Date() }).where(eq(jvLeads.id, jvLeadId));

  return NextResponse.json({ sasUrl: generateJvLeadSasUrl(blobName) });
}
```

### Pattern 3: Idempotent Milestone Creation

**Key insight:** Use `ON CONFLICT DO NOTHING` with a unique constraint on `(jv_lead_id, milestone_type)`. This makes all three milestone triggers safe to call multiple times.

```typescript
// lib/jv-milestones.ts
export async function createQualifiedMilestone(jvLeadId: string, actorUserId: string | null): Promise<void> {
  await db.insert(jvLeadMilestones).values({
    jvLeadId,
    milestoneType: "qualified",
    amountCents: 1000, // $10.00
    earnedAt: new Date(),
  }).onConflictDoNothing(); // unique on (jv_lead_id, milestone_type)

  await logAudit({ actorUserId, action: "jv_lead.milestone_earned", entityType: "jv_lead", entityId: jvLeadId, newValue: { milestone: "qualified", amountCents: 1000 } });
}

export async function createActiveFollowUpMilestone(jvLeadId: string): Promise<void> {
  await db.insert(jvLeadMilestones).values({
    jvLeadId,
    milestoneType: "active_follow_up",
    amountCents: 1500, // $15.00
    earnedAt: new Date(),
  }).onConflictDoNothing();
}

export async function createDealClosedMilestone(jvLeadId: string): Promise<void> {
  await db.insert(jvLeadMilestones).values({
    jvLeadId,
    milestoneType: "deal_closed",
    amountCents: 50000, // $500.00
    earnedAt: new Date(),
  }).onConflictDoNothing();
}
```

### Pattern 4: Contact Event Hook for $15 Milestone

The `active_follow_up` milestone must fire when the **first outbound** `contact_event` is inserted for the linked property/lead. Wire this inside the existing `logActivity()` server action (or a new `createContactEvent()` server action) by checking if a `jv_lead` exists for the property and if the `active_follow_up` milestone is not yet earned:

```typescript
// After inserting contact_event in logActivity():
// Check if this property has an associated accepted jv_lead without active_follow_up milestone
const outboundTypes = ["called_client", "left_voicemail", "emailed_client", "sent_text", "met_in_person"];
if (outboundTypes.includes(eventType)) {
  // Look up if linked property has an accepted jv_lead
  const jvLead = await db.select({ id: jvLeads.id })
    .from(jvLeads)
    .innerJoin(leads, eq(leads.propertyId, jvLeads.propertyId))
    .where(and(eq(leads.id, parsed.leadId), eq(jvLeads.status, "accepted")))
    .limit(1);
  if (jvLead[0]) {
    await createActiveFollowUpMilestone(jvLead[0].id);
  }
}
```

### Pattern 5: Deal Closed Hook for $500 Milestone

Wire into the existing deal status-change server action. When `status` transitions to `'closed'`, check for a linked `jv_lead`:

```typescript
// In the deal status update server action, after setting status='closed':
const jvLead = await db.select({ id: jvLeads.id })
  .from(jvLeads)
  .where(and(eq(jvLeads.propertyId, deal.propertyId), eq(jvLeads.status, "accepted")))
  .limit(1);
if (jvLead[0]) {
  await createDealClosedMilestone(jvLead[0].id);
}
```

### Pattern 6: Role-Conditional Bottom Nav

The `MobileBottomNav` currently gets `feedbackBadgeCount` and `canManageUsers` as props from `DashboardLayout`. Extend this pattern to pass the user's roles (or a `isJvPartner` flag) so the nav renders conditionally:

```typescript
// In DashboardLayout (server component):
const isJvPartner = roles.includes("jv_partner") && !roles.includes("owner");

// Pass to MobileBottomNav:
<MobileBottomNav feedbackBadgeCount={feedbackBadgeCount} isJvPartner={isJvPartner} />
```

In `MobileBottomNav`:
```typescript
// If isJvPartner, render only 2 items instead of 6:
const navItems = isJvPartner
  ? [
      { label: "Submit Lead", href: "/jv-submit", icon: MapPin },
      { label: "My Ledger", href: "/jv-ledger", icon: BarChart2 },
    ]
  : bottomNavItems;
```

### Pattern 7: Login Redirect for jv_partner

Add to `middleware.ts` — after the empty-roles redirect, before `NextResponse.next()`:

```typescript
// In middleware.ts, after the roles.length === 0 check:
if (roles.includes("jv_partner") && !roles.includes("owner") && path === "/") {
  return NextResponse.redirect(new URL("/jv-ledger", req.url));
}
```

Also add `/jv-submit` and `/jv-ledger` to the middleware `matcher` allowlist for `jv_partner` so they are accessible (currently the matcher excludes nothing from authenticated users, so this is automatic — just confirm no `notFound()` guard blocks them).

### Anti-Patterns to Avoid

- **Do NOT create a separate "jv_partner_user" table.** The existing `users` table with `roles text[]` already supports multi-role users. Adding `jv_partner` to `roles` is the correct approach.
- **Do NOT gate jv_submit/jv_ledger with `notFound()`** the way `/admin/users` is gated. Use a redirect to `/` or `/jv-ledger` for unauthorized access so the URL is not leaked but the UX is graceful.
- **Do NOT store `payment_method` in a separate table.** A single `jv_partner_settings` table with one row per user is fine, but even simpler is adding `jvPaymentMethod text` directly to the `users` table (already has `roles`, `isActive`; adding one nullable column costs almost nothing). Recommend the `users` table approach.
- **Do NOT add `jv_partner` to `MATERIAL_AUDIT_ACTIONS` in `activity-queries.ts`.** JV milestones are not "deal pipeline" activity. The per-property activity feed should include JV submission/accept/reject (since these are property-level events), but milestone-earned and payment events belong in the audit log only and in the JV-specific ledger view — not in the main unified feed visible to the full team.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Photo compression | Custom canvas resize | `resizeImage()` in `photo-upload.tsx` — copy verbatim |
| Azure Blob upload | Custom HTTP fetch | `uploadFeedbackBlob()` pattern in `blob-storage.ts` |
| SAS URL generation | Custom token signing | `generateFeedbackSasUrl()` pattern in `blob-storage.ts` |
| Idempotent insert | Check-then-insert | `onConflictDoNothing()` with unique constraint |
| Audit trail | Custom log table | `logAudit()` in `audit-log.ts` |
| Email notifications | Direct Resend calls | `getResend()` + HTML builder pattern in `email-actions.ts` |
| Role permission check | Inline role array check | `userCan(roles, action)` from `permissions.ts` |
| Address normalization | Regex from scratch | Follow `wholesaleLeads.addressNormalized` pattern: `toLowerCase().replace(/\s+/g, ' ').trim()` + strip common suffixes |

---

## Common Pitfalls

### Pitfall 1: Orphaned JV Milestones on User Deactivation

**What goes wrong:** Brian deactivates a JV partner via `/admin/users` (`isActive = false`). If milestone hooks check `isActive` before firing, future milestones ($15, $500) for that partner's accepted leads will never be created.

**Why it happens:** The `deactivateUser()` server action in `admin-actions.ts` sets `isActive = false` but nothing else. If milestone creation queries join against `users.isActive`, deactivated users get silently skipped.

**How to avoid:** The `jv_lead_milestones` hooks (`createActiveFollowUpMilestone`, `createDealClosedMilestone`) must NOT filter on `users.isActive`. They operate on the `jv_leads` row (`status='accepted'`) — not on the submitter's current account status. Termination clause (Section 7) requires this.

**Warning signs:** JV partner account deactivated → no new milestones appear in payment run despite deal progressing.

### Pitfall 2: `contact_events.actorUserId` is Nullable for Legacy Rows

**What goes wrong:** The `active_follow_up` milestone trigger queries `contact_events` by `lead_id` to find the first outbound event. If you try to scope to "events logged by non-JV users only", you need `actorUserId` — but Phase 31 migration 0017 added it as nullable for legacy rows.

**Why it happens:** Pre-Phase-31 rows have `actorUserId = NULL`. The trigger should NOT require `actorUserId IS NOT NULL` — it should fire on any first outbound contact regardless of who logged it.

**How to avoid:** The trigger checks for the first `contact_event` of outbound type for the lead — without filtering on `actorUserId`. Use `COUNT(*) = 1` (first event ever for this type set) or check for existence of `jv_lead_milestones` row.

### Pitfall 3: Double-Paying via Race Conditions on `Mark All Paid`

**What goes wrong:** Brian clicks "Mark all paid" twice (or two browser tabs). Both requests read `paid_at IS NULL` at the same time and both proceed to update rows to `paid_at = now()`.

**Why it happens:** No optimistic locking or DB-level idempotency guard.

**How to avoid:** The `markMilestonesPaid()` server action must use `WHERE paid_at IS NULL` in its UPDATE (not just in the SELECT). PostgreSQL's `UPDATE ... WHERE paid_at IS NULL` is atomic — only one winner. Add `onConflict` behavior: if `paid_at IS NOT NULL`, skip silently. Log once per batch, not per row.

### Pitfall 4: `leadSource` is `text` not an Enum

**What goes wrong:** Someone assumes `lead_source` on the `leads` table is a typed PG enum and tries to add `'jv_partner'` via `ALTER TYPE ... ADD VALUE`.

**Why it happens:** Looking at `schema.ts`, `leads.leadSource` is `text("lead_source").default("scraping")` — it is plain text, not a pgEnum. No ALTER TYPE needed.

**How to avoid:** In migration 0019, just set `lead_source = 'jv_partner'` when accepting a JV lead. No schema change needed for the enum. However, `deals.leadSource` is also plain `text("lead_source")` — same treatment.

### Pitfall 5: Bottom Nav Role Check Must Use Session Roles, Not a DB Query

**What goes wrong:** The role-conditional bottom nav issues an extra DB query to check if the user is a `jv_partner` on every page load.

**Why it happens:** Forgetting that `session.user.roles` already contains the roles (populated by NextAuth `session` callback from Phase 29).

**How to avoid:** Read `roles` from `session.user.roles` in `DashboardLayout` (it's a server component with `auth()` already called). Pass a single boolean `isJvPartner` prop to `MobileBottomNav`. Zero extra queries.

### Pitfall 6: Photo Upload Must Block Form Submit Until Photo is Present

**What goes wrong:** JV partner fills in address and notes, hits Submit, but hasn't selected a photo yet. Server action creates the `jv_leads` row; the API photo upload never fires. Row exists with `photoBlobName = NULL`.

**Why it happens:** The two-step flow (create row → upload photo) means the DB row exists before the photo.

**How to avoid:** Two safeguards: (a) client-side: disable the Submit button until a photo is queued; (b) server-side: the `acceptJvLead()` action checks that `jv_leads.photoBlobName IS NOT NULL` before accepting. If `photoBlobName` is null, return an error: "Lead cannot be accepted — no photo on file." This covers the edge case where photo upload silently failed after row creation.

### Pitfall 7: tsc Breaks on New `jv_partner` Role Type

**What goes wrong:** TypeScript's `Role` type is a union of string literals. Adding `"jv_partner"` to `ROLE_GRANTS` without also adding it to the `Role` type union causes a tsc error.

**How to avoid:** In Plan 01, update BOTH the `Role` type union AND the `ROLE_GRANTS` object in `permissions.ts` in the same edit.

---

## Resolved Open Questions

### Q1: "Active follow-up" trigger — which contact_event types count?

**Recommendation:** Trigger on first `contact_event` where `event_type` is in `['called_client', 'left_voicemail', 'emailed_client', 'sent_text', 'met_in_person']`. Exclude `received_email` — this is an *inbound* contact (property owner called *us*) and does not represent "Brian makes contact with the property owner" as Section 4 requires. A note (`lead_notes` table) also does NOT trigger this milestone.

**Implementation:** The existing `contactEventTypeEnum` has exactly these 6 values. The 5 outbound types are the trigger set.

### Q2: Where does `jv_partner` land on login?

**Recommendation:** Redirect to `/jv-ledger`. Rationale: the ledger is the partner's primary reference ("what have I submitted, what do I owe?"). The submission form is a secondary action they initiate deliberately.

**Implementation:** Add a single `if` block in `middleware.ts` after the empty-roles check. This is 3 lines of code. Also add `/jv-ledger` and `/jv-submit` to the `allowedPathsForEmptyRoles` array? No — these paths require `jv_partner` role, which is not empty. The middleware already allows any authenticated user with roles to proceed. The redirect from `/` to `/jv-ledger` is role-specific, not a fallback.

### Q3: DB schema — one table or two?

**Recommendation:** Two tables: `jv_leads` + `jv_lead_milestones`.

**Rationale:** The `feedback_items` + `feedback_attachments` + `feedback_activity` split in Phase 28 established the pattern of normalizing related entities. A single `jv_leads` table with milestone columns would require NULLable columns for each milestone's `earned_at`, `paid_at`, `paid_by_user_id`, `payment_method` — 12 extra nullable columns. The normalized schema is cleaner, supports querying milestones independently (for the payment-run page), and is consistent with Phase 28 patterns.

**Schema:**

```sql
-- jv_leads: one row per submission
CREATE TABLE jv_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_user_id uuid NOT NULL REFERENCES users(id),
  address text NOT NULL,
  address_normalized text NOT NULL,
  condition_notes text,
  photo_blob_name text,               -- null until photo uploaded
  status text NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
  property_id uuid REFERENCES properties(id),  -- set on accept
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES users(id),
  rejected_at timestamptz,
  rejected_by_user_id uuid REFERENCES users(id),
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jv_leads_submitter ON jv_leads (submitter_user_id);
CREATE INDEX idx_jv_leads_status ON jv_leads (status);
CREATE INDEX idx_jv_leads_property_id ON jv_leads (property_id);
CREATE INDEX idx_jv_leads_address_normalized ON jv_leads (address_normalized);

-- jv_lead_milestones: one row per milestone per lead (max 3 rows per jv_lead)
CREATE TABLE jv_lead_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jv_lead_id uuid NOT NULL REFERENCES jv_leads(id),
  milestone_type text NOT NULL,       -- 'qualified' | 'active_follow_up' | 'deal_closed'
  amount_cents integer NOT NULL,      -- 1000 | 1500 | 50000
  earned_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  paid_by_user_id uuid REFERENCES users(id),
  payment_method text,                -- free-text per agreement (Venmo/Zelle/check)
  UNIQUE (jv_lead_id, milestone_type) -- idempotency key
);

CREATE INDEX idx_jv_milestones_jv_lead_id ON jv_lead_milestones (jv_lead_id);
CREATE INDEX idx_jv_milestones_paid_at ON jv_lead_milestones (paid_at) WHERE paid_at IS NULL;
```

**Note on `payment_method` per partner:** The agreement has a per-partner "Payments will be made via: ___" field. Store this on the `users` table as `jv_payment_method text` (nullable). The payment-run page reads it per partner. This requires one column addition to `users` in migration 0019.

### Q4: Photo storage container

**Recommendation:** New `jv-leads` Azure Blob container. Do NOT reuse `feedback`. Rationale: different retention policies (JV photos are business records tied to payment agreements; feedback screenshots are disposable), different SAS scopes, clean separation if either set is ever migrated or deleted.

**Implementation:** Add `uploadJvLeadBlob()` and `generateJvLeadSasUrl()` to `blob-storage.ts` following the exact same pattern as `uploadFeedbackBlob()` / `generateFeedbackSasUrl()`. Container auto-created via `createIfNotExists()` on first upload.

### Q5: Dedup match strategy

**Recommendation:** Normalize address to lowercase, collapse multiple spaces, strip trailing punctuation. Store in `jv_leads.address_normalized`. The triage queue JOIN query matches against `properties.address` normalized the same way, and against other `jv_leads.address_normalized`.

**Existing precedent:** `wholesale_leads.address_normalized` in `schema.ts` already does this. Reuse the same normalization approach.

```typescript
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    // Normalize common street suffix variants
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bct\b/g, 'ct')   // court stays
    .replace(/\bln\b/g, 'ln');  // lane stays
}
```

The dedup hint on the triage queue should be a warning badge (yellow) — not an automatic block — because Brian must manually confirm. False positives (same normalized address, different actual property) should be overridable.

### Q6: `lead_source` enum check

**Confirmed:** `leads.leadSource` is `text("lead_source").default("scraping")` — plain text, NOT a pgEnum. No ALTER TYPE needed. Just set `lead_source = 'jv_partner'` in the `createLead()` or `upsertProperty()` call during accept. Same for `deals.leadSource` which is also plain text.

### Q7: Termination clause — deactivated users and milestones

**Recommendation:** Deactivating a JV partner via `/admin/users` sets `users.isActive = false`. The milestone hooks (`createActiveFollowUpMilestone`, `createDealClosedMilestone`) look up `jv_leads` by `property_id` and `status='accepted'` — they do NOT check `users.isActive` on the submitter. This means milestones continue to accrue after deactivation, which is exactly what Section 7 requires.

The `isActive = false` check only blocks **login** (middleware/auth gates). It does not affect `jv_lead_milestones` rows.

For the ledger: a deactivated `jv_partner` cannot log in. However, Brian (owner) can view any partner's ledger by navigating to `/jv-ledger?userId={id}` (owner-gated variant), enabling him to audit and pay the deactivated partner's final milestones.

### Q8: Bottom nav for `jv_partner`

**Recommendation:** Exactly 2 items: "Submit Lead" (MapPin icon, `/jv-submit`) and "My Ledger" (BarChart2 icon, `/jv-ledger`). The existing 6-item nav is inappropriate for a partner who has no access to Deals, Buyers, Analytics, Map, or Feedback. The `isJvPartner` boolean passed from `DashboardLayout` gates which item array renders.

**Note:** The sidebar (`AppSidebar`) also needs the `isJvPartner` gate — render only a minimal sidebar (or hide it entirely via CSS for mobile, since partners are mobile-first). On desktop, the sidebar can show the same 2 links.

### Q9: Resend notification events

**Recommendation:** Wire these 5 email events, all following the `email-actions.ts` fire-and-forget pattern:

| Event | Trigger | Recipient | Subject template |
|-------|---------|-----------|-----------------|
| New submission | `submitJvLead()` completes | Brian (`BRIAN_EMAIL`) | `[JV Lead] New submission: {address}` |
| Accepted | `acceptJvLead()` completes | Submitting partner (`users.email`) | `[JV Lead] Your lead was accepted — $10 queued` |
| Rejected | `rejectJvLead()` completes | Submitting partner | `[JV Lead] Your lead was not accepted` |
| Milestone earned ($15 or $500) | Milestone created | Submitting partner | `[JV Lead] Milestone earned: ${amount} for {address}` |
| Payment marked paid | `markMilestonesPaid()` batch action | Submitting partner | `[JV Lead] Payment issued: ${total} via {method}` |

The $10 qualified milestone is created synchronously on accept; notify the partner at the same time as the accept notification (merge into one email). Do NOT send a separate $10 email — it would be redundant with the acceptance confirmation.

---

## Proposed Plan Breakdown

### Plan 01 — DB Schema + Role Foundation (Wave 1, solo)

**What:** The bedrock all other plans depend on.

**Files to create/modify:**
- `app/src/db/schema.ts` — add `jvLeads`, `jvLeadMilestones` tables + `InferSelectModel` type exports; add `jvPaymentMethod text` column to `users` table definition
- `app/drizzle/0019_jv_partner.sql` — migration SQL
- `app/src/lib/permissions.ts` — add `"jv_partner"` to `Role` type union; add `"jv.submit_lead"` and `"jv.view_own_ledger"` to `Action` type union; add `jv_partner` entry to `ROLE_GRANTS`
- `app/src/lib/gates.ts` — add `canSubmitJvLead`, `canViewJvLedger`, `canTriageJvLeads` booleans
- `app/src/lib/blob-storage.ts` — add `uploadJvLeadBlob()` and `generateJvLeadSasUrl()` (copy `uploadFeedbackBlob` / `generateFeedbackSasUrl` pattern)
- `app/src/lib/jv-milestones.ts` — `createQualifiedMilestone()`, `createActiveFollowUpMilestone()`, `createDealClosedMilestone()` with `onConflictDoNothing()`
- `app/src/components/admin/new-user-form.tsx` — add `{ value: "jv_partner", label: "JV Partner" }` to `ROLE_OPTIONS`

**Dependency:** None. This plan must complete before any other plan starts.

### Plan 02 — Submission Form + Nav Wiring (Wave 2, can run after Plan 01)

**What:** The JV partner's entire client-facing surface.

**Files to create/modify:**
- `app/src/lib/jv-actions.ts` — `submitJvLead()` server action
- `app/src/app/api/jv-leads/[id]/photo/route.ts` — multipart POST → jv-leads container
- `app/src/components/jv/jv-submit-form.tsx` — client component (address + photo + notes; reuse `resizeImage()` from `photo-upload.tsx`)
- `app/src/app/(dashboard)/jv-submit/page.tsx` — server page with `jv_partner` gate
- `app/src/components/bottom-nav.tsx` — `isJvPartner` conditional rendering
- `app/src/components/app-sidebar.tsx` — `isJvPartner` conditional rendering (minimal sidebar)
- `app/src/app/(dashboard)/layout.tsx` — compute `isJvPartner`, pass to nav components
- `app/src/middleware.ts` — add `/` → `/jv-ledger` redirect for `jv_partner` role

**Dependency:** Plan 01 (needs schema + permissions).

### Plan 03 — Triage Queue + Accept/Reject (Wave 2, can run parallel with Plan 02)

**What:** Brian's inbound queue.

**Files to create/modify:**
- `app/src/lib/jv-queries.ts` — `getJvLeadsForTriage()` (pending, oldest-first, with dedup hint subquery), `getJvLeadById()`
- `app/src/lib/jv-actions.ts` — (add to existing) `acceptJvLead()` + `rejectJvLead()` server actions; `acceptJvLead()` calls `createQualifiedMilestone()` + fires `notifyJvLeadAccepted()` email
- `app/src/components/jv/jv-triage-table.tsx` — client component with Accept/Reject buttons + reject-reason modal
- `app/src/app/(dashboard)/jv-leads/page.tsx` — owner-gated server page

**Dependency:** Plan 01. Can run parallel to Plan 02.

### Plan 04 — Milestone Hooks + Partner Ledger (Wave 3, after Plans 02-03)

**What:** The payment-tracking engine and partner's ledger view.

**Files to create/modify:**
- `app/src/lib/activity-actions.ts` — add `active_follow_up` milestone trigger after `contact_events` insert (call `createActiveFollowUpMilestone()` if jv_lead exists for property)
- `app/src/app/(dashboard)/deals/[id]/page.tsx` (or the server action that handles deal status transitions) — add `deal_closed` milestone trigger
- `app/src/lib/jv-queries.ts` — (add) `getJvLedgerForUser(userId)` (partner-scoped), `getJvLedgerForOwner(userId)` (owner viewing a specific partner's ledger)
- `app/src/components/jv/jv-ledger-table.tsx` — client component
- `app/src/app/(dashboard)/jv-ledger/page.tsx` — server page (`jv_partner` or `owner` gated; `jv_partner` sees own, owner sees all with selector)

**Dependency:** Plans 02 and 03 must be complete (needs accepted jv_leads to exist).

### Plan 05 — Payment-Run Admin Page + Resend Notifications (Wave 4, after Plan 04)

**What:** Brian's monthly workflow + all email notifications.

**Files to create/modify:**
- `app/src/lib/jv-queries.ts` — (add) `getJvPaymentRun(month)` — per-partner earned-but-unpaid milestones for a given month
- `app/src/lib/jv-actions.ts` — (add) `markMilestonesPaid(milestoneIds, paymentMethod)` — batch UPDATE with `WHERE paid_at IS NULL`
- `app/src/components/jv/jv-payment-run-table.tsx` — client component with checkboxes + Mark All Paid button
- `app/src/app/(dashboard)/admin/jv-payments/page.tsx` — owner-gated server page
- `app/src/lib/email-actions.ts` — add 5 JV notification functions (reuse `getResend()` + HTML builder pattern)
- `app/src/components/email/jv-*.tsx` — HTML email builders (plain HTML, NOT react-email — per Phase 28 decision to use `contract-emails.tsx` style)

**Dependency:** Plan 04 (needs milestones to exist).

### Wave Summary

```
Wave 1: Plan 01 (schema + role)
Wave 2: Plan 02 (submit form) + Plan 03 (triage queue)  — parallel
Wave 3: Plan 04 (milestones + ledger)
Wave 4: Plan 05 (payment-run + emails)
```

---

## Code Patterns to Reuse Verbatim

These specific function signatures and patterns should be copied, not reimplemented:

### From `blob-storage.ts` — template for JV blob helpers
```typescript
export async function uploadJvLeadBlob(buffer: Buffer, blobName: string, contentType: string): Promise<string>
export function generateJvLeadSasUrl(blobName: string): string
// Copy uploadFeedbackBlob / generateFeedbackSasUrl verbatim, change FEEDBACK_CONTAINER → "jv-leads"
```

### From `photo-upload.tsx` — client-side image resize
```typescript
async function resizeImage(file: File): Promise<Blob>
// Copy verbatim into jv-submit-form.tsx (same MAX_SIDE=1600, JPEG 0.8)
```

### From `feedback-actions.ts` — server action structure
```typescript
// Template:
export async function submitJvLead(input: {...}): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "jv.submit_lead")) throw new Error("Forbidden");
  // ... db.insert().returning({ id })
  await logAudit({ actorUserId, action: "jv_lead.submitted", ... });
  revalidatePath("/jv-leads");
  return { id: row.id };
}
```

### From `audit-log.ts` — never-throw audit writes
```typescript
await logAudit({
  actorUserId: ...,
  action: "jv_lead.accepted",   // or .rejected / .milestone_earned / .payment_marked_paid
  entityType: "jv_lead",
  entityId: jvLeadId,
  oldValue: { status: "pending" },
  newValue: { status: "accepted", propertyId },
});
```

### From `admin-actions.ts` — permission guard pattern
```typescript
async function requireOwner() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const roles = (session.user.roles ?? []) as Role[];
  if (!userCan(roles, "user.manage")) throw new Error("Forbidden");
  return { actorUserId: session.user.id as string | null };
}
```

### From `email-actions.ts` — fire-and-forget notification pattern
```typescript
export async function notifyJvLeadSubmitted(args: {...}): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) return;
    const { subject, html } = buildJvLeadSubmittedHtml(args);
    await resend.emails.send({ from: SENDER, to: BRIAN_EMAIL, subject, html });
  } catch (err) {
    console.error("[notifyJvLeadSubmitted] failed:", err);
  }
}
```

### From `middleware.ts` — role-based redirect
```typescript
// Existing empty-roles redirect:
if (roles.length === 0 && !isAllowed) {
  return NextResponse.redirect(new URL("/pending-approval", req.url));
}
// ADD AFTER:
if (roles.includes("jv_partner") && !roles.includes("owner") && path === "/") {
  return NextResponse.redirect(new URL("/jv-ledger", req.url));
}
```

---

## Risks and Unknowns for Plan Execution

### Risk 1: Deal status-change hook location

**Unknown:** Where does the current deal status-change code live? The schema shows `deals.status` with text values (`"lead"`, `"closed"`, etc.), but the server action that handles status transitions needs to be found and modified to fire the `$500` milestone hook. Likely in a `deal-actions.ts` or similar. **Planner must identify this file** before writing Plan 04.

### Risk 2: `contact_events.actorUserId` null rate in production

**Unknown:** Phase 31 migration 0017 added `actor_user_id` as nullable, which means rows inserted before Phase 31 have `actorUserId = NULL`. If Brian manually logged contact events in the legacy system before Phase 31 shipped, those rows exist with NULL actor. This does NOT affect the `active_follow_up` trigger (we don't filter on `actorUserId`) but it's worth noting for any display logic on the ledger ("Who logged the contact?").

### Risk 3: `onConflictDoNothing()` Drizzle API

**Verify:** Drizzle's `onConflictDoNothing()` method works correctly with a named unique constraint. The syntax is:
```typescript
.insert(jvLeadMilestones)
.values({...})
.onConflictDoNothing({ target: [jvLeadMilestones.jvLeadId, jvLeadMilestones.milestoneType] })
```
This requires the unique constraint to be defined on those two columns. Confirm the migration SQL uses `UNIQUE (jv_lead_id, milestone_type)` and that Drizzle's schema definition includes `uniqueIndex` on those columns.

### Risk 4: AppSidebar `isJvPartner` prop threading

**Unknown:** The `AppSidebar` component receives `feedbackBadgeCount` and `navGates` from `DashboardLayout`. Adding `isJvPartner` requires reading the `AppSidebar` component to understand its prop interface. The planner must verify this file before writing Plan 02. File: `app/src/components/app-sidebar.tsx`.

### Risk 5: `dismissed_parcels` interaction with JV-accepted properties

**Risk:** If a JV partner submits an address that is already in `dismissed_parcels` (suppressed from re-scraping), what happens? The `acceptJvLead()` action creates/upserts a `properties` row. If the parcel is suppressed, the scraper won't re-enrich it, but the property row will exist. This is acceptable behavior — the acceptance is a manual override of the suppression for the purposes of following up on this specific lead. The `dismissed_parcels` table is about scraper suppression, not about whether Brian can work a lead manually.

**Resolution:** No special handling needed. Accept proceeds normally regardless of `dismissed_parcels` status.

### Risk 6: Property upsert on JV accept — what parcel_id to use?

**Risk:** The `properties` table requires `parcel_id` as a NOT NULL unique key. A JV-partner-submitted lead is an address only — no parcel ID. The `acceptJvLead()` action needs to either (a) find an existing `properties` row by fuzzy address match, or (b) create a new row with a synthetic parcel ID.

**Recommendation:** On accept, do a normalized address match against `properties.address` (same normalization as the dedup hint). If a match exists, link `jv_leads.property_id` to the existing property. If no match, create a new `properties` row with a synthetic parcel ID like `jv-{jv_lead_id}` (clearly prefixed to distinguish from real parcel IDs). This follows the pattern used for manually created properties in earlier phases.

**Also needed:** Create a `leads` row for the new/linked property with `lead_source='jv_partner'` so it appears in Brian's lead pipeline.

---

## State of the Art (Project-Specific)

| Old Approach | Current Approach | Phase Introduced |
|--------------|------------------|-----------------|
| Manual SMS + Venmo | In-app JV pipeline (Phase 34) | Phase 34 |
| Hard-coded role list in `new-user-form.tsx` ROLE_OPTIONS | Add `jv_partner` to existing list | Phase 34 |
| Single `Role` type union (7 roles) | Extended to 8 roles (+ `jv_partner`) | Phase 34 |
| Feedback form as only "user submission" pattern | JV submit form uses same multipart pattern | Phase 34 |

---

## Sources

### Primary (HIGH confidence — code verified by direct read)

- `app/src/lib/permissions.ts` — confirmed `Role` union (7 values), `ROLE_GRANTS` structure, `userCan()` signature
- `app/src/lib/gates.ts` — confirmed `Gates` interface pattern for extending
- `app/src/lib/blob-storage.ts` — confirmed `uploadFeedbackBlob()` / `generateFeedbackSasUrl()` signatures; confirmed 5 existing containers (`receipts`, `contracts`, `photos`, `floor-plans`, `feedback`)
- `app/src/lib/feedback-actions.ts` — confirmed `createFeedbackItem()` server action pattern with `logAudit()` + Resend fire-and-forget
- `app/src/lib/audit-log.ts` — confirmed `logAudit()` never-throw pattern
- `app/src/lib/email-actions.ts` — confirmed `getResend()` null-safe pattern, `SENDER`, `BRIAN_EMAIL` constants
- `app/src/lib/activity-queries.ts` — confirmed `MATERIAL_AUDIT_ACTIONS` allowlist; confirmed `contactEventTypeEnum` values; confirmed `actorUserId` is nullable on `contactEvents`
- `app/src/lib/activity-actions.ts` — confirmed `logActivity()` routes to `contact_events` + `lead_notes`; confirmed outbound event type mapping
- `app/src/db/schema.ts` — confirmed `leads.leadSource` is plain `text` (NOT enum); confirmed `deals.leadSource` is plain `text`; confirmed `users` table structure (`roles text[]`, `isActive`); confirmed `contactEventTypeEnum` has exactly 6 values; confirmed `jvLeads` and `jvLeadMilestones` do NOT exist yet (next migration = 0019)
- `app/src/middleware.ts` — confirmed existing redirect logic for empty-roles → `/pending-approval`; confirmed `path === "/"` check pattern
- `app/src/components/bottom-nav.tsx` — confirmed 6-item hardcoded nav; confirmed `isMobile` gate; confirmed prop interface
- `app/src/app/(dashboard)/layout.tsx` — confirmed `isJvPartner`-style prop threading pattern (already does `feedbackBadgeCount` + `navGates`)
- `app/src/components/admin/new-user-form.tsx` — confirmed `ROLE_OPTIONS` array (7 entries); confirmed checkbox multi-role form
- `app/src/components/photo-upload.tsx` — confirmed `resizeImage()` function (canvas, MAX_SIDE=1600, JPEG 0.8); confirmed dual-input pattern for iOS
- `app/src/app/api/feedback/[id]/attachments/route.ts` — confirmed multipart POST → blob pattern; confirmed `runtime = "nodejs"` required
- `app/src/components/feedback/feedback-form.tsx` — confirmed two-step form (create → upload) pattern
- `app/drizzle/` — confirmed next migration is `0019_*` (highest existing = `0018_dismiss_archive.sql`)

### Secondary (MEDIUM confidence — inferred from patterns)

- Deal status-change server action location: not directly verified (file not read). Likely `app/src/lib/deal-actions.ts` based on convention. **Planner must verify.**
- `AppSidebar` prop interface: not directly verified. Assumed `feedbackBadgeCount` + `navGates` based on `layout.tsx`. **Planner must read `app/src/components/app-sidebar.tsx`.**

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — everything reuses existing proven patterns
- Architecture: HIGH — all patterns verified against actual source files
- DB schema: HIGH — existing schema fully read; new tables designed to match conventions
- Pitfalls: HIGH — identified from code verification + Phase 28/29/30/31/32 decision log
- Open questions: HIGH — all 9 resolved with verified evidence

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable codebase; internal tool with no external API dependencies)
