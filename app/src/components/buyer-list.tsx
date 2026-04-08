"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, CheckCircle2, MapPin } from "lucide-react";
import { deactivateBuyer } from "@/lib/deal-actions";
import { updateBuyerDealInteraction } from "@/lib/buyer-actions";
import { BuyerIntakeForm } from "@/components/buyer-intake-form";
import type { Buyer, BuyerWithMatchInfo } from "@/types";

// BuyerList can be rendered either:
// 1. On /buyers page — plain Buyer[] with optional matchDealPrice (old mode)
// 2. On deal detail page — BuyerWithMatchInfo[] with dealId + interaction map (new mode)
type BuyerListProps =
  | {
      buyers: Buyer[];
      matchDealPrice?: number;
      dealId?: undefined;
      buyerInteractions?: undefined;
    }
  | {
      buyers: BuyerWithMatchInfo[];
      matchDealPrice?: undefined;
      dealId: string;
      buyerInteractions: Map<string, string>;
    };

function fundingLabel(fundingType: string | null): string {
  switch (fundingType) {
    case "cash":
      return "Cash";
    case "hard_money":
      return "Hard Money";
    case "both":
      return "Cash / Hard Money";
    default:
      return fundingType ?? "Unknown";
  }
}

function rehabLabel(rehab: string | null): string {
  switch (rehab) {
    case "light":
      return "Light";
    case "medium":
      return "Medium";
    case "heavy":
      return "Heavy";
    case "any":
      return "Any";
    default:
      return rehab ?? "Unknown";
  }
}

function formatPrice(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function isMatch(buyer: Buyer, dealPrice: number): boolean {
  const aboveMin = buyer.minPrice == null || buyer.minPrice <= dealPrice;
  const belowMax = buyer.maxPrice == null || buyer.maxPrice >= dealPrice;
  return aboveMin && belowMax;
}

function InteractionStatusBadge({ status }: { status: string }) {
  if (status === "blasted") {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
        Blasted
      </Badge>
    );
  }
  if (status === "interested") {
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
        Interested
      </Badge>
    );
  }
  if (status === "closed") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
        Closed
      </Badge>
    );
  }
  return null;
}

function BuyerCard({
  buyer,
  matchDealPrice,
  dealId,
  initialInteractionStatus,
}: {
  buyer: Buyer | BuyerWithMatchInfo;
  matchDealPrice?: number;
  dealId?: string;
  initialInteractionStatus?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [interactionStatus, setInteractionStatus] = useState<string | undefined>(
    initialInteractionStatus
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Determine match badge mode
  const isBuyerWithMatchInfo = "isFullMatch" in buyer;
  const simpleMatch =
    !isBuyerWithMatchInfo && matchDealPrice != null && isMatch(buyer, matchDealPrice);

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await deactivateBuyer(buyer.id);
    } finally {
      setDeactivating(false);
      setConfirming(false);
    }
  }

  async function handleInteractionUpdate(newStatus: "interested" | "closed") {
    if (!dealId) return;
    setUpdatingStatus(true);
    try {
      const fd = new FormData();
      fd.set("buyerId", buyer.id);
      fd.set("dealId", dealId);
      fd.set("status", newStatus);
      const result = await updateBuyerDealInteraction(fd);
      if ("success" in result) {
        setInteractionStatus(newStatus);
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (editing) {
    return (
      <BuyerIntakeForm buyer={buyer} onClose={() => setEditing(false)} />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {dealId ? (
              <Link
                href={`/buyers/${buyer.id}`}
                className="hover:text-primary transition-colors truncate"
              >
                {buyer.name}
              </Link>
            ) : (
              <span className="truncate">{buyer.name}</span>
            )}
            {/* Match badges (deal detail mode) */}
            {isBuyerWithMatchInfo && buyer.isFullMatch && (
              <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700 shrink-0">
                <CheckCircle2 className="h-3 w-3" />
                Full Match
              </Badge>
            )}
            {isBuyerWithMatchInfo && !buyer.isFullMatch && buyer.matchesArea === false && (
              <Badge className="gap-1 bg-yellow-500 text-white hover:bg-yellow-600 shrink-0">
                <CheckCircle2 className="h-3 w-3" />
                Price Match
              </Badge>
            )}
            {/* Simple match badge (buyers page) */}
            {simpleMatch && (
              <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700 shrink-0">
                <CheckCircle2 className="h-3 w-3" />
                Match
              </Badge>
            )}
            {/* Interaction status badge */}
            {interactionStatus && (
              <InteractionStatusBadge status={interactionStatus} />
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            {confirming ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deactivating}
                  onClick={handleDeactivate}
                >
                  {deactivating ? "..." : "Confirm"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirming(true)}
              >
                Deactivate
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Contact */}
        <div className="flex flex-wrap gap-4 text-sm">
          {buyer.phone && (
            <a
              href={`tel:${buyer.phone}`}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Phone className="h-3 w-3" />
              {buyer.phone}
            </a>
          )}
          {buyer.email && (
            <a
              href={`mailto:${buyer.email}`}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Mail className="h-3 w-3" />
              {buyer.email}
            </a>
          )}
        </div>

        {/* Price Range & Funding */}
        <div className="flex flex-wrap gap-2 text-sm">
          {(buyer.minPrice != null || buyer.maxPrice != null) && (
            <span className="text-muted-foreground">
              Price:{" "}
              <span className="font-medium text-foreground">
                {formatPrice(buyer.minPrice)} – {formatPrice(buyer.maxPrice)}
              </span>
            </span>
          )}
          {buyer.fundingType && (
            <Badge variant="secondary">{fundingLabel(buyer.fundingType)}</Badge>
          )}
          {buyer.rehabTolerance && (
            <Badge variant="outline">
              Rehab: {rehabLabel(buyer.rehabTolerance)}
            </Badge>
          )}
        </div>

        {/* Buy Box */}
        {buyer.buyBox && (
          <p className="text-sm text-muted-foreground">{buyer.buyBox}</p>
        )}

        {/* Target Areas */}
        {buyer.targetAreas && (
          <p className="text-xs text-muted-foreground">
            <MapPin className="inline h-3 w-3 mr-0.5" />
            {buyer.targetAreas}
          </p>
        )}

        {/* Tags (deal detail mode only) */}
        {isBuyerWithMatchInfo && buyer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {buyer.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Interaction status buttons (deal detail mode) */}
        {dealId && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={interactionStatus === "interested" ? "default" : "outline"}
              disabled={updatingStatus}
              onClick={() => handleInteractionUpdate("interested")}
              className="text-xs h-7"
            >
              Interested
            </Button>
            <Button
              size="sm"
              variant={interactionStatus === "closed" ? "default" : "outline"}
              disabled={updatingStatus}
              onClick={() => handleInteractionUpdate("closed")}
              className="text-xs h-7"
            >
              Closed
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BuyerList({
  buyers,
  matchDealPrice,
  dealId,
  buyerInteractions,
}: BuyerListProps) {
  if (buyers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {dealId
          ? "No active buyers match this deal's price range yet."
          : "No active buyers yet. Add your first buyer below."}
      </div>
    );
  }

  // Sort: full matches first, then price-only matches, then rest (when in deal mode)
  const sorted =
    dealId
      ? [...(buyers as BuyerWithMatchInfo[])].sort((a, b) => {
          if (a.isFullMatch && !b.isFullMatch) return -1;
          if (!a.isFullMatch && b.isFullMatch) return 1;
          return 0;
        })
      : buyers;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sorted.map((buyer) => (
        <BuyerCard
          key={buyer.id}
          buyer={buyer}
          matchDealPrice={matchDealPrice}
          dealId={dealId}
          initialInteractionStatus={buyerInteractions?.get(buyer.id)}
        />
      ))}
    </div>
  );
}
