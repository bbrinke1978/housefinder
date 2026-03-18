import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  getDashboardStats,
  getProperties,
  getDistinctCities,
} from "@/lib/queries";
import { StatsBar } from "@/components/stats-bar";
import { DashboardFilters } from "@/components/dashboard-filters";
import { PropertyCard } from "@/components/property-card";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;

  // Extract filter params (single string values only)
  const filterParams = {
    city: typeof params.city === "string" ? params.city : undefined,
    distressType:
      typeof params.distressType === "string"
        ? params.distressType
        : undefined,
    hot: typeof params.hot === "string" ? params.hot : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    sort: typeof params.sort === "string" ? params.sort : undefined,
  };

  const [stats, properties, cities] = await Promise.all([
    getDashboardStats(),
    getProperties(filterParams),
    getDistinctCities(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <Suspense fallback={null}>
        <DashboardFilters cities={cities} />
      </Suspense>

      {/* Property list */}
      {properties.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No properties found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters or check back later for new leads.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
