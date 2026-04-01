import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getMapProperties,
  getDistinctCities,
  getDistinctCounties,
} from "@/lib/queries";
import { toGeoJSON } from "@/lib/map-utils";
import { MapWrapper } from "@/components/map/map-wrapper";

export default async function MapPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [properties, cities, counties] = await Promise.all([
    getMapProperties(),
    getDistinctCities(),
    getDistinctCounties(),
  ]);

  const geojson = toGeoJSON(properties);

  return (
    <div className="space-y-3 p-4 md:p-6">
      <h1 className="text-xl font-bold">Map</h1>
      {/* On mobile: fill viewport minus top header (48px) + page title (~40px) + bottom nav (56px) */}
      <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-8rem)] min-h-[400px]">
        <MapWrapper geojson={geojson} cities={cities} counties={counties} />
      </div>
    </div>
  );
}
