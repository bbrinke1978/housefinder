"use client";

import dynamic from "next/dynamic";
import type { FeatureCollection, Point } from "geojson";
import type { MapGeoJSONProperties } from "@/lib/map-utils";

// Dynamic import with SSR disabled — Mapbox GL JS requires window/WebGL
const PropertyMap = dynamic(
  () =>
    import("@/components/map/property-map").then((mod) => mod.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl bg-muted">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    ),
  }
);

interface MapWrapperProps {
  geojson: FeatureCollection<Point, MapGeoJSONProperties>;
  cities: string[];
  counties: string[];
}

export function MapWrapper({ geojson, cities, counties }: MapWrapperProps) {
  return <PropertyMap geojson={geojson} cities={cities} counties={counties} />;
}
