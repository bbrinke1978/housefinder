"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateWholesaleLeadStatus } from "@/lib/wholesale-actions";
import type { WholesaleLeadWithWholesaler } from "@/types";

interface WholesaleDetailHeaderProps {
  lead: WholesaleLeadWithWholesaler;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "analyzing", label: "Analyzing" },
  { value: "interested", label: "Interested" },
  { value: "pass", label: "Pass" },
  { value: "promoted", label: "Promoted" },
] as const;

const SOURCE_LABELS: Record<string, string> = {
  email: "Email",
  social: "Social",
  text: "Text",
  other: "Other",
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "interested":
      return "bg-green-50 text-green-700 border-green-200";
    case "analyzing":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "pass":
      return "bg-red-50 text-red-700 border-red-200";
    case "promoted":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

export function WholesaleDetailHeader({ lead }: WholesaleDetailHeaderProps) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: string) {
    if (newStatus === lead.status) return;
    startTransition(async () => {
      await updateWholesaleLeadStatus(lead.id, newStatus);
    });
  }

  const canPromote = lead.status === "interested" || lead.status === "analyzing";

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link
        href="/wholesale"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Wholesale
      </Link>

      {/* Address and status row */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold md:text-2xl leading-tight">{lead.address}</h1>
          {(lead.city || lead.state || lead.zip) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {[lead.city, lead.state, lead.zip].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(lead.status)}`}
          >
            {STATUS_OPTIONS.find((s) => s.value === lead.status)?.label ?? lead.status}
          </span>

          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isPending}
            className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm outline-none disabled:opacity-50"
            aria-label="Change status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {canPromote ? (
            <Button size="sm" disabled title="Coming soon — Plan 04">
              Promote to Deal
            </Button>
          ) : null}
        </div>
      </div>

      {/* Wholesaler info */}
      {(lead.wholesalerName || lead.wholesalerEmail || lead.wholesalerPhone) && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {lead.wholesalerName ?? "Wholesaler"}
              {lead.wholesalerCompany && (
                <span className="ml-1 text-muted-foreground font-normal">
                  · {lead.wholesalerCompany}
                </span>
              )}
            </p>
            {lead.sourceChannel && (
              <Badge variant="outline" className="text-xs">
                <Building2 className="mr-1 h-3 w-3" />
                {SOURCE_LABELS[lead.sourceChannel] ?? lead.sourceChannel}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {lead.wholesalerPhone && (
              <a
                href={`tel:${lead.wholesalerPhone}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {lead.wholesalerPhone}
              </a>
            )}
            {lead.wholesalerEmail && (
              <a
                href={`mailto:${lead.wholesalerEmail}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                {lead.wholesalerEmail}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
