import Link from "next/link";
import {
  getPipelineFunnelData,
  getLeadSourceAttribution,
  getMarketComparisonData,
  getPropertyTrendData,
  getScraperHealthData,
  getOutreachStats,
  getRecentActivityLog,
} from "@/lib/analytics-queries";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

const tabs = [
  { id: "pipeline", label: "Pipeline" },
  { id: "markets", label: "Markets" },
  { id: "trends", label: "Trends" },
  { id: "health", label: "Health" },
  { id: "outreach", label: "Outreach" },
  { id: "activity", label: "Activity" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const { tab = "pipeline" } = await searchParams;
  const activeTab = (tabs.some((t) => t.id === tab) ? tab : "pipeline") as TabId;

  // Fetch only the active tab's data
  let data: unknown = null;
  switch (activeTab) {
    case "pipeline": {
      const [funnelData, attributionData] = await Promise.all([
        getPipelineFunnelData(),
        getLeadSourceAttribution(),
      ]);
      data = { funnelData, attributionData };
      break;
    }
    case "markets": {
      data = await getMarketComparisonData();
      break;
    }
    case "trends": {
      data = await getPropertyTrendData();
      break;
    }
    case "health": {
      data = await getScraperHealthData();
      break;
    }
    case "outreach": {
      data = await getOutreachStats();
      break;
    }
    case "activity": {
      data = await getRecentActivityLog();
      break;
    }
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex rounded-lg border overflow-x-auto text-sm mb-6 w-fit">
        {tabs.map((t, i) => (
          <Link
            key={t.id}
            href={`/analytics?tab=${t.id}`}
            className={`px-3 py-1.5 whitespace-nowrap transition-colors ${
              i > 0 ? "border-l" : ""
            } ${
              activeTab === t.id
                ? "bg-muted font-medium"
                : "hover:bg-muted/50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab content — placeholder data display until Plans 02–03 add chart components */}
      <div className="rounded-lg border p-4 bg-muted/20">
        <p className="text-xs text-muted-foreground mb-3 font-mono uppercase tracking-wide">
          {activeTab} data (raw — chart components added in Plans 02–03)
        </p>

        {activeTab === "pipeline" && (
          <>
            {/* TODO: Replace with <AnalyticsFunnel data={funnelData} /> in Plan 02 */}
            <PipelinePlaceholder data={data as { funnelData: Awaited<ReturnType<typeof getPipelineFunnelData>>; attributionData: Awaited<ReturnType<typeof getLeadSourceAttribution>> }} />
          </>
        )}

        {activeTab === "markets" && (
          <>
            {/* TODO: Replace with <MarketComparisonChart data={data} /> in Plan 02 */}
            <SimpleTable data={data as Record<string, unknown>[]} />
          </>
        )}

        {activeTab === "trends" && (
          <>
            {/* TODO: Replace with <PropertyTrendChart data={data} /> in Plan 02 */}
            <SimpleTable data={data as Record<string, unknown>[]} />
          </>
        )}

        {activeTab === "health" && (
          <>
            {/* TODO: Replace with <ScraperHealthGrid data={data} /> in Plan 03 */}
            <HealthTable data={data as Awaited<ReturnType<typeof getScraperHealthData>>} />
          </>
        )}

        {activeTab === "outreach" && (
          <>
            {/* TODO: Replace with <OutreachChart data={data} /> in Plan 03 */}
            <SimpleTable data={data as Record<string, unknown>[]} />
          </>
        )}

        {activeTab === "activity" && (
          <>
            {/* TODO: Replace with <ActivityFeed data={data} /> in Plan 03 */}
            <ActivityList data={data as Awaited<ReturnType<typeof getRecentActivityLog>>} />
          </>
        )}
      </div>
    </div>
  );
}

// -- Placeholder sub-components --

function PipelinePlaceholder({
  data,
}: {
  data: {
    funnelData: Awaited<ReturnType<typeof getPipelineFunnelData>>;
    attributionData: Awaited<ReturnType<typeof getLeadSourceAttribution>>;
  };
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Funnel Stages</h3>
        {data.funnelData.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-1 pr-4">Status</th>
                <th className="pb-1 pr-4">Count</th>
                <th className="pb-1">Avg Days</th>
              </tr>
            </thead>
            <tbody>
              {data.funnelData.map((row) => (
                <tr key={row.status} className="border-b last:border-0">
                  <td className="py-1 pr-4 font-medium capitalize">{row.status.replace("_", " ")}</td>
                  <td className="py-1 pr-4">{row.count}</td>
                  <td className="py-1">{row.avgDaysInStage ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Lead Source Attribution</h3>
        {data.attributionData.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-1 pr-4">Signal Type</th>
                <th className="pb-1 pr-4">Total</th>
                <th className="pb-1 pr-4">Hot</th>
                <th className="pb-1">Deals</th>
              </tr>
            </thead>
            <tbody>
              {data.attributionData.map((row) => (
                <tr key={row.signalType} className="border-b last:border-0">
                  <td className="py-1 pr-4 font-medium">{row.signalType}</td>
                  <td className="py-1 pr-4">{row.totalLeads}</td>
                  <td className="py-1 pr-4">{row.hotLeads}</td>
                  <td className="py-1">{row.convertedDeals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SimpleTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-sm">No data yet.</p>;
  }
  const headers = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {headers.map((h) => (
              <th key={h} className="pb-1 pr-4 capitalize">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {headers.map((h) => (
                <td key={h} className="py-1 pr-4">
                  {String(row[h] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthTable({
  data,
}: {
  data: Awaited<ReturnType<typeof getScraperHealthData>>;
}) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No scrapers configured yet.</p>;
  }
  const statusColor: Record<string, string> = {
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
  };
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="pb-1 pr-4">County</th>
          <th className="pb-1 pr-4">Status</th>
          <th className="pb-1 pr-4">Last Success</th>
          <th className="pb-1 pr-4">Freshness (h)</th>
          <th className="pb-1">Last Count</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.county} className="border-b last:border-0">
            <td className="py-1 pr-4 font-medium capitalize">{row.county}</td>
            <td className={`py-1 pr-4 font-semibold ${statusColor[row.status]}`}>
              {row.status.toUpperCase()}
            </td>
            <td className="py-1 pr-4">
              {row.lastSuccessAt ? row.lastSuccessAt.toLocaleDateString() : "Never"}
            </td>
            <td className="py-1 pr-4">{row.freshnessHours ?? "—"}</td>
            <td className="py-1">{row.lastResultCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActivityList({
  data,
}: {
  data: Awaited<ReturnType<typeof getRecentActivityLog>>;
}) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity yet.</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {data.map((entry) => (
        <li key={entry.id} className="flex gap-3 border-b last:border-0 pb-2">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
              entry.type === "call"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {entry.type}
          </span>
          <div className="min-w-0">
            <p className="font-medium truncate">
              {entry.address}, {entry.city}
            </p>
            <p className="text-muted-foreground truncate">{entry.text}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground ml-auto">
            {entry.createdAt.toLocaleDateString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
