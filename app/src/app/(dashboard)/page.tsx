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
import { MapPin } from "lucide-react";

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

  const filterParams = {
    city: typeof params.city === "string" ? params.city : undefined,
    distressType:
      typeof params.distressType === "string"
        ? params.distressType
        : undefined,
    hot: typeof params.hot === "string" ? params.hot : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    sort: typeof params.sort === "string" ? params.sort : undefined,
    skipTrace: typeof params.skipTrace === "string" ? params.skipTrace : undefined,
    ownerType: typeof params.ownerType === "string" ? params.ownerType : undefined,
    minScore: typeof params.minScore === "string" ? params.minScore : undefined,
    tier: typeof params.tier === "string" ? params.tier : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
  };

  const [stats, properties, cities] = await Promise.all([
    getDashboardStats(),
    getProperties(filterParams),
    getDistinctCities(),
  ]);

  return (
    <div className="space-y-6">
      {/* Compact page header */}
      <div className="mb-2 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stats.total} properties across {cities.length} cities
        </p>
      </div>

      {/* Stats */}
      <div className="animate-fade-in-up stagger-1">
        <StatsBar stats={stats} />
      </div>

      {/* Filters */}
      <div className="animate-fade-in-up stagger-2 relative z-40">
        <Suspense fallback={null}>
          <DashboardFilters cities={cities} />
        </Suspense>
      </div>

      {/* Filtered count */}
      <div className="text-sm text-muted-foreground animate-fade-in-up stagger-3">
        {Object.values(filterParams).some(Boolean) ? (
          <span>
            Showing <span className="font-semibold text-foreground">{properties.length}</span> of{" "}
            <span className="font-semibold text-foreground">{stats.total}</span> properties
          </span>
        ) : (
          <span>
            <span className="font-semibold text-foreground">{stats.total}</span> properties
          </span>
        )}
      </div>

      {/* Property grid */}
      {properties.length === 0 ? (
        <div className="card-elevated text-center py-16 animate-fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MapPin className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-xl font-semibold text-foreground">
            No properties found
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your filters or check back later for new leads.
          </p>
        </div>
      ) : (
        <div className="stagger-children grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 relative z-0">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
