"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, MapPin, User } from "lucide-react";
import type { PropertyWithLead } from "@/types";

interface PropertyCardProps {
  property: PropertyWithLead;
}

function scoreColor(score: number): string {
  if (score >= 5) return "bg-red-500/10 text-red-600";
  if (score >= 3) return "bg-yellow-500/10 text-yellow-600";
  return "bg-green-500/10 text-green-600";
}

function isNew(property: PropertyWithLead): boolean {
  if (!property.firstSeenAt) return false;
  if (!property.lastViewedAt) return true;
  return new Date(property.firstSeenAt) > new Date(property.lastViewedAt);
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link href={`/properties/${property.id}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-2">
          {/* Header row: address + badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{property.address}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  {property.city}, {property.state}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {isNew(property) && (
                <Badge className="bg-blue-500/10 text-blue-600">New</Badge>
              )}
              {property.isHot && (
                <Badge variant="destructive">
                  <Flame className="mr-0.5 h-3 w-3" />
                  Hot
                </Badge>
              )}
            </div>
          </div>

          {/* Owner */}
          {property.ownerName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate">{property.ownerName}</span>
            </div>
          )}

          {/* Score + Status row */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${scoreColor(property.distressScore)}`}
            >
              Score: {property.distressScore}
            </span>
            <Badge variant="outline" className="text-xs capitalize">
              {property.leadStatus.replace("_", " ")}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
