import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import crypto from "crypto";
import type { ContractWithSigners } from "@/types";

// Register Inter font using local file — no CDN dependency in server PDF generation
Font.register({
  family: "Inter",
  src: process.cwd() + "/public/fonts/Inter-Regular.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Inter",
    fontSize: 10,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontSize: 8,
    color: "#666",
    width: "35%",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 10,
    width: "65%",
  },
  clauseTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    marginTop: 8,
  },
  clauseBody: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
    marginBottom: 8,
  },
  signatureLine: {
    marginTop: 12,
    marginBottom: 4,
  },
  signatureBox: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    width: "60%",
    height: 32,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666",
  },
  signatureValue: {
    fontSize: 9,
    color: "#374151",
    paddingTop: 4,
  },
  auditPage: {
    padding: 48,
    fontFamily: "Inter",
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  auditTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  auditSubtitle: {
    fontSize: 9,
    color: "#666",
    marginBottom: 20,
  },
  auditEntry: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  auditField: {
    flexDirection: "row",
    marginBottom: 3,
  },
  auditLabel: {
    fontSize: 8,
    color: "#666",
    width: "30%",
  },
  auditValue: {
    fontSize: 9,
    width: "70%",
    color: "#1a1a1a",
  },
  hashText: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 8,
    wordBreak: "break-all",
  },
});

function formatCurrency(cents: number | null): string {
  if (!cents) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents);
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Denver",
    timeZoneName: "short",
  }).format(date);
}

// ── PurchaseAgreementDocument ─────────────────────────────────────────────────

export function PurchaseAgreementDocument({
  contract,
}: {
  contract: ContractWithSigners;
}) {
  const hasSignatures = contract.signers.some((s) => s.signedAt);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Real Estate Purchase Agreement</Text>
        <Text style={styles.subtitle}>State of Utah — Wholesale Transaction</Text>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>
              {contract.propertyAddress}, {contract.city}, UT
            </Text>
          </View>
          {contract.county ? (
            <View style={styles.row}>
              <Text style={styles.label}>County</Text>
              <Text style={styles.value}>{contract.county}</Text>
            </View>
          ) : null}
          {contract.parcelId ? (
            <View style={styles.row}>
              <Text style={styles.label}>Parcel ID</Text>
              <Text style={styles.value}>{contract.parcelId}</Text>
            </View>
          ) : null}
        </View>

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Seller</Text>
            <Text style={styles.value}>{contract.sellerName || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Buyer / Wholesaler</Text>
            <Text style={styles.value}>{contract.buyerName || "—"}</Text>
          </View>
        </View>

        {/* Financial Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Terms</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Purchase Price</Text>
            <Text style={styles.value}>
              {formatCurrency(contract.purchasePrice)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Earnest Money</Text>
            <Text style={styles.value}>
              {formatCurrency(contract.earnestMoney)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Inspection Period</Text>
            <Text style={styles.value}>
              {contract.inspectionPeriodDays || 10} business days
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Closing Timeline</Text>
            <Text style={styles.value}>
              {contract.closingDays || 30} days from execution
            </Text>
          </View>
          {contract.arv ? (
            <View style={styles.row}>
              <Text style={styles.label}>ARV (Reference)</Text>
              <Text style={styles.value}>{formatCurrency(contract.arv)}</Text>
            </View>
          ) : null}
        </View>

        {/* Clauses */}
        {contract.parsedClauses.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms and Conditions</Text>
            {contract.parsedClauses
              .sort((a, b) => a.order - b.order)
              .map((clause) => (
                <View key={clause.id}>
                  <Text style={styles.clauseTitle}>{clause.title}</Text>
                  <Text style={styles.clauseBody}>{clause.body}</Text>
                </View>
              ))}
          </View>
        ) : null}

        {/* Signature Lines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          {contract.signers
            .sort((a, b) => a.signerOrder - b.signerOrder)
            .map((signer) => (
              <View key={signer.id} style={styles.signatureLine}>
                <View style={styles.signatureBox}>
                  {signer.signedAt ? (
                    <Text style={styles.signatureValue}>
                      {signer.signatureType === "typed"
                        ? signer.signatureData || signer.signerName
                        : `[Signed electronically — ${signer.signerName}]`}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.signatureLabel}>
                  {signer.signerName} ({signer.signerRole})
                  {signer.signedAt
                    ? ` — Signed ${formatDate(signer.signedAt)}`
                    : " — Signature pending"}
                </Text>
              </View>
            ))}
        </View>
      </Page>

      {/* Audit trail page (only included when signatures exist) */}
      {hasSignatures ? (
        <Page size="LETTER" style={styles.auditPage}>
          <Text style={styles.auditTitle}>Signature Audit Trail</Text>
          <Text style={styles.auditSubtitle}>
            This audit trail is appended to verify the authenticity of electronic
            signatures captured under UETA / ESIGN Act.
          </Text>
          {contract.signers
            .sort((a, b) => a.signerOrder - b.signerOrder)
            .map((signer) => (
              <View key={signer.id} style={styles.auditEntry}>
                <View style={styles.auditField}>
                  <Text style={styles.auditLabel}>Signer</Text>
                  <Text style={styles.auditValue}>
                    {signer.signerName} ({signer.signerRole})
                  </Text>
                </View>
                <View style={styles.auditField}>
                  <Text style={styles.auditLabel}>Email</Text>
                  <Text style={styles.auditValue}>{signer.signerEmail}</Text>
                </View>
                {signer.signedAt ? (
                  <>
                    <View style={styles.auditField}>
                      <Text style={styles.auditLabel}>Signed At</Text>
                      <Text style={styles.auditValue}>
                        {formatDate(signer.signedAt)}
                      </Text>
                    </View>
                    <View style={styles.auditField}>
                      <Text style={styles.auditLabel}>IP Address</Text>
                      <Text style={styles.auditValue}>
                        {signer.ipAddress || "unknown"}
                      </Text>
                    </View>
                    <View style={styles.auditField}>
                      <Text style={styles.auditLabel}>Signature Type</Text>
                      <Text style={styles.auditValue}>
                        {signer.signatureType || "unknown"}
                      </Text>
                    </View>
                    {signer.documentHash ? (
                      <Text style={styles.hashText}>
                        Document SHA-256: {signer.documentHash}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.auditField}>
                    <Text style={styles.auditLabel}>Status</Text>
                    <Text style={styles.auditValue}>Signature pending</Text>
                  </View>
                )}
              </View>
            ))}
        </Page>
      ) : null}
    </Document>
  );
}

// ── AssignmentDocument ────────────────────────────────────────────────────────

export function AssignmentDocument({
  contract,
}: {
  contract: ContractWithSigners;
}) {
  const hasSignatures = contract.signers.some((s) => s.signedAt);
  const totalBuyerPrice =
    (contract.purchasePrice || 0) + (contract.assignmentFee || 0);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Assignment of Contract</Text>
        <Text style={styles.subtitle}>State of Utah — Wholesale Transaction</Text>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>
              {contract.propertyAddress}, {contract.city}, UT
            </Text>
          </View>
          {contract.county ? (
            <View style={styles.row}>
              <Text style={styles.label}>County</Text>
              <Text style={styles.value}>{contract.county}</Text>
            </View>
          ) : null}
          {contract.parcelId ? (
            <View style={styles.row}>
              <Text style={styles.label}>Parcel ID</Text>
              <Text style={styles.value}>{contract.parcelId}</Text>
            </View>
          ) : null}
        </View>

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Assignor (Wholesaler)</Text>
            <Text style={styles.value}>{contract.sellerName || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assignee (Buyer)</Text>
            <Text style={styles.value}>{contract.buyerName || "—"}</Text>
          </View>
        </View>

        {/* Financial Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Terms</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Original Purchase Price</Text>
            <Text style={styles.value}>
              {formatCurrency(contract.purchasePrice)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assignment Fee</Text>
            <Text style={styles.value}>
              {formatCurrency(contract.assignmentFee)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Buyer Price</Text>
            <Text style={styles.value}>{formatCurrency(totalBuyerPrice)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Earnest Money</Text>
            <Text style={styles.value}>
              {formatCurrency(contract.earnestMoney)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Closing Timeline</Text>
            <Text style={styles.value}>
              {contract.closingDays || 30} days from execution
            </Text>
          </View>
        </View>

        {/* Clauses */}
        {contract.parsedClauses.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms and Conditions</Text>
            {contract.parsedClauses
              .sort((a, b) => a.order - b.order)
              .map((clause) => (
                <View key={clause.id}>
                  <Text style={styles.clauseTitle}>{clause.title}</Text>
                  <Text style={styles.clauseBody}>{clause.body}</Text>
                </View>
              ))}
          </View>
        ) : null}

        {/* Signature Lines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signatures</Text>
          {contract.signers
            .sort((a, b) => a.signerOrder - b.signerOrder)
            .map((signer) => (
              <View key={signer.id} style={styles.signatureLine}>
                <View style={styles.signatureBox}>
                  {signer.signedAt ? (
                    <Text style={styles.signatureValue}>
                      {signer.signatureType === "typed"
                        ? signer.signatureData || signer.signerName
                        : `[Signed electronically — ${signer.signerName}]`}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.signatureLabel}>
                  {signer.signerName} ({signer.signerRole})
                  {signer.signedAt
                    ? ` — Signed ${formatDate(signer.signedAt)}`
                    : " — Signature pending"}
                </Text>
              </View>
            ))}
        </View>
      </Page>

      {/* Audit trail page */}
      {hasSignatures ? (
        <Page size="LETTER" style={styles.auditPage}>
          <Text style={styles.auditTitle}>Signature Audit Trail</Text>
          <Text style={styles.auditSubtitle}>
            This audit trail is appended to verify the authenticity of electronic
            signatures captured under UETA / ESIGN Act.
          </Text>
          {contract.signers
            .sort((a, b) => a.signerOrder - b.signerOrder)
            .map((signer) => (
              <View key={signer.id} style={styles.auditEntry}>
                <View style={styles.auditField}>
                  <Text style={styles.auditLabel}>Signer</Text>
                  <Text style={styles.auditValue}>
                    {signer.signerName} ({signer.signerRole})
                  </Text>
                </View>
                <View style={styles.auditField}>
                  <Text style={styles.auditLabel}>Email</Text>
                  <Text style={styles.auditValue}>{signer.signerEmail}</Text>
                </View>
                {signer.signedAt ? (
                  <>
                    <View style={styles.auditField}>
                      <Text style={styles.auditLabel}>Signed At</Text>
                      <Text style={styles.auditValue}>
                        {formatDate(signer.signedAt)}
                      </Text>
                    </View>
                    <View style={styles.auditField}>
                      <Text style={styles.auditLabel}>IP Address</Text>
                      <Text style={styles.auditValue}>
                        {signer.ipAddress || "unknown"}
                      </Text>
                    </View>
                    <View style={styles.auditField}>
                      <Text style={styles.auditLabel}>Signature Type</Text>
                      <Text style={styles.auditValue}>
                        {signer.signatureType || "unknown"}
                      </Text>
                    </View>
                    {signer.documentHash ? (
                      <Text style={styles.hashText}>
                        Document SHA-256: {signer.documentHash}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.auditField}>
                    <Text style={styles.auditLabel}>Status</Text>
                    <Text style={styles.auditValue}>Signature pending</Text>
                  </View>
                )}
              </View>
            ))}
        </Page>
      ) : null}
    </Document>
  );
}

// ── generateContractPdf ───────────────────────────────────────────────────────

/**
 * generateContractPdf — pick the right document component and render to buffer.
 */
export async function generateContractPdf(
  contract: ContractWithSigners
): Promise<Buffer> {
  const element =
    contract.contractType === "purchase_agreement" ? (
      <PurchaseAgreementDocument contract={contract} />
    ) : (
      <AssignmentDocument contract={contract} />
    );

  return renderToBuffer(element);
}

// ── hashBuffer ────────────────────────────────────────────────────────────────

/**
 * hashBuffer — compute SHA-256 hex digest of a buffer.
 */
export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
