# Phase 13: Contract & E-Signature - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate, manage, and e-sign wholesale contracts (purchase agreements and assignment contracts) within HouseFinder. Auto-fill from deal data, send for signature via email, track lifecycle from draft to executed, store signed PDFs in Azure Blob Storage. Integrates with deal pipeline stages and campaign auto-stop from Phase 12.

</domain>

<decisions>
## Implementation Decisions

### Contract Templates & Fields
- Two contract types: Purchase Agreement (you + seller) and Assignment of Contract (you + buyer)
- Create standard Utah wholesale templates with common clauses (as-is, inspection period, closing timeline, earnest money)
- Auto-fill all available deal data: property address, city, county, parcel ID, seller name, offer price, ARV, assignment fee
- User reviews and can edit before sending
- Editable clauses — add/remove/modify sections like inspection period, earnest money terms, special conditions per deal

### E-Signature Method
- RESEARCH NEEDED: Compare built-in signature capture (draw/type in browser, store with timestamp + IP) vs third-party service (DocuSign, HelloSign API). Researcher should recommend.
- Two signers per contract: Purchase Agreement = seller first, then you countersign. Assignment = you sign, then buyer signs.
- Signing order: seller/buyer signs first → you get notified → you countersign → both get final copy
- Configurable expiration on signing links — default 72 hours, can extend or resend

### Contract Lifecycle
- Full status flow: Draft → Sent → Seller Signed → Countersigned → Executed. Plus: Expired, Voided, Amended
- Contracts tab on deal detail page (per-deal view) + global Contracts page (overview across all deals)
- Auto-advance deal stage when purchase agreement is fully executed (moves to "Under Contract")
- Auto-stop email campaign sequence when contract is fully executed (leverages Phase 12 campaign stop logic)

### Delivery & Storage
- Send signing link via email using Resend (already configured in Phase 12)
- Store signed contracts as PDF in Azure Blob Storage — downloadable/printable from deal detail
- Auto-email signed PDF to both parties when fully countersigned
- Same blob storage infrastructure will be reused by Phase 14 (Mobile Photo Capture) for receipts

### Claude's Discretion
- PDF generation library choice (react-pdf, puppeteer, etc.)
- Contract template HTML/component structure
- Signing page UI design
- Audit trail format (timestamps, IP addresses, signature hashes)
- Azure Blob Storage container naming and organization

</decisions>

<specifics>
## Specific Ideas

- Standard Utah REPC-style purchase agreement adapted for wholesale (as-is condition, no financing contingency)
- Assignment contract should clearly show original purchase price, assignment fee, and total buyer price
- Signing link should work on mobile — sellers may not be at a computer
- 72-hour default expiration creates urgency without being too aggressive
- Countersign notification should be prominent — don't miss a signed deal

</specifics>

<deferred>
## Deferred Ideas

- SMS delivery of signing links — requires SMS integration (not in scope)
- JV Partnership Agreement template — future phase if needed
- Custom template upload (bring your own contract PDF) — future enhancement
- Notarization integration — out of scope
- Title company integration for closing — future phase

</deferred>

---

*Phase: 13-contract-e-signature*
*Context gathered: 2026-04-05*
