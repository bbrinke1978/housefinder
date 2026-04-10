import { getWholesaleLeads, getWholesalersWithStats } from "@/lib/wholesale-queries";
import { WholesaleLeadGrid } from "@/components/wholesale-lead-grid";
import { WholesaleTabs } from "@/components/wholesale-tabs";

export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const [leads, wholesalersWithStats] = await Promise.all([
    getWholesaleLeads(),
    getWholesalersWithStats(),
  ]);

  const wholesalerOptions = wholesalersWithStats.map((w) => ({
    id: w.id,
    name: w.name,
  }));

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Wholesale Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Triage incoming wholesale deals
        </p>
      </div>

      <WholesaleTabs
        leads={leads}
        wholesalers={wholesalerOptions}
        wholesalersWithStats={wholesalersWithStats}
      />
    </div>
  );
}
