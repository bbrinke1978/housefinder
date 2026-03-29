import Link from "next/link";
import { Download } from "lucide-react";
import {
  getPipelineFunnelData,
  getLeadSourceAttribution,
  getMarketComparisonData,
  getPropertyTrendData,
  getScraperHealthData,
  getOutreachStats,
  getRecentActivityLog,
  getLeadsForCallLog,
} from "@/lib/analytics-queries";
import { ActivityLog } from "@/components/analytics-activity-log";
import { AnalyticsFunnel } from "@/components/analytics-funnel";
import { AnalyticsMarket } from "@/components/analytics-market";
import { AnalyticsTrends } from "@/components/analytics-trends";
import { AnalyticsAttribution } from "@/components/analytics-attribution";
import { ScraperHealthTable } from "@/components/analytics-scraper-health";
import { AnalyticsOutreach } from "@/components/analytics-outreach";
import { CallLogForm } from "@/components/call-log-form";
import { AnalyticsInfoPanel } from "@/components/analytics-info-panel";

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
      const [outreachStats, leadsForForm] = await Promise.all([
        getOutreachStats(),
        getLeadsForCallLog(),
      ]);
      data = { outreachStats, leadsForForm };
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

      {/* Tab content */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <AnalyticsInfoPanel tab="pipeline" />
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h2 className="text-base font-semibold mb-4">Pipeline Conversion</h2>
            <AnalyticsFunnel
              data={
                (data as { funnelData: Awaited<ReturnType<typeof getPipelineFunnelData>> })
                  .funnelData
              }
            />
          </div>
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h3 className="text-base font-semibold mb-4">Lead Source Attribution</h3>
            <AnalyticsAttribution
              data={
                (data as { attributionData: Awaited<ReturnType<typeof getLeadSourceAttribution>> })
                  .attributionData
              }
            />
          </div>
        </div>
      )}

      {activeTab === "markets" && (
        <div className="space-y-6">
          <AnalyticsInfoPanel tab="markets" />
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h2 className="text-base font-semibold mb-4">Market Comparison</h2>
            <AnalyticsMarket data={data as Awaited<ReturnType<typeof getMarketComparisonData>>} />
          </div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="space-y-6">
          <AnalyticsInfoPanel tab="trends" />
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h2 className="text-base font-semibold mb-4">Weekly Property Volume by City</h2>
            <AnalyticsTrends data={data as Awaited<ReturnType<typeof getPropertyTrendData>>} />
          </div>
        </div>
      )}

      {activeTab === "health" && (
        <div className="space-y-6">
          <AnalyticsInfoPanel tab="health" />
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h2 className="text-base font-semibold mb-4">Scraper Health</h2>
            <ScraperHealthTable data={data as Awaited<ReturnType<typeof getScraperHealthData>>} />
          </div>
        </div>
      )}

      {activeTab === "outreach" && (() => {
        const { outreachStats, leadsForForm } = data as {
          outreachStats: Awaited<ReturnType<typeof getOutreachStats>>;
          leadsForForm: { id: string; address: string }[];
        };
        return (
          <div className="space-y-6">
            <AnalyticsInfoPanel tab="outreach" />
            <div className="rounded-xl border bg-card p-4 md:p-6">
              <h2 className="text-base font-semibold mb-4">Outreach Stats</h2>
              <AnalyticsOutreach data={outreachStats} />
            </div>
            <div className="rounded-xl border bg-card p-4 md:p-6">
              <h2 className="text-base font-semibold mb-4">Log a Call</h2>
              <CallLogForm leads={leadsForForm} />
            </div>
          </div>
        );
      })()}

      {activeTab === "activity" && (
        <div className="space-y-6">
          <AnalyticsInfoPanel tab="activity" />
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h2 className="text-base font-semibold mb-4">Recent Activity</h2>
            <ActivityLog data={data as Awaited<ReturnType<typeof getRecentActivityLog>>} />
          </div>
        </div>
      )}

      {/* Export section */}
      <div className="rounded-xl border bg-card p-4 md:p-6 mt-6">
        <h2 className="text-base font-semibold">Export Data</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Download your data as CSV for external analysis.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export?type=leads"
            download
            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Leads CSV
          </a>
          <a
            href="/api/export?type=deals"
            download
            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Deals CSV
          </a>
          <a
            href="/api/export?type=buyers"
            download
            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Buyers CSV
          </a>
        </div>
      </div>
    </div>
  );
}

// -- Non-chart sub-components --

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

