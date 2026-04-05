---
phase: 13-contract-e-signature
verified: 2026-04-05T15:00:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
---

# Phase 13: Contract & E-Signature Verification Report

**Phase Goal:** The investor can generate, e-sign, and manage wholesale contracts (purchase agreements and assignment contracts) within HouseFinder — auto-filled from deal data, sent for signature via email with token-gated signing pages, tracked through a full lifecycle from draft to executed, with signed PDFs stored in Azure Blob Storage and automatic deal stage advancement on execution.

**Verified:** 2026-04-05T15:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                           | Status     | Evidence                                                                                       |
|----|-----------------------------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| 1  | Contract and signer tables exist in the database with correct enums, indexes, and foreign keys                  | VERIFIED   | `schema.ts` lines 595–691: `contractStatusEnum`, `contractTypeEnum`, `contracts`, `contractSigners` with FK, indexes on dealId/status/contractId |
| 2  | @react-pdf/renderer is installed and configured in serverExternalPackages                                       | VERIFIED   | `package.json`: `@react-pdf/renderer@^4.3.3`; `next.config.ts` line 6: `serverExternalPackages: ["@react-pdf/renderer"]` |
| 3  | Blob storage supports a contracts container alongside existing receipts container                                | VERIFIED   | `blob-storage.ts` lines 10, 83–142: `CONTRACTS_CONTAINER`, `uploadContract`, `generateContractSasUrl` |
| 4  | Contract types, queries, and server actions are exported and ready for UI consumption                           | VERIFIED   | `types/index.ts`: `ContractWithSigners`, `ContractClause`, `DEFAULT_PURCHASE_CLAUSES`, `DEFAULT_ASSIGNMENT_CLAUSES`; `contract-queries.ts`: 5 functions; `contract-actions.ts`: 8 exports + `"use server"` |
| 5  | User can create a contract from the deal detail Financials tab with auto-filled deal data                       | VERIFIED   | `contract-create-form.tsx` (296 lines) imports `createContract`, auto-fills address/price/signers from deal prop; wired in `deals/[id]/page.tsx` via `ContractTab` |
| 6  | User can edit clauses (add/remove/modify/reorder) before sending a contract                                     | VERIFIED   | `contract-clause-editor.tsx` (130 lines): ChevronUp/Down, Trash2, Add Clause with timestamp-based ID and order recomputation |
| 7  | Contract list on deal detail shows status, type, parties, and action buttons                                    | VERIFIED   | `contract-list-item.tsx`: `ContractStatusBadge`, type label, signer name, Send/Void/Resend/Download PDF actions with `useTransition` |
| 8  | Global contracts page shows all contracts across all deals                                                      | VERIFIED   | `contracts/page.tsx` (166 lines): `force-dynamic`, calls `getAllContracts()`, groups Active/Executed/Expired+Voided |
| 9  | Contracts link appears in sidebar navigation                                                                    | VERIFIED   | `app-sidebar.tsx`: `FileText` icon, `{ label: "Contracts", href: "/contracts" }` between Deals and Buyers |
| 10 | A signer can open a signing link on mobile or desktop without logging in                                        | VERIFIED   | `middleware.ts` line 6: `sign` excluded from matcher; `sign/[token]/page.tsx` outside `(dashboard)` layout group; `signing-page-client.tsx` handles submission |
| 11 | The signing page validates the token and shows expired/already-signed state                                     | VERIFIED   | `sign/[token]/page.tsx` lines 11–42: null check, `signer.signedAt` check, `tokenExpiresAt < new Date()` check with distinct error cards |
| 12 | The signer can draw or type their signature on the canvas                                                       | VERIFIED   | `signature-canvas.tsx` (273 lines): `pointerdown`/`pointermove`/`pointerUp` Pointer Events, `touchAction: "none"`, type mode with cursive font preview |
| 13 | The signature is submitted with IP, user agent, and document hash for audit trail                               | VERIFIED   | `contract-actions.ts` `submitSignature`: `headers()` for IP, `userAgent`, `hashBuffer(pdfBuffer)` written to signer row |
| 14 | A PDF preview/download endpoint returns the contract as application/pdf                                         | VERIFIED   | `api/contracts/[id]/pdf/route.ts` (41 lines): `getContractById` + `generateContractPdf` + `new Uint8Array(buffer)` + `Content-Type: application/pdf` |
| 15 | Signing invitation email, countersign notification, and executed PDF email are sent at each lifecycle step      | VERIFIED   | `contract-emails.tsx`: 3 builder functions; `contract-actions.ts`: `sendForSigning` sends invitation, `advanceContractStatus` sends countersign notification and executed PDF to both parties |
| 16 | Deal auto-advances to under_contract and campaign enrollment auto-stops when contract is executed               | VERIFIED   | `contract-actions.ts` lines 374–410: `UPDATE deals SET status = 'under_contract' ... NOT IN (...)` and `campaignEnrollments` update with `stopReason: "contract_executed"` |

**Score:** 16/16 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact                             | Min Lines | Actual | Status     | Details                                                                          |
|--------------------------------------|-----------|--------|------------|---------------------------------------------------------------------------------|
| `app/src/db/schema.ts`               | —         | 691+   | VERIFIED   | `contracts`, `contractSigners`, enums, indexes, FK at lines 595–691             |
| `app/src/types/index.ts`             | —         | 510+   | VERIFIED   | `ContractWithSigners`, `ContractClause`, `DEFAULT_PURCHASE_CLAUSES` exported    |
| `app/src/lib/contract-queries.ts`    | —         | 157    | VERIFIED   | All 5 functions: getDealContracts, getContractById, getContractBySigningToken, getAllContracts, getContractCountByDealId |
| `app/src/lib/contract-actions.ts`    | —         | 700+   | VERIFIED   | `"use server"`, 8 exports: createContract, sendForSigning, submitSignature, voidContract, resendSigningLink, extendSigningDeadline, downloadSignedPdf |
| `app/src/lib/contract-pdf.tsx`       | —         | 570+   | VERIFIED   | `PurchaseAgreementDocument`, `AssignmentDocument`, `generateContractPdf`, `hashBuffer`, Inter font from local TTF |
| `app/src/lib/blob-storage.ts`        | —         | 142+   | VERIFIED   | `uploadContract`, `generateContractSasUrl`, `CONTRACTS_CONTAINER = "contracts"` |
| `app/next.config.ts`                 | —         | —      | VERIFIED   | `serverExternalPackages: ["@react-pdf/renderer"]` at line 6                     |
| `app/drizzle/0005_simple_expediter.sql` | —      | —      | VERIFIED   | Creates `contract_lifecycle_status` enum, `contract_type` enum, `contracts` table, `contract_signers` table with FK and indexes |
| `app/public/fonts/Inter-Regular.ttf` | —        | exists | VERIFIED   | Present; referenced via `process.cwd() + '/public/fonts/Inter-Regular.ttf'`    |

### Plan 02 Artifacts

| Artifact                                           | Min Lines | Actual | Status   | Details                                                          |
|----------------------------------------------------|-----------|--------|----------|------------------------------------------------------------------|
| `app/src/components/contract-tab.tsx`              | 50        | 80     | VERIFIED | ContractListItem + ContractCreateForm wired; contract count badge |
| `app/src/components/contract-create-form.tsx`      | 100       | 296    | VERIFIED | Auto-fill from deal, clause editor, type selector, useTransition  |
| `app/src/components/contract-clause-editor.tsx`    | 60        | 130    | VERIFIED | Add/remove/reorder with ChevronUp/Down/Trash2                    |
| `app/src/components/contract-list-item.tsx`        | —         | 160+   | VERIFIED | Send/Void/Resend/Download PDF, expiration countdown              |
| `app/src/components/contract-status-badge.tsx`     | —         | —      | VERIFIED | All 8 lifecycle statuses mapped to Badge variants                |
| `app/src/app/(dashboard)/contracts/page.tsx`       | 30        | 166    | VERIFIED | `force-dynamic`, grouped Active/Executed/Expired+Voided          |
| `app/src/components/app-sidebar.tsx`               | —         | —      | VERIFIED | Contracts link with FileText icon between Deals and Buyers       |
| `app/src/app/(dashboard)/deals/[id]/page.tsx`      | —         | —      | VERIFIED | ContractTab + contract count badge in Financials tab             |

### Plan 03 Artifacts

| Artifact                                              | Min Lines | Actual | Status   | Details                                                               |
|-------------------------------------------------------|-----------|--------|----------|-----------------------------------------------------------------------|
| `app/src/app/sign/[token]/page.tsx`                   | 80        | 292    | VERIFIED | Token validation (invalid/expired/signed states), contract summary card |
| `app/src/app/sign/[token]/signing-page-client.tsx`    | —         | —      | VERIFIED | useTransition, calls submitSignature, shows confirmation              |
| `app/src/components/signature-canvas.tsx`             | 80        | 273    | VERIFIED | Draw (Pointer Events, touchAction:none) + Type (cursive font) modes   |
| `app/src/app/api/contracts/[id]/pdf/route.ts`         | 20        | 41     | VERIFIED | getContractById + generateContractPdf + inline PDF response           |
| `app/src/middleware.ts`                               | —         | —      | VERIFIED | `sign` excluded from auth matcher negative lookahead                  |

### Plan 04 Artifacts

| Artifact                          | Min Lines | Actual | Status   | Details                                                                      |
|-----------------------------------|-----------|--------|----------|------------------------------------------------------------------------------|
| `app/src/lib/contract-emails.tsx` | 40        | 168    | VERIFIED | buildSigningInvitationHtml, buildCountersignNotificationHtml, buildExecutedContractHtml; returns `{ subject, html }` |

---

## Key Link Verification

### Plan 01 Key Links

| From                          | To                      | Via                                       | Status  | Evidence                                                                  |
|-------------------------------|-------------------------|-------------------------------------------|---------|---------------------------------------------------------------------------|
| `contract-actions.ts`         | `schema.ts`             | drizzle queries on contracts + contractSigners | WIRED  | `import ... contracts, contractSigners` used throughout action functions  |
| `contract-actions.ts`         | `blob-storage.ts`       | `uploadContract` for signed PDF storage   | WIRED   | Line 21: `import { uploadContract }`; line 344: `await uploadContract(...)` |

### Plan 02 Key Links

| From                                     | To                           | Via                              | Status | Evidence                                                   |
|------------------------------------------|------------------------------|----------------------------------|--------|------------------------------------------------------------|
| `contract-tab.tsx`                       | `contract-queries.ts`        | `getDealContracts` for listing   | WIRED  | Data passed as prop from `deals/[id]/page.tsx` which calls `getDealContracts(id)` |
| `contract-create-form.tsx`               | `contract-actions.ts`        | `createContract` server action   | WIRED  | Line 6: `import { createContract }`; line 37: `await createContract(formData)` |
| `deals/[id]/page.tsx`                    | `contract-tab.tsx`           | `ContractTab` rendered in Financials tab | WIRED | Line 17: `import { ContractTab }`; line 178: `<ContractTab deal={deal} contracts={contracts} />` |

### Plan 03 Key Links

| From                              | To                        | Via                                   | Status | Evidence                                                                 |
|-----------------------------------|---------------------------|---------------------------------------|--------|--------------------------------------------------------------------------|
| `sign/[token]/page.tsx`           | `contract-queries.ts`     | `getContractBySigningToken`           | WIRED  | Line 1: `import { getContractBySigningToken }`; line 12: called in server component |
| `sign/[token]/signing-page-client.tsx` | `contract-actions.ts` | `submitSignature` server action      | WIRED  | Line 5: `import { submitSignature }`; line 22: `await submitSignature(token, ...)` |
| `api/contracts/[id]/pdf/route.ts` | `contract-pdf.tsx`        | `generateContractPdf`                 | WIRED  | Lines 2–3: both imports present; lines 18, 25: both called                |

### Plan 04 Key Links

| From                     | To                          | Via                                                 | Status | Evidence                                                                     |
|--------------------------|-----------------------------|-----------------------------------------------------|--------|------------------------------------------------------------------------------|
| `contract-actions.ts`    | `contract-emails.tsx`       | `buildSigningInvitationHtml`, `buildCountersignNotificationHtml`, `buildExecutedContractHtml` | WIRED | Lines 24–27: all 3 builders imported; used in `sendSigningInvitationEmail`, `sendCountersignNotificationEmail`, `sendExecutedContractEmails` helpers |
| `contract-actions.ts`    | deals table (drizzle)       | `UPDATE deals SET status = 'under_contract'`        | WIRED  | Lines 374–376: `db.execute(sql\`UPDATE deals SET status = 'under_contract' ... NOT IN (...)\`)` |
| `contract-actions.ts`    | `campaignEnrollments` table | `stopReason: "contract_executed"`                   | WIRED  | Lines 397–410: drizzle update sets `status: "stopped"`, `stopReason: "contract_executed"` for active enrollments matching the deal's propertyId |

---

## Requirements Coverage

| Requirement   | Source Plan | Description                                                                         | Status    | Evidence                                                                      |
|---------------|-------------|--------------------------------------------------------------------------------------|-----------|-------------------------------------------------------------------------------|
| CONTRACT-01   | 13-01       | Contract definitions in PostgreSQL with deal linkage, parties, financial terms, clauses | SATISFIED | `contracts` table: 27 columns with deal FK, type, status, financial terms, clauses JSON |
| CONTRACT-02   | 13-01       | Signer records with unique signing tokens, expiration, signature data, IP, user agent, document hash | SATISFIED | `contractSigners` table: 15 columns including signingToken (unique), tokenExpiresAt, signatureData, signatureType, ipAddress, userAgent, documentHash |
| CONTRACT-03   | 13-01       | Standard Utah wholesale clauses auto-populate on contract creation                  | SATISFIED | `types/index.ts`: `DEFAULT_PURCHASE_CLAUSES` (7 clauses), `DEFAULT_ASSIGNMENT_CLAUSES` (5 clauses); `contract-create-form.tsx` initializes clause editor with defaults |
| CONTRACT-04   | 13-01       | Contract creation auto-fills deal data: address, city, county, parcel ID, seller name, offer price, ARV, assignment fee | SATISFIED | `contract-create-form.tsx`: auto-fill from `deal` prop for all listed fields |
| CONTRACT-05   | 13-02       | User can add, remove, modify, and reorder clauses before sending                     | SATISFIED | `contract-clause-editor.tsx`: editable title/body, ChevronUp/Down for reorder, Trash2 for remove, Add Clause button |
| CONTRACT-06   | 13-02       | Contracts tab on deal detail with status badges and action buttons (send, void, resend, download) | SATISFIED | `contract-tab.tsx` on Financials tab; `contract-list-item.tsx` with Send/Void/Resend/Download PDF actions |
| CONTRACT-07   | 13-02       | Global Contracts page shows all contracts with status filtering and deal links       | SATISFIED | `contracts/page.tsx`: groups Active/Executed/Expired+Voided; each row is a Link to deal detail |
| CONTRACT-08   | 13-02       | Sidebar navigation includes Contracts link between Deals and Campaigns               | SATISFIED | `app-sidebar.tsx`: Contracts placed between Deals and Buyers (Buyers precedes Campaigns in deal lifecycle nav) |
| CONTRACT-09   | 13-01       | PDF generated server-side with property details, parties, financial terms, clauses, signature lines, audit trail | SATISFIED | `contract-pdf.tsx`: `PurchaseAgreementDocument` and `AssignmentDocument` components, audit trail page when `signedAt` data present, `generateContractPdf` via `renderToBuffer` |
| CONTRACT-10   | 13-02       | User can preview contract as downloadable PDF before sending                         | SATISFIED | `contract-list-item.tsx`: PDF preview link `<a href="/api/contracts/[id]/pdf">` shown for all contracts |
| CONTRACT-11   | 13-03       | Public signing page at /sign/[token] — token-gated, no account required, 72-hour expiry | SATISFIED | `sign/[token]/page.tsx` outside `(dashboard)` layout; middleware excludes `sign` from auth; `createContract` sets tokens; `sendForSigning` sets tokenExpiresAt 72h |
| CONTRACT-12   | 13-03       | Signer can draw (canvas) or type signature on mobile/desktop; Pointer Events with touchAction:none | SATISFIED | `signature-canvas.tsx`: `pointerdown`/`pointermove`/`pointerUp` handlers, `touchAction: "none"` on canvas element, cursive font for type mode |
| CONTRACT-13   | 13-03       | Signing page validates token expiration and already-signed status with appropriate messages | SATISFIED | `sign/[token]/page.tsx` lines 11–42: distinct error cards for invalid token (null result), already signed, and expired token |
| CONTRACT-14   | 13-04       | Signing invitation email sent via Resend with "Sign Now" CTA button linking to /sign/[token] | SATISFIED | `contract-emails.tsx` `buildSigningInvitationHtml`: violet CTA button; `contract-actions.ts` `sendForSigning` sends via Resend using `NEXTAUTH_URL/sign/${token}` |
| CONTRACT-15   | 13-04       | Full lifecycle: Draft -> Sent -> Seller Signed -> Countersigned -> Executed; countersign link auto-sent; executed PDF emailed to both parties | SATISFIED | `advanceContractStatus`: seller_signed + activate signer2 token + countersign email; executed + upload to blob + email both parties with PDF attachment |
| CONTRACT-16   | 13-04       | Deal auto-advances to "Under Contract" and campaign enrollment auto-stops (stopReason: contract_executed) on execution | SATISFIED | `advanceContractStatus` lines 374–410: `UPDATE deals ... NOT IN (...)` and `campaignEnrollments` update with `stopReason: "contract_executed"` |

All 16 requirements satisfied. No orphaned requirements.

---

## Anti-Patterns Found

No blockers or meaningful warnings found.

| File                     | Pattern                | Severity | Assessment                                                                    |
|--------------------------|------------------------|----------|-------------------------------------------------------------------------------|
| `contract-queries.ts`    | `return null` (×4)     | INFO     | Legitimate early exits for not-found, already-signed, and expired token cases |
| `contract-create-form.tsx` | `placeholder` attrs  | INFO     | HTML input placeholder attributes — not code stubs                            |
| `contract-list-item.tsx` | `return null` (×2)    | INFO     | Null returns inside helper lambda for expiration label — correct conditional logic |

---

## Human Verification Required

The following items cannot be verified programmatically:

### 1. End-to-End Signing Flow

**Test:** Create a deal, open Financials tab, create a Purchase Agreement contract, click Send, open the signing link from the invitation email, draw a signature, submit, then check the deal auto-advances to Under Contract.
**Expected:** Signing invitation email arrives with working link; canvas accepts drawn signature on mobile and desktop; confirmation message shown after submit; deal status changes to Under Contract; campaign enrollment (if any) shows stopped with reason contract_executed.
**Why human:** Real Resend email delivery, actual Azure Blob Storage upload, and PostgreSQL state transitions require live infrastructure.

### 2. Signed PDF Quality and Audit Trail

**Test:** Execute a contract (both parties sign), then click "Download Signed PDF" from the deal detail.
**Expected:** PDF opens with property details, parties, financial terms, all clauses, both signature entries (name/date or drawn image), and an audit trail page showing IP, user agent, and document hash for each signature.
**Why human:** PDF visual rendering quality and content correctness cannot be verified by grepping source code.

### 3. Signing Page Mobile Experience

**Test:** Open a signing link on an iPhone (Safari) and attempt to draw a signature on the canvas.
**Expected:** Canvas drawing works without iOS Safari scroll interference; signature is captured correctly; layout renders cleanly at 360px viewport width.
**Why human:** Pointer Events / touchAction:none behavior requires real device testing to confirm no scroll hijacking on iOS Safari.

### 4. Expiration Countdown Display

**Test:** Send a contract, then view the contract on the deal detail Financials tab.
**Expected:** An amber "Expires in X hours" label appears with Clock icon showing relative time from the 72-hour window.
**Why human:** Requires a live database row with a real `tokenExpiresAt` timestamp to verify `formatDistanceToNow` renders correctly.

---

## Commits Verified

| Commit    | Plan | Description                                                   |
|-----------|------|---------------------------------------------------------------|
| `73cc5b0` | 01   | Schema, types, deps, and config for contracts                 |
| `4fab43d` | 01   | Contract queries, server actions, and PDF generation          |
| `c0005e7` | 02   | Contract tab on deal detail with create form and clause editor|
| `6170ccf` | 02   | Global contracts page and sidebar navigation                  |
| `6d82e60` | 03   | Signature canvas component                                    |
| `cf1ad7f` | 03   | Public signing page, signing client, PDF API endpoint         |
| `4d7d854` | 04   | Email templates and wired email delivery                      |
| `b0d9216` | 04   | Signed PDF download + expiration countdown                    |

All 8 commits present in git log.

---

## Summary

Phase 13 goal is fully achieved. Every observable truth is verified at all three levels (exists, substantive, wired):

- The **data layer** is complete: two PostgreSQL tables with correct enums, FK constraints, and indexes; Drizzle migration generated; TypeScript types and 5 query functions exported.
- The **server actions** implement the full two-signer lifecycle with non-fatal email/blob failures: create, send, sign, advance (seller_signed → countersigned → executed), void, resend, extend.
- The **PDF generation** is server-side via @react-pdf/renderer with local Inter font, producing Purchase Agreement and Assignment documents with audit trail pages.
- The **UI** provides contract creation with auto-fill and clause editing, contract listing with status badges and actions, and a global contracts overview page — all wired to live server actions.
- The **public signing page** is correctly excluded from NextAuth middleware, validates all error states, and accepts drawn or typed signatures using Pointer Events with iOS Safari compatibility.
- The **email lifecycle** is complete: invitation on send, countersign notification after first signature, executed PDF attachment email to both parties.
- The **side effects** fire on execution: deal advances to `under_contract`, active campaign enrollments stop with `contract_executed` reason, and the signed PDF is uploaded to Azure Blob Storage with a SAS URL available from the deal detail.

Four items require human/live-environment verification: end-to-end email delivery, signed PDF visual quality, mobile canvas behavior on iOS Safari, and expiration countdown rendering.

---

_Verified: 2026-04-05T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
