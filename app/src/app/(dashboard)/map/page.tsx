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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Map</h1>
      <MapWrapper geojson={geojson} cities={cities} counties={counties} />
    </div>
  );
}
