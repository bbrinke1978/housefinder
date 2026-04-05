---
phase: 13-contract-e-signature
plan: "04"
subsystem: contracts
tags: [contracts, e-signature, email, resend, pdf, blob-storage, deal-auto-advance]
dependency_graph:
  requires:
    - app/src/lib/contract-actions.ts (sendForSigning, advanceContractStatus — Plan 01)
    - app/src/lib/blob-storage.ts (generateContractSasUrl — Plan 01)
    - app/src/lib/contract-pdf.tsx (generateContractPdf — Plan 01)
    - app/src/components/contract-status-badge.tsx (Plan 02)
    - app/src/types/index.ts (ContractWithSigners — Plan 01)
  provides:
    - contract-emails.tsx (3 email builder functions)
    - downloadSignedPdf server action
    - sendCountersignNotificationEmail helper (distinct countersign notification)
    - "Download Signed PDF" button with SAS URL (contract-list-item.tsx)
    - Expiration countdown for in-flight contracts
  affects:
    - app/src/lib/contract-actions.ts (email helpers refactored to use builders)
    - app/src/components/contract-list-item.tsx (download + countdown added)
tech_stack:
  added:
    - "date-fns formatDistanceToNow (already in package.json) — expiration countdown"
  patterns:
    - "Plain HTML string email builders (no JSX) — consistent with Phase 12-05 scraper pattern"
    - "Non-fatal email sends (try/catch) — consistent with Phase 12 logContactEvent pattern"
    - "SAS URL fetched server-side via downloadSignedPdf action, opened in new tab — no blob credentials on client"
    - "formatDistanceToNow for countdown — human-readable relative time (e.g. 'in 71 hours')"
key_files:
  created:
    - app/src/lib/contract-emails.tsx
  modified:
    - app/src/lib/contract-actions.ts
    - app/src/components/contract-list-item.tsx
decisions:
  - "contract-emails.tsx returns { subject, html } tuple — subject and HTML kept co-located to prevent subject/body mismatch bugs"
  - "sendCountersignNotificationEmail is distinct from sendSigningInvitationEmail — uses buildCountersignNotificationHtml (emphasizes first signer completed) vs plain invitation"
  - "canResend extended to include 'expired' status — investor may need to resend after expiry without voiding and recreating"
  - "Download PDF button only shown when signedPdfBlobName is set — avoids showing a broken download for manually-executed edge cases"
metrics:
  duration: "2min"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 13 Plan 04: Email Delivery, Signed PDF Download & Integration Summary

**One-liner:** Email template module (3 Resend builders), wired countersign notification and executed PDF delivery in contract actions, and signed PDF download button with SAS URL + expiration countdown in contract list item.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Email templates and wired email delivery in contract actions | 4d7d854 | contract-emails.tsx (created), contract-actions.ts (refactored) |
| 2 | Signed PDF download + final integration polish | b0d9216 | contract-list-item.tsx |

## What Was Built

### Task 1: Email Templates and Wired Email Delivery

**contract-emails.tsx (new file, 148 lines):**
- `buildSigningInvitationHtml(params)` — returns `{ subject, html }` for signing invitation. Subject: "Please sign: [Contract Type] for [Property Address]". Violet CTA button (#6d28d9), 72-hour expiry note, fallback URL, professional layout.
- `buildCountersignNotificationHtml(params)` — returns `{ subject, html }` for countersign notification. Subject: "[Signer Name] has signed — your countersignature is needed". References first signer by name, same violet CTA.
- `buildExecutedContractHtml(params)` — returns `{ subject, html }` for fully executed delivery. Subject: "Fully executed: [Contract Type] for [Property Address]". Green status callout (#f0fdf4), deal detail link, PDF attached at call site.

**contract-actions.ts refactoring:**
- `sendSigningInvitationEmail` now calls `buildSigningInvitationHtml` (inline HTML removed)
- `sendCountersignNotificationEmail` added — distinct helper called from `advanceContractStatus` when signer 1 completes, uses `buildCountersignNotificationHtml` with signer 1's name and signer 2's signing URL
- `sendExecutedContractEmails` now calls `buildExecutedContractHtml` with `dealUrl = ${NEXTAUTH_URL}/deals/${dealId}?tab=financials`
- `downloadSignedPdf(contractId)` server action added — fetches contract, returns SAS URL via `generateContractSasUrl`, protected: returns `{ error }` if not executed or no blob

**End-to-end email lifecycle:**
1. `sendForSigning` → signing invitation to signer 1
2. `advanceContractStatus` (signer 1 done) → countersign notification to signer 2
3. `advanceContractStatus` (both done) → executed PDF email to both parties with PDF attachment, deal auto-advanced to `under_contract`, campaigns auto-stopped with `contract_executed` reason

### Task 2: Signed PDF Download + Integration Polish

**contract-list-item.tsx updates:**
- "Download PDF" button (Download icon) shown for executed contracts with `signedPdfBlobName` — calls `downloadSignedPdf` server action, opens SAS URL via `window.open` in new tab
- Expiration countdown shown for sent/seller_signed/countersigned contracts with active signer — uses `formatDistanceToNow` from date-fns: "Expires in 71 hours", amber color with Clock icon
- `canResend` extended to include `expired` status — investor can resend to revive an expired signing link without voiding/recreating
- Download error displayed inline below contract info row
- `useState` for `downloadError` added alongside existing `useTransition`

**deals/[id]/page.tsx (pre-existing from Plan 02):**
- Financials tab contract count badge: already present
- `ContractTab` wiring: already present

## Deviations from Plan

None — plan executed exactly as written.

The plan noted "create contract-emails.tsx" but `contract-actions.ts` already had inline email HTML from Plan 01. The inline HTML was extracted into proper builder functions in `contract-emails.tsx` and the helpers were refactored to call them. No behavior change.

## End-to-End Contract Lifecycle (Complete)

The full e-signature workflow is now functional:

1. **Draft** — investor creates contract via `ContractCreateForm`, 2 signers added
2. **Sent** — `sendForSigning` activates signer 1 token (72h), sends signing invitation email
3. **Seller Signed** — signer 1 visits `/sign/[token]`, draws/types signature, submits; countersign notification emailed to signer 2
4. **Executed** — signer 2 countersigns; final PDF generated with audit trail, uploaded to blob storage, emailed to both parties, deal status → `under_contract`, active campaign enrollments stopped with `contract_executed` reason
5. **Download** — investor clicks "Download PDF" on deal detail, SAS URL returned, PDF opens in browser

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| contract-emails.tsx exists | PASSED |
| contract-emails.tsx exports 3 build* functions | PASSED (3 found) |
| downloadSignedPdf action in contract-actions.ts | PASSED |
| sendCountersignNotificationEmail in contract-actions.ts | PASSED |
| contract-list-item.tsx has Download PDF button | PASSED |
| contract-list-item.tsx has expiration countdown | PASSED |
| commit 4d7d854 exists | PASSED |
| commit b0d9216 exists | PASSED |
| TypeScript compiles clean | PASSED |
| npm run build succeeds | PASSED |
