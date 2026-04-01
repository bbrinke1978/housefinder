import Link from "next/link";
import { getDeals } from "@/lib/deal-queries";
import { DealsSearchWrapper } from "@/components/deals-search-wrapper";
import { LayoutGrid, List } from "lucide-react";

export const dynamic = "force-dynamic";

interface DealsPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const { view = "kanban" } = await searchParams;
  const deals = await getDeals();

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Deals</h1>
          <span className="text-sm text-muted-foreground rounded-full bg-muted px-2.5 py-0.5 tabular-nums">
            {deals.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden text-sm bg-muted/40">
            <Link
              href="/deals?view=kanban"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                view === "kanban"
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Kanban view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </Link>
            <Link
              href="/deals?view=list"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-l border-border transition-colors ${
                view === "list"
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </Link>
          </div>

          {/* New deal button */}
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors min-h-[36px]"
          >
            + New
          </Link>
        </div>
      </div>

      {/* Mobile kanban hint */}
      {view !== "list" && (
        <p className="text-xs text-muted-foreground md:hidden">
          Swipe horizontally to see all columns
        </p>
      )}

      {/* Search + content (client-side filtering) */}
      <DealsSearchWrapper deals={deals} view={view} />
    </div>
  );
}
