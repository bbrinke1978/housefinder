"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createWholesaleLeadsFromPaste, type PastedLeadResult } from "@/lib/wholesale-actions";

function fmtCompact(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDollars(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function VerdictDot({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="w-3 h-3 rounded-full bg-muted inline-block" />;
  const color = verdict === "green" ? "bg-green-500" : verdict === "yellow" ? "bg-yellow-500" : "bg-red-500";
  return <span className={`w-3 h-3 rounded-full ${color} inline-block`} />;
}

interface Props {
  onClose: () => void;
}

export function WholesalePasteEmail({ onClose }: Props) {
  const [bodyText, setBodyText] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<PastedLeadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!bodyText.trim()) return;
    setError(null);
    setResults(null);

    startTransition(async () => {
      try {
        const res = await createWholesaleLeadsFromPaste(bodyText.trim(), fromEmail.trim() || undefined);
        if (res.leads.length === 0) {
          setError("No properties found in the pasted text. Make sure the email contains addresses with pricing data (Asking, ARV).");
        } else {
          setResults(res.leads);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  // Results view
  if (results) {
    const greens = results.filter(r => r.verdict === "green").length;
    const yellows = results.filter(r => r.verdict === "yellow").length;
    const reds = results.filter(r => r.verdict === "red").length;
    const unscored = results.filter(r => !r.verdict).length;

    return (
      <div className="space-y-5">
        {/* Success header */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-700">
              {results.length} {results.length === 1 ? "deal" : "deals"} imported
            </p>
            <p className="text-sm text-green-600/80 mt-0.5">
              {greens > 0 && <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {greens} strong</span>}
              {yellows > 0 && <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> {yellows} marginal</span>}
              {reds > 0 && <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {reds} pass</span>}
              {unscored > 0 && <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" /> {unscored} unscored</span>}
            </p>
          </div>
        </div>

        {/* Results table */}
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 px-3 font-medium">Property</th>
                <th className="text-right py-2 px-3 font-medium">Asking</th>
                <th className="text-right py-2 px-3 font-medium">ARV</th>
                <th className="text-right py-2 px-3 font-medium">Spread</th>
                <th className="text-center py-2 px-3 font-medium">Score</th>
                <th className="text-center py-2 px-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3">
                    <Link
                      href={`/wholesale/${r.id}`}
                      className="font-medium text-primary hover:underline leading-tight block max-w-[200px] truncate"
                    >
                      {r.address}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{fmtCompact(r.askingPrice)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{fmtCompact(r.arv)}</td>
                  <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${
                    r.spreadDollars === null ? "" : r.spreadDollars >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {fmtDollars(r.spreadDollars)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <VerdictDot verdict={r.verdict} />
                      <span className="tabular-nums font-medium">{r.dealScore !== null ? `${r.dealScore}/10` : "-"}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-xs text-muted-foreground">{r.fieldsFound}/{r.totalFields}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              setResults(null);
              setBodyText("");
              setFromEmail("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Paste another email
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Input view
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paste a wholesaler email below. If it contains multiple properties, each one will be imported as a separate lead with auto-scoring.
      </p>

      {/* From email (optional) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Wholesaler email (optional)
        </label>
        <input
          type="email"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="wholesaler@example.com"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Email body */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Email body
        </label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder={"Paste the email content here...\n\n123 Main St - ASKING $169K\nARV: $325K\nBeds: 3 Baths: 2\nSq Ft: 1,328\nYear Built: 1972\n\n456 Oak Ave - ASKING $145K\nARV: $280K\n..."}
          rows={12}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending || !bodyText.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Import Deals
            </>
          )}
        </button>
      </div>
    </div>
  );
}
