import Link from "next/link";
import { getDeals } from "@/lib/deal-queries";
import { db } from "@/db/client";
import { propertyPhotos } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { generatePhotoSasUrl } from "@/lib/blob-storage";
import { DealsSearchWrapper } from "@/components/deals-search-wrapper";
import { LayoutGrid, List } from "lucide-react";
import { auth } from "@/auth";
import { sessionCan } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface DealsPageProps {
  searchParams: Promise<{ view?: string; mine?: string }>;
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const session = await auth();
  const { view = "kanban", mine: mineParam } = await searchParams;

  // Determine "my deals" filter:
  // - Owner: off by default (sees everything); ?mine=true to narrow
  // - Non-owner: on by default; ?mine=false to see all (if they have deal.view_all)
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? [];
  const isOwner = roles.includes("owner");
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  let mineFilter: { userId: string } | undefined = undefined;
  if (currentUserId) {
    const mineDefault = !isOwner; // non-owners default to mine=true
    const mineOn = mineParam !== undefined ? mineParam === "true" : mineDefault;
    if (mineOn) {
      mineFilter = { userId: currentUserId };
    }
  }

  const deals = await getDeals({ mine: mineFilter });

  // Batch-fetch cover photos for all deals (non-fatal — page works without photos)
  const dealIds = deals.map((d) => d.id);
  let coverPhotos: Record<string, string> = {};
  if (dealIds.length > 0) {
    try {
      const coverRows = await db
        .select({ dealId: propertyPhotos.dealId, blobName: propertyPhotos.blobName })
        .from(propertyPhotos)
        .where(
          and(
            inArray(propertyPhotos.dealId, dealIds),
            eq(propertyPhotos.isCover, true)
          )
        );
      coverPhotos = Object.fromEntries(
        coverRows
          .filter((r) => r.dealId !== null)
          .map((r) => [r.dealId as string, generatePhotoSasUrl(r.blobName)])
      );
    } catch {
      // Table may not exist yet — continue without cover photos
    }
  }

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
          {/* "My deals" toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden text-sm bg-muted/40">
            <Link
              href={`/deals?view=${view}&mine=false`}
              className={`inline-flex items-center px-3 py-1.5 transition-colors ${
                !mineFilter
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </Link>
            <Link
              href={`/deals?view=${view}&mine=true`}
              className={`inline-flex items-center px-3 py-1.5 border-l border-border transition-colors ${
                mineFilter
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mine
            </Link>
          </div>

          {/* View toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden text-sm bg-muted/40">
            <Link
              href={`/deals?view=kanban${mineFilter ? "&mine=true" : ""}`}
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
              href={`/deals?view=list${mineFilter ? "&mine=true" : ""}`}
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
      <DealsSearchWrapper deals={deals} view={view} coverPhotos={coverPhotos} />
    </div>
  );
}
