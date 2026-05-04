import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listFeedbackItems } from "@/lib/feedback-queries";
import type { FeedbackListFilters } from "@/lib/feedback-queries";
import { FeedbackList } from "@/components/feedback/feedback-list";
import Link from "next/link";

interface FeedbackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;

  const getString = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;
  const getCsv = (v: string | string[] | undefined): string[] => {
    const s = getString(v);
    return s ? s.split(",").filter(Boolean) : [];
  };

  const archive = getString(params.archive) === "true";

  const filters: FeedbackListFilters = {
    status:    getCsv(params.status),
    type:      getCsv(params.type),
    priority:  getCsv(params.priority),
    search:    getString(params.q),
    reporterId: getString(params.mine) === "true" ? (session.user.id as string) : undefined,
    archive,
  };

  const items = await listFeedbackItems(filters);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {archive ? "Archive" : "Bugs / Feature Request"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {archive
              ? "Shipped, won't-fix, and duplicate items."
              : "Bug reports, feature requests, and ideas for No BS Workbench"}
          </p>
        </div>
        {!archive && (
          <Link
            href="/feedback/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            + New
          </Link>
        )}
      </div>

      {/* List client component handles interactive filtering */}
      <FeedbackList
        items={items}
        filters={filters}
        isMine={getString(params.mine) === "true"}
        isArchive={archive}
      />
    </div>
  );
}
