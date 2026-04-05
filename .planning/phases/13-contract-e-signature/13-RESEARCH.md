# Phase 13: Contract & E-Signature - Research

**Researched:** 2026-04-02
**Domain:** PDF generation, e-signature workflow, contract lifecycle management
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two contract types: Purchase Agreement (you + seller) and Assignment of Contract (you + buyer)
- Standard Utah wholesale templates with common clauses (as-is, inspection period, closing timeline, earnest money)
- Auto-fill all available deal data: property address, city, county, parcel ID, seller name, offer price, ARV, assignment fee
- User reviews and can edit before sending
- Editable clauses — add/remove/modify sections like inspection period, earnest money terms, special conditions per deal
- Two signers per contract: Purchase Agreement = seller first, then you countersign. Assignment = you sign, then buyer signs
- Signing order: seller/buyer signs first → you get notified → you countersign → both get final copy
- Configurable expiration on signing links — default 72 hours, can extend or resend
- Full status flow: Draft → Sent → Seller Signed → Countersigned → Executed. Plus: Expired, Voided, Amended
- Contracts tab on deal detail page (per-deal view) + global Contracts page (overview across all deals)
- Auto-advance deal stage when purchase agreement is fully executed (moves to "Under Contract")
- Auto-stop email campaign sequence when contract is fully executed (leverages Phase 12 campaign stop logic)
- Send signing link via email using Resend (already configured in Phase 12)
- Store signed contracts as PDF in Azure Blob Storage — downloadable/printable from deal detail
- Auto-email signed PDF to both parties when fully countersigned
- Same blob storage infrastructure reused by Phase 14 (Mobile Photo Capture) for receipts

### Claude's Discretion
- PDF generation library choice (react-pdf, puppeteer, etc.)
- Contract template HTML/component structure
- Signing page UI design
- Audit trail format (timestamps, IP addresses, signature hashes)
- Azure Blob Storage container naming and organization

### Deferred Ideas (OUT OF SCOPE)
- SMS delivery of signing links — requires SMS integration (not in scope)
- JV Partnership Agreement template — future phase if needed
- Custom template upload (bring your own contract PDF) — future enhancement
- Notarization integration — out of scope
- Title company integration for closing — future phase
</user_constraints>

---

## Summary

Phase 13 builds a complete contract generation and e-signature workflow inside HouseFinder. The core technical challenge is: (1) generate a legally presentable PDF from deal data using a React component tree; (2) implement an e-signature flow with two ordered signers; (3) store signed PDFs in Azure Blob Storage; and (4) trigger deal stage advancement and campaign stop on full execution.

The most critical decision is e-signature method. The CONTEXT.md asks for a recommendation between built-in browser capture and a third-party service. **Recommendation: use built-in signature capture** (draw/type in browser, store with timestamp + IP + SHA-256 hash). At HouseFinder's volume (a handful of contracts per month in rural Utah), the ~$0.85/document SignWell API cost adds up for a single-user tool, and more importantly the existing Resend infrastructure already handles email delivery. A custom implementation is legally valid under UETA/ESIGN Act provided four requirements are met: intent to sign, consent to do business electronically, reliable association of signature with the document, and record retention. All four are achievable with a well-structured signing page and audit trail embedded in the PDF.

For PDF generation, `@react-pdf/renderer` v4 (which supports React 19 since v4.1.0) is the correct choice. It runs server-side in a Next.js 15 API route with the `serverExternalPackages` config key. Puppeteer is an alternative but introduces Chromium installation complexity on Azure App Service Linux — the same problem HouseFinder already encountered with the scraper (Phase 1 blocker documented in STATE.md). Avoid Puppeteer.

**Primary recommendation:** Use `@react-pdf/renderer` for PDF generation + built-in browser signature capture (canvas draw or type) stored with SHA-256 document hash, timestamps, and IP address. No third-party e-signature service needed. Resend delivers signing links.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | ^4.x | Generate contract PDFs server-side | React 19 compatible since v4.1.0; runs in Next.js 15 API routes with serverExternalPackages config; produces real PDF bytes (not screenshots) |
| @azure/storage-blob | ^12.31.0 | Store signed PDFs in Blob Storage | Already installed; existing uploadBlob + generateSasUrl pattern in blob-storage.ts |
| resend | ^6.10.0 | Deliver signing links to signer email | Already installed and configured via Phase 12 mail settings |
| drizzle-orm | ^0.45.1 | Contract + signature tables | Already installed; consistent with entire project DB layer |
| crypto (Node built-in) | N/A | SHA-256 hash of PDF bytes for audit trail | No install needed; `crypto.createHash('sha256')` produces document fingerprint |
| date-fns | ^4.1.0 | Expiration countdown, date formatting | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod/v4 | ^4.3.6 | Validate contract creation form, server actions | Already installed; consistent with existing validation pattern |
| lucide-react | ^0.577.0 | Status icons in contract lifecycle UI | Already installed |
| @react-email/components | ^1.0.11 | Signing invitation email template | Already installed via Phase 12 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer | Puppeteer HTML-to-PDF | Puppeteer requires Chromium on Azure App Service Linux — same blocker HouseFinder hit in Phase 1 (see STATE.md). Avoid. |
| Built-in signature capture | SignWell API | SignWell: $0.85/document, adds external dependency, requires iframe embed. At 5 contracts/month = ~$5/mo. Not worth external coupling for single-user tool. |
| Built-in signature capture | DocuSign | $25+/user/month, massive overkill for single-user wholesale tool |
| Blob container "contracts" | Reuse "receipts" container | Use a separate "contracts" container — avoids path collision with Phase 14 receipt images, cleaner organization |

**Installation:**
```bash
npm install @react-pdf/renderer
```

(All other dependencies already installed)

---

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── db/
│   └── schema.ts                    # Add: contracts, contract_signers, contract_clauses tables
├── lib/
│   ├── contract-actions.ts          # Server actions: createContract, sendForSigning, sign, countersign, void
│   ├── contract-queries.ts          # getDealContracts, getContractById, getContractsByStatus
│   ├── contract-pdf.tsx             # @react-pdf/renderer Document component (server-only)
│   └── blob-storage.ts              # Extend: add uploadContract(buffer, name) using "contracts" container
├── components/
│   ├── contract-tab.tsx             # Per-deal Contracts tab (list + create button)
│   ├── contract-list-item.tsx       # Single contract row with status badge + actions
│   ├── contract-clause-editor.tsx   # Editable clause list with add/remove/edit
│   └── contract-status-badge.tsx    # Badge component for lifecycle status
├── app/(dashboard)/
│   ├── contracts/
│   │   └── page.tsx                 # Global contracts overview (all deals)
│   └── sign/
│       └── [token]/
│           └── page.tsx             # Public signing page (no auth required)
└── app/api/
    └── contracts/
        ├── [id]/pdf/route.ts        # GET: generate + return PDF bytes
        └── [id]/signed-pdf/route.ts # GET: fetch signed PDF from blob + proxy (SAS URL redirect)
```

### Pattern 1: Two-Phase Signing with Token-Gated Public Page

**What:** Each signer gets a unique signed token (UUID or HMAC) emailed to them. Clicking the link opens `/sign/[token]` — a public route (no NextAuth session required). The signing page verifies the token against the DB, shows the contract content, captures the signature, and calls a server action to record it.

**When to use:** Both the seller (who has no HouseFinder account) and the buyer need to sign without being authenticated users.

**Token structure:**
```typescript
// Source: standard pattern
// Store in contract_signers table
signingToken: text("signing_token").notNull().unique(), // crypto.randomUUID()
tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
signedAt: timestamp("signed_at", { withTimezone: true }),
signatureData: text("signature_data"),  // base64 PNG of drawn signature
ipAddress: text("ip_address"),
userAgent: text("user_agent"),
documentHash: text("document_hash"),    // SHA-256 of PDF bytes at time of signing
```

### Pattern 2: @react-pdf/renderer in Next.js 15 API Route

**What:** Contract PDF generated server-side in an API route handler, returned as `application/pdf`. Requires `serverExternalPackages` config in next.config.ts to prevent bundling issues.

**When to use:** Every time a contract is finalized (on creation for preview, and again after each signature to embed audit trail).

**next.config.ts change:**
```typescript
// Source: https://react-pdf.org/compatibility + GitHub issue #3074 fix
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["mapbox-gl"],
  serverExternalPackages: ["@react-pdf/renderer"],  // ADD THIS
};
```

**API route pattern:**
```typescript
// Source: react-pdf.org Node API + GitHub issue #3074 resolution
// app/api/contracts/[id]/pdf/route.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { PurchaseAgreementDocument } from "@/lib/contract-pdf";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContractById(id);
  if (!contract) return new Response("Not found", { status: 404 });

  const buffer = await renderToBuffer(
    <PurchaseAgreementDocument contract={contract} />
  );

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contract-${id}.pdf"`,
    },
  });
}
```

### Pattern 3: Signing Page (Public, Token-Gated)

**What:** `/sign/[token]` is a server component that verifies the token and renders signer info, then a client component captures the signature.

**When to use:** Seller and buyer sign here. No HouseFinder account needed.

**Key considerations:**
- Verify token exists AND not expired AND not already signed
- Show contract summary (not full PDF inline — too heavy for mobile)
- Offer two input modes: draw (canvas) and type (typed name)
- Capture IP from `req.headers.get('x-forwarded-for')` or `req.ip`
- On submit: hash the current PDF bytes (SHA-256), record signature + hash + IP + timestamp in DB, advance status

### Pattern 4: Audit Trail Embedded in Final PDF

**What:** After countersignature, regenerate the PDF with an appended audit trail page showing: signer names, emails, IP addresses, signed-at timestamps, and the SHA-256 document hash. Upload this final PDF to Azure Blob Storage "contracts" container.

**Why:** Self-contained legal record. The signed PDF itself proves who signed, when, and that the document hasn't been tampered with. This is the same approach DocuSign uses.

### Pattern 5: Auto-Advance Deal Stage and Campaign Stop

**What:** When a Purchase Agreement reaches "Executed" status, two side effects fire atomically (in the same server action):
1. Update `deals.status` to `'under_contract'`
2. Stop any active campaign enrollment for the property's lead (call existing `stopCampaignEnrollment` or set enrollment status = 'stopped' with stopReason = 'contract_executed')

**When to use:** In the `countersignContract` server action, after updating contract status to 'executed'.

### Anti-Patterns to Avoid
- **Client-side PDF generation:** `@react-pdf/renderer`'s `PDFDownloadLink` and browser-only APIs won't work in server components or API routes. Generate PDFs server-side only.
- **Storing signature image in blob:** Store signature as base64 data URL in DB (small PNG, <10KB for drawn signature). Only upload the final merged PDF to blob storage.
- **Using the existing "receipts" container:** Add a separate "contracts" container to avoid path collisions with Phase 14.
- **Sending the signing link to both signers simultaneously:** The CONTEXT.md mandates ordered signing — seller first, then countersign. Do not send countersign link until first signer completes.
- **Exposing contract content on public signing page without token verification:** Always verify token expiry AND not-yet-signed server-side before rendering.

---

## Database Schema

New tables required (add to `schema.ts`):

```typescript
// Contract lifecycle status enum
export const contractStatusEnum = pgEnum("contract_lifecycle_status", [
  "draft",
  "sent",
  "seller_signed",    // or "buyer_signed" for assignment contracts
  "countersigned",
  "executed",
  "expired",
  "voided",
  "amended",
]);

export const contractTypeEnum = pgEnum("contract_type", [
  "purchase_agreement",  // you + seller
  "assignment",          // you + buyer
]);

export const contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  contractType: contractTypeEnum("contract_type").notNull(),
  status: contractStatusEnum("status").notNull().default("draft"),
  // Auto-filled from deal, user can edit before sending
  propertyAddress: text("property_address").notNull(),
  city: text("city").notNull(),
  county: text("county"),
  parcelId: text("parcel_id"),
  sellerName: text("seller_name"),
  buyerName: text("buyer_name"),
  purchasePrice: integer("purchase_price"),
  arv: integer("arv"),
  assignmentFee: integer("assignment_fee"),
  earnestMoney: integer("earnest_money").default(100),
  inspectionPeriodDays: integer("inspection_period_days").default(10),
  closingDays: integer("closing_days").default(30),
  // Editable clauses — stored as JSON array of {id, title, body, order, isDefault}
  clauses: text("clauses"),  // JSON string
  // Signed PDF stored in Azure Blob Storage
  signedPdfBlobName: text("signed_pdf_blob_name"),
  signedPdfUrl: text("signed_pdf_url"),
  documentHash: text("document_hash"),  // SHA-256 of final signed PDF
  // Lifecycle timestamps
  sentAt: timestamp("sent_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_contracts_deal_id").on(table.dealId),
  index("idx_contracts_status").on(table.status),
]);

export const contractSigners = pgTable("contract_signers", {
  id: uuid("id").defaultRandom().primaryKey(),
  contractId: uuid("contract_id").notNull().references(() => contracts.id),
  signerOrder: integer("signer_order").notNull(),  // 1 = first signer, 2 = countersigner
  signerRole: text("signer_role").notNull(),        // "seller" | "buyer" | "wholesaler"
  signerName: text("signer_name").notNull(),
  signerEmail: text("signer_email").notNull(),
  signingToken: text("signing_token").notNull().unique(),  // crypto.randomUUID()
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signatureData: text("signature_data"),  // base64 PNG (drawn) or typed name
  signatureType: text("signature_type"),  // "drawn" | "typed"
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  documentHash: text("document_hash"),  // SHA-256 of PDF at time of signing
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_contract_signers_contract_id").on(table.contractId),
  uniqueIndex("uq_contract_signer_order").on(table.contractId, table.signerOrder),
]);

export type ContractRow = InferSelectModel<typeof contracts>;
export type ContractSignerRow = InferSelectModel<typeof contractSigners>;
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF rendering | Custom HTML-to-string + CSS | @react-pdf/renderer | Handles page breaks, fonts, margins, PDF spec compliance — all complex to replicate |
| Chromium on Azure | Custom Chromium install script | Avoid Puppeteer entirely | Same root blocker as Phase 1 scraper (STATE.md) — Chromium not pre-installed on Linux App Service |
| Font rendering in PDF | Google Fonts CDN link | Register fonts in @react-pdf/renderer Font.register() | CDN fonts don't work in server-side PDF generation — must embed font bytes |
| Audit trail formatting | Custom timestamp comparison logic | date-fns format() | Already in project, handles timezone display |
| Canvas signature capture | Raw pointer event tracking | `<canvas>` with mouse/touch events + toDataURL() | Standard pattern; 30-line implementation is sufficient — no library needed |
| Blob naming / path management | Custom UUID scheme | `contracts/${dealId}/${contractId}-executed.pdf` | Predictable, deal-scoped, prevents collisions |

**Key insight:** The two hardest parts (PDF generation, Chromium deployment) are solved by avoiding Puppeteer and using @react-pdf/renderer. The e-signature capture is genuinely simple — a canvas element with a clear button and submit action is all that's needed for legal validity under UETA/ESIGN.

---

## Common Pitfalls

### Pitfall 1: @react-pdf/renderer Not in serverExternalPackages
**What goes wrong:** Next.js 15 bundles @react-pdf/renderer into the server bundle, causing `PDFDocument is not a constructor` or React internal API errors in API routes.
**Why it happens:** The library uses react-reconciler internally, which conflicts with Next.js's server-side React resolution.
**How to avoid:** Add `serverExternalPackages: ["@react-pdf/renderer"]` to next.config.ts before writing any PDF generation code.
**Warning signs:** Error: `PDFDocument is not a constructor` or `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` in server logs.

### Pitfall 2: PDF Generation in Client Components
**What goes wrong:** Importing `@react-pdf/renderer` in a client component causes "window is not defined" or hydration errors during SSR.
**Why it happens:** Some internal PDF APIs reference browser globals that don't exist server-side, but more critically, the renderer is designed for Node.js rendering.
**How to avoid:** All PDF generation happens in API route handlers only (`app/api/contracts/[id]/pdf/route.ts`). Client components never import from `@react-pdf/renderer`.
**Warning signs:** Build error about browser globals; hydration mismatch warnings.

### Pitfall 3: Signing Token Not Expiring Active Sessions
**What goes wrong:** A signer clicks an expired link and still sees the signing page.
**Why it happens:** Forgetting to check `tokenExpiresAt` on the signing page server component.
**How to avoid:** In the signing page server component, check: `if (!signer || signer.signedAt || (signer.tokenExpiresAt && signer.tokenExpiresAt < new Date()))` and render an expired/already-signed message.
**Warning signs:** Signers reporting "I signed but it's still showing as pending."

### Pitfall 4: Race Condition on Countersign Trigger
**What goes wrong:** If two requests hit the countersign action simultaneously, the deal might advance to "under_contract" twice or the campaign stop fires twice.
**Why it happens:** Non-atomic read-then-write in server actions.
**How to avoid:** Use a single `UPDATE contracts SET status = 'executed' WHERE id = $1 AND status = 'countersigned' RETURNING id` — only advance deal stage if the row was actually updated (row count = 1). The existing campaignEnrollments `status = 'stopped'` upsert pattern from Phase 12 is already idempotent.
**Warning signs:** Deal appearing in two pipeline columns; duplicate "contract_executed" contact events.

### Pitfall 5: Canvas Signature on Mobile Safari
**What goes wrong:** Touch events not captured on iOS Safari canvas, blank signature submitted.
**Why it happens:** iOS Safari requires `touch-action: none` CSS on the canvas element to prevent default scroll behavior.
**How to avoid:** Add `style={{ touchAction: 'none' }}` to the canvas element. Listen to both `pointerdown/pointermove/pointerup` events (Pointer Events API works on modern iOS) rather than separate mouse/touch handlers.
**Warning signs:** Sellers reporting they can draw but signature is blank when submitted.

### Pitfall 6: Blob Container Not Created
**What goes wrong:** `uploadBlob` throws "The specified container does not exist" on first contract upload.
**Why it happens:** The "contracts" container needs to be created once in Azure Storage.
**How to avoid:** Either create it during deployment via Azure CLI (`az storage container create --name contracts`) or add auto-create logic: `await containerClient.createIfNotExists()` before the first upload.
**Warning signs:** 404 error from Azure Storage SDK on first PDF upload.

---

## Code Examples

Verified patterns from project conventions and official sources:

### PDF Document Component (server-only)
```typescript
// Source: react-pdf.org official API
// app/src/lib/contract-pdf.tsx
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Register Inter font (project uses Inter — embed for PDF)
Font.register({
  family: "Inter",
  src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
});

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Inter", fontSize: 10, color: "#1a1a1a" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  section: { marginBottom: 16 },
  label: { fontSize: 8, color: "#666", marginBottom: 2 },
  value: { fontSize: 10 },
  clause: { marginBottom: 8, lineHeight: 1.4 },
  auditPage: { padding: 48, fontFamily: "Inter", fontSize: 9, color: "#444" },
});

interface ContractData {
  id: string;
  contractType: "purchase_agreement" | "assignment";
  propertyAddress: string;
  city: string;
  county: string | null;
  parcelId: string | null;
  sellerName: string | null;
  buyerName: string | null;
  purchasePrice: number | null;
  assignmentFee: number | null;
  earnestMoney: number | null;
  inspectionPeriodDays: number | null;
  closingDays: number | null;
  clauses: Array<{ id: string; title: string; body: string; order: number }>;
  signers: Array<{
    signerRole: string;
    signerName: string;
    signerEmail: string;
    signedAt: Date | null;
    ipAddress: string | null;
    documentHash: string | null;
  }>;
}

export function PurchaseAgreementDocument({ contract }: { contract: ContractData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>
          {contract.contractType === "purchase_agreement"
            ? "Real Estate Purchase Agreement"
            : "Assignment of Contract"}
        </Text>
        <View style={styles.section}>
          <Text style={styles.label}>PROPERTY ADDRESS</Text>
          <Text style={styles.value}>{contract.propertyAddress}, {contract.city}, UT</Text>
          {contract.parcelId && (
            <Text style={styles.value}>Parcel ID: {contract.parcelId}</Text>
          )}
        </View>
        {/* ... clauses rendered from contract.clauses array ... */}
      </Page>
      {/* Audit trail page (only on executed contracts) */}
      {contract.signers.some(s => s.signedAt) && (
        <Page size="LETTER" style={styles.auditPage}>
          <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 16 }}>Signature Audit Trail</Text>
          {contract.signers.map(signer => (
            <View key={signer.signerEmail} style={{ marginBottom: 12 }}>
              <Text>{signer.signerRole}: {signer.signerName} ({signer.signerEmail})</Text>
              {signer.signedAt && (
                <>
                  <Text>Signed: {signer.signedAt.toISOString()}</Text>
                  <Text>IP: {signer.ipAddress ?? "unknown"}</Text>
                  <Text>Document SHA-256: {signer.documentHash ?? "pending"}</Text>
                </>
              )}
            </View>
          ))}
        </Page>
      )}
    </Document>
  );
}
```

### Document Hash Generation (Node crypto, built-in)
```typescript
// Source: Node.js crypto built-in (no install)
import crypto from "crypto";

export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Usage in contract-actions.ts:
const pdfBuffer = await renderToBuffer(<PurchaseAgreementDocument contract={contractData} />);
const documentHash = hashBuffer(pdfBuffer);
```

### Signing Action (server action)
```typescript
// Source: project convention — "use server" + zod/v4 + drizzle
"use server";

import { db } from "@/db/client";
import { contracts, contractSigners } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { headers } from "next/headers";

export async function submitSignature(
  token: string,
  signatureData: string,  // base64 PNG
  signatureType: "drawn" | "typed",
  documentHash: string,
): Promise<{ success: true } | { error: string }> {
  const now = new Date();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const userAgent = headersList.get("user-agent") ?? "unknown";

  // Verify token: exists, not expired, not already signed
  const [signer] = await db
    .select()
    .from(contractSigners)
    .where(
      and(
        eq(contractSigners.signingToken, token),
        isNull(contractSigners.signedAt),
        gt(contractSigners.tokenExpiresAt, now)
      )
    )
    .limit(1);

  if (!signer) return { error: "Invalid or expired signing link" };

  // Record signature
  await db
    .update(contractSigners)
    .set({ signedAt: now, signatureData, signatureType, ipAddress: ip, userAgent, documentHash })
    .where(eq(contractSigners.id, signer.id));

  // Advance contract status
  await advanceContractStatus(signer.contractId);

  return { success: true };
}
```

### Blob Storage for Contracts (extend existing blob-storage.ts pattern)
```typescript
// Source: app/src/lib/blob-storage.ts (existing pattern, new container)
// Note: add a parallel uploadContract function using "contracts" container
const CONTRACTS_CONTAINER = "contracts";

export async function uploadContract(
  buffer: Buffer,
  blobName: string,   // e.g. `${dealId}/${contractId}-executed.pdf`
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(CONTRACTS_CONTAINER);
  await containerClient.createIfNotExists();  // idempotent first-run setup
  const blobClient = containerClient.getBlockBlobClient(blobName);
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: "application/pdf" },
  });
  return blobClient.url;
}
```

### Resend: Signing Invitation Email
```typescript
// Source: app/src/lib/enrollment-actions.ts (existing Resend pattern)
const resend = new Resend(mailSettings.resendApiKey);
await resend.emails.send({
  from: `${mailSettings.fromName} <${mailSettings.fromEmail}>`,
  to: [signerEmail],
  subject: `Please sign: ${contractTitle} for ${propertyAddress}`,
  html: signingInviteHtml,  // react-email component rendered to string
  // Include signing link: `${process.env.NEXTAUTH_URL}/sign/${token}`
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer HTML-to-PDF | @react-pdf/renderer | 2022+ | No Chromium dependency; works in serverless/App Service |
| DocuSign for everything | Built-in e-sign for simple workflows | 2020+ (UETA/ESIGN) | Zero per-document cost at small volumes |
| PDFDownloadLink (client) | renderToBuffer in API route | Next.js 14.1.1+ | Stable server-side generation; no SSR crash |
| Separate font CDN for PDF | Font.register() with embedded bytes | Always | CDN fonts unreachable in server PDF generation |

**Deprecated/outdated:**
- `renderToStream` with Next.js 15: Use `renderToBuffer` instead and wrap in `new Response(buffer, ...)` — stream handling has edge cases in Next.js 15 App Router
- `experimental.serverComponentsExternalPackages`: Renamed to `serverExternalPackages` (top-level) in Next.js 15

---

## Open Questions

1. **Inter font embedding in @react-pdf/renderer**
   - What we know: @react-pdf/renderer requires fonts to be registered with `Font.register()`. Google Fonts CDN URLs work in local dev but may timeout in production on Azure.
   - What's unclear: Whether the Azure App Service outbound networking allows CDN font fetches during PDF generation, or whether we need to bundle the font bytes locally.
   - Recommendation: Bundle Inter font bytes as a local file (download woff/ttf once, commit to repo at `public/fonts/Inter-Regular.ttf`). Reference via `process.cwd() + '/public/fonts/...'` in the server action. This removes the CDN dependency entirely.

2. **PDF preview before signing**
   - What we know: The CONTEXT.md says "user reviews and can edit before sending." This implies a draft review step.
   - What's unclear: Should the preview be an inline `<iframe src="/api/contracts/[id]/pdf">` (requires PDF mime type), a download button, or a simplified HTML preview?
   - Recommendation: Use a download button labeled "Preview PDF" for draft review — simpler than iframe embed and works better on mobile where inline PDF rendering is inconsistent. The signing page itself can show a simplified HTML summary of key terms.

3. **Clause storage format**
   - What we know: Clauses are editable per deal — add/remove/modify. Stored as JSON in `contracts.clauses` text column.
   - What's unclear: Whether the planner should treat each clause type as a known constant (e.g., INSPECTION_CLAUSE, EARNEST_MONEY_CLAUSE) or allow fully freeform body text.
   - Recommendation: Define `DEFAULT_CLAUSES` as a TypeScript constant (similar to `DEFAULT_BUDGET_CATEGORIES` from Phase 9). Each clause has `{ id, title, body, isDefault, order }`. User can edit body text and add/remove clauses before sending.

---

## Sources

### Primary (HIGH confidence)
- https://react-pdf.org/compatibility — React 19 support confirmed since v4.1.0; Node.js 18/20/21 tested
- https://github.com/diegomura/react-pdf/issues/3074 — Next.js 15 + React 19 fix: upgrade React + add serverExternalPackages
- `app/src/lib/blob-storage.ts` — Existing Azure Blob Storage pattern (uploadBlob, generateSasUrl, connection string parsing)
- `app/src/db/schema.ts` — Full existing schema; contracts tables must follow same conventions (uuid PK, drizzle-orm, no relations())
- `app/src/lib/enrollment-actions.ts` — Resend integration pattern already in project
- `app/src/lib/deal-actions.ts` — Server action conventions (zod/v4, "use server", revalidatePath)

### Secondary (MEDIUM confidence)
- https://www.signwell.com/api-pricing/ — SignWell API pricing: 25 free docs/month then $0.85/doc (verified on official page)
- https://developers.signwell.com/reference/embedded-iframe — SignWell embedded iframe 3-step flow (verified official docs)
- https://juro.com/learn/esign-act-ueta — UETA/ESIGN Act requirements for custom e-sign legality
- https://www.blueink.com/blog/esign-ueta-legality-secure-esignatures — Four legal requirements for DIY e-signatures

### Tertiary (LOW confidence)
- Azure App Service Linux + Puppeteer Chromium install notes — corroborates known Phase 1 blocker but not re-verified for 2026

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @react-pdf/renderer React 19 compat verified at react-pdf.org; all other libraries already in project
- Architecture: HIGH — follows established project patterns (server actions, drizzle, blob-storage, Resend)
- E-signature legality: MEDIUM — UETA/ESIGN requirements verified via multiple sources; custom implementation is valid for simple wholesale contracts
- Pitfalls: MEDIUM-HIGH — Next.js 15 / serverExternalPackages pitfall verified via GitHub issues; others are reasoned from existing patterns
- SignWell pricing: MEDIUM — fetched from official pricing page

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days — libraries are stable; pricing may change)
