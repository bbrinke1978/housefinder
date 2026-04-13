"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, User, DollarSign, Flame, Pencil, X, Check, Phone, Mail, Home, Search } from "lucide-react";
import { SkipTraceButton } from "@/components/skip-trace-button";
import { updateDeal } from "@/lib/deal-actions";
import type { DealWithBuyer, OwnerContact } from "@/types";
import { CONDITION_OPTIONS, TIMELINE_OPTIONS, MOTIVATION_OPTIONS } from "@/types";

interface DealOverviewProps {
  deal: DealWithBuyer;
  contacts?: OwnerContact[];
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString();
}

function conditionColor(condition: string | null): string {
  switch (condition) {
    case "light":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "heavy":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "tear_down":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function timelineColor(timeline: string | null): string {
  switch (timeline) {
    case "asap":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "1_month":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "3_months":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "flexible":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function motivationLabel(motivation: string | null): string {
  const opt = MOTIVATION_OPTIONS.find((o) => o.value === motivation);
  return opt?.label ?? motivation ?? "—";
}

function conditionLabel(condition: string | null): string {
  const opt = CONDITION_OPTIONS.find((o) => o.value === condition);
  return opt?.label ?? condition ?? "—";
}

function timelineLabel(timeline: string | null): string {
  const opt = TIMELINE_OPTIONS.find((o) => o.value === timeline);
  return opt?.label ?? timeline ?? "—";
}

function isHotSeller(deal: DealWithBuyer): boolean {
  const hotConditions = ["heavy", "tear_down"];
  const hotMotivations = ["financial_distress", "inherited", "vacant"];
  return (
    hotConditions.includes(deal.condition ?? "") &&
    deal.timeline === "asap" &&
    hotMotivations.includes(deal.motivation ?? "")
  );
}

export function DealOverview({ deal, contacts = [] }: DealOverviewProps) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      await updateDeal(deal.id, new FormData(e.currentTarget));
      setEditing(false);
    } finally {
      setPending(false);
    }
  }

  const hot = isHotSeller(deal);

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={deal.address}
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={deal.city} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Seller
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="sellerName">Seller Name</Label>
                <Input
                  id="sellerName"
                  name="sellerName"
                  defaultValue={deal.sellerName ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="sellerPhone">Phone</Label>
                <Input
                  id="sellerPhone"
                  name="sellerPhone"
                  defaultValue={deal.sellerPhone ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="askingPrice">Asking Price</Label>
                <Input
                  id="askingPrice"
                  name="askingPrice"
                  type="number"
                  defaultValue={deal.askingPrice ?? ""}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seller Qualification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  name="condition"
                  defaultValue={deal.condition ?? ""}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Select --</option>
                  {CONDITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <select
                  id="timeline"
                  name="timeline"
                  defaultValue={deal.timeline ?? ""}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Select --</option>
                  {TIMELINE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="motivation">Motivation</Label>
                <select
                  id="motivation"
                  name="motivation"
                  defaultValue={deal.motivation ?? ""}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Select --</option>
                  {MOTIVATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Financials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="arv">ARV ($)</Label>
                <Input
                  id="arv"
                  name="arv"
                  type="number"
                  defaultValue={deal.arv ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="repairEstimate">Repair Estimate ($)</Label>
                <Input
                  id="repairEstimate"
                  name="repairEstimate"
                  type="number"
                  defaultValue={deal.repairEstimate ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="offerPrice">Offer Price ($)</Label>
                <Input
                  id="offerPrice"
                  name="offerPrice"
                  type="number"
                  defaultValue={deal.offerPrice ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="assignmentFee">Assignment Fee ($)</Label>
                <Input
                  id="assignmentFee"
                  name="assignmentFee"
                  type="number"
                  defaultValue={deal.assignmentFee ?? ""}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            <Check className="h-4 w-4 mr-1" />
            {pending ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(false)}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {hot && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 dark:border-orange-700 dark:bg-orange-950/30">
          <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <span className="font-semibold text-orange-700 dark:text-orange-300">
            HOT SELLER — Heavy repairs + ASAP timeline + motivated
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline hover:text-primary transition-colors inline-block"
            >
              {deal.address}
            </a>
            <p className="text-sm text-muted-foreground">
              {deal.city}, {deal.state}
            </p>
            {deal.propertyId && (
              <Link
                href={`/properties/${deal.propertyId}`}
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                View source property
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Seller */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Seller
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="font-medium">{deal.sellerName ?? "Unknown"}</p>
            {deal.sellerPhone ? (
              <a
                href={`tel:${deal.sellerPhone}`}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Phone className="h-3 w-3" />
                {deal.sellerPhone}
              </a>
            ) : (
              contacts.filter((c) => c.phone).slice(0, 2).map((c) => (
                <a
                  key={c.id}
                  href={`tel:${c.phone}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {c.phone}
                  {c.source !== "manual" && (
                    <span className="text-xs text-muted-foreground">({c.source})</span>
                  )}
                </a>
              ))
            )}
            {contacts.filter((c) => c.email).slice(0, 1).map((c) => (
              <a
                key={c.id}
                href={`mailto:${c.email}`}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                {c.email}
              </a>
            ))}
            {deal.askingPrice != null && (
              <p className="text-sm">
                <span className="text-muted-foreground">Asking:</span>{" "}
                <span className="font-medium">{fmt(deal.askingPrice)}</span>
              </p>
            )}
            {/* Skip Trace button — uses propertyId if deal is linked to a property */}
            {deal.propertyId && (
              <div className="pt-2 border-t border-border mt-2">
                <SkipTraceButton
                  propertyId={deal.propertyId}
                  hasTracerfyResult={(contacts ?? []).some((c) => c.source.startsWith("tracerfy"))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seller Qualification — 4 pillars */}
        <Card>
          <CardHeader>
            <CardTitle>Seller Qualification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Condition</p>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${conditionColor(deal.condition)}`}
                >
                  {conditionLabel(deal.condition)}
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Timeline</p>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${timelineColor(deal.timeline)}`}
                >
                  {timelineLabel(deal.timeline)}
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Motivation</p>
                <Badge variant="outline">{motivationLabel(deal.motivation)}</Badge>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Price</p>
                <span className="text-sm font-medium">{fmt(deal.askingPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ARV</span>
              <span className="font-medium">{fmt(deal.arv)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Repairs</span>
              <span>{fmt(deal.repairEstimate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">MAO</span>
              <span
                className={
                  deal.mao != null && deal.offerPrice != null
                    ? deal.mao >= deal.offerPrice
                      ? "font-medium text-green-600 dark:text-green-400"
                      : "font-medium text-red-600 dark:text-red-400"
                    : ""
                }
              >
                {fmt(deal.mao)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-1.5 mt-1.5">
              <span className="text-muted-foreground">Offer Price</span>
              <span className="font-semibold">{fmt(deal.offerPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Assignment Fee</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {fmt(deal.assignmentFee)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessor Data — from linked property */}
      {(deal.buildingSqft || deal.yearBuilt || deal.assessedValue || deal.lotAcres) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              Property Details (Assessor)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {deal.buildingSqft && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Building</p>
                  <p className="text-sm font-semibold">{deal.buildingSqft.toLocaleString()} sqft</p>
                </div>
              )}
              {deal.yearBuilt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Year Built</p>
                  <p className="text-sm font-semibold">{deal.yearBuilt}</p>
                </div>
              )}
              {deal.assessedValue && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Assessed Value</p>
                  <p className="text-sm font-semibold">${deal.assessedValue.toLocaleString()}</p>
                </div>
              )}
              {deal.lotAcres && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Lot Size</p>
                  <p className="text-sm font-semibold">{deal.lotAcres} acres</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4 mr-1" />
        Edit Deal
      </Button>
    </div>
  );
}
