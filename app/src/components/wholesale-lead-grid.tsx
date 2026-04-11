"use client";

import { useState } from "react";
import type { WholesaleLeadWithWholesaler } from "@/types";
import { WholesaleLeadCard } from "@/components/wholesale-lead-card";
import { WholesaleLeadForm } from "@/components/wholesale-lead-form";
import { WholesalePasteEmail } from "@/components/wholesale-paste-email";
import { Mail } from "lucide-react";

interface WholesaleLeadGridProps {
  leads: WholesaleLeadWithWholesaler[];
  wholesalers: { id: string; name: string }[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "analyzing", label: "Analyzing" },
  { value: "interested", label: "Interested" },
  { value: "pass", label: "Pass" },
  { value: "promoted", label: "Promoted" },
];

const VERDICT_OPTIONS = [
  { value: "", label: "All" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
];

export function WholesaleLeadGrid({ leads, wholesalers }: WholesaleLeadGridProps) {
  const [verdict, setVerdict] = useState("");
  const [status, setStatus] = useState("");
  const [wholesalerId, setWholesalerId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);

  const filtered = leads.filter((l) => {
    if (verdict && l.verdict !== verdict) return false;
    if (status && l.status !== status) return false;
    if (wholesalerId && l.wholesalerId !== wholesalerId) return false;
    return true;
  });

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Verdict toggle group */}
        <div className="flex rounded-xl border border-border overflow-hidden text-sm bg-muted/40">
          {VERDICT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setVerdict(opt.value)}
              className={`px-3 py-1.5 transition-colors border-r last:border-r-0 border-border ${
                verdict === opt.value
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.value === "green" && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle" />}
              {opt.value === "yellow" && <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1.5 align-middle" />}
              {opt.value === "red" && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 align-middle" />}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-background text-sm px-3 py-1.5 text-foreground"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Wholesaler filter */}
        {wholesalers.length > 0 && (
          <select
            value={wholesalerId}
            onChange={(e) => setWholesalerId(e.target.value)}
            className="rounded-xl border border-border bg-background text-sm px-3 py-1.5 text-foreground"
          >
            <option value="">All Wholesalers</option>
            {wholesalers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}

        {/* Action buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPasteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors min-h-[36px]"
          >
            <Mail className="h-3.5 w-3.5" />
            Paste Email
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors min-h-[36px]"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Count indicator */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {leads.length} leads
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <WholesaleLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-muted-foreground">
            No wholesale leads yet. Paste a deal email or add one manually.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPasteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Paste Email
            </button>
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              + Add Lead
            </button>
          </div>
        </div>
      )}

      {/* Paste email modal overlay */}
      {pasteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPasteOpen(false);
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background border shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Paste Wholesale Email</h2>
              </div>
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <WholesalePasteEmail onClose={() => setPasteOpen(false)} />
          </div>
        </div>
      )}

      {/* Manual entry modal overlay */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFormOpen(false);
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background border shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Add Wholesale Lead</h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <WholesaleLeadForm onClose={() => setFormOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
