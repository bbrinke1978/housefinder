"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WholesaleAnalysis } from "@/components/wholesale-analysis";
import { updateWholesaleLead } from "@/lib/wholesale-actions";
import type { WholesaleLeadWithWholesaler } from "@/types";
import { normalizeAddress } from "@/lib/wholesale-parser";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface ParsedDraft {
  address?: string | null;
  askingPrice?: number | null;
  arv?: number | null;
  sqft?: number | null;
  beds?: number | null;
  baths?: number | null;
  yearBuilt?: number | null;
  taxId?: string | null;
  wholesalerName?: string | null;
  wholesalerPhone?: string | null;
  wholesalerEmail?: string | null;
  confidence?: number;
}

interface WholesaleParseReviewProps {
  lead: WholesaleLeadWithWholesaler;
  duplicates?: WholesaleLeadWithWholesaler[];
}

export function WholesaleParseReview({
  lead,
  duplicates = [],
}: WholesaleParseReviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);

  // Parse the draft JSON
  const draft: ParsedDraft = (() => {
    try {
      return lead.parsedDraft ? JSON.parse(lead.parsedDraft as string) : {};
    } catch {
      return {};
    }
  })();

  // Live analysis state (starts from parsed values)
  const [arv, setArv] = useState<number | undefined>(
    lead.arv ?? draft.arv ?? undefined
  );
  const [askingPrice, setAskingPrice] = useState<number | undefined>(
    lead.askingPrice ?? draft.askingPrice ?? undefined
  );
  const [repairEstimate, setRepairEstimate] = useState<number | undefined>(
    lead.repairEstimate ?? undefined
  );

  function parseIntOrUndef(val: string): number | undefined {
    const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) || n <= 0 ? undefined : n;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("id", lead.id);
    // Set status to "analyzing" on save
    formData.set("status", "analyzing");

    startTransition(async () => {
      try {
        await updateWholesaleLead(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save lead");
      }
    });
  }

  // Confidence indicator: count tracked fields
  const trackedFields = [
    draft.address,
    draft.askingPrice,
    draft.arv,
    draft.sqft,
    draft.beds,
    draft.baths,
    draft.yearBuilt,
    draft.taxId,
    draft.wholesalerName,
    draft.wholesalerPhone,
    draft.wholesalerEmail,
    lead.rawEmailText,
  ];
  const nonNullCount = trackedFields.filter((f) => f !== null && f !== undefined).length;
  const confidencePct = Math.round((nonNullCount / trackedFields.length) * 100);
  const confidenceColor =
    confidencePct >= 70
      ? "text-green-600 bg-green-50 border-green-200"
      : confidencePct >= 40
      ? "text-yellow-700 bg-yellow-50 border-yellow-200"
      : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="space-y-6">
      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Similar address found</p>
            {duplicates.map((dup) => (
              <p key={dup.id} className="text-xs">
                {dup.address} — from{" "}
                <span className="font-medium">
                  {dup.wholesalerName ?? "unknown wholesaler"}
                </span>{" "}
                on {new Date(dup.createdAt).toLocaleDateString()}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold">Review Parsed Email</h2>
          <p className="text-sm text-muted-foreground">
            Verify and correct the auto-extracted fields below
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${confidenceColor}`}
        >
          {nonNullCount}/{trackedFields.length} fields extracted
        </span>
      </div>

      {/* Review form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="id" value={lead.id} />

        {/* Property fields — two-column on desktop */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Property
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="pr-address">Address</Label>
              <Input
                id="pr-address"
                name="address"
                required
                defaultValue={lead.address ?? draft.address ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-city">City</Label>
              <Input
                id="pr-city"
                name="city"
                defaultValue={lead.city ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-state">State</Label>
              <Input
                id="pr-state"
                name="state"
                defaultValue={lead.state ?? "UT"}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-zip">Zip</Label>
              <Input
                id="pr-zip"
                name="zip"
                defaultValue={lead.zip ?? ""}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Financials */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Financials
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="pr-askingPrice">Asking Price</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="pr-askingPrice"
                  name="askingPrice"
                  type="number"
                  min="1"
                  className="pl-7"
                  defaultValue={lead.askingPrice ?? draft.askingPrice ?? ""}
                  onChange={(e) => setAskingPrice(parseIntOrUndef(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pr-arv">ARV</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="pr-arv"
                  name="arv"
                  type="number"
                  min="1"
                  className="pl-7"
                  defaultValue={lead.arv ?? draft.arv ?? ""}
                  onChange={(e) => setArv(parseIntOrUndef(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pr-repairEstimate">Repair Estimate</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="pr-repairEstimate"
                  name="repairEstimate"
                  type="number"
                  min="0"
                  className="pl-7"
                  defaultValue={lead.repairEstimate ?? ""}
                  onChange={(e) => setRepairEstimate(parseIntOrUndef(e.target.value))}
                />
              </div>
            </div>
          </div>

          {arv && askingPrice && (
            <div className="mt-4">
              <WholesaleAnalysis
                arv={arv}
                askingPrice={askingPrice}
                repairEstimate={repairEstimate}
              />
            </div>
          )}
        </div>

        {/* Property details */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="pr-sqft">Sq Ft</Label>
              <Input
                id="pr-sqft"
                name="sqft"
                type="number"
                min="1"
                defaultValue={lead.sqft ?? draft.sqft ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-beds">Beds</Label>
              <Input
                id="pr-beds"
                name="beds"
                type="number"
                min="0"
                defaultValue={lead.beds ?? draft.beds ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-baths">Baths</Label>
              <Input
                id="pr-baths"
                name="baths"
                defaultValue={lead.baths ?? (draft.baths != null ? String(draft.baths) : "")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-yearBuilt">Year Built</Label>
              <Input
                id="pr-yearBuilt"
                name="yearBuilt"
                type="number"
                min="1800"
                max="2030"
                defaultValue={lead.yearBuilt ?? draft.yearBuilt ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-lotSize">Lot Size</Label>
              <Input
                id="pr-lotSize"
                name="lotSize"
                defaultValue={lead.lotSize ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-taxId">Tax ID / Parcel</Label>
              <Input
                id="pr-taxId"
                name="taxId"
                defaultValue={lead.taxId ?? draft.taxId ?? ""}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Wholesaler */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Wholesaler
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="pr-wholesalerName">Name</Label>
              <Input
                id="pr-wholesalerName"
                name="wholesalerName"
                defaultValue={lead.wholesalerName ?? draft.wholesalerName ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-wholesalerPhone">Phone</Label>
              <Input
                id="pr-wholesalerPhone"
                name="wholesalerPhone"
                type="tel"
                defaultValue={lead.wholesalerPhone ?? draft.wholesalerPhone ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-wholesalerEmail">Email</Label>
              <Input
                id="pr-wholesalerEmail"
                name="wholesalerEmail"
                type="email"
                defaultValue={lead.wholesalerEmail ?? draft.wholesalerEmail ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-wholesalerCompany">Company</Label>
              <Input
                id="pr-wholesalerCompany"
                name="wholesalerCompany"
                defaultValue={lead.wholesalerCompany ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pr-sourceChannel">Source Channel</Label>
              <select
                id="pr-sourceChannel"
                name="sourceChannel"
                defaultValue={lead.sourceChannel ?? "email"}
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none"
              >
                <option value="email">Email</option>
                <option value="social">Social</option>
                <option value="text">Text</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save & Analyze"}
          </Button>
        </div>
      </form>

      {/* Raw email toggle */}
      {lead.rawEmailText && (
        <div className="rounded-xl border">
          <button
            type="button"
            onClick={() => setRawExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Raw email text</span>
            {rawExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {rawExpanded && (
            <div className="border-t px-4 py-3">
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono leading-relaxed max-h-64 overflow-y-auto">
                {lead.rawEmailText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
