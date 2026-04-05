import { getContractBySigningToken } from "@/lib/contract-queries";
import { SigningPageClient } from "./signing-page-client";

interface SignPageProps {
  params: Promise<{ token: string }>;
}

export default async function SignPage({ params }: SignPageProps) {
  const { token } = await params;

  // Fetch contract by signing token (returns null if invalid, expired, or already signed)
  const result = await getContractBySigningToken(token).catch(() => null);

  // ── Invalid / expired / already signed states ────────────────────────────

  if (!result) {
    return (
      <ErrorPage
        title="Invalid Signing Link"
        message="This signing link is invalid, has expired, or the document has already been signed."
      />
    );
  }

  const { contract, signer } = result;

  // Extra guard: signed at check (query already checks but belt-and-suspenders)
  if (signer.signedAt) {
    return (
      <ErrorPage
        title="Already Signed"
        message="This document has already been signed. Thank you!"
      />
    );
  }

  // Extra guard: expiry check
  if (signer.tokenExpiresAt && signer.tokenExpiresAt < new Date()) {
    return (
      <ErrorPage
        title="Signing Link Expired"
        message="This signing link has expired. Please contact the sender to request a new link."
      />
    );
  }

  // ── Format display values ────────────────────────────────────────────────

  const contractTitle =
    contract.contractType === "purchase_agreement"
      ? "Real Estate Purchase Agreement"
      : "Assignment of Contract";

  const formatCurrency = (cents: number | null) => {
    if (cents == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const roleLabel =
    signer.signerRole === "seller"
      ? "Seller"
      : signer.signerRole === "buyer"
      ? "Buyer"
      : "Wholesaler / Co-signer";

  // ── Render signing page ──────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-gray-50 py-8 px-4"
      style={{ colorScheme: "light" }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Branding */}
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-violet-700 tracking-wide uppercase">
            HouseFinder
          </p>
        </div>

        {/* Contract summary card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="mb-4 pb-4 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">{contractTitle}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Please review the contract details below before signing.
            </p>
          </div>

          {/* Property info */}
          <section className="mb-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Property
            </h2>
            <p className="text-gray-900 font-medium">{contract.propertyAddress}</p>
            <p className="text-gray-600 text-sm">
              {contract.city}, UT
              {contract.county ? ` — ${contract.county} County` : ""}
            </p>
            {contract.parcelId && (
              <p className="text-gray-500 text-xs mt-1">
                Parcel: {contract.parcelId}
              </p>
            )}
          </section>

          {/* Parties */}
          <section className="mb-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Parties
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {contract.sellerName && (
                <div>
                  <span className="text-gray-500">Seller: </span>
                  <span className="text-gray-900 font-medium">
                    {contract.sellerName}
                  </span>
                </div>
              )}
              {contract.buyerName && (
                <div>
                  <span className="text-gray-500">Buyer: </span>
                  <span className="text-gray-900 font-medium">
                    {contract.buyerName}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Key terms */}
          <section className="mb-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Key Terms
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {contract.purchasePrice != null && (
                <div>
                  <span className="text-gray-500 block text-xs">
                    Purchase Price
                  </span>
                  <span className="text-gray-900 font-semibold">
                    {formatCurrency(contract.purchasePrice)}
                  </span>
                </div>
              )}
              {contract.earnestMoney != null && (
                <div>
                  <span className="text-gray-500 block text-xs">
                    Earnest Money
                  </span>
                  <span className="text-gray-900 font-semibold">
                    {formatCurrency(contract.earnestMoney)}
                  </span>
                </div>
              )}
              {contract.inspectionPeriodDays != null && (
                <div>
                  <span className="text-gray-500 block text-xs">
                    Inspection Period
                  </span>
                  <span className="text-gray-900 font-semibold">
                    {contract.inspectionPeriodDays} days
                  </span>
                </div>
              )}
              {contract.closingDays != null && (
                <div>
                  <span className="text-gray-500 block text-xs">
                    Closing Timeline
                  </span>
                  <span className="text-gray-900 font-semibold">
                    {contract.closingDays} days from acceptance
                  </span>
                </div>
              )}
              {contract.contractType === "assignment" &&
                contract.assignmentFee != null && (
                  <div>
                    <span className="text-gray-500 block text-xs">
                      Assignment Fee
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {formatCurrency(contract.assignmentFee)}
                    </span>
                  </div>
                )}
            </div>
          </section>

          {/* Download full PDF */}
          <div className="pt-4 border-t border-gray-100">
            <a
              href={`/api/contracts/${contract.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-violet-700 font-medium hover:text-violet-900 underline underline-offset-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download Full Contract PDF
            </a>
          </div>
        </div>

        {/* Signature section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-5 pb-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">
              Your Signature
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Signing as: <strong className="text-gray-700">{signer.signerName}</strong>{" "}
              ({roleLabel})
            </p>
            <p className="text-xs text-gray-400 mt-2">
              By signing, you agree to the terms of the contract above. Your IP
              address and the time of signing will be recorded for audit
              purposes.
            </p>
          </div>

          <SigningPageClient token={token} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by HouseFinder &bull; Secure document signing
        </p>
      </div>
    </div>
  );
}

// ── Error state component ────────────────────────────────────────────────────

function ErrorPage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
      style={{ colorScheme: "light" }}
    >
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <a
          href="/login"
          className="text-sm text-violet-700 hover:text-violet-900 underline"
        >
          Back to HouseFinder
        </a>
      </div>
    </div>
  );
}
