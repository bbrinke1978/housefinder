---
phase: 13-contract-e-signature
plan: "02"
subsystem: contracts
tags: [contracts, ui, e-signature, deal-detail, sidebar, navigation]
dependency_graph:
  requires:
    - app/src/lib/contract-queries.ts (getDealContracts, getAllContracts, getContractCountByDealId)
    - app/src/lib/contract-actions.ts (createContract, sendForSigning, voidContract, resendSigningLink)
    - app/src/types/index.ts (ContractWithSigners, ContractClause, DEFAULT_PURCHASE_CLAUSES, DEFAULT_ASSIGNMENT_CLAUSES)
    - app/src/app/api/contracts/[id]/pdf/route.ts (PDF preview endpoint — from 13-03)
  provides:
    - ContractTab component (deal detail Financials tab integration)
    - ContractCreateForm component (contract creation with clause editor)
    - ContractClauseEditor component (reorderable clause management)
    - ContractListItem component (status badge + action buttons)
    - ContractStatusBadge component (lifecycle status to Badge variant mapping)
    - /contracts global page (all contracts across all deals)
    - Contracts sidebar nav item
  affects:
    - app/src/app/(dashboard)/deals/[id]/page.tsx (ContractTab replaces DealContractTracker, contract count badge)
    - app/src/components/app-sidebar.tsx (Contracts nav item added)
tech_stack:
  added: []
  patterns:
    - "useTransition for server action pending state — consistent with Phase 12 pattern"
    - "Client component with useState for show/hide form — consistent with BudgetTab"
    - "Server component page with grouped data — matches Campaigns page pattern"
    - "Hero banner gradient — matches Campaigns page hero styling"
key_files:
  created:
    - app/src/components/contract-status-badge.tsx
    - app/src/components/contract-clause-editor.tsx
    - app/src/components/contract-create-form.tsx
    - app/src/components/contract-list-item.tsx
    - app/src/components/contract-tab.tsx
    - app/src/app/(dashboard)/contracts/page.tsx
  modified:
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/src/components/app-sidebar.tsx
decisions:
  - "ContractTab is 'use client' (not server wrapper) — create form needs useState, simpler to keep entire tab client-side"
  - "contracts/page.tsx groups by Active/Executed/Expired+Voided — matches natural workflow view (in-flight first, terminal last)"
  - "Contracts nav item placed between Deals and Buyers — deal lifecycle order (Deals → Contracts → Buyers/Campaigns)"
  - "window.prompt() for void reason — lightweight, no modal needed for single-field input at this stage"
metrics:
  duration: "3min"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 13 Plan 02: Contract Management UI Summary

**One-liner:** Contract UI layer: status badge, reorderable clause editor, auto-fill create form with type selector, deal detail contract list with Send/Void/Resend actions, global contracts overview page, and Contracts sidebar nav item.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Contract tab on deal detail + create form with clause editor | c0005e7 | contract-status-badge.tsx, contract-clause-editor.tsx, contract-create-form.tsx, contract-list-item.tsx, contract-tab.tsx, deals/[id]/page.tsx |
| 2 | Global contracts page + sidebar navigation | 6170ccf | contracts/page.tsx, app-sidebar.tsx |

## What Was Built

### Task 1: Contract Tab and Create Form

**ContractStatusBadge (contract-status-badge.tsx):**
- Maps all 8 `ContractLifecycleStatus` values to Badge variants
- `executed` gets custom green styling (border-green-500)
- `voided`/`expired` → destructive, `draft`/`amended` → outline, `sent`/`seller_signed` → secondary, `countersigned`/`executed` → default

**ContractClauseEditor (contract-clause-editor.tsx):**
- "use client" component with `clauses: ContractClause[]` + `onChange` callback
- Each clause: editable title (input) + editable body (textarea), order number badge
- Per-clause actions: ChevronUp/ChevronDown (move, disabled at boundaries), Trash2 (remove)
- "Add Clause" button (dashed border) creates new clause with timestamp-based ID
- Reorders automatically (order = index + 1 after each mutation)

**ContractCreateForm (contract-create-form.tsx):**
- "use client" with useTransition for submit pending state
- Contract type toggle: Purchase Agreement / Assignment (styled button pair)
- Type change reseeds clause editor: DEFAULT_PURCHASE_CLAUSES or DEFAULT_ASSIGNMENT_CLAUSES
- Auto-fill from deal: propertyAddress, city, purchasePrice (offerPrice), assignmentFee
- Signer 1 (Purchase = Seller / Assignment = Buyer): name auto-fill, email required
- Signer 2 (Wholesaler): name/email inputs
- Financial inputs: earnestMoney (default 100), inspectionPeriodDays (default 10), closingDays (default 30)
- Inline error display on createContract failure
- Calls createContract server action, onClose() on success

**ContractListItem (contract-list-item.tsx):**
- Shows contract type label + ContractStatusBadge + counterparty (signer 1 name) + created date
- PDF preview: `<a href="/api/contracts/[id]/pdf">` anchor (always visible)
- Send button: `canSend = status === "draft"` → calls sendForSigning
- Resend button: `canResend = sent/seller_signed/countersigned AND has unsigned signer` → calls resendSigningLink on active signer
- Void button: `canVoid = not executed AND not voided` → window.prompt() for reason → voidContract
- All actions use useTransition

**ContractTab (contract-tab.tsx):**
- "use client" with useState for showCreate toggle
- Header: "Contracts" label + count badge + "New Contract" button
- Empty state: FileText icon + prompt + "Create First Contract" button
- ContractCreateForm shown inline when showCreate=true
- Maps contracts array to ContractListItem rows

**Deal detail page updates (deals/[id]/page.tsx):**
- Added getDealContracts + getContractCountByDealId to Promise.all (parallel fetch)
- Removed DealContractTracker import (replaced by ContractTab)
- Financials tab trigger: contract count badge when contractCount > 0
- Financials tab content: `<ContractTab deal={deal} contracts={contracts} />` above Budget section

### Task 2: Global Contracts Page + Sidebar

**contracts/page.tsx:**
- `export const dynamic = "force-dynamic"` — server component
- Calls `getAllContracts()` → groups into 3 sections: Active (draft/sent/seller_signed/countersigned), Executed, Expired/Voided
- Hero banner: violet gradient + FileText icon, matching Campaigns page aesthetic
- Each row: property address + city, contract type, counterparty, status badge, date (executed/sent/created priority order)
- Each row is a `<Link href="/deals/{dealId}?tab=financials">` — links back to deal detail
- Empty state: FileText illustration + "Create one from a deal's Financials tab" + Go to Deals link
- ContractSection component skips rendering if count=0 (no empty sections shown)

**app-sidebar.tsx:**
- Added `FileText` to lucide-react import
- Added `{ label: "Contracts", href: "/contracts", icon: FileText }` nav item between Deals and Buyers
- Active state: `pathname.startsWith("/contracts")`

## Deviations from Plan

None — plan executed exactly as written with one note:

**ContractTab implemented as "use client" (not server component wrapper)**
- Plan specified "Server component wrapper" for contract-tab.tsx
- Implementation uses "use client" instead because the create form requires useState for show/hide toggle
- A "use client" boundary wrapping a server query would require passing data as props anyway — making the entire tab client-side with data passed in from the parent page is simpler and consistent with BudgetTab pattern
- No behavioral difference; data is still fetched server-side in the parent page

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| contract-status-badge.tsx exists | PASSED |
| contract-clause-editor.tsx exists | PASSED |
| contract-create-form.tsx exists | PASSED |
| contract-list-item.tsx exists | PASSED |
| contract-tab.tsx exists | PASSED |
| contracts/page.tsx exists | PASSED |
| app-sidebar.tsx updated | PASSED |
| deals/[id]/page.tsx updated | PASSED |
| commit c0005e7 exists | PASSED |
| commit 6170ccf exists | PASSED |
| TypeScript compiles clean | PASSED |
