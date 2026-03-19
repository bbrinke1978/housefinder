import type { MapProperty } from "@/types";
import type { FeatureCollection, Feature, Point } from "geojson";

/** Properties attached to each GeoJSON feature for Mapbox layer styling and popups */
export interface MapGeoJSONProperties {
  id: string;
  address: string;
  city: string;
  county: string;
  state: string;
  distressScore: number;
  isHot: boolean;
  leadStatus: string;
  ownerName: string | null;
  signalTypes: string; // comma-joined for Mapbox filter expressions
}

/**
 * Convert MapProperty[] to GeoJSON FeatureCollection.
 * GeoJSON coordinates are [longitude, latitude] (not [lat, lng]).
 */
export function toGeoJSON(
  properties: MapProperty[]
): FeatureCollection<Point, MapGeoJSONProperties> {
  return {
    type: "FeatureCollection",
    features: properties.map(
      (p): Feature<Point, MapGeoJSONProperties> => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [p.longitude, p.latitude],
        },
        properties: {
          id: p.id,
          address: p.address,
          city: p.city,
          county: p.county,
          state: p.state,
          distressScore: p.distressScore,
          isHot: p.isHot,
          leadStatus: p.leadStatus,
          ownerName: p.ownerName,
          signalTypes: p.signalTypes.join(","),
        },
      })
    ),
  };
}

/** Map distress score (0-10) to hex color: green -> yellow -> orange -> red */
export function scoreToColor(score: number): string {
  if (score >= 7) return "#ef4444"; // red
  if (score >= 5) return "#f97316"; // orange
  if (score >= 3) return "#eab308"; // yellow
  return "#22c55e"; // green
}

/** Signal type key to display label */
export function signalLabel(type: string): string {
  const labels: Record<string, string> = {
    nod: "NOD",
    tax_lien: "Tax Lien",
    lis_pendens: "Lis Pendens",
    probate: "Probate",
    code_violation: "Code Violation",
    vacant: "Vacant",
  };
  return labels[type] ?? type;
}
