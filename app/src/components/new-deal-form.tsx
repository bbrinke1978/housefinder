"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createDeal } from "@/lib/deal-actions";
import {
  CONDITION_OPTIONS,
  TIMELINE_OPTIONS,
  MOTIVATION_OPTIONS,
} from "@/types";

interface NewDealFormProps {
  prefill?: {
    address?: string;
    city?: string;
    sellerName?: string;
    propertyId?: string;
  };
}

export function NewDealForm({ prefill }: NewDealFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Live ARV/repair/fee state for MAO preview
  const [arv, setArv] = useState("");
  const [repairEstimate, setRepairEstimate] = useState("");
  const [wholesaleFee, setWholesaleFee] = useState("15000");

  const maoPreview = (() => {
    const a = parseFloat(arv);
    const r = parseFloat(repairEstimate);
    const f = parseFloat(wholesaleFee) || 15000;
    if (!isNaN(a) && !isNaN(r)) {
      return Math.round(a * 0.7 - r - f);
    }
    return null;
  })();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createDeal(formData);
      } catch (err: unknown) {
        // redirect() throws a Next.js redirect error — don't treat as user error
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("NEXT_REDIRECT")) {
          setError(message);
        }
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      {prefill?.propertyId && (
        <input type="hidden" name="propertyId" value={prefill.propertyId} />
      )}

      {/* Property Details */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Property
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1" htmlFor="address">
              Address <span className="text-destructive">*</span>
            </label>
            <input
              id="address"
              name="address"
              type="text"
              required
              defaultValue={prefill?.address}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="123 Main St"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="city">
              City <span className="text-destructive">*</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              required
              defaultValue={prefill?.city}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Price"
            />
          </div>
        </div>
      </section>

      {/* Seller Info */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Seller
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="sellerName"
            >
              Seller Name
            </label>
            <input
              id="sellerName"
              name="sellerName"
              type="text"
              defaultValue={prefill?.sellerName}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="sellerPhone"
            >
              Seller Phone
            </label>
            <input
              id="sellerPhone"
              name="sellerPhone"
              type="tel"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="(801) 555-1234"
            />
          </div>
        </div>
      </section>

      {/* Seller Qualification — 4 Pillars */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Seller Qualification
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="condition"
            >
              Condition
            </label>
            <select
              id="condition"
              name="condition"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select…</option>
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="timeline"
            >
              Timeline
            </label>
            <select
              id="timeline"
              name="timeline"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select…</option>
              {TIMELINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="motivation"
            >
              Motivation
            </label>
            <select
              id="motivation"
              name="motivation"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select…</option>
              {MOTIVATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="askingPrice"
          >
            Asking Price
          </label>
          <input
            id="askingPrice"
            name="askingPrice"
            type="number"
            min="0"
            step="1000"
            className="w-full sm:w-48 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="250000"
          />
        </div>
      </section>

      {/* Financial Analysis */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Financial Analysis
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="arv">
              ARV
            </label>
            <input
              id="arv"
              name="arv"
              type="number"
              min="0"
              step="1000"
              value={arv}
              onChange={(e) => setArv(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="350000"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="repairEstimate"
            >
              Repair Estimate
            </label>
            <input
              id="repairEstimate"
              name="repairEstimate"
              type="number"
              min="0"
              step="1000"
              value={repairEstimate}
              onChange={(e) => setRepairEstimate(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="35000"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="wholesaleFee"
            >
              Wholesale Fee
            </label>
            <input
              id="wholesaleFee"
              name="wholesaleFee"
              type="number"
              min="0"
              step="1000"
              value={wholesaleFee}
              onChange={(e) => setWholesaleFee(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* MAO Preview */}
        {maoPreview !== null && (
          <div
            className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
              maoPreview > 0
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            }`}
          >
            <span className="font-medium">MAO: </span>
            <span
              className={`font-bold ${
                maoPreview > 0 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              ${maoPreview.toLocaleString()}
            </span>
            <span className="text-muted-foreground ml-2">
              (ARV × 70% − Repairs − Fee)
            </span>
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Creating…" : "Create Deal"}
        </button>
        <Link
          href="/deals"
          className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
