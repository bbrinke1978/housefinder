"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, MapPin, ArrowRight, X } from "lucide-react";
import type { MapGeoJSONProperties } from "@/lib/map-utils";
import { scoreToColor, signalLabel } from "@/lib/map-utils";

interface PropertyBottomSheetProps {
  property: MapGeoJSONProperties;
  onClose: () => void;
}

interface PropertyCardContentProps {
  property: MapGeoJSONProperties;
  onClose: () => void;
}

/** Shared card content used in both bottom sheet (mobile) and popup (desktop) */
export function PropertyCardContent({
  property,
  onClose,
}: PropertyCardContentProps) {
  const signalTypes = property.signalTypes
    .split(",")
    .filter(Boolean);
  const color = scoreToColor(property.distressScore);

  return (
    <div className="space-y-3 p-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{property.address}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>
              {property.city}, {property.state}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Score + hot badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{
            backgroundColor: `${color}20`,
            color,
          }}
        >
          Score: {property.distressScore}
        </span>
        {property.isHot && (
          <Badge variant="destructive" className="text-xs">
            <Flame className="mr-0.5 h-3 w-3" />
            Hot
          </Badge>
        )}
        <Badge variant="outline" className="text-xs capitalize">
          {property.leadStatus.replace("_", " ")}
        </Badge>
      </div>

      {/* Signal types */}
      {signalTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {signalTypes.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {signalLabel(type)}
            </Badge>
          ))}
        </div>
      )}

      {/* Owner name */}
      {property.ownerName && (
        <p className="text-xs text-muted-foreground truncate">
          Owner: {property.ownerName}
        </p>
      )}

      {/* View Details link */}
      <Link
        href={`/properties/${property.id}`}
        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        View Details
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/** Mobile bottom sheet — slides up from bottom, swipe down to dismiss */
export function PropertyBottomSheet({
  property,
  onClose,
}: PropertyBottomSheetProps) {
  const touchStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const deltaY = e.touches[0].clientY - touchStartY.current;
      // Swipe down more than 100px → dismiss
      if (deltaY > 100) {
        onClose();
        touchStartY.current = null;
      }
    },
    [onClose]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartY.current = null;
  }, []);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl bg-background shadow-2xl animate-in slide-in-from-bottom duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2">
        <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Content */}
      <div className="px-4 pb-6">
        <PropertyCardContent property={property} onClose={onClose} />
      </div>
    </div>
  );
}
