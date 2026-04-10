import { notFound } from "next/navigation";
import { getWholesaleLead, getWholesaleLeadNotes, checkDuplicateAddress } from "@/lib/wholesale-queries";
import { WholesaleParseReview } from "@/components/wholesale-parse-review";
import { WholesaleDetailHeader } from "@/components/wholesale-detail-header";
import { WholesaleAnalysis } from "@/components/wholesale-analysis";
import { WholesaleNotes } from "@/components/wholesale-notes";

export const dynamic = "force-dynamic";

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "—";
  return `${n.toLocaleString()}${suffix}`;
}

export default async function WholesaleDetailPage({ params }: DetailPageProps) {
  const { id } = await params;

  const [lead, notes] = await Promise.all([
    getWholesaleLead(id),
    getWholesaleLeadNotes(id),
  ]);

  if (!lead) {
    notFound();
  }

  // Check for duplicates if lead has a normalized address (for parse review)
  const duplicates =
    lead.parsedDraft && lead.status === "new" && lead.addressNormalized
      ? await checkDuplicateAddress(lead.addressNormalized, lead.id)
      : [];

  const isNewEmailLead = lead.status === "new" && lead.parsedDraft;

  return (
    <div className="space-y-6">
      {isNewEmailLead ? (
        /* Parse review flow for new email-derived leads */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WholesaleParseReview lead={lead} duplicates={duplicates} />
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Notes</h3>
              <WholesaleNotes notes={notes} wholesaleLeadId={lead.id} />
            </div>
          </div>
        </div>
      ) : (
        /* Full detail view for analyzed/reviewed leads */
        <div className="space-y-6">
          <WholesaleDetailHeader lead={lead} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property details grid */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Property Details
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { label: "Address", value: lead.address },
                    {
                      label: "City / State",
                      value: [lead.city, lead.state, lead.zip]
                        .filter(Boolean)
                        .join(", ") || "—",
                    },
                    { label: "Sq Ft", value: fmtNum(lead.sqft, " sqft") },
                    { label: "Beds / Baths", value: `${lead.beds ?? "—"} bd / ${lead.baths ?? "—"} ba` },
                    { label: "Year Built", value: fmtNum(lead.yearBuilt) },
                    { label: "Lot Size", value: lead.lotSize ?? "—" },
                    { label: "Tax ID", value: lead.taxId ?? "—" },
                  ].map((row) => (
                    <div key={row.label} className="py-1 border-b border-border last:border-b-0">
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="text-sm font-medium">{row.value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis */}
              {(lead.arv || lead.askingPrice) && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Deal Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Asking Price</p>
                      <p className="text-lg font-bold">{fmt(lead.askingPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ARV</p>
                      <p className="text-lg font-bold">{fmt(lead.arv)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Repair Estimate</p>
                      <p className="text-lg font-bold">{fmt(lead.repairEstimate)}</p>
                    </div>
                  </div>
                  <WholesaleAnalysis
                    arv={lead.arv}
                    askingPrice={lead.askingPrice}
                    repairEstimate={lead.repairEstimate}
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Notes */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Notes</h3>
                <WholesaleNotes notes={notes} wholesaleLeadId={lead.id} />
              </div>

              {/* Wholesaler info card */}
              {(lead.wholesalerName || lead.wholesalerEmail || lead.wholesalerPhone) && (
                <div className="rounded-xl border bg-card p-4 space-y-2">
                  <h3 className="text-sm font-semibold">Wholesaler</h3>
                  <p className="text-sm font-medium">
                    {lead.wholesalerName ?? "Unknown"}
                  </p>
                  {lead.wholesalerCompany && (
                    <p className="text-xs text-muted-foreground">{lead.wholesalerCompany}</p>
                  )}
                  {lead.wholesalerPhone && (
                    <a
                      href={`tel:${lead.wholesalerPhone}`}
                      className="block text-sm text-primary hover:underline"
                    >
                      {lead.wholesalerPhone}
                    </a>
                  )}
                  {lead.wholesalerEmail && (
                    <a
                      href={`mailto:${lead.wholesalerEmail}`}
                      className="block text-sm text-primary hover:underline"
                    >
                      {lead.wholesalerEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
