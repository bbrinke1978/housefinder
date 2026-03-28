import Link from "next/link";
import { getDeals } from "@/lib/deal-queries";
import { DealKanban } from "@/components/deal-kanban";
import { DealList } from "@/components/deal-list";

export const dynamic = "force-dynamic";

interface DealsPageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const { view = "kanban" } = await searchParams;
  const deals = await getDeals();

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Deals</h1>
          <span className="text-sm text-muted-foreground rounded-full bg-muted px-2.5 py-0.5">
            {deals.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <Link
              href="/deals?view=kanban"
              className={`px-3 py-1.5 transition-colors ${
                view === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Kanban
            </Link>
            <Link
              href="/deals?view=list"
              className={`px-3 py-1.5 border-l transition-colors ${
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              List
            </Link>
          </div>

          {/* New deal button */}
          <Link
            href="/deals/new"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + New Deal
          </Link>
        </div>
      </div>

      {/* Content */}
      {view === "list" ? (
        <DealList deals={deals} />
      ) : (
        <DealKanban deals={deals} />
      )}
    </div>
  );
}
