import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  getDashboardStats,
  getProperties,
  getDistinctCities,
  getWebsiteLeads,
} from "@/lib/queries";
import type { WebsiteLead } from "@/lib/queries";
import { LEAD_SOURCES } from "@/types";
import { getSequences } from "@/lib/campaign-queries";
import { getOverdueBuyerFollowups } from "@/lib/buyer-queries";
import { StatsBar } from "@/components/stats-bar";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardPropertyGrid } from "@/components/dashboard-property-grid";
import { BuyerFollowupWidget } from "@/components/buyer-followup-widget";
import { MapPin, Globe, Phone, MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/format-date";

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
    source: typeof params.source === "string" ? params.source : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
  };

  const [stats, properties, cities, sequences, websiteLeads, overdueBuyers] = await Promise.all([
    getDashboardStats(),
    getProperties(filterParams),
    getDistinctCities(),
    getSequences(),
    getWebsiteLeads().catch(() => [] as WebsiteLead[]),
    getOverdueBuyerFollowups().catch(() => []),
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

      {/* Buyer Follow-Up Reminders */}
      <BuyerFollowupWidget buyers={overdueBuyers} />

      {/* Inbound Leads (website + voicemail) */}
      {websiteLeads.length > 0 && (
        <div className="space-y-3 animate-fade-in-up stagger-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Inbound Leads ({websiteLeads.length})
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {websiteLeads.map((lead) => {
              const isVoicemail = lead.leadSource === "voicemail";
              const badgeLabel = isVoicemail ? "Voicemail" : "Website";
              const badgeClass = isVoicemail
                ? "bg-teal-500/15 text-teal-600"
                : "bg-violet-500/15 text-violet-600";
              return (
              <div key={lead.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{lead.name ?? "Unknown"}</p>
                    {lead.address && (
                      <p className="text-xs text-muted-foreground">{lead.address}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-wider rounded-full px-2 py-0.5 ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${lead.phone}`} className="hover:text-foreground">{lead.phone}</a>
                  </div>
                )}
                {lead.message && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                    <p className="line-clamp-2">{lead.message}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {formatDateTime(lead.createdAt)}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      )}

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
        <DashboardPropertyGrid properties={properties} sequences={sequences} />
      )}
    </div>
  );
}
