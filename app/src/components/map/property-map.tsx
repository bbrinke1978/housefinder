"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  GeolocateControl,
  Popup,
} from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import type { FeatureCollection, Point } from "geojson";
import type { MapGeoJSONProperties } from "@/lib/map-utils";
import { Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MapFilters } from "./map-filters";
import { PropertyBottomSheet, PropertyCardContent } from "./property-bottom-sheet";
import "mapbox-gl/dist/mapbox-gl.css";

interface PropertyMapProps {
  geojson: FeatureCollection<Point, MapGeoJSONProperties>;
  cities: string[];
  counties: string[];
}

interface MapFiltersState {
  county: string;
  distressType: string;
  hot: boolean;
}

export function PropertyMap({ geojson, cities, counties }: PropertyMapProps) {
  const mapRef = useRef<MapRef>(null);
  const isMobile = useIsMobile();

  const [selectedProperty, setSelectedProperty] =
    useState<MapGeoJSONProperties | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<
    [number, number] | null
  >(null);
  const [filters, setFilters] = useState<MapFiltersState>({
    county: "",
    distressType: "",
    hot: false,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Address search — geocode via Mapbox and fly to result
  const handleSearch = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || !searchQuery.trim()) return;
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!token) return;
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${token}&limit=1&country=US&bbox=-114.05,37.0,-109.04,42.0`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.features?.[0]) {
          const [lng, lat] = data.features[0].center;
          mapRef.current?.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 2000,
          });
        }
      } catch {
        // Silently fail — geocoding is best-effort
      }
    },
    [searchQuery]
  );

  // Filter GeoJSON features client-side based on active filters
  const filteredGeojson = useMemo(() => {
    const filtered = geojson.features.filter((feature) => {
      const props = feature.properties;

      if (filters.county && props.county !== filters.county) return false;

      if (filters.distressType) {
        const signals = props.signalTypes.split(",").filter(Boolean);
        if (!signals.includes(filters.distressType)) return false;
      }

      if (filters.hot && !props.isHot) return false;

      return true;
    });

    return {
      type: "FeatureCollection" as const,
      features: filtered,
    };
  }, [geojson, filters]);

  // Fit map bounds to all properties on initial load
  const handleMapLoad = useCallback(() => {
    if (geojson.features.length === 0) return;

    const lngs = geojson.features.map((f) => f.geometry.coordinates[0]);
    const lats = geojson.features.map((f) => f.geometry.coordinates[1]);

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];

    mapRef.current?.fitBounds(bounds, { padding: 60, duration: 1000 });
  }, [geojson]);

  // Handle click on map features
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const features = event.features;
      if (!features || features.length === 0) {
        setSelectedProperty(null);
        setSelectedCoords(null);
        return;
      }

      const feature = features[0];

      // Handle cluster click — zoom into cluster
      if (feature.properties?.cluster) {
        const source = mapRef.current?.getSource(
          "properties"
        ) as mapboxgl.GeoJSONSource | undefined;
        if (source && feature.properties?.cluster_id != null) {
          source.getClusterExpansionZoom(
            feature.properties.cluster_id,
            (err, zoom) => {
              if (err || zoom == null) return;
              const coords = (feature.geometry as GeoJSON.Point).coordinates;
              mapRef.current?.flyTo({
                center: [coords[0], coords[1]],
                zoom,
                duration: 500,
              });
            }
          );
        }
        return;
      }

      // Handle individual pin click
      const props = feature.properties as unknown as MapGeoJSONProperties;
      if (props?.id) {
        // Parse isHot back from string if needed (Mapbox serializes to string)
        const parsed: MapGeoJSONProperties = {
          ...props,
          distressScore: Number(props.distressScore),
          isHot: props.isHot === true || (props.isHot as unknown) === "true",
        };
        setSelectedProperty(parsed);
        const coords = (feature.geometry as GeoJSON.Point).coordinates;
        setSelectedCoords([coords[0], coords[1]]);
      }
    },
    []
  );

  const handleCloseProperty = useCallback(() => {
    setSelectedProperty(null);
    setSelectedCoords(null);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      {/* Filter chips */}
      <MapFilters
        cities={cities}
        counties={counties}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Address search bar */}
      <div className="absolute left-4 right-4 top-16 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full rounded-lg border bg-background/90 py-2 pl-10 pr-4 text-sm shadow-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        initialViewState={{
          longitude: -111.5,
          latitude: 39.5,
          zoom: 7,
        }}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        interactiveLayerIds={[
          "clusters",
          "unclustered-point",
          "hot-point",
        ]}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        <Source
          id="properties"
          type="geojson"
          data={filteredGeojson}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
          clusterProperties={{
            maxScore: ["max", ["get", "distressScore"]],
          }}
        >
          {/* Cluster circles */}
          <Layer
            id="clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "maxScore"],
                0,
                "#22c55e",
                3,
                "#eab308",
                5,
                "#f97316",
                7,
                "#ef4444",
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                20,
                10,
                30,
                50,
                40,
              ],
              "circle-opacity": 0.8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />

          {/* Cluster count label */}
          <Layer
            id="cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": [
                "DIN Offc Pro Medium",
                "Arial Unicode MS Bold",
              ],
              "text-size": 14,
            }}
            paint={{
              "text-color": "#ffffff",
            }}
          />

          {/* Regular pins (non-hot) */}
          <Layer
            id="unclustered-point"
            type="circle"
            filter={[
              "all",
              ["!", ["has", "point_count"]],
              ["!=", ["get", "isHot"], true],
              ["!=", ["get", "isHot"], "true"],
            ]}
            paint={{
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "distressScore"],
                0,
                "#22c55e",
                3,
                "#eab308",
                5,
                "#f97316",
                7,
                "#ef4444",
              ],
              "circle-radius": 8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />

          {/* Hot lead pins — larger with gold stroke */}
          <Layer
            id="hot-point"
            type="circle"
            filter={[
              "all",
              ["!", ["has", "point_count"]],
              [
                "any",
                ["==", ["get", "isHot"], true],
                ["==", ["get", "isHot"], "true"],
              ],
            ]}
            paint={{
              "circle-color": "#ef4444",
              "circle-radius": 12,
              "circle-stroke-width": 3,
              "circle-stroke-color": "#fbbf24",
            }}
          />
        </Source>

        {/* Desktop popup */}
        {!isMobile && selectedProperty && selectedCoords && (
          <Popup
            longitude={selectedCoords[0]}
            latitude={selectedCoords[1]}
            onClose={handleCloseProperty}
            closeOnClick={false}
            maxWidth="320px"
            anchor="bottom"
          >
            <PropertyCardContent
              property={selectedProperty}
              onClose={handleCloseProperty}
            />
          </Popup>
        )}
      </Map>

      {/* Mobile bottom sheet */}
      {isMobile && selectedProperty && (
        <PropertyBottomSheet
          property={selectedProperty}
          onClose={handleCloseProperty}
        />
      )}
    </div>
  );
}
