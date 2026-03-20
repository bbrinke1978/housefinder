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
    minSignals: typeof params.minSignals === "string" ? params.minSignals : undefined,
  };

  const [stats, properties, cities] = await Promise.all([
    getDashboardStats(),
    getProperties(filterParams),
    getDistinctCities(),
  ]);

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl h-48 md:h-56 animate-fade-in">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=75')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/60 via-dark-950/30 to-dark-950/70" />
        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 shadow-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span
              style={{ fontFamily: "var(--font-display)" }}
              className="text-2xl tracking-wide"
            >
              DASHBOARD
            </span>
          </div>
          <p className="text-white/70 text-sm md:text-base">
            Tracking {stats.total} properties across {cities.length} cities in Utah
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-in-up stagger-1">
        <StatsBar stats={stats} />
      </div>

      {/* Filters */}
      <div className="animate-fade-in-up stagger-2">
        <Suspense fallback={null}>
          <DashboardFilters cities={cities} />
        </Suspense>
      </div>

      {/* Property grid */}
      {properties.length === 0 ? (
        <div className="card-warm text-center py-16 animate-fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warm-200 dark:bg-dark-700">
            <MapPin className="h-7 w-7 text-warm-500" />
          </div>
          <p
            style={{ fontFamily: "var(--font-heading)" }}
            className="text-xl font-semibold text-dark-950 dark:text-dark-100"
          >
            No properties found
          </p>
          <p className="mt-2 text-sm text-dark-500 dark:text-dark-400">
            Try adjusting your filters or check back later for new leads.
          </p>
        </div>
      ) : (
        <div className="stagger-children grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
