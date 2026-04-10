"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ImageOff, Store } from "lucide-react";
import type { DealWithBuyer } from "@/types";

interface DealCardProps {
  deal: DealWithBuyer;
  coverPhotoUrl?: string;
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

export function DealCard({ deal, coverPhotoUrl }: DealCardProps) {
  const hot = isHotSeller(deal);
  const displayPrice = deal.offerPrice ?? deal.mao;

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block rounded-lg border bg-card p-2.5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        {/* Cover photo thumbnail — 48x48 avatar-sized */}
        <div className="shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {coverPhotoUrl ? (
            <Image
              src={coverPhotoUrl}
              alt="Cover"
              width={48}
              height={48}
              className="h-12 w-12 object-cover"
            />
          ) : (
            <ImageOff className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>

        {/* Deal info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="font-semibold text-xs leading-tight truncate flex-1">
              {deal.address}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {deal.leadSource === "wholesale" && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400"
                  title="Promoted from wholesale lead"
                >
                  <Store className="h-2.5 w-2.5" />
                  Wholesale
                </span>
              )}
              {hot && (
                <span
                  className="w-2 h-2 rounded-full bg-orange-500 mt-0.5"
                  title="Hot seller"
                />
              )}
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deal.address}, ${deal.city}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground truncate block hover:underline hover:text-foreground transition-colors"
          >
            {deal.city}
          </a>

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
        </div>
      </div>
    </Link>
  );
}
