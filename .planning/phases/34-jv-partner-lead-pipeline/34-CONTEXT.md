# Phase 34 Context: JV Partner Lead Pipeline

**Created:** 2026-05-03
**Source documents:**
- `C:\Users\brian.BRIANRIPPER\OneDrive\Documents\nobshomes\NoBSHomes_JV_Agreement.docx` — the signed agreement Brian uses with each JV driver
- `.planning/v1.3-MILESTONE-AUDIT.md` — recent context on what just shipped
- Brian's clarifications during the 2026-05-03 add-phase session (see "Decisions" below)

---

## What Brian is automating

The "JV Partner" workflow today is manual:
- Brian's drivers (1-2 people) drive around looking for distressed-looking houses (peeling paint, overgrown yard, tarps on roof, etc.).
- They text Brian a photo + the address + a quick condition note.
- Brian decides if it's a real lead, adds it to his pipeline.
- If he closes a deal off it, he Venmos them their cut.

Phase 34 replaces all of that with an in-app workflow + automatic payment ledger.

---

## The agreement (full text — keep this verbatim, it's the source of truth)

**Pay structure:**

| Milestone | Amount | Trigger |
|-----------|--------|---------|
| Qualified Lead Accepted | $10 | Brian confirms the lead meets Section 3 criteria, paid within 7 days of confirmation |
| Lead Reaches Active Follow-Up | $15 | Brian makes contact with the property owner and opens a negotiation file (recognizes the 7-10 touch reality of working leads) |
| Deal Closes | $500 | Property sourced from the partner's lead results in a completed purchase by No-BS Homes |
| **Total possible per lead** | **Up to $525** | If a submitted lead progresses all the way to a closed deal |

Quick-hit payments ($10 and $15) are paid **regardless of whether the deal closes**. The $500 closing bonus is paid **in addition to** quick hits already received.

**Section 3 acceptance criteria (qualified lead):**
ALL of:
- Property shows visible signs of deferred maintenance — peeling paint, overgrown yard, broken windows, damaged roof, boarded doors, or general neglect
- Property is residential (single family, duplex, or small multi-family)
- Full property address submitted with at least one clear photo of the front
- Lead has not been previously submitted by another partner or sourced by No-BS Homes

**Disqualified:**
- Vacant land, commercial properties, storage units
- Properties already on MLS or with a real-estate agent
- Duplicate submissions of addresses already in the system

**Submission requirements:**
- Full property address
- At least one clear photo of the front of the property
- Brief condition notes (broken gutters, overgrown lawn, tarps on roof, boarded windows, etc.)
- Submitter's name and contact (auto from session)

Leads submitted **without a photo and address will not be accepted or compensated**.

**Payment timing (Section 6):**
- All payments **batched and issued on the 1st of each month**
- Applies to all three milestones — qualified, active follow-up, closing bonus
- Example: anything earned in May is paid in a single payment on June 1
- Running ledger visible to each JV partner — submitted leads, statuses, amounts owed, at any time
- Each line item gets a **paid/unpaid checkbox** to prevent duplicate payments
- Closing bonus that lands after the 1st rolls to the following month
- Disputes about payment status must be raised within 30 days
- Payment method line on the agreement is left blank — Brian fills it in per partner (likely Venmo / Zelle / check)

**General terms (Section 7):**
- JV Partner is an **independent contractor**, not an employee
- Brian (No-BS Homes) reserves the right to determine whether a lead qualifies and whether a deal has closed
- Either party may terminate with 7 days written notice
- **Leads already in the pipeline at termination remain eligible for the closing bonus** (important: don't auto-orphan a partner's open submissions when their account is deactivated)

---

## Decisions Brian made during the add-phase session (2026-05-03)

1. **Phase 34 is added to v1.4** (not a new v1.5 milestone). v1.4 stays open to absorb this.
2. **One phase, not three.** Brian wants the full submission → triage → ledger → payment-run flow shipped together.
3. **JV partners are internal users with `@no-bshomes.com` Google Workspace accounts.** No external auth surface. Brian provisions each partner manually via `/admin/users` (the existing Phase 30 admin console). No changes to Phase 30.1 Google OAuth auto-provision logic.
4. **NEW `jv_partner` role** — separate from the existing `sales` role. Brian explicitly chose this over reusing `sales` because the existing `sales` role has broad grants (Tracerfy, Skip Trace, Deal Blast, full lead pipeline, etc.) that would be inappropriate for a driver who should only see their own submissions + payment ledger.

---

## Architectural pointers (where to plug into existing code)

**RBAC + role:**
- `app/src/lib/permissions.ts` — `ROLE_GRANTS` matrix (Phase 29). Add `jv_partner` with narrow grants (probably just `jv.submit_lead`, `jv.view_own_ledger`).
- Existing roles to reference: `owner`, `acquisition_manager`, `disposition_manager`, `lead_manager`, `transaction_coordinator`, `sales`, `assistant`.
- `app/src/lib/gates.ts` (Phase 30) — UI gate map. Add gates for the JV submission button, ledger access, etc. Restricted buttons absent from DOM (not greyed) per Phase 30 convention.

**Account provisioning:**
- `/admin/users` (Phase 30) — already has create + role-assignment + deactivate. Just add `jv_partner` to the role dropdown options. No new flow needed.

**Lead submission form (mobile-first):**
- Reuse the photo-upload pattern from Phase 14 (mobile photo capture) — Azure Blob `feedback`-style container (probably new `jv-leads` container), client-side compression, multipart upload, SAS URL for display.
- Address input + condition-notes textarea + photo picker. The Phase 28 `feedback-form.tsx` is the closest existing model (form → server action → DB insert → blob upload via separate API route, then redirect).

**Triage queue:**
- New page (e.g. `/jv-leads` for Brian, owner-gated). Lists pending JV submissions with photo thumbnail + dedup hints (match against `properties.address` + against prior JV submissions of the same parcel).
- Accept → creates a row in `properties` (or links to an existing one) with the JV partner stored as `lead_source` and `jv_lead_id` FK preserved on the property row for downstream payment lookups.
- Reject → marks the JV submission row with `status='rejected'` + `rejected_reason` + `rejected_by`. Does NOT pay the $10.

**Payment milestone tracking:**
- New `jv_lead_milestones` table (or similar) tracking per-lead milestone status: `qualified` (created on accept), `active_follow_up` (created when first `contact_event` is logged for the linked property/deal), `deal_closed` (created when a linked deal transitions to status `closed`).
- Wire into existing status-transition hooks. Phase 32 `archived_at` / Phase 31 activity-log hooks are the closest patterns.
- Idempotency: re-running a transition does not duplicate-create a milestone (use `INSERT ... ON CONFLICT DO NOTHING` keyed on `(jv_lead_id, milestone_type)`).

**Per-partner ledger view:**
- `/jv-ledger` (any logged-in `jv_partner` sees their own; owner sees a link from `/admin/users`).
- Lists their submitted leads with current status, each accepted lead's milestones (earned / paid / not yet), running total owed for current month.

**Monthly payment-run report (owner-only):**
- `/admin/jv-payments` — for each partner, current month's earned-but-unpaid milestones with paid/unpaid checkboxes, "Mark all paid" action, printable/downloadable summary.
- Timing: any time during the month, but the workflow is "run on the 1st".
- Marking paid: idempotent, logged in audit log (Phase 29 `logAudit()`), updates `paid_at` + `paid_by_user_id` + `payment_method` (free-text since Brian wrote that line in by hand on each agreement).

**Activity feed (Phase 31) integration:**
- JV submission, accept, reject, milestone-earned, milestone-paid all go into the unified activity feed for the linked property/lead/deal.

**Audit log (Phase 29) integration:**
- All mutating server actions wrap with `logAudit(actor, action, entity, old, new)`. Especially important for payment marks-as-paid (auditable trail of who paid what when).

**Notifications (likely Resend, reuse Phase 28 pattern):**
- New JV submission → email Brian (so he knows to triage)
- Accept → notify JV partner ("Your lead at {address} was accepted, $10 is in your ledger")
- Reject → notify JV partner with the reason
- Milestone earned ($15 / $500) → notify JV partner
- Monthly payment marked paid → notify JV partner ("Your June 1 payment of $X has been issued")

---

## Edge cases to plan for

1. **Termination clause (Section 7):** "Leads already in the pipeline at termination remain eligible for the closing bonus." If Brian deactivates a JV partner via `/admin/users`, the partner's existing accepted leads must still:
   - Appear in their ledger (they need to log in to see it)
   - Continue to accrue future milestones (active follow-up, deal closes)
   - Be payable on the next monthly run
   This means deactivating a `jv_partner` cannot orphan their `jv_lead_milestones`.

2. **Dedup hint accuracy:** Address normalization is non-trivial. The dedup check should fuzzy-match against `properties.address` (case-insensitive, normalize "St" / "Street" etc.). False positives are OK (Brian can override in the triage queue); false negatives (missed dups) are the real risk.

3. **Photo-only submissions:** The agreement says "Leads submitted without a photo and address will not be accepted or compensated." Server action should reject submissions missing either field with a clear error.

4. **Disputes within 30 days (Section 6):** No code needed — but the audit log of payment marks-as-paid should be queryable so Brian can resolve disputes.

5. **Payment method per partner:** The `Payments will be made via: ___` line on the agreement is filled in per partner. Store this as a free-text field on the `users` table (or a `jv_partner_settings` table) so the monthly report includes it.

6. **`lead_source` enum:** Existing `properties.lead_source` may need a new enum value `jv_partner` if it's currently a typed enum. Check before adding.

---

## Open questions for `/gsd:plan-phase 34` to resolve

- New table schema: one combined `jv_leads` table, or split into `jv_leads` + `jv_lead_milestones`? (Latter is cleaner — leads are 1:N with milestones.)
- Photo storage: new Azure Blob container `jv-leads`, or reuse `feedback`? (Probably new container for clean separation.)
- "Active follow-up" trigger: first `contact_event` of any type? Or specific types only (call / email / text but not "note")? Re-read Section 4 ("makes contact with the property owner and opens a negotiation file") — implies an outbound contact event, not a note.
- Mobile bottom-nav for `jv_partner`: what shows? Probably just "Submit Lead" + "My Ledger" — most other tabs are hidden by their respective gates.
- Where does the `jv_partner` land on login? Default landing route is `/` (dashboard), but they shouldn't see the dashboard. Probably redirect to `/jv-ledger` (or a JV-specific home).

---

*Use `/gsd:plan-phase 34` to break this down into atomic plans with proper REQ-IDs in REQUIREMENTS.md.*
