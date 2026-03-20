"use client";

import Link from "next/link";
import { Flame, MapPin, User, Building2, ArrowRight } from "lucide-react";
import type { PropertyWithLead } from "@/types";

interface PropertyCardProps {
  property: PropertyWithLead;
}

function ownerTypeBadge(type: string | null): { label: string; badgeClass: string; borderClass: string } | null {
  switch (type) {
    case "llc":
      return { label: "LLC", badgeClass: "bg-purple-500 text-white", borderClass: "border-l-4 border-l-purple-500" };
    case "trust":
      return { label: "Trust", badgeClass: "bg-indigo-500 text-white", borderClass: "border-l-4 border-l-indigo-500" };
    case "estate":
      return { label: "Estate", badgeClass: "bg-slate-500 text-white", borderClass: "border-l-4 border-l-slate-500" };
    default:
      return null;
  }
}

function scoreColor(score: number): string {
  if (score >= 7) return "bg-red-500 text-white";
  if (score >= 5) return "bg-brand-500 text-white";
  if (score >= 3) return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
}

function scoreBarColor(score: number): string {
  if (score >= 7) return "bg-red-500";
  if (score >= 5) return "bg-brand-500";
  if (score >= 3) return "bg-amber-500";
  return "bg-emerald-500";
}

function isNew(property: PropertyWithLead): boolean {
  if (!property.firstSeenAt) return false;
  if (!property.lastViewedAt) return true;
  return new Date(property.firstSeenAt) > new Date(property.lastViewedAt);
}

export function PropertyCard({ property }: PropertyCardProps) {
  const hot = property.isHot;
  const pct = Math.min((property.distressScore / 10) * 100, 100);
  const badge = ownerTypeBadge(property.ownerType);
  const isEntity = property.ownerType === "llc" || property.ownerType === "trust" || property.ownerType === "estate";

  return (
    <Link href={`/properties/${property.id}`} className="group block">
      <div
        className={`card-warm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
          hot ? "hot-pulse" : ""
        } ${badge?.borderClass ?? ""}`}
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
            {hot && (
              <span className="inline-flex items-center gap-0.5 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                <Flame className="h-3 w-3" />
                Hot
              </span>
            )}
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
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${scoreColor(property.distressScore)}`}
            >
              {property.distressScore}
            </span>
            <span className="text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
              Score
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
            className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(property.distressScore)}`}
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
