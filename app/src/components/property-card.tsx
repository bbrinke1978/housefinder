"use client";

import Link from "next/link";
import { Flame, MapPin, User, Building2, ArrowRight, ChevronDown, Search, SearchX } from "lucide-react";
import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import type { PropertyWithLead } from "@/types";
import { LEAD_SOURCES } from "@/types";
import { updateLeadSource } from "@/lib/actions";
import { TouchpointBadge } from "@/components/touchpoint-badge";
import { SwipeCard } from "@/components/swipe-card";
import { useIsMobile } from "@/hooks/use-mobile";

interface PropertyCardProps {
  property: PropertyWithLead;
  /** Whether this card is selected (for bulk enrollment) */
  selected?: boolean;
}

function ownerTypeBadge(type: string | null): { label: string; badgeClass: string } | null {
  switch (type) {
    case "llc":
      return { label: "LLC", badgeClass: "bg-primary/10 text-primary border border-primary/20" };
    case "trust":
      return { label: "Trust", badgeClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" };
    case "estate":
      return { label: "Estate", badgeClass: "bg-muted text-muted-foreground border border-border" };
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
      badgeClass: "bg-red-500/10 text-red-400 border border-red-500/20",
      barColor: "bg-red-500",
      scoreCircleClass: "bg-red-600 text-white",
    };
  }
  if (score >= 4) {
    return {
      label: "Hot",
      badgeClass: "bg-primary/10 text-primary border border-primary/20",
      barColor: "bg-primary",
      scoreCircleClass: "bg-primary text-white",
    };
  }
  if (score >= 2) {
    return {
      label: "Warm",
      badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      barColor: "bg-amber-500",
      scoreCircleClass: "bg-amber-500 text-white",
    };
  }
  if (score >= 1) {
    return {
      label: "Cool",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      barColor: "bg-emerald-500",
      scoreCircleClass: "bg-emerald-500 text-white",
    };
  }
  return {
    label: "No Signal",
    badgeClass: "bg-muted text-muted-foreground border border-border",
    barColor: "bg-muted-foreground",
    scoreCircleClass: "bg-muted-foreground text-white",
  };
}

function isNew(property: PropertyWithLead): boolean {
  if (!property.firstSeenAt) return false;
  if (!property.lastViewedAt) return true;
  return new Date(property.firstSeenAt) > new Date(property.lastViewedAt);
}

/** Parse leadSource — handles "other:custom text" format */
function parseLeadSource(raw: string | null): { value: string; otherText?: string } {
  if (!raw) return { value: "scraping" };
  if (raw.startsWith("other:")) {
    return { value: "other", otherText: raw.slice(6) };
  }
  return { value: raw };
}

function getLeadSourceInfo(raw: string | null) {
  const { value } = parseLeadSource(raw);
  return LEAD_SOURCES.find((s) => s.value === value) ?? LEAD_SOURCES[0];
}

// -- Lead Source Selector (inline on card) --

interface LeadSourceSelectorProps {
  leadId: string;
  currentSource: string | null;
}

function LeadSourceSelector({ leadId, currentSource }: LeadSourceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(parseLeadSource(currentSource).value);
  const [otherText, setOtherText] = useState(parseLeadSource(currentSource).otherText ?? "");
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const sourceInfo = getLeadSourceInfo(currentSource);

  function handleSelect(value: string) {
    if (value !== "other") {
      setSource(value);
      setOpen(false);
      startTransition(async () => {
        await updateLeadSource(leadId, value);
      });
    } else {
      setSource("other");
    }
  }

  function handleOtherSave() {
    setOpen(false);
    startTransition(async () => {
      await updateLeadSource(leadId, "other", otherText);
    });
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white transition-opacity ${isPending ? "opacity-60" : ""} ${sourceInfo.color}`}
        title="Change lead source"
      >
        <span>{sourceInfo.label}</span>
        <ChevronDown className="h-2.5 w-2.5" />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-1 left-0 z-50 rounded-md border border-border bg-popover shadow-lg w-[160px]"
          onClick={(e) => e.preventDefault()}
        >
          <div className="p-1">
            {LEAD_SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(s.value);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${s.color}`} />
                {s.label}
              </button>
            ))}
          </div>
          {source === "other" && (
            <div className="border-t border-border p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Describe source..."
                className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOtherSave();
                  e.stopPropagation();
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOtherSave();
                }}
                className="w-full rounded bg-primary text-primary-foreground text-xs py-1 hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PropertyCard({ property, selected }: PropertyCardProps) {
  const hot = property.isHot;
  const displayScore = normalizeScore(property.distressScore);
  const pct = Math.min((displayScore / 10) * 100, 100);
  const badge = ownerTypeBadge(property.ownerType);
  const isEntity = property.ownerType === "llc" || property.ownerType === "trust" || property.ownerType === "estate";
  const tier = getTier(property.distressScore);
  const isMobile = useIsMobile();

  const handleSwipeRight = useCallback(() => {
    // Right swipe → navigate to property detail to initiate a call
    window.location.href = `/properties/${property.id}#contact`;
  }, [property.id]);

  const handleSwipeLeft = useCallback(() => {
    // Left swipe → navigate to property detail to change status
    window.location.href = `/properties/${property.id}`;
  }, [property.id]);

  const cardContent = (
    <Link href={`/properties/${property.id}`} className="group block">
      <div
        className={`relative bg-card rounded-xl p-3 md:p-4 border transition-all duration-200 hover:border-primary/30 ${
          hot ? "hot-pulse" : ""
        } ${selected ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Header: address + badges */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-foreground group-hover:text-primary transition-colors">
              {property.address || property.parcelId}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.address || property.parcelId}, ${property.city}, ${property.state}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:underline hover:text-foreground transition-colors"
              >
                {property.city}, {property.state}
              </a>
            </div>
          </div>
          <div className="flex flex-wrap shrink-0 items-center gap-1 justify-end max-w-[140px]">
            {property.hasDeal && (
              <span className="inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full font-semibold bg-teal-500/10 text-teal-500 border border-teal-500/20">
                Deal Active
              </span>
            )}
            {badge && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.badgeClass}`}>
                {badge.label}
              </span>
            )}
            {isNew(property) && (
              <span className="inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
                New
              </span>
            )}
          </div>
        </div>

        {/* Owner */}
        {property.ownerName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
            {isEntity ? <Building2 className="h-3 w-3 flex-shrink-0" /> : <User className="h-3 w-3 flex-shrink-0" />}
            <span className="truncate">{property.ownerName}</span>
          </div>
        )}

        {/* Assessor data: sqft + year built */}
        {(property.buildingSqft || property.yearBuilt) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            {property.buildingSqft && (
              <span>{property.buildingSqft.toLocaleString()} sqft</span>
            )}
            {property.buildingSqft && property.yearBuilt && (
              <span className="text-border">·</span>
            )}
            {property.yearBuilt && (
              <span>Built {property.yearBuilt}</span>
            )}
          </div>
        )}

        {/* Compact score row: [circle] [bar] [tier badge] */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${tier.scoreCircleClass}`}
          >
            {displayScore}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${tier.barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${tier.badgeClass}`}
          >
            {hot && <Flame className="h-3 w-3" />}
            {tier.label}
          </span>
        </div>

        {/* Bottom row: lead status + source badge + touchpoints + hover CTA */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
              {property.leadStatus.replace("_", " ")}
            </span>
            <LeadSourceSelector
              leadId={property.leadId}
              currentSource={property.leadSource ?? null}
            />
            {(property.touchpointCount ?? 0) > 0 && (
              <TouchpointBadge count={property.touchpointCount ?? 0} />
            )}
            {property.traceStatus === "traced_found" && (
              <span title="Skip traced — results found">
                <Search className="h-3 w-3 text-emerald-500 shrink-0" />
              </span>
            )}
            {property.traceStatus === "traced_not_found" && (
              <span title="Skip traced — no results">
                <SearchX className="h-3 w-3 text-muted-foreground shrink-0" />
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-primary opacity-0 transition-all duration-200 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 shrink-0">
            View details
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );

  if (isMobile) {
    return (
      <SwipeCard
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
        rightLabel="Call"
        leftLabel="Status"
      >
        {cardContent}
      </SwipeCard>
    );
  }

  return cardContent;
}
