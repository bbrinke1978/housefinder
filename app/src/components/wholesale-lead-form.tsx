"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WholesaleAnalysis } from "@/components/wholesale-analysis";
import { createWholesaleLead } from "@/lib/wholesale-actions";

interface WholesaleLeadFormProps {
  onClose: () => void;
}

export function WholesaleLeadForm({ onClose }: WholesaleLeadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [arv, setArv] = useState<number | undefined>();
  const [askingPrice, setAskingPrice] = useState<number | undefined>();
  const [repairEstimate, setRepairEstimate] = useState<number | undefined>();

  function parseIntOrUndef(val: string): number | undefined {
    const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) || n <= 0 ? undefined : n;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createWholesaleLead(formData);
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save lead");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Property */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Property
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" name="address" required placeholder="123 Main St" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" placeholder="Price" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue="UT" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="zip">Zip</Label>
            <Input id="zip" name="zip" placeholder="84501" className="mt-1" />
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
            <Label htmlFor="askingPrice">Asking Price</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="askingPrice"
                name="askingPrice"
                type="number"
                min="1"
                placeholder="169000"
                className="pl-7"
                onChange={(e) => setAskingPrice(parseIntOrUndef(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="arv">ARV</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="arv"
                name="arv"
                type="number"
                min="1"
                placeholder="325000"
                className="pl-7"
                onChange={(e) => setArv(parseIntOrUndef(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="repairEstimate">Repair Estimate</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="repairEstimate"
                name="repairEstimate"
                type="number"
                min="0"
                placeholder="45000"
                className="pl-7"
                onChange={(e) => setRepairEstimate(parseIntOrUndef(e.target.value))}
              />
            </div>
          </div>
        </div>

        {arv && askingPrice && (
          <div className="mt-4">
            <WholesaleAnalysis arv={arv} askingPrice={askingPrice} repairEstimate={repairEstimate} />
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="sqft">Sq Ft</Label>
            <Input id="sqft" name="sqft" type="number" min="1" placeholder="1328" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="beds">Beds</Label>
            <Input id="beds" name="beds" type="number" min="0" placeholder="3" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="baths">Baths</Label>
            <Input id="baths" name="baths" placeholder="1.5" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="yearBuilt">Year Built</Label>
            <Input id="yearBuilt" name="yearBuilt" type="number" min="1800" max="2030" placeholder="1972" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="lotSize">Lot Size</Label>
            <Input id="lotSize" name="lotSize" placeholder="0.25 ac" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="taxId">Tax ID / Parcel</Label>
            <Input id="taxId" name="taxId" placeholder="09-0234-0015" className="mt-1" />
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
            <Label htmlFor="wholesalerName">Name</Label>
            <Input id="wholesalerName" name="wholesalerName" placeholder="Jane Smith" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="wholesalerPhone">Phone</Label>
            <Input id="wholesalerPhone" name="wholesalerPhone" type="tel" placeholder="(801) 555-1234" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="wholesalerEmail">Email</Label>
            <Input id="wholesalerEmail" name="wholesalerEmail" type="email" placeholder="jane@deals.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="wholesalerCompany">Company</Label>
            <Input id="wholesalerCompany" name="wholesalerCompany" placeholder="Deal Flow LLC" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="sourceChannel">Source Channel</Label>
            <select
              id="sourceChannel"
              name="sourceChannel"
              defaultValue="email"
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

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Any additional notes about this deal..."
          rows={3}
          className="mt-1 resize-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Lead"}
        </Button>
      </div>
    </form>
  );
}
