---
phase: 16-buyers-list-crm
plan: "04"
subsystem: buyer-crm-deal-integration
tags: [next-js, ui, buyer-crm, deal-blast, email, resend, matching, deal-detail]
dependency_graph:
  requires:
    - phase: 16-01
      provides: BuyerWithMatchInfo type, logDealBlast action, updateBuyerDealInteraction action, buyerDealInteractions table
    - phase: 16-02
      provides: /buyers list page, buyer-queries.ts with getMatchingBuyersForDeal
    - phase: 16-03
      provides: /buyers/[id] buyer detail page (buyer name links target here)
  provides:
    - getInteractionsForDeal(dealId) query in buyer-queries.ts
    - sendDealBlast server action in buyer-actions.ts
    - Enhanced DealBlastGenerator with email blast panel
    - Enhanced BuyerList with BuyerWithMatchInfo support, match badges, interaction toggles
    - Deal detail page fetches and displays matched buyers with interaction status
  affects:
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/src/components/deal-blast-generator.tsx
    - app/src/components/buyer-list.tsx
    - app/src/lib/buyer-queries.ts
    - app/src/lib/buyer-actions.ts
tech_stack:
  added: []
  patterns:
    - Union type for BuyerList dual-mode (Buyer[] vs BuyerWithMatchInfo[] with dealId)
    - Promise.all parallel fetch for matchingBuyers + buyerInteractions on deal page
    - Resend email via getMailSettings() pattern (mirrors contract-actions.ts)
    - Client-side checkbox state with pre-selected full matches
    - Non-fatal logDealBlast after email send (mirrors logContactEvent after enrollment)
key_files:
  created: []
  modified:
    - app/src/lib/buyer-queries.ts
    - app/src/lib/buyer-actions.ts
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/src/components/deal-blast-generator.tsx
    - app/src/components/buyer-list.tsx
key_decisions:
  - "getInteractionsForDeal added to buyer-queries.ts (returns Map<buyerId, status>) — deal page needs interaction status per buyer in O(1) lookup"
  - "BuyerList union type: Buyer[] mode (no dealId) for /deals/buyers; BuyerWithMatchInfo[] mode (with dealId + interactions) for deal detail"
  - "Full Match buyers pre-checked in email panel, price-only matches unchecked — reduces accidental blasts to out-of-area buyers"
  - "sendDealBlast returns { error: 'mail_not_configured' } as sentinel — DealBlastGenerator renders warning with /settings/mail link"
  - "logDealBlast in sendDealBlast is non-fatal try/catch — email already sent; CRM log failure doesn't surface to user"
  - "getMatchingBuyersForDeal stays in buyer-queries.ts (not duplicated in deal-queries.ts) — plan 01 built it there, deal page imports directly"
requirements-completed:
  - BUYER-05
  - BUYER-06
  - BUYER-11
metrics:
  duration: 4min
  completed: 2026-04-05
  tasks_completed: 2
  files_created: 0
  files_modified: 5
---

# Phase 16 Plan 04: Deal-Buyer Integration Summary

**One-liner:** Deal detail page now shows auto-matched buyers sorted by match quality (full/price-only), with interaction status badges + toggles, email blast to selected buyers via Resend with auto-logging to buyer timeline.

## What Was Built

### getInteractionsForDeal (buyer-queries.ts)
- New query: SELECT buyerId, status FROM buyer_deal_interactions WHERE dealId = $1
- Returns `Map<string, string>` (buyerId -> status) for O(1) lookup in buyer list render
- Used by deal detail page to show current interaction status per matched buyer

### Deal Detail Page (deals/[id]/page.tsx)
- Added import for `getMatchingBuyersForDeal` + `getInteractionsForDeal` from buyer-queries
- Post-deal-fetch: parallel Promise.all for matchingBuyers + buyerInteractions (non-blocking via safe wrapper)
- dealPrice = offerPrice ?? mao ?? 0; dealCity = deal.city
- Overview tab now renders: DealBlastGenerator (with matchingBuyers + dealId) + BuyerList (matched buyers section)
- Section header "Matched Buyers ({count})" shows match count at a glance

### BuyerList Component (buyer-list.tsx) — Rewritten
- Union prop type: plain `Buyer[]` mode (existing /deals/buyers page) vs `BuyerWithMatchInfo[]` mode (deal detail)
- Deal mode features:
  - "Full Match" green badge (price + area match)
  - "Price Match" yellow badge (price only, area mismatch)
  - Buyer name as Link to /buyers/[id]
  - Tags displayed as secondary badges
  - MapPin icon for target areas
  - Interaction status badge (amber Blasted / blue Interested / green Closed)
  - "Interested" + "Closed" toggle buttons — call updateBuyerDealInteraction and update local state
- Sorted: full matches first, then price-only matches
- Empty state message differs by mode

### DealBlastGenerator (deal-blast-generator.tsx) — Enhanced
- Accepts `matchingBuyers: BuyerWithMatchInfo[]` and `dealId: string` as optional props
- Copy-to-clipboard unchanged (works without email config)
- New "Email Blast" button (shown when dealId + matchingBuyers present):
  - Opens collapsible email panel below copy button
  - Checkbox list: buyer name + email; Full Match pre-checked; buyers without email disabled with "No email" text
  - "FULL MATCH" label in green for visual priority
  - "Send Blast ({N})" button disabled when no eligible checked buyers
  - Sends via `sendDealBlast` server action sequentially
  - Progress: "{sent}/{total} emails sent and logged to buyer history" success message
  - mail_not_configured error: warning card with link to /settings/mail
  - Cancel button closes panel and clears results

### sendDealBlast Server Action (buyer-actions.ts)
- Accepts: dealId, buyerId, buyerEmail, blastText
- Fetches mailSettings via getMailSettings() — consistent with contract-actions pattern
- Returns `{ error: 'mail_not_configured' }` sentinel when no API key
- Sends via Resend: subject "Deal Available - {dealAddress}", text body = blastText
- Calls logDealBlast(buyerId, dealId) in non-fatal try/catch after email send
- revalidatePath for /deals/[dealId] and /buyers/[buyerId]

## Deviations from Plan

### [Rule 1 - Architecture] getMatchingBuyersForDeal not duplicated in deal-queries.ts
- **Found during:** Task 1
- **Issue:** Plan spec said to add getMatchingBuyersForDeal to deal-queries.ts, but plan 01 already created it in buyer-queries.ts
- **Fix:** Deal detail page imports directly from buyer-queries.ts — no duplication needed
- **Files modified:** app/src/app/(dashboard)/deals/[id]/page.tsx

## Self-Check

### Files Exist
- `app/src/lib/buyer-queries.ts` (modified — added getInteractionsForDeal) — FOUND
- `app/src/lib/buyer-actions.ts` (modified — added sendDealBlast) — FOUND
- `app/src/app/(dashboard)/deals/[id]/page.tsx` (modified) — FOUND
- `app/src/components/deal-blast-generator.tsx` (modified) — FOUND
- `app/src/components/buyer-list.tsx` (modified) — FOUND

### Commits
- `b8265d1` — feat(16-04): enhanced buyer matching on deal detail page — FOUND
- `b718373` — feat(16-04): email blast with auto-logging to buyer CRM — FOUND

### TypeScript
- `npx tsc --noEmit` — PASSED (zero errors)

## Self-Check: PASSED
