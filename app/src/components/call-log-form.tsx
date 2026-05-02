"use client";

import { useActionState, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { logCall, type LogCallResult } from "@/lib/analytics-actions";
import { ChevronDown, X } from "lucide-react";

interface DealOption {
  dealId: string;
  leadId: string | null;
  address: string;
  sellerName: string | null;
  city: string;
}

interface CallLogFormProps {
  deals: DealOption[];
}

const INITIAL_STATE: LogCallResult | null = null;

const OUTCOME_OPTIONS = [
  { value: "answered", label: "Answered" },
  { value: "voicemail", label: "Voicemail" },
  { value: "no_answer", label: "No Answer" },
  { value: "wrong_number", label: "Wrong Number" },
];

export function CallLogForm({ deals }: CallLogFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<DealOption | null>(null);
  const [comboOpen, setComboOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return deals.slice(0, 50);
    return deals
      .filter(
        (d) =>
          d.address.toLowerCase().includes(q) ||
          (d.sellerName?.toLowerCase().includes(q) ?? false) ||
          d.city.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [deals, query]);

  const [state, formAction, isPending] = useActionState<LogCallResult | null, FormData>(
    async (_prevState, formData) => {
      const result = await logCall(formData);
      if ("success" in result && result.success) {
        formRef.current?.reset();
        setSelectedDeal(null);
        setQuery("");
      }
      return result;
    },
    INITIAL_STATE
  );

  function handleSelect(deal: DealOption) {
    setSelectedDeal(deal);
    setQuery(deal.address);
    setComboOpen(false);
  }

  function handleClear() {
    setSelectedDeal(null);
    setQuery("");
    setComboOpen(false);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* Hidden leadId */}
      <input type="hidden" name="leadId" value={selectedDeal?.leadId ?? ""} />

      {/* Deal combobox */}
      <div className="space-y-1.5">
        <Label htmlFor="deal-search">Deal / Property</Label>
        <div className="relative">
          <div className="flex items-center rounded-xl border border-input bg-background px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-ring">
            <input
              id="deal-search"
              type="text"
              value={query}
              autoComplete="off"
              placeholder="Search by address, seller, or city..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedDeal(null);
                setComboOpen(true);
              }}
              onFocus={() => setComboOpen(true)}
              onBlur={() => setTimeout(() => setComboOpen(false), 150)}
            />
            {selectedDeal ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          {comboOpen && filtered.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
              {filtered.map((deal) => (
                <li key={deal.dealId}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onMouseDown={() => handleSelect(deal)}
                  >
                    <span className="font-medium">{deal.address}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {deal.city}
                      {deal.sellerName ? ` · ${deal.sellerName}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {comboOpen && query.length > 0 && filtered.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg px-3 py-2 text-sm text-muted-foreground">
              No deals match &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Outcome */}
      <div className="space-y-1.5">
        <Label>Outcome</Label>
        <div className="flex flex-wrap gap-3">
          {OUTCOME_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="outcome"
                value={opt.value}
                required
                className="accent-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Optional notes about this call..."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Feedback */}
      {state && "success" in state && state.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          Call logged successfully.
        </p>
      )}
      {state && "error" in state && (
        <p className="text-sm text-red-500 font-medium">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending || !selectedDeal?.leadId}
        className="w-full sm:w-auto"
      >
        {isPending ? "Saving..." : "Log Call"}
      </Button>
    </form>
  );
}
