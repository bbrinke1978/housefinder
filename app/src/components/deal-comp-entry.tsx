"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  BarChart2,
  CheckCircle2,
  Save,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { updateDeal } from "@/lib/deal-actions";
import { updateDealComps } from "@/lib/deal-actions";
import type { DealWithBuyer, DealComp } from "@/types";

interface DealCompEntryProps {
  deal: DealWithBuyer;
}

function parseSavedComps(raw: string | null): DealComp[] {
  if (!raw) return [emptyComp(), emptyComp(), emptyComp()];
  try {
    const parsed = JSON.parse(raw) as DealComp[];
    // Pad to 3 slots
    while (parsed.length < 3) parsed.push(emptyComp());
    return parsed.slice(0, 3);
  } catch {
    return [emptyComp(), emptyComp(), emptyComp()];
  }
}

function emptyComp(): DealComp {
  return { address: "", salePrice: 0, details: "", dom: undefined, notes: "" };
}

function fmtDollar(n: number): string {
  return "$" + n.toLocaleString();
}

function buildMlsUrl(address: string, city: string): string {
  const query = `${address} ${city} UT`.trim();
  return `https://www.utahrealestate.com/search/map#query=${encodeURIComponent(query)}`;
}

function buildZillowUrl(address: string, city: string, state: string): string {
  const query = `${address} ${city} ${state}`.trim();
  return `https://www.zillow.com/homes/${encodeURIComponent(query)}_rb/`;
}

export function DealCompEntry({ deal }: DealCompEntryProps) {
  const [comps, setComps] = useState<DealComp[]>(() =>
    parseSavedComps(deal.comps)
  );
  const [arvNotes, setArvNotes] = useState(deal.arvNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [applyingArv, setApplyingArv] = useState(false);
  const [saved, setSaved] = useState(false);

  const filledComps = comps.filter((c) => c.salePrice > 0);
  const avgPrice =
    filledComps.length > 0
      ? Math.round(
          filledComps.reduce((sum, c) => sum + c.salePrice, 0) /
            filledComps.length
        )
      : 0;

  function updateComp(
    index: number,
    field: keyof DealComp,
    value: string | number | undefined
  ) {
    setComps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setSaved(false);
  }

  async function handleSaveComps() {
    setSaving(true);
    try {
      await updateDealComps(deal.id, JSON.stringify(comps), arvNotes);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleUseAsArv() {
    if (avgPrice <= 0) return;
    setApplyingArv(true);
    try {
      const fd = new FormData();
      fd.set("arv", String(avgPrice));
      await updateDeal(deal.id, fd);
    } finally {
      setApplyingArv(false);
    }
  }

  const mlsUrl = buildMlsUrl(deal.address, deal.city);
  const zillowUrl = buildZillowUrl(deal.address, deal.city, deal.state);

  return (
    <div className="space-y-4">
      {/* MLS + Zillow Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            Research Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Search MLS for comparable sales, or view this property on Zillow.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={mlsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Search MLS Comps — {deal.address}, {deal.city}
              </Button>
            </a>
            <a href={zillowUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View on Zillow
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: Zillow Zestimates may be inaccurate in Utah (non-disclosure state). Use MLS comps for accurate ARV.
          </p>
        </CardContent>
      </Card>

      {/* Comp Entry Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            Comparable Sales (up to 3)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {comps.map((comp, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Comp {i + 1}
                </p>
                {(comp.address || comp.salePrice > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setComps((prev) => {
                        const next = [...prev];
                        next[i] = emptyComp();
                        return next;
                      });
                      setSaved(false);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Clear comp ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor={`comp-addr-${i}`} className="text-xs">
                    Address
                  </Label>
                  <Input
                    id={`comp-addr-${i}`}
                    placeholder="123 Oak St, Price, UT"
                    value={comp.address}
                    onChange={(e) => updateComp(i, "address", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`comp-price-${i}`} className="text-xs">
                    Sale Price
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id={`comp-price-${i}`}
                      type="number"
                      placeholder="280000"
                      value={comp.salePrice || ""}
                      onChange={(e) =>
                        updateComp(
                          i,
                          "salePrice",
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="pl-6"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`comp-details-${i}`} className="text-xs">
                    Details (beds/baths/sqft)
                  </Label>
                  <Input
                    id={`comp-details-${i}`}
                    placeholder="3bd/2ba 1400sqft"
                    value={comp.details ?? ""}
                    onChange={(e) => updateComp(i, "details", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`comp-dom-${i}`} className="text-xs">
                    Days on Market
                  </Label>
                  <Input
                    id={`comp-dom-${i}`}
                    type="number"
                    placeholder="45"
                    value={comp.dom ?? ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateComp(i, "dom", isNaN(val) ? undefined : val);
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`comp-notes-${i}`} className="text-xs">
                    Notes
                  </Label>
                  <Input
                    id={`comp-notes-${i}`}
                    placeholder="Similar condition, updated kitchen"
                    value={comp.notes ?? ""}
                    onChange={(e) => updateComp(i, "notes", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ARV Summary */}
      {filledComps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comp Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Comps entered
                </p>
                <p className="text-lg font-semibold">{filledComps.length}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Average sale price
                </p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {fmtDollar(avgPrice)}
                </p>
              </div>
            </div>

            {filledComps.length > 1 && (
              <div className="text-xs text-muted-foreground space-y-1">
                {filledComps.map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate max-w-[60%]">
                      {c.address || `Comp ${i + 1}`}
                    </span>
                    <span className="font-medium">{fmtDollar(c.salePrice)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Suggested ARV</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {fmtDollar(avgPrice)}
                </p>
                {deal.arv != null && deal.arv !== avgPrice && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Current ARV:{" "}
                    <span className="font-medium">{fmtDollar(deal.arv)}</span>
                  </p>
                )}
              </div>
              <Button
                onClick={handleUseAsArv}
                disabled={applyingArv || avgPrice <= 0}
                className="shrink-0"
                variant="default"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {applyingArv ? "Applying..." : "Use as ARV"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ARV Research Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlusCircle className="h-4 w-4 text-muted-foreground" />
            ARV Research Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Paste agent opinions, Zillow estimates, market notes, or any other
            ARV research.
          </p>
          <Textarea
            placeholder="e.g. Agent Jane Smith quoted $285k-$295k. Zillow Zestimate $278k. Comparable on 5th St sold for $292k in Jan 2026..."
            value={arvNotes}
            onChange={(e) => {
              setArvNotes(e.target.value);
              setSaved(false);
            }}
            rows={5}
            className="resize-y"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSaveComps} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Comps & Notes"}
        </Button>
        {saved && !saving && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
