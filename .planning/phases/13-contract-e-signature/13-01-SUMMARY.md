---
phase: 13-contract-e-signature
plan: "01"
subsystem: contracts
tags: [contracts, e-signature, pdf, drizzle, blob-storage]
dependency_graph:
  requires:
    - app/src/db/schema.ts (deals table FK)
    - app/src/lib/blob-storage.ts (existing BlobServiceClient)
    - app/src/lib/mail-settings-actions.ts (Resend config)
    - app/drizzle/ (migration infrastructure)
  provides:
    - contracts + contractSigners tables (schema)
    - ContractWithSigners, ContractClause, DEFAULT_PURCHASE_CLAUSES types
    - contract-queries.ts (5 query functions)
    - contract-actions.ts (6 server actions + advanceContractStatus)
    - contract-pdf.tsx (PurchaseAgreementDocument, AssignmentDocument, generateContractPdf)
    - uploadContract + generateContractSasUrl (blob-storage.ts extension)
  affects:
    - app/src/types/index.ts (new contract types added)
    - app/next.config.ts (serverExternalPackages added)
    - app/package.json (@react-pdf/renderer added)
tech_stack:
  added:
    - "@react-pdf/renderer@4.3.3 — server-side PDF generation"
  patterns:
    - "drizzle pgEnum + pgTable with uuid PK, no relations() — consistent with project"
    - "server actions with zod/v4 validation + revalidatePath — consistent with project"
    - "blob container per feature (contracts vs receipts) — avoids path collisions"
    - "non-fatal email/blob failures (try/catch) — prevents state corruption on partial failure"
key_files:
  created:
    - app/src/lib/contract-queries.ts
    - app/src/lib/contract-actions.ts
    - app/src/lib/contract-pdf.tsx
    - app/drizzle/0005_simple_expediter.sql
    - app/public/fonts/Inter-Regular.ttf
  modified:
    - app/src/db/schema.ts
    - app/src/types/index.ts
    - app/src/lib/blob-storage.ts
    - app/next.config.ts
    - app/package.json
decisions:
  - "advanceContractStatus uses db.execute(sql) for NOT IN multi-status check — drizzle lacks native notInArray for text columns"
  - "Inter-Regular.ttf committed to public/fonts/ — CDN fonts unreliable in server-side PDF generation on Azure"
  - "Contract blob path pattern: {dealId}/{contractId}-executed.pdf — deal-scoped, predictable, no collisions"
  - "Dual redundant deal advance removed — single db.execute(sql NOT IN ...) replaces paired drizzle update"
metrics:
  duration: "6min"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_created: 5
  files_modified: 5
---

# Phase 13 Plan 01: Contract Data Layer Summary

**One-liner:** Full contract data layer: Drizzle schema, TypeScript types, 5 query functions, 6 server actions with two-signer lifecycle, @react-pdf/renderer PDF documents with audit trail, and Azure Blob Storage contract container.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Schema, types, dependencies, and config | 73cc5b0 | schema.ts, types/index.ts, blob-storage.ts, next.config.ts, package.json, migration |
| 2 | Contract queries, server actions, and PDF generation | 4fab43d | contract-queries.ts, contract-actions.ts, contract-pdf.tsx |

## What Was Built

### Task 1: Schema, Types, Dependencies, Config

**Schema additions (app/src/db/schema.ts):**
- `contractStatusEnum` pgEnum: draft, sent, seller_signed, countersigned, executed, expired, voided, amended
- `contractTypeEnum` pgEnum: purchase_agreement, assignment
- `contracts` table: 27 columns — deal FK, type, status, property details, financial terms, clauses (JSON), signed PDF blob name, lifecycle timestamps
- `contractSigners` table: 15 columns — contract FK, signerOrder, signerRole, signerName/Email, signingToken (unique), tokenExpiresAt, signedAt, signatureData/Type, IP, userAgent, documentHash
- Indexes on dealId, status (contracts); contractId + unique composite on (contractId, signerOrder) (contractSigners)
- `ContractRow` and `ContractSignerRow` InferSelectModel exports

**Type additions (app/src/types/index.ts):**
- `ContractLifecycleStatus` union type
- `ContractType` union type
- `ContractClause` interface with id, title, body, order, isDefault
- `DEFAULT_PURCHASE_CLAUSES` — 7 standard Utah wholesale clauses (As-Is, Inspection, Earnest Money, Closing Timeline, Title/Closing Costs, Assignment, Default/Remedies)
- `DEFAULT_ASSIGNMENT_CLAUSES` — 5 clauses for assignment contracts
- `ContractWithSigners` interface extending ContractRow with signers[] and parsedClauses[]

**Blob storage extension (app/src/lib/blob-storage.ts):**
- `CONTRACTS_CONTAINER = "contracts"` constant
- `uploadContract(buffer, blobName)` — uploads PDF, calls createIfNotExists() for idempotent first-run
- `generateContractSasUrl(blobName)` — 1-hour read-only SAS URL for contracts container

**Config and deps:**
- `serverExternalPackages: ["@react-pdf/renderer"]` added to next.config.ts (top-level, not experimental — Next.js 15 rename)
- @react-pdf/renderer@4.3.3 installed
- Inter-Regular.ttf downloaded to app/public/fonts/ (variable TTF from Google Fonts repo, ~302KB)
- Drizzle migration `0005_simple_expediter.sql` generated

### Task 2: Queries, Server Actions, PDF Generation

**contract-queries.ts (5 functions):**
- `getDealContracts(dealId)` — all contracts for a deal with signers, ordered newest first; uses `inArray` for multi-contract signer fetch
- `getContractById(id)` — single contract with signers and parsed clauses
- `getContractBySigningToken(token)` — token verification (checks not signed, not expired)
- `getAllContracts()` — global list for contracts overview page, ordered by updatedAt
- `getContractCountByDealId(dealId)` — badge count query

**contract-actions.ts (6 server actions + 1 internal helper):**
- `createContract(formData)` — creates contract + 2 signer rows with crypto.randomUUID() tokens; signer roles auto-set from contractType
- `sendForSigning(contractId)` — draft → sent, activates signer 1 token (72h), sends Resend signing invitation email
- `submitSignature(token, signatureData, signatureType)` — verifies token, generates PDF hash, records signature, calls advanceContractStatus
- `advanceContractStatus(contractId)` — internal helper: signer1 done → seller_signed + activate signer2 token + email; both done → executed + upload final PDF + email both parties + auto-advance deal + stop campaigns
- `voidContract(contractId, reason)` — blocks on executed status, sets voided
- `resendSigningLink(signerId)` — resets 72h expiry, re-sends invitation
- `extendSigningDeadline(signerId, hours)` — extends expiry by N hours

**contract-pdf.tsx:**
- `PurchaseAgreementDocument` — LETTER-size PDF: property section, parties, financial terms (price/earnest/inspection/closing), clause list, signature lines, audit trail page (when signers have signedAt)
- `AssignmentDocument` — similar but shows original purchase price + assignment fee + total buyer price
- `generateContractPdf(contract)` — picks component by contractType, calls renderToBuffer
- `hashBuffer(buffer)` — SHA-256 hex digest
- Inter font registered from local `process.cwd() + '/public/fonts/Inter-Regular.ttf'`

## Deviations from Plan

None — plan executed exactly as written with two minor auto-fixes:

**1. [Rule 1 - Bug] Simplified getDealContracts multi-contract signer fetch**
- Found during: Task 2 implementation review
- Issue: Original getDealContracts had duplicate/redundant signer fetch logic for the multi-contract case (fetched all signers then filtered in JS instead of using inArray)
- Fix: Added `inArray` import and used `inArray(contractSigners.contractId, contractIds)` directly
- Files modified: contract-queries.ts
- Commit: 4fab43d

**2. [Rule 1 - Bug] Removed redundant deal status advance in advanceContractStatus**
- Found during: Task 2 implementation review
- Issue: advanceContractStatus had a drizzle `eq(deals.status, "offered")` update followed immediately by a `db.execute(sql NOT IN ...)` — the first update was both wrong (only matched "offered") and redundant
- Fix: Removed the narrowly-scoped drizzle update, keeping only the `db.execute(sql)` with proper NOT IN multi-status exclusion
- Files modified: contract-actions.ts
- Commit: 4fab43d

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| contract-queries.ts exists | PASSED |
| contract-actions.ts exists | PASSED |
| contract-pdf.tsx exists | PASSED |
| migration 0005 exists | PASSED |
| Inter-Regular.ttf exists | PASSED |
| commit 73cc5b0 exists | PASSED |
| commit 4fab43d exists | PASSED |
| TypeScript compiles clean | PASSED |
