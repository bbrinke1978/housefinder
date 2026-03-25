"use client";

import Link from "next/link";
import { Flame, MapPin, User, Building2, ArrowRight } from "lucide-react";
import type { PropertyWithLead } from "@/types";

interface PropertyCardProps {
  property: PropertyWithLead;
}

function ownerTypeBadge(type: string | null): { label: string; badgeClass: string; accentClass: string } | null {
  switch (type) {
    case "llc":
      return { label: "LLC", badgeClass: "bg-purple-500 text-white", accentClass: "ring-2 ring-purple-400/50 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-[#3d3d3d]" };
    case "trust":
      return { label: "Trust", badgeClass: "bg-indigo-500 text-white", accentClass: "ring-2 ring-indigo-400/50 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-[#3d3d3d]" };
    case "estate":
      return { label: "Estate", badgeClass: "bg-slate-500 text-white", accentClass: "ring-2 ring-slate-400/50 bg-gradient-to-br from-slate-100 to-white dark:from-slate-900/20 dark:to-[#3d3d3d]" };
    default:
      return null;
  }
}

/** Normalize raw distress score (1-24+) to a display score (1-10) */
function normalizeScore(raw: number): number {
  if (raw <= 0) return 0;
  if (raw <= 3) return raw;        // 1→1, 2→2, 3→3
  if (raw <= 5) return 4;          // 4-5→4
  if (raw <= 7) return 5;          // 6-7→5
  if (raw <= 9) return 6;          // 8-9→6
  if (raw <= 12) return 7;         // 10-12→7
  if (raw <= 16) return 8;         // 13-16→8
  if (raw <= 20) return 9;         // 17-20→9
  return 10;                       // 21+→10
}

interface TierInfo {
  label: string;
  badgeClass: string;
  barColor: string;
  scoreCircleClass: string;
}

function getTier(score: number): TierInfo {
  if (score >= 7) {
    return {
      label: "Critical",
      badgeClass: "bg-red-700 text-white",
      barColor: "bg-red-600",
      scoreCircleClass: "bg-red-600 text-white",
    };
  }
  if (score >= 4) {
    return {
      label: "Hot",
      badgeClass: "bg-brand-500 text-white",
      barColor: "bg-brand-500",
      scoreCircleClass: "bg-brand-500 text-white",
    };
  }
  if (score >= 2) {
    return {
      label: "Warm",
      badgeClass: "bg-amber-500 text-white",
      barColor: "bg-amber-500",
      scoreCircleClass: "bg-amber-500 text-white",
    };
  }
  if (score >= 1) {
    return {
      label: "Cool",
      badgeClass: "bg-emerald-600 text-white",
      barColor: "bg-emerald-500",
      scoreCircleClass: "bg-emerald-500 text-white",
    };
  }
  return {
    label: "No Signal",
    badgeClass: "bg-dark-400 text-white",
    barColor: "bg-dark-400",
    scoreCircleClass: "bg-dark-400 text-white",
  };
}

function isNew(property: PropertyWithLead): boolean {
  if (!property.firstSeenAt) return false;
  if (!property.lastViewedAt) return true;
  return new Date(property.firstSeenAt) > new Date(property.lastViewedAt);
}

export function PropertyCard({ property }: PropertyCardProps) {
  const hot = property.isHot;
  const displayScore = normalizeScore(property.distressScore);
  const pct = Math.min((displayScore / 10) * 100, 100);
  const badge = ownerTypeBadge(property.ownerType);
  const isEntity = property.ownerType === "llc" || property.ownerType === "trust" || property.ownerType === "estate";
  const tier = getTier(property.distressScore);

  return (
    <Link href={`/properties/${property.id}`} className="group block">
      <div
        className={`card-warm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
          hot ? "hot-pulse" : ""
        } ${badge?.accentClass ?? ""}`}
      >
        {/* Header: address + badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-dark-950 dark:text-dark-100 group-hover:text-brand-500 transition-colors">
              {property.address || property.parcelId}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 mt-0.5">
              <MapPin className="h-3 w-3" />
              <span>
                {property.city}, {property.state}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {badge && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${badge.badgeClass}`}>
                {badge.label}
              </span>
            )}
            {isNew(property) && (
              <span className="badge-tag text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                New
              </span>
            )}
            {/* Tier label — replaces standalone Hot badge; Hot gets the flame icon */}
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm ${tier.badgeClass}`}>
              {hot && <Flame className="h-3 w-3" />}
              {tier.label}
            </span>
          </div>
        </div>

        {/* Owner */}
        {property.ownerName && (
          <div className="flex items-center gap-1.5 text-xs text-dark-500 dark:text-dark-400 mb-3">
            {isEntity ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
            <span className="truncate">{property.ownerName}</span>
          </div>
        )}

        {/* Score section */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${tier.scoreCircleClass}`}
            >
              {displayScore}
            </span>
            <span className="text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
              / 10
            </span>
          </div>
          <span
            style={{ fontFamily: "var(--font-heading)" }}
            className="text-xs uppercase tracking-wider text-dark-400 dark:text-dark-500"
          >
            {property.leadStatus.replace("_", " ")}
          </span>
        </div>

        {/* Score bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-warm-200 dark:bg-dark-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${tier.barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Hover CTA */}
        <div className="flex items-center justify-end mt-3 opacity-0 transition-all duration-200 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0">
          <span className="flex items-center gap-1 text-xs font-bold text-brand-500">
            View details
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
