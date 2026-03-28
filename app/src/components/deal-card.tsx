"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { DealWithBuyer } from "@/types";

interface DealCardProps {
  deal: DealWithBuyer;
}

function formatK(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `$${Math.round(value / 1000)}k`;
}

/**
 * Hot seller: condition is heavy/tear_down AND timeline is asap
 * AND motivation is financial_distress/inherited/vacant
 */
function isHotSeller(deal: DealWithBuyer): boolean {
  const hotConditions = ["heavy", "tear_down"];
  const hotMotivations = ["financial_distress", "inherited", "vacant"];
  return (
    !!deal.condition &&
    hotConditions.includes(deal.condition) &&
    deal.timeline === "asap" &&
    !!deal.motivation &&
    hotMotivations.includes(deal.motivation)
  );
}

export function DealCard({ deal }: DealCardProps) {
  const hot = isHotSeller(deal);
  const displayPrice = deal.offerPrice ?? deal.mao;

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block rounded-lg border bg-card p-2.5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-1">
        <p className="font-semibold text-xs leading-tight truncate flex-1">
          {deal.address}
        </p>
        {hot && (
          <span
            className="shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-0.5"
            title="Hot seller"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground truncate">{deal.city}</p>

      {deal.sellerName && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {deal.sellerName}
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        {deal.arv !== null && (
          <span className="text-xs text-muted-foreground">
            ARV {formatK(deal.arv)}
          </span>
        )}
        {displayPrice !== null && (
          <span className="text-xs font-medium text-foreground">
            Offer {formatK(displayPrice)}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground/70">
        {formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true })}
      </p>
    </Link>
  );
}
