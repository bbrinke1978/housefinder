"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, CheckCircle2 } from "lucide-react";
import { deactivateBuyer } from "@/lib/deal-actions";
import { BuyerIntakeForm } from "@/components/buyer-intake-form";
import type { Buyer } from "@/types";

interface BuyerListProps {
  buyers: Buyer[];
  matchDealPrice?: number;
}

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

function BuyerCard({
  buyer,
  matchDealPrice,
}: {
  buyer: Buyer;
  matchDealPrice?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const matched =
    matchDealPrice != null && isMatch(buyer, matchDealPrice);

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await deactivateBuyer(buyer.id);
    } finally {
      setDeactivating(false);
      setConfirming(false);
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
          <div className="flex items-center gap-2">
            {buyer.name}
            {matched && (
              <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Match
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
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
              className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
            >
              <Phone className="h-3 w-3" />
              {buyer.phone}
            </a>
          )}
          {buyer.email && (
            <a
              href={`mailto:${buyer.email}`}
              className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
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
            <span className="font-medium">Areas:</span> {buyer.targetAreas}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function BuyerList({ buyers, matchDealPrice }: BuyerListProps) {
  if (buyers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No active buyers yet. Add your first buyer below.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {buyers.map((buyer) => (
        <BuyerCard key={buyer.id} buyer={buyer} matchDealPrice={matchDealPrice} />
      ))}
    </div>
  );
}
